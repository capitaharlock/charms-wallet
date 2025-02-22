<script lang="ts">
    import type { ProcessedCharm } from "../services/charms";
    import { charmsService } from "../services/charms";
    import transferCharms from "../services/transferCharms";
    import Modal from "./Modal.svelte";
    import placeholderImage from "../assets/placeholder.jpg";
    import { wallet } from "../stores/wallet";
    import { utxos } from "../stores/utxos";

    function formatTxHex(hex: string): string {
        const chunkSize = 64; // Number of characters per line
        const chunks = hex.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [];
        return chunks.join("\n");
    }

    export let charm: ProcessedCharm;
    export let show: boolean = false;
    export let onClose: () => void;

    let transferAmount: number = 0;
    let destinationAddress: string = "";
    let logMessages: string[] = [];
    let currentAddress: string = "";
    let transactionHex: string | null = null;

    // Get the current wallet address
    wallet.subscribe((w) => {
        if (w) {
            currentAddress = w.address;
        }
    });

    $: utxoAddress = $utxos[currentAddress]?.[0]?.txid ? currentAddress : "";

    $: if (transferAmount > charm.amount) {
        transferAmount = charm.amount;
    }

    let spellTemplate: string = "";

    // Update spell template whenever inputs change
    $: {
        try {
            // Use the original charm address for return
            spellTemplate = charmsService.composeTransferSpell(
                { ...charm }, // Don't override the original charm address
                transferAmount || 0,
                destinationAddress,
            );
        } catch (error: any) {
            // Ignore errors during template composition
            console.debug("Spell template composition error:", error);
        }
    }

    async function handleTransfer() {
        // Validate transfer requirements
        if (!destinationAddress?.trim()) {
            logMessages = [...logMessages, "Destination address is required"];
            return;
        }
        if (transferAmount <= 0) {
            logMessages = [...logMessages, "Amount must be greater than 0"];
            return;
        }
        if (transferAmount > charm.amount) {
            logMessages = [...logMessages, "Insufficient charm amount"];
            return;
        }

        try {
            // Use the original charm address for transfer
            const finalSpell = charmsService.composeTransferSpell(
                { ...charm }, // Keep original charm address
                transferAmount,
                destinationAddress,
            );

            logMessages = [
                ...logMessages,
                `Initiating transfer of ${transferAmount} charms...`,
            ];

            const fundingUtxoId = `${charm.txid}:${charm.outputIndex}`;
            const result = await transferCharms(
                destinationAddress,
                transferAmount,
                finalSpell,
                fundingUtxoId,
            );
            transactionHex = result.tx.tx_hex;
            logMessages = [
                ...logMessages,
                `Transfer successful! Transaction ready to sign.`,
            ];
        } catch (error: any) {
            logMessages = [
                ...logMessages,
                `Transfer failed: ${error.message || error}`,
            ];
        }
    }

    async function handleSign() {
        // TODO: Implement signing logic
        logMessages = [...logMessages, "Signing transaction..."];
    }

    function handleClose() {
        logMessages = [];
        transferAmount = 0;
        transactionHex = null;
        onClose();
    }
</script>

<Modal {show} onClose={handleClose}>
    <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
        <!-- Row 0: Title -->
        <h3 class="text-lg font-semibold leading-6 text-gray-900 mb-4">
            Charms Transfer
        </h3>

        <!-- Row 1: Charm Info -->
        <div class="mb-6 bg-gray-50 rounded-lg p-4">
            <div class="flex items-start justify-between">
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-gray-900">
                        Charm #{charm.id}
                    </h4>
                    <p class="text-sm text-gray-500">
                        Available Amount: <span
                            class="font-medium text-gray-900"
                            >{(
                                charm.amount - (transferAmount || 0)
                            ).toLocaleString()}</span
                        >
                    </p>
                    <p class="text-xs text-gray-400">
                        Total: {charm.amount.toLocaleString()}
                    </p>
                </div>
                <div class="w-16 h-16 bg-white rounded-lg overflow-hidden">
                    <img
                        src={placeholderImage}
                        alt="Charm"
                        class="w-full h-full object-contain"
                    />
                </div>
            </div>
        </div>

        <!-- Row 2: Amount and Address Inputs -->
        <div class="space-y-4">
            <div>
                <label
                    for="address"
                    class="block text-sm font-medium text-gray-700 mb-1"
                >
                    Destination Address
                </label>
                <input
                    type="text"
                    id="address"
                    bind:value={destinationAddress}
                    placeholder="Enter recipient's address"
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
            </div>

            <div>
                <label
                    for="amount"
                    class="block text-sm font-medium text-gray-700 mb-1"
                >
                    Transfer Amount
                </label>
                <input
                    type="number"
                    id="amount"
                    bind:value={transferAmount}
                    min="0"
                    max={charm.amount}
                    on:input={(e) => {
                        const value = Number(e.currentTarget.value);
                        if (value > charm.amount) {
                            e.currentTarget.value = charm.amount.toString();
                            transferAmount = charm.amount;
                        }
                    }}
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
            </div>
        </div>

        <!-- Row 3: Separator -->
        <div class="border-t border-gray-200 my-4"></div>

        <!-- Row 5: Log Box -->
        <div class="mt-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2">
                Building the spell
            </h4>
            <div
                class="bg-gray-50 rounded-md p-3 h-48 overflow-y-auto font-mono text-xs"
            >
                <p class="text-gray-700 whitespace-pre mb-3">{spellTemplate}</p>
                {#each logMessages as message}
                    <p class="text-gray-700 mb-3 whitespace-pre">
                        {message}
                    </p>
                {/each}
            </div>
        </div>

        <!-- Row 6: TX Data -->
        {#if transactionHex}
            <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-2">TX Data</h4>
                <div
                    class="bg-gray-50 rounded-md p-3 h-24 overflow-y-auto font-mono text-xs"
                >
                    <p class="text-gray-700 whitespace-pre">
                        {formatTxHex(transactionHex)}
                    </p>
                </div>
            </div>
        {/if}
    </div>

    <div
        class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row sm:justify-end sm:px-6"
    >
        <button
            type="button"
            on:click={handleClose}
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto mr-2"
        >
            Close
        </button>
        {#if !transactionHex}
            <button
                type="button"
                on:click={handleTransfer}
                class="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Start Transfer
            </button>
        {:else}
            <button
                type="button"
                on:click={handleSign}
                class="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
                Sign Transaction
            </button>
        {/if}
    </div>
</Modal>
