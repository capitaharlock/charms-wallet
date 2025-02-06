// src/stores/charms.ts
import { writable } from 'svelte/store';
import type { ProcessedCharm } from '../services/charms';
import { charmsService } from '../services/charms';
import type { UTXO } from '../services/utxo';

function createCharmsStore() {
  const { subscribe, set } = writable<ProcessedCharm[]>([]);
  const loading = writable(false);

  return {
    subscribe,
    loading: { subscribe: loading.subscribe },
    async loadCharmsFromUTXOs(utxos: { [address: string]: UTXO[] }) {
      loading.set(true);
      const charms = await charmsService.getCharmsByUTXOs(utxos);
      set(charms);
      loading.set(false);
    }
  };
}

export const charms = createCharmsStore();
