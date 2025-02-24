export interface SignedTransaction {
    hex: string;
    hash: string;
    signature: string;
    txid: string;
}

export interface BroadcastResponse {
    txid: string;
    command: string;
}
