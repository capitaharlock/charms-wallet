import { payments, networks } from 'bitcoinjs-lib';
import { ec as EC } from 'elliptic';
import * as bitcoin from 'bitcoinjs-lib';

const ec = new EC('secp256k1');

function hash160(buffer: Buffer): Buffer {
    return bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(buffer));
}

export async function verifyAddressDerivation(address: string, publicKey: string, maxIndex: number = 100): Promise<boolean> {
    try {
        console.debug('Verifying address:', address);
        console.debug('With public key:', publicKey);

        // Convert public key from hex to bytes
        const pubKeyBytes = Buffer.from(publicKey, 'hex');
        console.debug('Public key bytes:', pubKeyBytes);

        // For P2WPKH (tb1q) addresses
        if (address.startsWith('tb1q')) {
            try {
                // Get the hash160 of the public key
                const pubKeyHash = hash160(pubKeyBytes);
                console.debug('P2WPKH pubKeyHash:', pubKeyHash);

                // Create a P2WPKH address from our public key hash
                const p2wpkh = payments.p2wpkh({
                    hash: pubKeyHash,
                    network: networks.testnet
                });

                console.debug('Generated P2WPKH address:', p2wpkh.address);
                console.debug('Input address:', address);

                // Compare the addresses
                return p2wpkh.address === address;
            } catch (error) {
                console.debug('Error verifying P2WPKH address:', error);
                return false;
            }
        }

        // For P2TR (tb1p) addresses
        if (address.startsWith('tb1p')) {
            try {
                // Try different indices
                for (let index = 0; index <= maxIndex; index++) {
                    const indexBytes = Buffer.from([
                        (index >> 24) & 0xff,
                        (index >> 16) & 0xff,
                        (index >> 8) & 0xff,
                        index & 0xff,
                    ]);

                    // Combine public key and index
                    const combined = Buffer.concat([pubKeyBytes, indexBytes]);

                    // Get tweaked key for taproot
                    const hash = bitcoin.crypto.taggedHash('TapTweak', combined);
                    const tweakedKey = Buffer.from(
                        ec.keyFromPublic(pubKeyBytes).getPublic()
                            .add(ec.keyFromPrivate(hash).getPublic())
                            .encode('array', true)
                    );

                    // Create P2TR address
                    const p2tr = payments.p2tr({
                        pubkey: tweakedKey,
                        network: networks.testnet
                    });

                    console.debug(`Generated P2TR address at index ${index}:`, p2tr.address);
                    if (p2tr.address === address) {
                        console.debug('Found matching P2TR address at index:', index);
                        return true;
                    }
                }
            } catch (error) {
                console.debug('Error verifying P2TR address:', error);
            }
        }

        console.debug('No match found for address');
        return false;
    } catch (error) {
        console.error('Unexpected error in address verification:', error);
        return false;
    }
}
