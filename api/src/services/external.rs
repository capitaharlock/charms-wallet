use crate::error::{WalletError, WalletResult};
use crate::models::*;
use bitcoin::{Address, Network};
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

        let addr = Address::from_str(address)
            .map_err(|e| WalletError::InvalidAddress(e.to_string()))?;

        addr.require_network(self.network)
            .map_err(|_| WalletError::InvalidAddress("Not a testnet4 address".to_string()))?;

        let utxo_url = format!("https://mempool.space/testnet4/api/address/{}/utxo", address);
        tracing::info!("Fetching UTXOs from: {}", utxo_url);

        let response = self.client.get(&utxo_url).send().await
            .map_err(|e| WalletError::NetworkError(e.to_string()))?;

        let response_text = response.text().await
            .map_err(|e| WalletError::NetworkError(e.to_string()))?;

        let utxos: Vec<Value> = serde_json::from_str(&response_text)
            .map_err(|e| WalletError::NetworkError(e.to_string()))?;

        let (confirmed_balance, unconfirmed_balance) = utxos.iter().fold((0u64, 0u64), |(cb, ub), utxo| {
            if let Some(value) = utxo["value"].as_u64() {
                if utxo["status"].get("confirmed").and_then(|v| v.as_bool()).unwrap_or(false) {
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

}