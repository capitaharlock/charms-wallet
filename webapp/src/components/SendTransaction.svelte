<script lang="ts">
  import { wallet } from "../stores/wallet";
  import { walletApi } from "../services/wallet";

  let toAddress = "";
  let amount = "";
  let loading = false;
  let error = "";
  let success = "";
  let fees: any = null;

  async function fetchFees() {
    try {
      fees = await api.estimateFee();
    } catch (e) {
      console.error("Failed to fetch fees:", e);
    }
  }

  async function handleSend() {
    if (!$wallet) return;

    try {
      loading = true;
      error = "";
      success = "";

      const tx = {
        from_address: $wallet.public_key,
        to_address: toAddress,
        amount: Number(amount),
        private_key: $wallet.private_key,
      };

      await api.createTransaction(tx);
      success = "Transaction sent successfully!";
      toAddress = "";
      amount = "";
    } catch (e) {
      error = "Failed to send transaction";
      console.error(e);
    } finally {
      loading = false;
    }
  }

  fetchFees();
</script>

{#if $wallet}
  <div class="p-6 bg-white rounded-lg shadow">
    <h2 class="text-2xl font-bold mb-4">Send Bitcoin</h2>

    <form on:submit|preventDefault={handleSend} class="space-y-4">
      <div>
        <label for="toAddress" class="block text-sm font-medium text-gray-700"
          >To Address</label
        >
        <input
          type="text"
          id="toAddress"
          bind:value={toAddress}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label for="amount" class="block text-sm font-medium text-gray-700"
          >Amount (BTC)</label
        >
        <input
          type="number"
          id="amount"
          bind:value={amount}
          step="any"
          min="0"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      {#if fees}
        <div class="text-sm text-gray-600">
          <p>Estimated fees:</p>
          <ul class="list-disc list-inside">
            <li>Fast: {fees.fast} sat/vB</li>
            <li>Medium: {fees.medium} sat/vB</li>
            <li>Slow: {fees.slow} sat/vB</li>
          </ul>
        </div>
      {/if}

      {#if error}
        <p class="text-red-600 text-sm">{error}</p>
      {/if}

      {#if success}
        <p class="text-green-600 text-sm">{success}</p>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send"}
      </button>
    </form>
  </div>
{/if}
