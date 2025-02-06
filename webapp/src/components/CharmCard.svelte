<script lang="ts">
  import type { ProcessedCharm } from "../services/charms";
  import placeholderImage from "../assets/placeholder.jpg";

  export let charm: ProcessedCharm;
  let showDetails = false;

  function formatAppName(app: string): string {
    const [type, path] = app.split("/");
    return type === "n" ? "NFT" : "Token";
  }

  function getTypeColor(app: string): string {
    const type = app.split("/")[0];
    return type === "n"
      ? "bg-purple-100 text-purple-800"
      : "bg-green-100 text-green-700";
  }
</script>

<div
  class="bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-200 hover:shadow-lg w-[70%] mx-auto"
>
  <div class="relative w-full pb-[70%] bg-white border-b border-gray-200">
    <div class="absolute inset-0 p-6">
      <img
        src={placeholderImage}
        alt="Charm"
        class="w-full h-full object-contain rounded-lg"
      />
    </div>
    <div class="absolute top-2 right-2 flex space-x-2">
      <span
        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getTypeColor(
          charm.app,
        )}"
      >
        {formatAppName(charm.app)}
      </span>
      <span
        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
      >
        Active
      </span>
    </div>
  </div>
  <div class="p-4">
    <div class="flex justify-between items-start">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">
          Charm #{charm.id}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          Output: {charm.outputIndex}
        </p>
      </div>
      <span class="text-lg font-medium text-blue-600 tabular-nums">
        {charm.amount.toLocaleString()}
      </span>
    </div>

    <div class="mt-4 flex flex-col space-y-2">
      <button
        class="text-sm text-blue-600 hover:text-blue-800 font-medium text-left transition-colors"
        type="button"
        on:click={() => (showDetails = !showDetails)}
      >
        {showDetails ? "Hide Details ↑" : "Show Details ↓"}
      </button>

      {#if showDetails}
        <div class="mt-2 bg-gray-50 p-3 rounded text-xs font-mono break-all">
          <div class="mb-3">
            <p class="text-gray-600 mb-1">App:</p>
            <p class="text-gray-800">{charm.app}</p>
          </div>
          <div>
            <p class="text-gray-600 mb-1">UTXO:</p>
            <p class="text-gray-800">{charm.txid}</p>
          </div>
        </div>
      {/if}

      <button
        type="button"
        disabled
        class="w-full mt-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed transition-colors"
      >
        Transfer
      </button>
    </div>
  </div>
</div>
