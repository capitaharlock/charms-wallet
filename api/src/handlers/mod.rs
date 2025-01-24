// api/src/handlers/mod.rs
use axum::{
    extract::Path,
    Json,
    response::IntoResponse,
 };
 use crate::{
    models::*,
    services::WalletService,
 };
 
 pub async fn health_check() -> impl IntoResponse {
    "OK"
 }
 
 pub async fn create_wallet(
    Json(payload): Json<CreateWalletRequest>,
 ) -> impl IntoResponse {
    let service = WalletService::new();
    match service.create_wallet(&payload.password).await {
        Ok(result) => Json(result).into_response(),
        Err(e) => e.into_response(),
    }
 }
 
 pub async fn get_balance(
    Path(address): Path<String>,
 ) -> impl IntoResponse {
    let service = WalletService::new();
    match service.get_balance(&address).await {
        Ok(result) => Json(result).into_response(),
        Err(e) => e.into_response(),
    }
 }
 
 pub async fn estimate_fee() -> impl IntoResponse {
    let service = WalletService::new();
    match service.estimate_fee().await {
        Ok(result) => Json(result).into_response(),
        Err(e) => e.into_response(),
    }
 }
 
 pub async fn create_transaction(
    Json(payload): Json<TransactionRequest>,
 ) -> impl IntoResponse {
    let service = WalletService::new();
    match service.create_transaction(payload).await {
        Ok(result) => Json(result).into_response(),
        Err(e) => e.into_response(),
    }
 }
 
 
 

 
 
 
