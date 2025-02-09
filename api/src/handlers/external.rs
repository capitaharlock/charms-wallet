// api/src/handlers/external.rs
use crate::{models::BroadcastTxRequest, services::ExternalWalletService};
use axum::{extract::Path, response::IntoResponse, Json};

pub async fn get_balance(Path(address): Path<String>) -> impl IntoResponse {
    let service = ExternalWalletService::new();
    match service.get_balance(&address).await {
        Ok(result) => Json(result).into_response(),
        Err(e) => e.into_response(),
    }
}

pub async fn broadcast_transaction(Json(payload): Json<BroadcastTxRequest>) -> impl IntoResponse {
    let service = ExternalWalletService::new();
    match service.broadcast_transaction(&payload).await {
        Ok(result) => Json(result).into_response(),
        Err(e) => e.into_response(),
    }
}
