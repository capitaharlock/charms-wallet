use crate::{models::BroadcastTxRequest, services::ExternalWalletService};
use axum::{response::IntoResponse, Json};

pub async fn broadcast_transaction(Json(payload): Json<BroadcastTxRequest>) -> impl IntoResponse {
    let service = ExternalWalletService::new();
    match service.broadcast_transaction(&payload).await {
        Ok(result) => Json(result).into_response(),
        Err(e) => e.into_response(),
    }
}
