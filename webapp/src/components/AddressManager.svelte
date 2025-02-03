<script lang="ts">
    import { wallet } from '../stores/wallet';
    import { addresses } from '../stores/addresses';
    import { onMount } from 'svelte';
  
    let newCustomAddress = '';
    let addressError = '';
  
    // Bech32 constants
    const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  
    // Helper functions
    function polymod(values: number[]): number {
      let chk = 1;
      for (let value of values) {
        const top = chk >> 25;
        chk = (chk & 0x1ffffff) << 5 ^ value;
        for (let i = 0; i < 5; i++) {
          if ((top >> i) & 1) {
            chk ^= GENERATOR[i];
          }
        }
      }
      return chk;
    }
  
    function hrpExpand(hrp: string): number[] {
      const result = [];
      for (let i = 0; i < hrp.length; i++) {
        result.push(hrp.charCodeAt(i) >> 5);
      }
      result.push(0);
      for (let i = 0; i < hrp.length; i++) {
        result.push(hrp.charCodeAt(i) & 31);
      }
      return result;
    }
  
    function createChecksum(hrp: string, data: number[]): number[] {
      const values = [...hrpExpand(hrp), ...data];
      const mod = polymod([...values, 0, 0, 0, 0, 0, 0]) ^ 1;
      const ret = [];
      for (let p = 0; p < 6; p++) {
        ret.push((mod >> 5 * (5 - p)) & 31);
      }
      return ret;
    }
  
    async function sha256(data: Uint8Array): Promise<Uint8Array> {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return new Uint8Array(hashBuffer);
    }
  
    async function ripemd160(data: Uint8Array): Promise<Uint8Array> {
      const hash = await sha256(data);
      return hash.slice(0, 20);
    }
  
    function convertBits(data: Uint8Array, fromBits: number, toBits: number, pad: boolean): number[] {
      let acc = 0;
      let bits = 0;
      const ret = [];
      const maxv = (1 << toBits) - 1;
  
      for (let value of data) {
        acc = (acc << fromBits) | value;
        bits += fromBits;
        while (bits >= toBits) {
          bits -= toBits;
          ret.push((acc >> bits) & maxv);
        }
      }
  
      if (pad && bits > 0) {
        ret.push((acc << (toBits - bits)) & maxv);
      }
  
      return ret;
    }
  
    function encode(hrp: string, data: number[]): string {
      const combined = [...data, ...createChecksum(hrp, data)];
      let ret = `${hrp}1`;
      for (let p of combined) {
        ret += CHARSET.charAt(p);
      }
      return ret;
    }
  
    async function deriveNewAddress(publicKey: string, index: number): Promise<string> {
      try {
        const pubKeyBytes = new Uint8Array(
          publicKey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
        );
  
        const indexBytes = new Uint8Array([
          (index >> 24) & 0xff,
          (index >> 16) & 0xff,
          (index >> 8) & 0xff,
          index & 0xff
        ]);
  
        const combined = new Uint8Array(pubKeyBytes.length + indexBytes.length);
        combined.set(pubKeyBytes);
        combined.set(indexBytes, pubKeyBytes.length);
  
        const sha256Hash = await sha256(combined);
        const hash160 = await ripemd160(sha256Hash);
        const words = convertBits(hash160, 8, 5, true);
        const witnessVersion = 0;
        const programWords = [witnessVersion, ...words];
  
        return encode('tb', programWords);
      } catch (error) {
        console.error('Error generating address:', error);
        throw error;
      }
    }
  
    async function generateNewAddress() {
      if (!$wallet?.public_key) return;
      
      try {
        const nextIndex = $addresses.length;
        const newAddress = await deriveNewAddress($wallet.public_key, nextIndex);
        
        addresses.addAddress({
          address: newAddress,
          index: nextIndex,
          created: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to generate address:', error);
        throw error;
      }
    }
  
    function validateAddress(address: string): boolean {
      return /^tb1q[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38,89}$/.test(address);
    }
  
    function addCustomAddress() {
      if (!validateAddress(newCustomAddress)) {
        addressError = 'Invalid address format';
        return;
      }
  
      addresses.addAddress({
        address: newCustomAddress,
        index: -1,
        created: new Date().toISOString()
      });
  
      newCustomAddress = '';
      addressError = '';
    }
  
    async function copyToClipboard(text: string) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  
    onMount(async () => {
      if (!$wallet) {
        console.error('No wallet found');
        return;
      }
      addresses.loadAddresses();
      if ($addresses.length === 0) {
        await generateNewAddress();
      }
    });
  
    // Watch for wallet changes
    $: if ($wallet && $addresses.length === 0) {
      generateNewAddress();
    }
  </script>
  
  <div class="mt-4 space-y-4">
    <!-- Address List Section -->
    <div>
      <label class="block text-sm font-medium text-gray-700">Testnet Addresses (Native SegWit - bech32)</label>
      <div class="mt-2 space-y-2">
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
                class="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  
    <!-- Actions Section -->
    <div class="flex justify-between items-center pt-4">
      <button
        on:click={generateNewAddress}
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        Generate New Address
      </button>
      <div class="flex gap-2 items-center">
        <input
          type="text"
          bind:value={newCustomAddress}
          placeholder="Custom address..."
          class="block w-64 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        <button
          on:click={addCustomAddress}
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Add
        </button>
      </div>
    </div>
    {#if addressError}
      <p class="mt-1 text-sm text-red-600">{addressError}</p>
    {/if}
  </div>