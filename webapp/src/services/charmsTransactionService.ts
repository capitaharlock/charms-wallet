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

interface CommitTxInfo {
    txid: string;
    vout: number;
    scriptPubKey: string;
    amount: number;
}

class CharmsTransactionService {
    private readonly ec = new EC('secp256k1');

    async signTransaction(txHex: string, privateKey: string): Promise<{ hex: string; hash: string; signature: string; txid: string }> {
        const result = await this.signGenericTransaction(txHex, privateKey);

        // Compute the txid by double-hashing the signed transaction hex
        const signedTxBytes = hexToBytes(result.hex);
        const firstHash = await sha256(signedTxBytes);
        const txid = bytesToHex(await sha256(firstHash));

        return {
            ...result,
            txid: txid,
        };
    }

    async signSpellTransaction(
        spellTxHex: string,
        commitTxInfo: CommitTxInfo,
        privateKey: string
    ): Promise<{ hex: string; hash: string; signature: string }> {
        // For spell transactions, we need to include the commit tx info in the signature
        // This matches the behavior in the Rust code where additional UTXO info is provided
        console.log('Signing spell transaction with commit tx info:', commitTxInfo);

        // First hash the transaction with commit tx info
        const txBytes = hexToBytes(spellTxHex);
        const commitInfoBytes = hexToBytes(
            commitTxInfo.txid +
            commitTxInfo.vout.toString(16).padStart(8, '0') +
            commitTxInfo.scriptPubKey +
            Math.floor(commitTxInfo.amount * 100000000).toString(16).padStart(16, '0')
        );

        // Combine tx bytes with commit info bytes
        const combinedBytes = new Uint8Array(txBytes.length + commitInfoBytes.length);
        combinedBytes.set(txBytes);
        combinedBytes.set(commitInfoBytes, txBytes.length);

        const firstHash = await sha256(combinedBytes);
        const txHash = await sha256(firstHash);
        console.log('Transaction hash (pre-sign):', bytesToHex(txHash));

        // Import private key and create key pair
        const keyPair = this.ec.keyFromPrivate(privateKey);
        console.log('Key pair created from private key');

        // Sign the transaction hash
        const signature = keyPair.sign(txHash);
        console.log('Signature created:', signature.toDER('hex'));

        // Prepare the signed transaction by combining the signature with the tx hex
        const signedTxHex = this.prepareSignedTransaction(spellTxHex, signature.toDER('hex'), privateKey);

        // Return the signed transaction
        return {
            hex: signedTxHex,
            hash: bytesToHex(txHash),
            signature: signature.toDER('hex')
        };
    }

    private prepareSignedTransaction(txHex: string, signature: string, privateKey: string): string {
        // Import private key to get public key
        const keyPair = this.ec.keyFromPrivate(privateKey);
        const publicKey = keyPair.getPublic().encode('hex', true); // true for compressed format

        // Create scriptSig from signature and public key
        const signatureWithHashType = `${signature}01`; // 01 is SIGHASH_ALL
        const sigLengthByte = (signatureWithHashType.length / 2).toString(16).padStart(2, '0');
        const pubKeyLengthByte = (publicKey.length / 2).toString(16).padStart(2, '0');
        const scriptSig = `${sigLengthByte}${signatureWithHashType}${pubKeyLengthByte}${publicKey}`;
        const scriptLength = (scriptSig.length / 2).toString(16).padStart(2, '0');

        // Parse transaction parts
        const version = txHex.slice(0, 8);
        const inputCount = txHex.slice(8, 10);
        const inputs = [];
        let pos = 10;

        // Read inputs
        const numInputs = parseInt(inputCount, 16);
        for (let i = 0; i < numInputs; i++) {
            const txid = txHex.slice(pos, pos + 64);
            pos += 64;
            const vout = txHex.slice(pos, pos + 8);
            pos += 8;
            const scriptLen = parseInt(txHex.slice(pos, pos + 2), 16);
            pos += 2;
            const script = txHex.slice(pos, pos + scriptLen * 2);
            pos += scriptLen * 2;
            const sequence = txHex.slice(pos, pos + 8);
            pos += 8;
            inputs.push({ txid, vout, script, sequence });
        }

        // Read outputs and rest of tx
        const restOfTx = txHex.slice(pos);

        // Build signed transaction
        let signedTx = version + inputCount;
        inputs.forEach((input, i) => {
            signedTx += input.txid + input.vout;
            if (i === 0) {
                // Only sign the first input
                signedTx += scriptLength + scriptSig;
            } else {
                signedTx += '00'; // Empty script for other inputs
            }
            signedTx += input.sequence;
        });
        signedTx += restOfTx;

        return signedTx;
    }

    private async signGenericTransaction(txHex: string, privateKey: string): Promise<{ hex: string; hash: string; signature: string }> {
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
