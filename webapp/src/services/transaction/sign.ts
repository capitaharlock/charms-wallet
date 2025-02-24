import { decodeTx } from "../../utils/txDecoder";
import { charmsTransactionService } from "../charms/transaction";
import type { SignedTransaction } from "../shared/types";
import { WALLET_API_URL } from '../shared/constants';
import axios from 'axios';

export class SignTransactionService {
    async estimateFee(): Promise<{ fast: number; medium: number; slow: number }> {
        try {
            const response = await axios.get(`${WALLET_API_URL}/wallet/fees`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async createTransaction(tx: {
        from_address: string;
        to_address: string;
        amount: number;
        private_key: string;
    }): Promise<void> {
        try {
            await axios.post(`${WALLET_API_URL}/wallet/transaction`, tx);
        } catch (error) {
            throw error;
        }
    }

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
