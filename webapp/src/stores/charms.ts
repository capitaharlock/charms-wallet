// src/stores/charms.ts
import { writable, get } from 'svelte/store';
import type { ProcessedCharm } from '../types';
import { charmsService } from '../services/charms/index';
import type { UTXO } from '../types';

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
    },
    updateCharm(updatedCharm: ProcessedCharm) {
      set(
        [...get(charms)].map((charm) =>
          charm.uniqueId === updatedCharm.uniqueId ? updatedCharm : charm
        )
      );
    },
  };
}

export const charms = createCharmsStore();
