<script lang="ts">
  import { onMount } from "svelte";
  import { charms } from "../../stores/charms";
  import { utxos } from "../../stores/utxos";
  import CharmCard from "../CharmCard.svelte";

  let loading = true;
  let error = "";

  async function loadCharms() {
    loading = true;
    error = "";
    try {
      console.log("Loading charms with UTXOs:", $utxos);
      await charms.loadCharmsFromUTXOs($utxos);
      console.log("Loaded charms:", $charms);
    } catch (e) {
      console.error("Failed to load charms:", e);
      error = e instanceof Error ? e.message : "Failed to load charms";
    } finally {
      loading = false;
    }
  }

  // Load charms when UTXOs change
  $: {
    console.log("UTXOs changed:", $utxos);
    if ($utxos && Object.keys($utxos).length > 0) {
      loadCharms();
    }
  }

  onMount(() => {
    console.log("Component mounted, UTXOs:", $utxos);
    if ($utxos && Object.keys($utxos).length > 0) {
      loadCharms();
    }
  });
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h2 class="text-2xl font-bold text-gray-100">Your Charms</h2>
    <div class="flex space-x-3">
      <button
        type="button"
        class="inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Filter
      </button>
      <button
        type="button"
        on:click={loadCharms}
        disabled={loading}
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  </div>

  {#if loading}
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each Array(3) as _}
        <div class="animate-pulse">
          <div class="bg-gray-700 rounded-lg h-64"></div>
        </div>
      {/each}
    </div>
  {:else if error}
    <div class="rounded-md bg-red-900/30 border border-red-700 p-4">
      <div class="flex">
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-200">
            {error}
          </h3>
        </div>
      </div>
    </div>
  {:else if $charms.length === 0}
    <div class="text-center py-12">
      <h3 class="mt-2 text-sm font-medium text-gray-200">No charms found</h3>
      <p class="mt-1 text-sm text-gray-400">
        Get started by acquiring some charms.
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each $charms as charm (charm.uniqueId)}
        <CharmCard {charm} />
      {/each}
    </div>
  {/if}
</div>
