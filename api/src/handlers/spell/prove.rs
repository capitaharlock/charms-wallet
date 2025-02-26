use crate::models::TransferCharmsRequest;
use crate::services;
use axum::{http::StatusCode, Json};
use bitcoin::consensus::encode;
use charms::{
    spell::{prove_spell_tx, Spell},
    tx,
};
use serde_json::json;
use std::path::PathBuf;
use tracing::{error, info};

pub async fn prove_spell(
    Json(req): Json<TransferCharmsRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    info!(
        "Processing transfer request to: {}",
        req.destination_address
    );

    // Validate request fields
    if req.spell_json.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status": "error",
                "message": "spell_json is required"
            })),
        ));
    }

    // Parse and validate spell using the Spell struct
    let spell: Spell = match serde_yaml::from_str(&req.spell_json) {
        Ok(spell) => spell,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "status": "error",
                    "message": format!("Invalid spell YAML: {}", e)
                })),
            ));
        }
    };

    // Create the spell tx
    let tx = tx::from_spell(&spell);

    // Get previous transactions
    let prev_txs = match services::local::get_prev_txs(&tx) {
        Ok(txs) => txs,
        Err(e) => {
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
        Ok(map) => map,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": format!("Failed to process previous transactions: {}", e)
                })),
            ));
        }
    };

    // Get funding utxo and value
    let funding_utxo = match services::local::parse_outpoint(&req.funding_utxo_id) {
        Ok(utxo) => utxo,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "status": "error",
                    "message": format!("Invalid funding UTXO format: {}", e)
                })),
            ));
        }
    };

    let funding_utxo_value = match services::local::get_funding_utxo_value(funding_utxo) {
        Ok(value) => value,
        Err(e) => {
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
    let change_address = match services::local::get_change_address() {
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

    // Create transactions using prove_spell_tx
    let app_bins: Vec<PathBuf> = vec![];
    let fee_rate = 2.0; // fee rate in sat/vB

    let [commit_tx, spell_tx] = match prove_spell_tx(
        spell,
        tx,
        app_bins,
        prev_txs_map,
        funding_utxo,
        funding_utxo_value,
        change_address,
        fee_rate,
    ) {
        Ok(txs) => txs,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": format!("Failed to create transactions: {}", e)
                })),
            ));
        }
    };

    // Serialize transactions
    let commit_tx_hex = encode::serialize_hex(&commit_tx);
    let spell_tx_hex = encode::serialize_hex(&spell_tx);

    // Get taproot data from the first output of spell tx
    let script = spell_tx.output[0].script_pubkey.to_string();

    info!("Transfer request processed successfully");

    Ok(Json(json!({
        "status": "success",
        "transactions": {
            "commit_tx": commit_tx_hex,
            "spell_tx": spell_tx_hex,
            "taproot_script": script
        }
    })))
}
