// api/src/models/mod.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct KeyPair {
    pub public_key: String,
    pub private_key: String,
    pub address: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateWalletRequest {
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct TransactionRequest {
    pub from_address: String,
    pub to_address: String,
    pub amount: f64,
    pub private_key: String,
}

#[derive(Debug, Serialize)]
pub struct TransactionResponse {
    pub tx_id: String,
    pub fee: u64,
}

#[derive(Debug, Serialize)]
pub struct BalanceResponse {
    pub address: String,
    pub balance: f64,
    pub unconfirmed_balance: f64,
}

#[derive(Debug, Serialize)]
pub struct FeeEstimateResponse {
    pub fast: u64,
    pub medium: u64,
    pub slow: u64,
}
