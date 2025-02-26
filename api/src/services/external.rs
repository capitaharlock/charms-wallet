// api/src/services/external.rs
use crate::error::{WalletError, WalletResult};
use crate::models::*;
use bitcoin::{consensus::deserialize, hashes::hex::FromHex, Address, Network, Transaction};
use bitcoincore_rpc::{Auth, Client as RpcClient, RpcApi};
use reqwest::Client;
use serde_json::Value;
use std::str::FromStr;

pub struct ExternalWalletService {
    network: Network,
    client: Client,
}

impl ExternalWalletService {
    pub fn new() -> Self {
        Self {
            network: Network::Testnet,
            client: Client::new(),
        }
    }

    pub async fn get_balance(&self, address: &str) -> WalletResult<BalanceResponse> {
        tracing::info!("Getting balance for address: {}", address);

        let addr =
            Address::from_str(address).map_err(|e| WalletError::InvalidAddress(e.to_string()))?;

        addr.require_network(self.network)
            .map_err(|_| WalletError::InvalidAddress("Not a testnet4 address".to_string()))?;

        let utxo_url = format!(
            "https://mempool.space/testnet4/api/address/{}/utxo",
            address
        );
        tracing::info!("Fetching UTXOs from: {}", utxo_url);

        let response = self
            .client
            .get(&utxo_url)
            .send()
            .await
            .map_err(|e| WalletError::NetworkError(e.to_string()))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| WalletError::NetworkError(e.to_string()))?;

        let utxos: Vec<Value> = serde_json::from_str(&response_text)
            .map_err(|e| WalletError::NetworkError(e.to_string()))?;

        let (confirmed_balance, unconfirmed_balance) =
            utxos.iter().fold((0u64, 0u64), |(cb, ub), utxo| {
                if let Some(value) = utxo["value"].as_u64() {
                    if utxo["status"]
                        .get("confirmed")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false)
                    {
                        (cb + value, ub)
                    } else {
                        (cb, ub + value)
                    }
                } else {
                    (cb, ub)
                }
            });

        Ok(BalanceResponse {
            address: address.to_string(),
            balance: (confirmed_balance as f64) / 100_000_000.0,
            unconfirmed_balance: (unconfirmed_balance as f64) / 100_000_000.0,
        })
    }

    /// Broadcasts a transaction to the Bitcoin network.
    /// Takes a raw transaction hex string that has been signed by the frontend.
    pub async fn broadcast_transaction(
        &self,
        request: &BroadcastTxRequest,
    ) -> WalletResult<BroadcastTxResponse> {
        let rpc_client = RpcClient::new(
            "http://localhost:48332",
            Auth::UserPass("hello".into(), "world".into()),
        )
        .map_err(|e| WalletError::BitcoinError(format!("RPC client creation failed: {}", e)))?;

        let tx_bytes = Vec::<u8>::from_hex(&request.tx_hex)
            .map_err(|e| WalletError::BitcoinError(format!("Invalid hex: {}", e)))?;
        let tx: Transaction = deserialize(&tx_bytes)
            .map_err(|e| WalletError::BitcoinError(format!("Deserialization failed: {}", e)))?;

        let txid = rpc_client
            .send_raw_transaction(&tx)
            .map_err(|e| WalletError::BitcoinError(format!("Broadcast failed: {}", e)))?;

        Ok(BroadcastTxResponse {
            txid: txid.to_string(),
        })
    }
}
