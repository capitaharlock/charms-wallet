use crate::error::{WalletError, WalletResult};
use crate::models::*;
use bitcoin::key::CompressedPublicKey;
use bitcoin::secp256k1::{Secp256k1, SecretKey};
use bitcoin::{consensus::encode::serialize_hex, Network, OutPoint, PrivateKey, Transaction, Txid};
use bitcoincore_rpc::{Auth, Client as RpcClient, RpcApi};
use rand::thread_rng;
use std::{env, str::FromStr};

pub struct LocalWalletService {
    network: Network,
    secp: Secp256k1<bitcoin::secp256k1::All>,
}

fn get_rpc_client() -> WalletResult<RpcClient> {
    let host = env::var("BITCOIN_RPC_HOST").unwrap_or_else(|_| "localhost".to_string());
    let port = env::var("BITCOIN_RPC_PORT").unwrap_or_else(|_| "18332".to_string());
    let user = env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "hello".to_string());
    let password = env::var("BITCOIN_RPC_PASSWORD").unwrap_or_else(|_| "world".to_string());

    RpcClient::new(
        &format!("http://{}:{}", host, port),
        Auth::UserPass(user, password),
    )
    .map_err(|e| WalletError::BitcoinError(e.to_string()))
}

pub fn parse_outpoint(s: &str) -> WalletResult<OutPoint> {
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() != 2 {
        return Err(WalletError::BitcoinError(
            "Invalid UTXO format. Expected txid:vout".to_string(),
        ));
    }

    let txid = Txid::from_str(parts[0])
        .map_err(|e| WalletError::BitcoinError(format!("Invalid txid: {}", e)))?;
    let vout = parts[1]
        .parse::<u32>()
        .map_err(|e| WalletError::BitcoinError(format!("Invalid vout: {}", e)))?;

    Ok(OutPoint::new(txid, vout))
}

pub fn get_funding_utxo_value(utxo: OutPoint) -> WalletResult<u64> {
    let rpc_client = get_rpc_client()?;
    let tx_out = rpc_client
        .get_tx_out(&utxo.txid, utxo.vout, Some(false))
        .map_err(|e| WalletError::BitcoinError(format!("Failed to get tx_out: {}", e)))?
        .ok_or_else(|| WalletError::BitcoinError("UTXO not found".to_string()))?;

    Ok(tx_out.value.to_sat())
}

pub fn get_change_address() -> WalletResult<String> {
    let rpc_client = get_rpc_client()?;
    let address = rpc_client
        .get_new_address(None, None)
        .map_err(|e| WalletError::BitcoinError(format!("Failed to get change address: {}", e)))?;

    Ok(address.assume_checked().to_string())
}

pub fn get_prev_txs(tx: &Transaction) -> WalletResult<Vec<String>> {
    let rpc_client = get_rpc_client()?;
    let mut prev_txs = Vec::new();

    for input in &tx.input {
        let raw_tx = rpc_client
            .get_raw_transaction(&input.previous_output.txid, None)
            .map_err(|e| {
                WalletError::BitcoinError(format!("Failed to get raw transaction: {}", e))
            })?;
        prev_txs.push(serialize_hex(&raw_tx));
    }

    Ok(prev_txs)
}

impl LocalWalletService {
    pub fn new() -> WalletResult<Self> {
        Ok(Self {
            network: Network::Testnet,
            secp: Secp256k1::new(),
        })
    }

    pub async fn create_wallet(&self, password: &str) -> WalletResult<KeyPair> {
        let wallet_name = format!("wallet_{}", password);

        let host = env::var("BITCOIN_RPC_HOST").unwrap_or_else(|_| "localhost".to_string());
        let port = env::var("BITCOIN_RPC_PORT").unwrap_or_else(|_| "18332".to_string());
        let user = env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "hello".to_string());
        let password = env::var("BITCOIN_RPC_PASSWORD").unwrap_or_else(|_| "world".to_string());

        let rpc_client = RpcClient::new(
            &format!("http://{}:{}/wallet/{}", host, port, wallet_name),
            Auth::UserPass(user, password),
        )
        .map_err(|e| WalletError::BitcoinError(e.to_string()))?;

        match rpc_client.create_wallet(&wallet_name, None, None, None, None) {
            Ok(_) => (),
            Err(e) => {
                if !e.to_string().contains("Database already exists") {
                    return Err(WalletError::BitcoinError(e.to_string()));
                }
            }
        }

        let secret_key = SecretKey::new(&mut thread_rng());
        let private_key = PrivateKey::new(secret_key, self.network);
        let compressed_pub_key = CompressedPublicKey::from_private_key(&self.secp, &private_key)
            .map_err(|e| WalletError::BitcoinError(e.to_string()))?;

        let address = bitcoin::Address::p2wpkh(&compressed_pub_key, self.network);

        Ok(KeyPair {
            private_key: private_key.to_string(),
            public_key: compressed_pub_key.to_string(),
            address: address.to_string(),
        })
    }
}
