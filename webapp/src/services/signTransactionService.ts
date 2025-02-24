import { decodeTx } from "../utils/txDecoder";
import { charmsTransactionService } from "./charmsTransactionService";

export interface SignedTransaction {
    hex: string;
    hash: string;
    signature: string;
    txid: string;
}

export class SignTransactionService {
    async signBothTransactions(
        transactions: { commit_tx: string; spell_tx: string },
        privateKey: string,
        onProgress: (message: string) => void
    ): Promise<{
        signedCommitTx: SignedTransaction;
        signedSpellTx: SignedTransaction;
    }> {
        // First sign the commit transaction
        onProgress("Step 1: Signing commit transaction...");
        console.log("Before signing commit transaction");
        const signedCommitTx = await charmsTransactionService.signTransaction(
            transactions.commit_tx,
            privateKey
        );

        // Get the commit tx output info
        onProgress("Decoding commit transaction...");
        const commitTxDecoded = decodeTx(transactions.commit_tx);
        if (!commitTxDecoded || !commitTxDecoded.outputs[0]) {
            throw new Error("Failed to decode commit transaction");
        }

        // Then sign the spell transaction using the commit tx info
        onProgress("Step 2: Signing spell transaction...");
        const signedSpellTx = await charmsTransactionService.signSpellTransaction(
            transactions.spell_tx,
            {
                txid: signedCommitTx.txid,
                vout: 0,
                scriptPubKey: commitTxDecoded.outputs[0].scriptPubKey,
                amount: commitTxDecoded.outputs[0].value / 100000000,
            },
            privateKey
        );

        return { signedCommitTx, signedSpellTx };
    }
}

export const signTransactionService = new SignTransactionService();
