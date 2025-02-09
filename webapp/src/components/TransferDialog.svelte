<script lang="ts">
    import { wallet } from "../stores/wallet";
    import { addresses } from "../stores/addresses";
    import { utxos } from "../stores/utxos";
    import { transferService } from "../services/transfer";
    import { utxoService } from "../services/utxo";
    import type { UTXO } from "../services/utxo";
    import type { TxDetails, RawTx } from "../services/transfer";
    import { get } from "svelte/store";
    import ConfirmDialog from "./ConfirmDialog.svelte";

    let showConfirmDialog = false;
    let isSigningMode = false;
    let signedTx: string | null = null;
    let signatures: string[] | null = null;
    interface PendingTx extends TxDetails {
        rawTx?: RawTx;
    }
    let pendingTx: PendingTx | null = null;

    export let isOpen = false;
    export let onClose: () => void;

    $: if (isOpen) {
        const addressList = get(addresses);
        if (addressList.length > 0) {
            const addressStrings = addressList.map((addr) => addr.address);
            utxos.fetchUTXOs(addressStrings);
        }
    }

    let amount = "";
    let address = "";
    let error = "";
    let isLoading = false;

    async function handleSubmit() {
        if (!$wallet) {
            error = "No wallet available";
            return;
        }

        error = "";
        isLoading = true;

        try {
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error("Invalid amount");
            }

            if (!address.trim()) {
                throw new Error("Please enter a recipient address");
            }

            const result = await transferService.transfer({
                amount: amountNum,
                recipientAddress: address.trim(),
                privateKey: $wallet.private_key,
                sourceAddress: $wallet.address,
            });

            if (result.needsConfirmation && result.details) {
                pendingTx = {
                    ...result.details,
                    rawTx: result.rawTx,
                };
                isSigningMode = true;
            }
        } catch (err) {
            error = err instanceof Error ? err.message : "Transfer failed";
        } finally {
            isLoading = false;
        }
    }
    async function signTransaction() {
        if (!pendingTx?.rawTx || !$wallet) return;

        try {
            error = "";
            isLoading = true;
            const result = await transferService.signTransaction(
                pendingTx.rawTx,
                $wallet.private_key,
            );
            const parsedSignedTx = JSON.parse(result.signedTx);
            signatures = parsedSignedTx.signatures;
            signedTx = result.signedTx;
        } catch (err) {
            error = err instanceof Error ? err.message : "Signing failed";
        } finally {
            isLoading = false;
        }
    }

    async function broadcastTransaction() {
        if (!signedTx) return;

        try {
            error = "";
            isLoading = true;
            await transferService.broadcastTransaction(signedTx);
            showConfirmDialog = false;
            onClose();
        } catch (err) {
            error = err instanceof Error ? err.message : "Broadcasting failed";
            showConfirmDialog = false;
        } finally {
            isLoading = false;
        }
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
    <div class="fixed inset-0 z-10 overflow-y-auto">
        <div
            class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
        >
            <div
                class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6"
            >
                <div class="absolute right-0 top-0 pr-4 pt-4">
                    <button
                        type="button"
                        class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                        on:click={onClose}
                    >
                        <span class="sr-only">Close</span>
                        <svg
                            class="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div class="sm:flex sm:items-start">
                    <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <h3
                            class="text-lg font-semibold leading-6 text-gray-900"
                        >
                            Transfer Bitcoin
                        </h3>
                        <div class="mt-4 space-y-4">
                            <div>
                                <label
                                    for="amount"
                                    class="block text-sm font-medium text-gray-700"
                                >
                                    Amount (BTC)
                                </label>
                                <div class="mt-1">
                                    <input
                                        type="number"
                                        name="amount"
                                        id="amount"
                                        bind:value={amount}
                                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        placeholder="0.0"
                                        step="0.00000001"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    for="address"
                                    class="block text-sm font-medium text-gray-700"
                                >
                                    Recipient Address
                                </label>
                                <div class="mt-1">
                                    <input
                                        type="text"
                                        name="address"
                                        id="address"
                                        bind:value={address}
                                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        placeholder="Enter Bitcoin address"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {#if error}
                    <div class="mt-4 p-4 bg-red-50 rounded-md">
                        <p class="text-sm text-red-700">{error}</p>
                    </div>
                {/if}

                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Broadcast Transaction"
                    message="Are you sure you want to broadcast this signed transaction?"
                    onConfirm={broadcastTransaction}
                    onCancel={() => (showConfirmDialog = false)}
                />

                <!-- Transaction Details -->
                {#if pendingTx}
                    <div class="mt-6 border-t border-gray-200 pt-4">
                        <h4 class="text-sm font-medium text-gray-900">
                            Transaction Details
                        </h4>
                        <div class="mt-2 space-y-2">
                            <div class="bg-gray-50 p-3 rounded-md">
                                <div class="space-y-1">
                                    <p class="text-sm text-gray-600">
                                        <span class="font-medium">Inputs:</span>
                                        {#each pendingTx.inputs as input}
                                            <div class="ml-4 text-xs">
                                                • {input.txid} ({utxoService.formatSats(
                                                    input.value,
                                                )} BTC)
                                            </div>
                                        {/each}
                                    </p>
                                    <p class="text-sm text-gray-600">
                                        <span class="font-medium">Outputs:</span
                                        >
                                        {#each pendingTx.outputs as output}
                                            <div class="ml-4 text-xs">
                                                • {utxoService.formatSats(
                                                    output.value,
                                                )} BTC to {output.address}
                                            </div>
                                        {/each}
                                    </p>
                                    <p class="text-sm text-gray-600">
                                        <span class="font-medium">Fee:</span>
                                        {utxoService.formatSats(pendingTx.fee)} BTC
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}

                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    {#if signedTx}
                        <button
                            type="button"
                            class="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            on:click={() => (showConfirmDialog = true)}
                            disabled={isLoading}
                        >
                            Broadcast Transaction
                        </button>
                    {:else}
                        <button
                            type="button"
                            class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            on:click={isSigningMode
                                ? signTransaction
                                : handleSubmit}
                            disabled={isLoading}
                        >
                            {#if isLoading}
                                <svg
                                    class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        class="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        stroke-width="4"
                                    />
                                    <path
                                        class="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Processing...
                            {:else}
                                {isSigningMode ? "Sign" : "Create Transaction"}
                            {/if}
                        </button>
                    {/if}
                    <button
                        type="button"
                        class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                        on:click={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                </div>

                <!-- Signatures -->
                {#if signatures}
                    <div class="mt-6 border-t border-gray-200 pt-4">
                        <h4 class="text-sm font-medium text-gray-900">
                            Signatures
                        </h4>
                        <div
                            class="mt-2 bg-gray-50 p-3 rounded-md overflow-x-auto"
                        >
                            <div class="space-y-2">
                                {#each signatures as signature, i}
                                    <div class="text-xs text-gray-600">
                                        <span class="font-medium"
                                            >Input {i + 1}:</span
                                        >
                                        <div class="ml-4 break-all">
                                            {signature}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Raw Transaction -->
                {#if pendingTx}
                    <div class="mt-6 border-t border-gray-200 pt-4">
                        <h4 class="text-sm font-medium text-gray-900">
                            Raw Transaction
                        </h4>
                        <div
                            class="mt-2 bg-gray-50 p-3 rounded-md overflow-x-auto"
                        >
                            <pre class="text-xs text-gray-600">{JSON.stringify(
                                    pendingTx.rawTx,
                                    null,
                                    2,
                                )}</pre>
                        </div>
                    </div>
                {/if}

                <!-- UTXO List -->
                <div class="mt-6 border-t border-gray-200 pt-4">
                    <h4 class="text-sm font-medium text-gray-900">
                        Available UTXOs
                    </h4>
                    <div class="mt-2 max-h-48 overflow-y-auto">
                        {#if $utxos && Object.keys($utxos).length > 0}
                            <div class="space-y-2">
                                {#each Object.entries($utxos) as [address, addressUtxos]}
                                    {#each addressUtxos as utxo}
                                        <div
                                            class="bg-gray-50 p-2 rounded-md flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-gray-600 truncate flex-1"
                                                >{utxo.txid}</span
                                            >
                                            <span
                                                class="text-sm font-medium text-gray-900 ml-4"
                                                >{utxoService.formatSats(
                                                    utxo.value,
                                                )} BTC</span
                                            >
                                        </div>
                                    {/each}
                                {/each}
                            </div>
                        {:else}
                            <p class="text-sm text-gray-500">
                                No UTXOs available
                            </p>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}
