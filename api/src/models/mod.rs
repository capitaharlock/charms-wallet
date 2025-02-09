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

#[derive(Debug, Serialize, Deserialize)]
pub struct BroadcastTxRequest {
    pub tx: TransactionData,
    pub private_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionData {
    pub version: u32,
    pub inputs: Vec<TxInput>,
    pub outputs: Vec<TxOutput>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TxInput {
    pub txid: String,
    pub vout: u32,
    pub sequence: u32,
    pub value: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TxOutput {
    pub address: String,
    pub value: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BroadcastTxResponse {
    pub txid: String,
}
