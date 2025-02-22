import type { UTXO } from './utxo';
import { utxoService } from './utxo';
import { addresses } from '../stores/addresses';
import { utxos } from '../stores/utxos';
import { get } from 'svelte/store';

interface TransferParams {
    amount: number;
    recipientAddress: string;
    privateKey: string;
    sourceAddress: string;
}

export interface TxInput {
    txid: string;
    vout: number;
    value: number;
}

export interface TxOutput {
    address: string;
    value: number;
}

export interface TxDetails {
    inputs: TxInput[];
    outputs: TxOutput[];
    fee: number;
    changeAddress: string;
}

export interface RawTx {
    version: number;
    inputs: {
        txid: string;
        vout: number;
        sequence: number;
        value: number;
    }[];
    outputs: {
        address: string;
        value: number;
    }[];
}

export interface UnsignedTx {
    details: TxDetails;
    rawTx: RawTx;
    needsConfirmation: true;
}

import { ec as EC } from 'elliptic';

class TransferService {
    private readonly API_BASE = 'http://localhost:9123/wallet';
    private readonly FEE_RATE = 1; // sats/vbyte
    private readonly ec = new EC('secp256k1');

    private estimateFee(inputCount: number, outputCount: number): number {
        const estimatedSize =
            (inputCount * 180) + // ~180 bytes per input
            (outputCount * 34) + // ~34 bytes per output
            10; // ~10 bytes overhead
        return estimatedSize * this.FEE_RATE;
    }

    private async findSuitableUTXOs(amountInSats: number, feeEstimate: number): Promise<{ utxos: UTXO[], address: string }> {
        // First refresh UTXOs for all addresses
        const addressEntries = get(addresses);
        const addressStrings = addressEntries.map(addr => addr.address);
        await utxos.fetchUTXOs(addressStrings);

        // Get fresh UTXOs
        const storedUtxos = get(utxos);
        console.log('Looking for UTXOs with amount:', amountInSats);
        console.log('Available addresses:', addressEntries);
        console.log('Fresh UTXOs:', storedUtxos);

        let bestAddress = null;
        let bestUtxos = null;
        let bestBalance = 0;

        for (const addressEntry of addressEntries) {
            console.log(`Checking address: ${addressEntry.address}`);
            const addressUtxos = storedUtxos[addressEntry.address] || [];
            console.log(`UTXOs for address:`, addressUtxos);

            const confirmedUtxos = addressUtxos.filter(utxo => utxo.status.confirmed);
            console.log(`Confirmed UTXOs:`, confirmedUtxos);

            const totalBalance = confirmedUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
            console.log(`Total confirmed balance: ${totalBalance}`);

            if (totalBalance >= amountInSats + feeEstimate) { // Amount + fee
                // Keep track of the address with the smallest sufficient balance
                if (bestBalance === 0 || totalBalance < bestBalance) {
                    bestAddress = addressEntry.address;
                    bestUtxos = confirmedUtxos;
                    bestBalance = totalBalance;
                }
            }
        }

        if (bestAddress && bestUtxos) {
            console.log(`Found suitable address: ${bestAddress} with balance: ${bestBalance}`);
            return { utxos: bestUtxos, address: bestAddress };
        }

        const totalRequired = amountInSats + feeEstimate;
        console.log(`No suitable address found. Required: ${totalRequired} sats (${amountInSats} + ${feeEstimate} fee)`);
        throw new Error(`Insufficient balance. Required: ${utxoService.formatSats(totalRequired)} BTC (including fee)`);
    }

    async transfer({ amount, recipientAddress, privateKey, sourceAddress }: TransferParams) {
        try {
            const amountInSats = Math.floor(amount * 100_000_000);

            // Estimate initial fee (assuming 1 input and 2 outputs)
            const initialFee = this.estimateFee(1, 2);

            // Find suitable UTXOs from available addresses
            const { utxos: selectedUtxos, address: selectedAddress } = await this.findSuitableUTXOs(amountInSats, initialFee);

            // Calculate total input amount
            const totalInput = selectedUtxos.reduce((sum, utxo) => sum + utxo.value, 0);

            // Prepare transaction details with actual input count
            const txDetails = {
                inputs: selectedUtxos.map(utxo => ({
                    txid: utxo.txid,
                    vout: utxo.vout,
                    value: utxo.value,
                })),
                outputs: [
                    {
                        address: recipientAddress,
                        value: amountInSats,
                    },
                    // Change output will be calculated after fee estimation
                ],
                fee: 0, // Will be calculated
                changeAddress: selectedAddress,
            };

            // Calculate actual fee based on input/output count
            txDetails.fee = this.estimateFee(txDetails.inputs.length, 2);

            // Calculate change
            const changeAmount = totalInput - amountInSats - txDetails.fee;
            if (changeAmount < 0) {
                throw new Error('Insufficient funds including fee');
            }

            if (changeAmount > 546) { // Dust limit
                txDetails.outputs.push({
                    address: selectedAddress,
                    value: changeAmount,
                });
            } else {
                // Add dust to fee
                txDetails.fee += changeAmount;
            }

            // Create raw transaction format
            const rawTx = {
                version: 2,
                inputs: txDetails.inputs.map(input => ({
                    txid: input.txid,
                    vout: input.vout,
                    sequence: 0xffffffff,
                    value: input.value,
                })),
                outputs: txDetails.outputs.map(output => ({
                    address: output.address,
                    value: output.value,
                })),
            };

            // Return unsigned transaction for confirmation
            return {
                details: txDetails,
                rawTx,
                needsConfirmation: true,
            };
        } catch (error) {
            console.error('Transfer failed:', error);
            throw error;
        }
    }

    private hashTransaction(tx: RawTx): Uint8Array {
        // Create a simple hash of the transaction for now
        // In a real implementation, this would follow Bitcoin's transaction hashing protocol
        const txString = JSON.stringify({
            version: tx.version,
            inputs: tx.inputs.map(input => ({
                txid: input.txid,
                vout: input.vout,
                sequence: input.sequence,
                value: input.value,
            })),
            outputs: tx.outputs.map(output => ({
                address: output.address,
                value: output.value
            }))
        });

        // Convert string to Uint8Array
        const encoder = new TextEncoder();
        return encoder.encode(txString);
    }

    signTransaction(tx: RawTx, privateKey: string): { signedTx: string } {
        try {
            // Create a proper Bitcoin transaction hex string
            // This is a placeholder - in a real implementation, you would:
            // 1. Create proper Bitcoin transaction structure
            // 2. Sign it with the private key
            // 3. Serialize it to hex format
            // For now, we'll use a dummy transaction for testing
            const dummyTx = "0200000001f9f34e95b9d5c8abcd20fc5bd4a825d1517be62f0f775e5f36da944d9452e550000000006b483045022100c86e9a111afc90f64b4904bd609e9eaed80d48ca17c162b1aca0a788ac3526f002207bb79b60d4fc6526329bf18a77135dc566c7896516845f94792137a045d3af9101210307ff6baa4719819ef79f11aa18ea71e9d58be0aa6f2e46a887a476cd64c7e2e8ffffffff0250c30000000000001976a914e039335769578cb6275f59b6f8dab568f9196bb688ac2c8c0100000000001976a914b0f6e64ea993466f84050becc101062bb502b4e488ac00000000";

            const signedTx = {
                ...tx,
                hex: dummyTx,
            };

            return { signedTx: JSON.stringify(signedTx) };
        } catch (error) {
            console.error('Local signing failed:', error);
            throw new Error('Failed to sign transaction locally');
        }
    }

    async broadcastTransaction(signedTx: string): Promise<{ txid: string }> {
        try {
            const parsedTx = JSON.parse(signedTx);
            const response = await fetch(`${this.API_BASE}/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tx_hex: parsedTx.hex
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Broadcasting failed: ${errorData.error || 'Unknown error'}`);
            }

            const result = await response.json();
            return { txid: result.txid };
        } catch (error) {
            console.error('Broadcast failed:', error);
            throw error;
        }
    }
}

export const transferService = new TransferService();
