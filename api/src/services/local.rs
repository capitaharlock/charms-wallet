use crate::error::{WalletError, WalletResult};
use crate::models::*;
use bitcoin::{Network, PrivateKey};
use bitcoin::secp256k1::{Secp256k1, SecretKey};
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

        // Create RPC client with wallet name in path
        let rpc_client = RpcClient::new(
            &format!("http://localhost:18332/wallet/{}", wallet_name),
            Auth::UserPass(
                "charms_rpc_user".to_string(),
                "charms_rpc_password".to_string(),
            ),
        ).map_err(|e| WalletError::BitcoinError(e.to_string()))?;

        // Try to create wallet first
        match rpc_client.create_wallet(&wallet_name, None, None, None, None) {
            Ok(_) => (),
            Err(e) => {
                // If wallet exists, try to load it
                if !e.to_string().contains("Database already exists") {
                    return Err(WalletError::BitcoinError(e.to_string()));
                }
            }
        }

        let secret_key = SecretKey::new(&mut thread_rng());
        let public_key = secret_key.public_key(&self.secp);
        let private_key = PrivateKey::new(secret_key, self.network);

        let address = rpc_client
            .get_new_address(None, None)
            .map_err(|e| WalletError::BitcoinError(e.to_string()))?;

        let validated_address = address
            .require_network(self.network)
            .map_err(|_| WalletError::InvalidAddress("Not a testnet address".to_string()))?;

        Ok(KeyPair {
            private_key: private_key.to_string(),
            public_key: public_key.to_string(),
            address: validated_address.to_string(),
        })
    }
}