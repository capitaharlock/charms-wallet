<script lang="ts">
    export let amount = "";
    export let address = "";
    export let error = "";
    export let isLoading = false;
    export let isSigningMode = false;
    export let signedTx: string | null = null;
    export let onSubmit: () => void;
    export let onSign: () => void;
    export let onBroadcast: () => void;
    export let onCancel: () => void;

    function handleSubmit() {
        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            error = "Invalid amount";
            return;
        }

        if (!address.trim()) {
            error = "Please enter a recipient address";
            return;
        }

        error = "";
        onSubmit();
    }
</script>

<div class="space-y-4">
    <div>
        <label for="amount" class="block text-sm font-medium text-gray-700">
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
        <label for="address" class="block text-sm font-medium text-gray-700">
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

    {#if error}
        <div class="p-4 bg-red-50 rounded-md">
            <p class="text-sm text-red-700">{error}</p>
        </div>
    {/if}

    <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        {#if signedTx}
            <button
                type="button"
                class="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                on:click={onBroadcast}
                disabled={isLoading}
            >
                Broadcast Transaction
            </button>
        {:else}
            <button
                type="button"
                class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                on:click={isSigningMode ? onSign : handleSubmit}
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
            on:click={onCancel}
            disabled={isLoading}
        >
            Cancel
        </button>
    </div>
</div>
