use crate::error::{WalletError, WalletResult};
use crate::models::*;
use bitcoin::{
    Address, Network, PrivateKey,
    secp256k1::{Secp256k1, SecretKey},
};
use reqwest::Client;
use std::str::FromStr;
use rand::thread_rng;
use serde_json::Value;

// Define custom network for Testnet4
const TESTNET4: Network = Network::Testnet;

pub struct WalletService {
    network: Network,
    client: Client,
    secp: Secp256k1<bitcoin::secp256k1::All>,
}

impl WalletService {
    pub fn new() -> Self {
        Self {
            network: TESTNET4,
            client: Client::new(),
            secp: Secp256k1::new(),
        }
    }

    pub async fn create_wallet(&self, _password: &str) -> WalletResult<KeyPair> {
        let secret_key = SecretKey::new(&mut thread_rng());
        let private_key = PrivateKey::new(secret_key, self.network);
        let public_key = private_key.public_key(&self.secp);

        let address = Address::p2wpkh(&public_key, self.network)
            .map_err(|e| WalletError::BitcoinError(e.to_string()))?;

        Ok(KeyPair {
            private_key: private_key.to_wif(),
            public_key: public_key.to_string(),
            address: address.to_string(),
        })
    }

    pub async fn get_balance(&self, address: &str) -> WalletResult<BalanceResponse> {
        tracing::info!("Getting balance for address: {}", address);
    
        let addr = Address::from_str(address)
            .map_err(|e| WalletError::InvalidAddress(e.to_string()))?;
    
        if addr.network() != &self.network {
            return Err(WalletError::InvalidAddress("Not a testnet4 address".to_string()));
        }
    
        // Use Mempool Testnet4 API
        let utxo_url = format!("https://mempool.space/testnet4/api/address/{}/utxo", address);
        tracing::info!("Fetching UTXOs from: {}", utxo_url);
    
        let response = self.client.get(&utxo_url).send().await
            .map_err(|e| {
                tracing::error!("Failed to fetch UTXOs: {}", e);
                WalletError::NetworkError(e.to_string())
            })?;
    
        let response_text = response.text().await
            .map_err(|e| {
                tracing::error!("Failed to get response text: {}", e);
                WalletError::NetworkError(e.to_string())
            })?;
    
        tracing::info!("Raw UTXO response: {}", response_text);
    
        // Parse the UTXO response
        let utxos: Vec<Value> = serde_json::from_str(&response_text)
            .map_err(|e| {
                tracing::error!("Failed to parse UTXOs: {}", e);
                WalletError::NetworkError(e.to_string())
            })?;
    
        tracing::info!("Found {} UTXOs", utxos.len());
    
        // Calculate confirmed and unconfirmed balance
        let mut confirmed_balance = 0u64;
        let mut unconfirmed_balance = 0u64;
        for utxo in &utxos {
            // Log the full UTXO structure for debugging
            tracing::info!("UTXO: {:?}", utxo);
    
            if let Some(value) = utxo["value"].as_u64() {
                // Check if the UTXO is confirmed
                let is_confirmed = utxo.get("status")
                    .and_then(|status| status["confirmed"].as_bool())
                    .unwrap_or(false);
    
                if is_confirmed {
                    confirmed_balance += value;
                } else {
                    unconfirmed_balance += value;
                }
                tracing::info!("UTXO value: {} sats (confirmed: {})", value, is_confirmed);
            } else {
                tracing::warn!("UTXO without value: {:?}", utxo);
            }
        }
    
        tracing::info!("Total confirmed balance: {} sats", confirmed_balance);
        tracing::info!("Total unconfirmed balance: {} sats", unconfirmed_balance);
    
        Ok(BalanceResponse {
            address: address.to_string(),
            balance: (confirmed_balance as f64) / 100_000_000.0,
            unconfirmed_balance: (unconfirmed_balance as f64) / 100_000_000.0,
        })
    }

    pub async fn estimate_fee(&self) -> WalletResult<FeeEstimateResponse> {
        Ok(FeeEstimateResponse {
            fast: 50,
            medium: 25,
            slow: 10,
        })
    }

    pub async fn create_transaction(
        &self,
        request: TransactionRequest,
    ) -> WalletResult<TransactionResponse> {
        let from = Address::from_str(&request.from_address)
            .map_err(|e| WalletError::InvalidAddress(e.to_string()))?;
        let to = Address::from_str(&request.to_address)
            .map_err(|e| WalletError::InvalidAddress(e.to_string()))?;

        if from.network() != &self.network || to.network() != &self.network {
            return Err(WalletError::InvalidAddress("Not a testnet4 address".to_string()));
        }

        if request.amount <= 0.0 {
            return Err(WalletError::InvalidAmount("Amount must be positive".to_string()));
        }

        Ok(TransactionResponse {
            tx_id: "mock_tx_id".to_string(),
            fee: 1000,
        })
    }
}