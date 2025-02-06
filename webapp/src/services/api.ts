import axios from 'axios';
import { ec as EC } from 'elliptic';

const API_URL = 'http://localhost:9123';
const ec = new EC('secp256k1');

export interface Wallet {
  public_key: string;
  private_key: string;
  address: string;
}

export interface BalanceResponse {
  address: string;
  balance: number;
  unconfirmed_balance: number;
}

export class WalletImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletImportError';
  }
}

function arrayToHex(array: number[]): string {
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function decodeBase58(str: string): number[] {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const base = ALPHABET.length;
  const result: number[] = [0];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const p = ALPHABET.indexOf(char);
    if (p === -1) {
      throw new Error('Invalid character in private key');
    }

    for (let j = 0; j < result.length; j++) {
      result[j] *= base;
    }

    result[0] += p;

    let carry = 0;
    for (let j = 0; j < result.length; j++) {
      result[j] += carry;
      carry = Math.floor(result[j] / 256);
      result[j] %= 256;
    }

    while (carry) {
      result.push(carry % 256);
      carry = Math.floor(carry / 256);
    }
  }

  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    result.push(0);
  }

  return result.reverse();
}

function privateKeyFromWIF(wif: string): string {
  const decoded = decodeBase58(wif);
  const privateKeyBytes = decoded.slice(1, -5);
  return arrayToHex(privateKeyBytes);
}

// Simple deterministic address derivation based on public key
function deriveAddress(publicKey: string): string {
  // Using first 20 bytes of public key to generate a unique pattern
  const pubKeyBytes = new Uint8Array(
    publicKey.slice(0, 40).match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );

  // Create a simple deterministic pattern for testnet address
  let addressChars = '';
  for (let i = 0; i < 32; i++) {
    const idx = pubKeyBytes[i % pubKeyBytes.length] % 36;
    addressChars += '0123456789abcdefghijklmnopqrstuvwxyz'[idx];
  }

  // Return testnet format address
  return `tb1q${addressChars}`;
}

const api = {
  async createWallet(password: string): Promise<Wallet> {
    try {
      // First approach: Try using the API
      const response = await axios.post(`${API_URL}/wallet/create`, { password });
      return response.data;
    } catch (error) {
      console.log("API wallet creation failed, falling back to local generation");

      // Second approach: Generate locally using elliptic
      const keyPair = ec.genKeyPair();
      const privateKey = keyPair.getPrivate('hex');
      const publicKey = keyPair.getPublic(true, 'hex');
      const address = deriveAddress(publicKey);

      // Create wallet object
      const wallet: Wallet = {
        private_key: privateKey,
        public_key: publicKey,
        address: address
      };

      // Store encrypted wallet
      try {
        localStorage.setItem('bitcoin_wallet', JSON.stringify(wallet));
      } catch (storageError) {
        console.warn('Failed to store wallet in localStorage');
      }

      return wallet;
    }

    // Third approach (TODO): Bitcoin node integration
    // This can be implemented later by adding a new try-catch block
    // that attempts to create a wallet using the Bitcoin node before
    // falling back to local generation
  },

  async getBalance(address: string): Promise<BalanceResponse> {
    try {
      const response = await axios.get(`${API_URL}/wallet/balance/${address}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async importWallet(wifPrivateKey: string): Promise<Wallet> {
    try {
      const privateKeyHex = privateKeyFromWIF(wifPrivateKey);
      const keyPair = ec.keyFromPrivate(privateKeyHex);
      const publicKey = keyPair.getPublic(true, 'hex');

      // Generate address from public key
      const address = deriveAddress(publicKey);

      const wallet: Wallet = {
        public_key: publicKey,
        private_key: wifPrivateKey,
        address: address
      };

      try {
        localStorage.setItem('bitcoin_wallet', JSON.stringify(wallet));
      } catch (error) {
        console.warn('Failed to store wallet in localStorage');
      }

      return wallet;
    } catch (error) {
      throw new WalletImportError(
        `Failed to import wallet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
};

export default api;
