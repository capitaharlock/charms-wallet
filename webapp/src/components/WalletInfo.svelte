<script lang="ts">
  import { wallet } from '../stores/wallet';
  import api from '../services/api';
  import { onMount } from 'svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let balance = null;
  let loading = false;
  let debugUtxos = [];
  let debugError = '';
  let showPrivateKey = false;
  let showClearConfirm = false;

  async function fetchBalance() {
    if ($wallet?.address) {
      try {
        loading = true;
        balance = await api.getBalance($wallet.address);
        const response = await fetch(`https://mempool.space/testnet4/api/address/${$wallet.address}/utxo`);
        debugUtxos = await response.json();
      } catch (e) {
        console.error('Failed to fetch data:', e);
        debugError = e.message;
      } finally {
        loading = false;
      }
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  function handleClearWallet() {
    showClearConfirm = true;
  }

  function confirmClear() {
    wallet.clear();
    showClearConfirm = false;
  }

  function downloadWallet() {
    // Create an object with wallet details
    const walletDetails = {
      address: $wallet.address,
      publicKey: $wallet.public_key,
      privateKey: $wallet.private_key,
    };

    // Convert the object to a JSON string
    const jsonString = JSON.stringify(walletDetails, null, 2);

    // Create a Blob with the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create an anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wallet_details.json'; // File name

    // Programmatically click the anchor to trigger the download
    a.click();

    // Clean up by revoking the object URL
    URL.revokeObjectURL(url);
  }

  $: if ($wallet?.address) {
    fetchBalance();
  }

  function formatSats(sats: number): string {
    return (sats / 100_000_000).toFixed(8);
  }
</script>

<div class="space-y-6">
  <!-- Balance Card -->
  <div class="bg-white rounded-xl shadow-sm overflow-hidden">
    <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8 sm:p-10">
      <div class="space-y-2">
        <h3 class="text-xl font-medium text-white">Current Balance</h3>
        {#if balance}
          <p class="text-4xl font-bold text-white">{balance.balance} tBTC</p>
          {#if balance.unconfirmed_balance > 0}
            <p class="text-sm text-blue-100">Pending: {balance.unconfirmed_balance} tBTC</p>
          {/if}
        {:else if loading}
          <div class="animate-pulse h-10 w-32 bg-blue-400 rounded"></div>
        {:else}
          <p class="text-4xl font-bold text-white">0.00000000 tBTC</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Wallet Details -->
  <div class="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
    <div class="p-6">
      <h3 class="text-lg font-medium text-gray-900">Wallet Details</h3>
      <div class="mt-4 space-y-4">
        <!-- Address Section -->
        <div>
          <label for="wallet-address" class="block text-sm font-medium text-gray-700">Testnet Address (Native SegWit - bech32)</label>
          <div class="mt-1 flex rounded-md shadow-sm">
            <div class="relative flex-grow">
              <input 
                id="wallet-address"
                type="text" 
                readonly 
                value={$wallet.address}
                class="block w-full pr-10 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button 
              type="button"
              class="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              on:click={() => copyToClipboard($wallet.address)}
            >
              Copy
            </button>
          </div>
        </div>

        <!-- Public Key Section -->
        <div>
          <label for="wallet-public-key" class="block text-sm font-medium text-gray-700">Public Key</label>
          <div class="mt-1 flex rounded-md shadow-sm">
            <div class="relative flex-grow">
              <input 
                id="wallet-public-key"
                type="text"
                readonly 
                value={$wallet.public_key}
                class="block w-full pr-10 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button 
              type="button"
              class="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              on:click={() => copyToClipboard($wallet.public_key)}
            >
              Copy
            </button>
          </div>
        </div>

        <!-- Private Key Section -->
        <div>
          <label for="wallet-private-key" class="block text-sm font-medium text-gray-700">Private Key</label>
          <div class="mt-1 flex rounded-md shadow-sm">
            <div class="relative flex-grow">
              <input 
                id="wallet-private-key"
                type={showPrivateKey ? "text" : "password"}
                readonly 
                value={$wallet.private_key}
                class="block w-full pr-10 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button 
              type="button"
              class="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              on:click={() => copyToClipboard($wallet.private_key)}
            >
              Copy
            </button>
            <button 
              type="button"
              class="ml-2 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              on:click={() => showPrivateKey = !showPrivateKey}
            >
              {showPrivateKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p class="mt-1 text-sm text-red-600">Never share your private key with anyone!</p>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="px-6 py-4 bg-gray-50">
      <div class="flex justify-between">
        <button
          type="button"
          disabled
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 opacity-50 cursor-not-allowed"
        >
          Send Bitcoin
        </button>
        <div class="flex gap-2">
          <button
            type="button"
            on:click={downloadWallet}
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Download Wallet
          </button>
          <button
            type="button"
            on:click={handleClearWallet}
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Clear Wallet
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Debug Section -->
  <details open class="bg-white rounded-lg shadow-sm">
    <summary class="px-6 py-4 cursor-pointer text-sm font-medium text-gray-900">Transaction History (UTXOs)</summary>
    <div class="px-6 py-4 border-t border-gray-200">
      {#if loading}
        <p class="text-sm text-gray-500">Loading UTXOs...</p>
      {:else if debugError}
        <p class="text-sm text-red-600">{debugError}</p>
      {:else if debugUtxos.length > 0}
        <div class="space-y-4">
          <p class="text-sm font-medium">UTXOs Found: {debugUtxos.length}</p>
          {#each debugUtxos as utxo}
            <div class="bg-gray-50 rounded p-3 text-xs font-mono">
              <p>txid: {utxo.txid}</p>
              <p>vout: {utxo.vout}</p>
              <p>value: {formatSats(utxo.value)} tBTC ({utxo.value} sats)</p>
              {#if utxo.status}
                <p>confirmed: {utxo.status.confirmed ? 'yes' : 'no'}</p>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-sm text-gray-500 bg-gray-50 p-4 rounded">
          No UTXOs available. When you receive bitcoin, they will appear here.
        </div>
      {/if}
    </div>
  </details>
</div>

<ConfirmDialog
  isOpen={showClearConfirm}
  title="Clear Wallet"
  message="Are you sure you want to clear this wallet? This action cannot be undone."
  onConfirm={confirmClear}
  onCancel={() => showClearConfirm = false}
/>