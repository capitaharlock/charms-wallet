use crate::error::{WalletError, WalletResult};
use crate::models::*;
use bitcoin::{Network, PrivateKey};
use bitcoin::secp256k1::{Secp256k1, SecretKey};
use bitcoin::key::CompressedPublicKey;
use bitcoincore_rpc::{Auth, Client as RpcClient, RpcApi};
use rand::thread_rng;

pub struct LocalWalletService {
    network: Network,
    secp: Secp256k1<bitcoin::secp256k1::All>,
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
        
        let rpc_client = RpcClient::new(
            &format!("http://localhost:18332/wallet/{}", wallet_name),
            Auth::UserPass(
                "charms_rpc_user".to_string(),
                "charms_rpc_password".to_string(),
            ),
        ).map_err(|e| WalletError::BitcoinError(e.to_string()))?;
    
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