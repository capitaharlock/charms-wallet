<script lang="ts">
    import { onMount } from 'svelte';
    import { addresses } from '../stores/addresses';
    import { wallet } from '../stores/wallet';
    import { deriveAddress, validateAddress } from '../utils/addressUtils';
    
    let newCustomAddress = '';
    let errorMessage = '';
  
    onMount(() => {
      addresses.loadAddresses();
    });
  
    generateNewAddress() {
  if (!$wallet?.public_key) return;
  
  const nextIndex = $addresses.length;
  const newAddress = deriveNewAddress($wallet.public_key, nextIndex);
  
  addresses.addAddress({
    address: newAddress,
    index: nextIndex,
    created: new Date().toISOString()
  });
}
  
    function addCustomAddress() {
      if (!validateAddress(newCustomAddress)) {
        errorMessage = 'Invalid address format';
        return;
      }
  
      addresses.addAddress({
        address: newCustomAddress,
        index: -1, // Custom addresses get -1 index
        created: new Date()
      });
  
      newCustomAddress = '';
      errorMessage = '';
    }
  
    async function copyToClipboard(text: string) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  </script>
  
  <div class="mt-4">
    <div class="flex justify-between items-center">
      <h4 class="text-sm font-medium text-gray-900">Derived Addresses</h4>
      <button
        on:click={generateNewAddress}
        class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        Generate New Address
      </button>
    </div>
  
    <!-- Custom Address Input -->
    <div class="mt-3">
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={newCustomAddress}
          placeholder="Add custom address..."
          class="flex-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        <button
          on:click={addCustomAddress}
          class="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Add
        </button>
      </div>
      {#if errorMessage}
        <p class="mt-1 text-sm text-red-600">{errorMessage}</p>
      {/if}
    </div>
  
    <!-- Address List -->
    <div class="mt-3 space-y-2">
      {#each $addresses as addr}
        <div class="flex items-center justify-between bg-gray-50 p-2 rounded-md">
          <div class="flex-1 font-mono text-sm truncate">
            {addr.address}
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">
              {addr.index === -1 ? 'Custom' : `Index: ${addr.index}`}
            </span>
            <button
              on:click={() => copyToClipboard(addr.address)}
              class="px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
            >
              Copy
            </button>
          </div>
        </div>
      {/each}
      {#if $addresses.length === 0}
        <div class="text-sm text-gray-500 text-center py-4">
          No addresses yet. Generate one or add a custom address.
        </div>
      {/if}
    </div>
  </div>