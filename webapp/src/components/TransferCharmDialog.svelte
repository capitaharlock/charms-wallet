<script lang="ts">
    import type { ProcessedCharm } from "../types";
    import { charmsService } from "../services/charms/index";
    import { transferCharmsService } from "../services/charms";
    import Modal from "./Modal.svelte";
    import { wallet } from "../stores/wallet";
    import { utxos } from "../stores/utxos";
    import { charmsTransactionService } from "../services/charms/transaction";
    import { charms } from "../stores/charms";
    import {
        broadcastTransactionService,
        signTransactionService,
    } from "../services/transaction";
    import type { SignedTransaction } from "../types";

    // Import new components
    import CharmInfo from "./transfer-charm/CharmInfo.svelte";
    import TransferForm from "./transfer-charm/TransferForm.svelte";
    import SpellViewer from "./transfer-charm/SpellViewer.svelte";
    import TransactionViewer from "./transfer-charm/TransactionViewer.svelte";
    import SignedTransactionViewer from "./transfer-charm/SignedTransactionViewer.svelte";

    export let charm: ProcessedCharm;
    export let show: boolean = false;
    export let onClose: () => void;

    let transferAmount: number = 55342;
    let destinationAddress: string =
        "tb1qfmdy2ek8j3uga4q76td3ka2dhmwrag3jwhppd9";
    let logMessages: string[] = [];
    let currentAddress: string = "";
    let transactionHex: string | null = null;
    let signedCommitTx: SignedTransaction | null = null;
    let signedSpellTx: SignedTransaction | null = null;
    $: signedCommitTx; // Add this line
    $: signedSpellTx; // Add this line
    let result: {
        transactions: { commit_tx: string; spell_tx: string };
    } | null = null;

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
            const response = await transferCharmsService.transferCharms(
                destinationAddress,
                transferAmount,
                finalSpell,
                fundingUtxoId,
            );
            result = response;
            transactionHex = response.transactions.spell_tx;
            logMessages = [
                ...logMessages,
                `Transfer successful! Transaction ready to sign.`,
                `Commit Transaction: ${response.transactions.commit_tx}`,
                `Spell Transaction: ${response.transactions.spell_tx}`,
            ];
        } catch (error: any) {
            logMessages = [
                ...logMessages,
                `Transfer failed: ${error.message || error}`,
            ];
        }
    }

    async function signAndBroadcastTxs() {
        console.log("signAndBroadcastTxs called");
        if (
            !result?.transactions?.commit_tx ||
            !result?.transactions?.spell_tx
        ) {
            logMessages = [...logMessages, "No transactions to sign"];
            return;
        }

        try {
            logMessages = [
                ...logMessages,
                "Starting transaction signing and broadcasting process...",
            ];

            // Get current wallet
            const currentWallet = $wallet;
            if (!currentWallet?.private_key) {
                throw new Error("No wallet available");
            }

            // Sign both transactions
            const {
                signedCommitTx: signedCommitResult,
                signedSpellTx: signedSpellResult,
            } = await signTransactionService.signBothTransactions(
                result.transactions,
                currentWallet.private_key,
                (message) => {
                    logMessages = [...logMessages, message];
                },
            );

            signedCommitTx = signedCommitResult;
            signedSpellTx = signedSpellResult;
            transactionHex = null;

            // Broadcast the signed transactions
            const { commitData, spellData } =
                await broadcastTransactionService.broadcastBothTransactions(
                    signedCommitTx,
                    signedSpellTx,
                    (message) => {
                        logMessages = [...logMessages, message];
                    },
                );

            // Update the charm object with the transaction IDs
            charm = {
                ...charm,
                commitTxId: commitData.txid,
                spellTxId: spellData.txid,
            };

            // Update the charms store with the updated charm object
            charms.updateCharm(charm);

            // Store transactions in localStorage
            localStorage.setItem(
                "commitTransaction",
                JSON.stringify(signedCommitTx),
            );
            localStorage.setItem(
                "spellTransaction",
                JSON.stringify(signedSpellTx),
            );

            // Clear the signed transactions
            signedCommitTx = null;
            signedSpellTx = null;

            console.log("Transfer process completed successfully");
        } catch (error: any) {
            console.error("Error in signAndBroadcastTxs:", error);
            logMessages = [
                ...logMessages,
                `Transaction failed: ${error.message || error}`,
            ];
        }
    }

    function handleClose() {
        logMessages = [];
        transferAmount = 0;
        transactionHex = null;
        result = null;
        signedCommitTx = null;
        signedSpellTx = null;
        onClose();
    }
</script>

<Modal {show} onClose={handleClose}>
    <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
        <h3 class="text-lg font-semibold leading-6 text-gray-900 mb-4">
            Charms Transfer
        </h3>

        <CharmInfo {charm} {transferAmount} />

        <TransferForm {charm} bind:transferAmount bind:destinationAddress />

        <div class="border-t border-gray-200 my-4"></div>

        <SpellViewer {spellTemplate} {logMessages} />

        {#if transactionHex && !signedCommitTx && !signedSpellTx}
            <TransactionViewer
                title="Commit Transaction"
                transactionHex={result?.transactions?.commit_tx || ""}
            />
            <TransactionViewer title="Spell Transaction" {transactionHex} />
        {/if}

        {#if signedCommitTx || signedSpellTx}
            <SignedTransactionViewer
                title="Signed Commit Transaction"
                transaction={signedCommitTx}
            />
            <SignedTransactionViewer
                title="Signed Spell Transaction"
                transaction={signedSpellTx}
            />
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
        {#if transactionHex}
            <button
                type="button"
                on:click={signAndBroadcastTxs}
                class="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
                Sign & Broadcast Transactions
            </button>
        {:else}
            <button
                type="button"
                on:click={handleTransfer}
                class="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Start Transfer
            </button>
        {/if}
    </div>
</Modal>
