import { CHARMS_API_URL } from '../shared/constants';
import type { SignedTransaction } from '../../types';
import type { SpellTransactionInput } from '../../types';

class CharmsTransactionService {
    private readonly API_URL = CHARMS_API_URL;

    async signTransaction(tx_hex: string, privateKey: string): Promise<SignedTransaction> {
        const response = await fetch(`${this.API_URL}/wallet/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tx_hex, private_key: privateKey })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to sign transaction: ${errorText}`);
        }

        return response.json();
    }

    async signSpellTransaction(
        tx_hex: string,
        input: SpellTransactionInput,
        privateKey: string
    ): Promise<SignedTransaction> {
        const response = await fetch(`${this.API_URL}/wallet/sign_spell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tx_hex,
                input,
                private_key: privateKey
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to sign spell transaction: ${errorText}`);
        }

        return response.json();
    }
}

export const charmsTransactionService = new CharmsTransactionService();
