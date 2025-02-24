use crate::models::TransferCharmsRequest;
use axum::{http::StatusCode, Json};
use bitcoin::{consensus::encode, Amount, FeeRate};
use charms::{spell::NormalizedSpell, spell::Spell, tx};
use serde_json::json;
use std::str::FromStr;
use tracing::{debug, error, info};

use crate::services::local::{
    get_change_address, get_funding_utxo_value, get_prev_txs, parse_outpoint,
};

pub async fn transfer_charms(
    Json(req): Json<TransferCharmsRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    info!("=== Starting transfer_charms handler ===");
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

    // Convert spell to transaction
    debug!("Converting spell to transaction");
    debug!(
        "Spell content: {}",
        serde_json::to_string_pretty(&spell).unwrap()
    );
    let tx = match std::panic::catch_unwind(|| tx::from_spell(&spell)) {
        Ok(tx) => {
            debug!("Transaction created successfully");
            tx
        }
        Err(e) => {
            let error_msg = if let Some(s) = e.downcast_ref::<String>() {
                s.clone()
            } else if let Some(s) = e.downcast_ref::<&str>() {
                s.to_string()
            } else {
                "Unknown error during transaction creation".to_string()
            };
            error!("Transaction creation failed: {}", error_msg);
            error!(
                "Spell that caused error: {}",
                serde_json::to_string_pretty(&spell).unwrap()
            );
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": format!("Failed to create transaction: {}", error_msg),
                    "spell": spell
                })),
            ));
        }
    };

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
    let fee_rate = FeeRate::from_sat_per_kwu((1.0 * 250.0) as u64);
    debug!("Using fee rate: {} sat/kwu", (1.0 * 250.0) as u64);

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

    // Serialize both transactions to hex without signing
    let commit_tx_hex = encode::serialize_hex(&commit_tx);
    let spell_tx_hex = encode::serialize_hex(&spell_tx);

    Ok(Json(json!({
        "status": "success",
        "message": "Transfer request processed successfully",
        "transactions": {
            "commit_tx": commit_tx_hex,
            "spell_tx": spell_tx_hex
        }
    })))
}
