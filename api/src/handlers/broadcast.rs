use axum::{http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{env, process::Command};
use tracing::{debug, error};

#[derive(Debug, Deserialize)]
pub struct BroadcastRequest {
    tx_hex: String,
}

#[derive(Debug, Serialize)]
pub struct BroadcastResponse {
    txid: String,
    command: String,
}

pub async fn broadcast_transaction(
    Json(req): Json<BroadcastRequest>,
) -> Result<Json<BroadcastResponse>, (StatusCode, Json<serde_json::Value>)> {
    debug!("Broadcasting transaction with hex: {}", req.tx_hex);

    let rpc_host = env::var("BITCOIN_RPC_HOST").unwrap_or_else(|_| "localhost".to_string());
    let rpc_port = env::var("BITCOIN_RPC_PORT").unwrap_or_else(|_| "48332".to_string());
    let rpc_user = env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "hello".to_string());
    let rpc_password = env::var("BITCOIN_RPC_PASSWORD").unwrap_or_else(|_| "world".to_string());

    let args = vec![
        &format!("-rpcconnect={}", rpc_host),
        &format!("-rpcport={}", rpc_port),
        &format!("-rpcuser={}", rpc_user),
        &format!("-rpcpassword={}", rpc_password),
        "sendrawtransaction",
        &req.tx_hex,
    ];
    debug!("Executing bitcoin-cli with args: {:?}", args);

    let cmd_out = Command::new("bitcoin-cli")
        .args(&args)
        .output()
        .map_err(|e| {
            error!("Failed to execute bitcoin-cli: {}", e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "status": "error",
                    "message": format!("Failed to broadcast transaction: {}", e)
                })),
            )
        })?;

    let stdout = String::from_utf8(cmd_out.stdout).unwrap_or_else(|_| "Invalid UTF-8".to_string());
    let stderr = String::from_utf8_lossy(&cmd_out.stderr);

    debug!("bitcoin-cli stdout: {}", stdout);
    debug!("bitcoin-cli stderr: {}", stderr);

    if !cmd_out.status.success() {
        error!(
            "bitcoin-cli failed. Status: {}, stdout: {}, stderr: {}",
            cmd_out.status, stdout, stderr
        );
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status": "error",
                "message": format!("Failed to broadcast transaction. stdout: {}, stderr: {}", stdout, stderr)
            })),
        ));
    }

    let txid = stdout.trim().to_string();

    let command = format!(
        "bitcoin-cli -rpcconnect={} -rpcport={} -rpcuser={} -rpcpassword={} sendrawtransaction {}",
        rpc_host, rpc_port, rpc_user, rpc_password, req.tx_hex
    );
    debug!("Full command: {}", command);

    Ok(Json(BroadcastResponse { txid, command }))
}
