use crate::models::TransferCharmsRequest;
use axum::{http::StatusCode, Json};
use bitcoin::{
    consensus::encode,
    secp256k1::{Keypair, Secp256k1},
    Amount, FeeRate, XOnlyPublicKey,
};
use charms::{
    script, spell::prove_spell_tx, spell::NormalizedSpell, spell::Spell, tx, wallet::get_prev_txs,
};
use rand::thread_rng;
use serde_json::json;
use std::path::PathBuf;
use std::str::FromStr;
use tracing::{debug, error, info};

use crate::services::local::{get_change_address, get_funding_utxo_value, parse_outpoint};

pub async fn prove_spell(
    Json(req): Json<TransferCharmsRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    info!("=== Starting prove_spell handler ===");
    info!("Request details:");
    info!("  - Destination address: {}", req.destination_address);
    info!("  - Funding UTXO ID: {}", req.funding_utxo_id);
    info!("  - Spell JSON length: {}", req.spell_json.len());

    // Validate request fields
    if req.spell_json.trim().is_empty() {
        error!("Empty spell_json provided");
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status": "error",
                "message": "spell_json is required"
            })),
        ));
    }

    // Parse and validate spell using the Spell struct
    debug!("Attempting to parse spell YAML");
    let spell: Spell = match serde_yaml::from_str(&req.spell_json) {
        Ok(spell) => spell,
        Err(e) => {
            error!("Invalid spell YAML: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "status": "error",
                    "message": format!("Invalid spell YAML: {}", e)
                })),
            ));
        }
    };

    // Validate spell structure using normalized()
    debug!("Validate spell structure");
    if let Err(e) = spell.normalized() {
        error!("Invalid spell structure: {}", e);
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status": "error",
                "message": format!("Invalid spell structure: {}", e)
            })),
        ));
    }

    // 1 Create the spell tx
    let tx = tx::from_spell(&spell);

    // 2 We dont need the app_bins to tokens or nfts
    let app_bins: Vec<PathBuf> = vec![];

    // 3 Get the previous transactions
    let prev_txs = txs_by_txid(wallet::get_prev_txs(&tx)?)?;

    // RJJ we need to call the prove_spell_tx function here that will return the 2 txs to sign

    /*
    spell: Spell,
    tx: bitcoin::Transaction,
    app_bins: Vec<PathBuf>,
    prev_txs: BTreeMap<Txid, bitcoin::Transaction>,
    funding_utxo: OutPoint,
    funding_utxo_value: u64,
    change_address: String,
    fee_rate: f64,
    */

    // Get funding utxo and value
    debug!("Getting funding UTXO from: {}", req.funding_utxo_id);
    let funding_utxo = match parse_outpoint(&req.funding_utxo_id) {
        Ok(utxo) => utxo,
        Err(e) => {
            error!("Failed to parse funding UTXO: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "status": "error",
                    "message": format!("Invalid funding UTXO format: {}", e)
                })),
            ));
        }
    };

    let funding_utxo_value = match get_funding_utxo_value(funding_utxo) {
        Ok(value) => {
            let amount = Amount::from_sat(value);
            debug!("Funding UTXO value: {} sats", value);
            amount
        }
        Err(e) => {
            error!("Failed to get funding UTXO value: {}", e);
            return Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "status": "error",
                    "message": format!("Failed to get funding UTXO value: {}", e)
                })),
            ));
        }
    };

    // Get change address
    debug!("Getting change address");
    let change_address = match get_change_address() {
        Ok(addr) => addr,
        Err(e) => {
            error!("Failed to get change address: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": "Failed to generate change address"
                })),
            ));
        }
    };

    let change_script_pubkey = match bitcoin::Address::from_str(&change_address) {
        Ok(addr) => {
            debug!("Change address: {}", change_address);
            addr.assume_checked().script_pubkey()
        }
        Err(e) => {
            error!("Invalid change address format: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": "Invalid change address format"
                })),
            ));
        }
    };

    // Get previous transactions
    debug!("Getting previous transactions");
    let prev_txs = match get_prev_txs(&tx) {
        Ok(txs) => txs,
        Err(e) => {
            error!("Failed to get previous transactions: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": format!("Failed to get previous transactions: {}", e)
                })),
            ));
        }
    };

    let prev_txs_map = match tx::txs_by_txid(prev_txs) {
        Ok(map) => {
            debug!("Previous transactions processed successfully");
            map
        }
        Err(e) => {
            error!("Failed to process previous transactions: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": format!("Failed to process previous transactions: {}", e)
                })),
            ));
        }
    };

    // Parse fee rate (using minimum fee rate)
    let fee_rate = FeeRate::from_sat_per_kwu(500);
    debug!("Using fee rate: {} sat/kwu", 500);

    // Get spell data
    debug!("Normalizing spell and preparing spell data");
    let (norm_spell, _) = spell.normalized().map_err(|e| {
        error!("Failed to normalize spell: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "status": "error",
                "message": format!("Failed to normalize spell: {}", e)
            })),
        )
    })?;

    let spell_data = charms_data::util::write::<(&NormalizedSpell, &[u8])>(&(&norm_spell, &[]))
        .map_err(|e| {
            error!("Failed to serialize spell data: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": format!("Failed to prepare spell data: {}", e)
                })),
            )
        })?;
    debug!("Spell data prepared successfully");

    // Create both transactions using add_spell
    debug!("Creating commit and spell transactions");
    let secp256k1 = Secp256k1::new();
    let keypair = Keypair::new(&secp256k1, &mut thread_rng());
    let (public_key, _) = XOnlyPublicKey::from_keypair(&keypair);

    // Create the script and control block
    let script = script::data_script(public_key, &spell_data);
    let control_block = script::control_block(public_key, script.clone());

    let [commit_tx, spell_tx] = tx::add_spell(
        tx,
        &spell_data,
        funding_utxo,
        funding_utxo_value,
        change_script_pubkey,
        fee_rate,
        &prev_txs_map,
    );
    debug!("Transactions created successfully");

    // Serialize transactions and additional data
    let commit_tx_hex = encode::serialize_hex(&commit_tx);
    let spell_tx_hex = encode::serialize_hex(&spell_tx);
    let script_hex = script.to_string();
    let control_block_hex = hex::encode(control_block.serialize());

    Ok(Json(json!({
        "status": "success",
        "message": "Transfer request processed successfully",
        "transactions": {
            "commit_tx": commit_tx_hex,
            "spell_tx": spell_tx_hex,
            "taproot_data": {
                "script": script_hex,
                "control_block": control_block_hex
            }
        }
    })))
}
