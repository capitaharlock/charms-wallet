use crate::models::TransferCharmsRequest;
use axum::{http::StatusCode, Json};
use bitcoin::consensus::encode;
use charms::{spell::Spell, tx};
use serde_json::json;
use tracing::{debug, error, info}; // Import necessary tracing macros

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

    // Serialize transaction
    debug!("Serializing transaction to hex");
    let tx_hex = encode::serialize_hex(&tx);
    info!("Successfully created transaction with hex: {}", tx_hex);

    Ok(Json(json!({
        "status": "success",
        "message": "Transfer request processed successfully",
        "tx": {
            "tx_hex": tx_hex
        }
    })))
}
