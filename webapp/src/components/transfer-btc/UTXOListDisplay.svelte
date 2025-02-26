<script lang="ts">
    import { utxos } from "../../stores/utxos";
    import { utxoService } from "../../services/wallet";
</script>

<div class="border-t border-gray-200 pt-4">
    <h4 class="text-sm font-medium text-gray-900">Available UTXOs</h4>
    <div class="mt-2 max-h-48 overflow-y-auto">
        {#if $utxos && Object.keys($utxos).length > 0}
            <div class="space-y-2">
                {#each Object.entries($utxos) as [address, addressUtxos]}
                    {#each addressUtxos as utxo}
                        <div
                            class="bg-gray-50 p-2 rounded-md flex justify-between items-center"
                        >
                            <span class="text-sm text-gray-600 truncate flex-1"
                                >{utxo.txid}</span
                            >
                            <span
                                class="text-sm font-medium text-gray-900 ml-4"
                            >
                                {utxoService.formatSats(utxo.value)} BTC
                            </span>
                        </div>
                    {/each}
                {/each}
            </div>
        {:else}
            <p class="text-sm text-gray-500">No UTXOs available</p>
        {/if}
    </div>
</div>
