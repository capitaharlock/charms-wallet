// src/stores/charms.ts
import { writable, get } from 'svelte/store';
import type { ProcessedCharm } from '../services/charms';
import { charmsService } from '../services/charms';
import type { UTXO } from '../services/utxo';

function createCharmsStore() {
  const { subscribe, set, update } = writable<ProcessedCharm[]>([]);
  const loading = writable(false);

  return {
    subscribe,
    loading: { subscribe: loading.subscribe },
    async loadCharmsFromUTXOs(utxos: { [address: string]: UTXO[] }) {
      // Prevent concurrent loads
      if (get(loading)) {
        console.log('Already loading charms, skipping...');
        return;
      }

      try {
        loading.set(true);
        charmsService.clearCache(); // Clear cache before fetching
        const charms = await charmsService.getCharmsByUTXOs(utxos);

        // Always update with the latest charms
        set(charms);
      } catch (error) {
        console.error('Error loading charms:', error);
        throw error;
      } finally {
        loading.set(false);
      }
    },
    clear() {
      set([]);
    },
    // Helper method to check if we have charms
    hasCharms() {
      return get(this).length > 0;
    }
  };
}

export const charms = createCharmsStore();
