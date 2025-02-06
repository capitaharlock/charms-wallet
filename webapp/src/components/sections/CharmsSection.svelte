<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { charms } from "../../stores/charms";
  import { utxos } from "../../stores/utxos";
  import CharmCard from "../CharmCard.svelte";
  import { activeSection } from "../../stores/navigation";

  let error = "";
  let retryCount = 0;
  const maxRetries = 3;
  let retryTimeout: ReturnType<typeof setTimeout>;
  let mounted = false;
  let initialLoad = true;

  // Subscribe to the loading state from the store
  let loading: boolean;
  charms.loading.subscribe((value) => {
    loading = value;
  });

  async function loadCharms(isRetry = false) {
    if (!mounted) return;

    if (isRetry && retryCount >= maxRetries) {
      error =
        "Failed to load charms after multiple attempts. Please try again later.";
      return;
    }

    error = "";

    try {
      console.log("Loading charms with UTXOs:", $utxos);
      const loadPromise = charms.loadCharmsFromUTXOs($utxos);

      // Set a timeout to prevent indefinite loading
      const timeoutPromise = new Promise((_, reject) => {
        retryTimeout = setTimeout(() => {
          reject(new Error("Loading charms timed out"));
        }, 15000); // 15 second timeout
      });

      await Promise.race([loadPromise, timeoutPromise]);
      clearTimeout(retryTimeout);
      console.log("Loaded charms:", $charms);
      retryCount = 0;
      initialLoad = false;
    } catch (e) {
      console.error("Failed to load charms:", e);
      error = e instanceof Error ? e.message : "Failed to load charms";
      if (retryCount < maxRetries) {
        scheduleRetry();
      }
    }
  }

  // Load charms when UTXOs change, but only if we have UTXOs and haven't loaded yet
  $: {
    if (mounted && $utxos && Object.keys($utxos).length > 0 && initialLoad) {
      console.log("UTXOs changed, initial load:", $utxos);
      clearTimeout(retryTimeout);
      retryCount = 0;
      loadCharms();
    }
  }

  function scheduleRetry() {
    clearTimeout(retryTimeout);
    retryTimeout = setTimeout(
      () => {
        handleRetry();
      },
      Math.min(2000 * (retryCount + 1), 8000),
    ); // Exponential backoff, max 8s
  }

  function handleRetry() {
    retryCount++;
    loadCharms(true);
  }

  function handleManualRefresh() {
    if (!loading) {
      // Prevent multiple simultaneous refreshes
      retryCount = 0;
      loadCharms();
    }
  }

  onMount(() => {
    mounted = true;
    console.log("Component mounted, UTXOs:", $utxos);
    if ($utxos && Object.keys($utxos).length > 0) {
      loadCharms();
    }
  });

  onDestroy(() => {
    mounted = false;
    clearTimeout(retryTimeout);
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
        on:click={handleManualRefresh}
        disabled={loading}
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {#if loading}
          <svg
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
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
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Refreshing...
        {:else}
          Refresh
        {/if}
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
      <div class="flex justify-between items-start">
        <div class="ml-3 flex-grow">
          <h3 class="text-sm font-medium text-red-200">
            {error}
          </h3>
        </div>
        <div class="flex space-x-3">
          {#if retryCount < maxRetries}
            <button
              on:click={() => handleRetry()}
              class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Retry
            </button>
          {/if}
          <button
            on:click={() => activeSection.set("wallets")}
            class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Back to Wallet
          </button>
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
