// api/src/handlers/local.rs
use axum::{Json, response::IntoResponse};
use crate::{
    models::CreateWalletRequest,
    services::LocalWalletService,
};

pub async fn create_wallet(
    Json(payload): Json<CreateWalletRequest>,
) -> impl IntoResponse {
    match LocalWalletService::new() {
        Ok(service) => {
            match service.create_wallet(&payload.password).await {
                Ok(result) => Json(result).into_response(),
                Err(e) => e.into_response(),
            }
        },
        Err(e) => e.into_response(),
    }
}