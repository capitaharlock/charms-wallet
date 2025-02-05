// src/stores/charms.ts
import { writable } from 'svelte/store';
import type { ProcessedCharm } from '../services/charms';
import { charmsService } from '../services/charms';
import type { UTXO } from '../services/utxo';

function createCharmsStore() {
  const { subscribe, set, update } = writable<ProcessedCharm[]>([]);

  return {
    subscribe,
    async loadCharmsFromUTXOs(utxos: { [address: string]: UTXO[] }) {
      const charms = await charmsService.getCharmsByUTXOs(utxos);
      set(charms);
    },
    clear() {
      set([]);
    }
  };
}

export const charms = createCharmsStore();