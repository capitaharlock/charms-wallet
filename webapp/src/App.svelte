<script lang="ts">
  import { wallet } from './stores/wallet';
  import MainLayout from './components/layout/MainLayout.svelte';
  import CreateWallet from './components/CreateWallet.svelte';
  import WalletInfo from './components/WalletInfo.svelte';
</script>

<MainLayout>
  {#if !$wallet}
    <CreateWallet />
  {:else}
    <WalletInfo />
  {/if}
</MainLayout>
