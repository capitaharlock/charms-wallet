import { ec as EC } from 'elliptic';

async function sha256(data: Uint8Array): Promise<Uint8Array> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

class CharmsTransactionService {
    private readonly ec = new EC('secp256k1');

    async signTransaction(txHex: string, privateKey: string): Promise<{ hex: string; hash: string; signature: string }> {
        try {
            console.log('Starting transaction signing process');
            console.log('Input transaction hex:', txHex);

            // Convert hex to bytes
            const txBytes = hexToBytes(txHex);
            console.log('Transaction bytes length:', txBytes.length);

            // Create double SHA256 hash of the transaction
            const firstHash = await sha256(txBytes);
            const txHash = await sha256(firstHash);
            console.log('Transaction hash (pre-sign):', bytesToHex(txHash));

            // Import private key and create key pair
            const keyPair = this.ec.keyFromPrivate(privateKey);
            console.log('Key pair created from private key');

            // Sign the transaction hash
            const signature = keyPair.sign(txHash);
            console.log('Signature created:', signature.toDER('hex'));

            // Return transaction hash and signature
            return {
                hex: txHex,
                hash: bytesToHex(txHash),
                signature: signature.toDER('hex')
            };
        } catch (error) {
            console.error('Charms transaction signing failed:', error);
            throw new Error('Failed to sign charms transaction');
        }
    }
}

export const charmsTransactionService = new CharmsTransactionService();
