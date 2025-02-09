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
                sequence: input.sequence
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
            // Create key pair from private key
            const keyPair = this.ec.keyFromPrivate(privateKey);

            // Hash the transaction
            const txHash = this.hashTransaction(tx);

            // Sign each input
            const signatures = tx.inputs.map(() => {
                const signature = keyPair.sign(txHash);
                return signature.toDER('hex');
            });

            // Return signed transaction
            const signedTx = {
                ...tx,
                signatures
            };

            return { signedTx: JSON.stringify(signedTx) };
        } catch (error) {
            console.error('Local signing failed:', error);
            throw new Error('Failed to sign transaction locally');
        }
    }

    async broadcastTransaction(signedTx: string): Promise<{ txid: string }> {
        try {
            // Make API call to broadcast through our backend
            const response = await fetch(`${this.API_BASE}/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    signed_tx: signedTx,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Broadcasting failed: ${errorText}`);
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
