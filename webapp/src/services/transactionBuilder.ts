// Constants for Bitcoin transaction structure
const TX_VERSION_SIZE = 8; // 4 bytes in hex
const INPUT_COUNT_SIZE = 2; // 1 byte in hex
const OUTPOINT_SIZE = 72; // 36 bytes in hex (txid + index)
const SEQUENCE_SIZE = 8; // 4 bytes in hex
const SIGHASH_ALL = '01';

/**
 * Creates a P2PKH scriptSig from signature and public key
 */
function createScriptSig(signature: string, publicKey: string): string {
    const signatureWithHashType = `${signature}${SIGHASH_ALL}`;
    const sigLengthByte = (signatureWithHashType.length / 2).toString(16).padStart(2, '0');
    const pubKeyLengthByte = (publicKey.length / 2).toString(16).padStart(2, '0');

    const scriptSig = `${sigLengthByte}${signatureWithHashType}${pubKeyLengthByte}${publicKey}`;
    const scriptLength = (scriptSig.length / 2).toString(16).padStart(2, '0');

    return `${scriptLength}${scriptSig}`;
}

/**
 * Helper function to prepare a transaction for broadcasting by combining
 * the raw transaction with signature data and public key
 * @param rawTxHex - The raw unsigned transaction hex
 * @param signature - The DER-encoded signature in hex format
 * @param publicKey - The public key in hex format
 * @returns The complete signed transaction hex ready for broadcasting
 */
export function prepareTransactionForBroadcast(
    rawTxHex: string,
    signature: string,
    publicKey: string
): string {
    if (!rawTxHex || !signature || !publicKey) {
        throw new Error('Missing required parameters');
    }

    // Extract transaction parts
    const version = rawTxHex.slice(0, TX_VERSION_SIZE);
    const inputCount = rawTxHex.slice(TX_VERSION_SIZE, TX_VERSION_SIZE + INPUT_COUNT_SIZE);
    const outpoint = rawTxHex.slice(TX_VERSION_SIZE + INPUT_COUNT_SIZE, TX_VERSION_SIZE + INPUT_COUNT_SIZE + OUTPOINT_SIZE);

    // Find script position (should be after outpoint)
    const scriptPos = TX_VERSION_SIZE + INPUT_COUNT_SIZE + OUTPOINT_SIZE;
    const sequence = rawTxHex.slice(scriptPos + 2, scriptPos + 2 + SEQUENCE_SIZE);
    const restOfTx = rawTxHex.slice(scriptPos + 2 + SEQUENCE_SIZE);

    // Create and insert scriptSig
    const scriptSig = createScriptSig(signature, publicKey);

    return `${version}${inputCount}${outpoint}${scriptSig}${sequence}${restOfTx}`;
}
