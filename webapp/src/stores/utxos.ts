// src/stores/utxos.ts
import { writable, derived } from 'svelte/store';
import type { UTXO } from '../services/utxo';
import { addresses } from './addresses';
import { utxoService } from '../services/utxo';

function createUTXOStore() {
  const { subscribe, set, update } = writable<{ [address: string]: UTXO[] }>({});

  return {
    subscribe,
    set,
    async fetchUTXOs(addressList: string[]) {
      const utxos = await utxoService.getMultipleAddressesUTXOs(addressList);
      set(utxos);
    },
    clear() {
      set({});
    }
  };
}

export const utxos = createUTXOStore();

// Derived store for total balance
export const totalBalance = derived(utxos, $utxos => {
  let total = 0;
  Object.values($utxos).forEach(addressUtxos => {
    addressUtxos.forEach(utxo => {
      total += utxo.value;
    });
  });
  return total;
});

// Derived store for confirmed balance
export const confirmedBalance = derived(utxos, $utxos => {
  let total = 0;
  Object.values($utxos).forEach(addressUtxos => {
    addressUtxos.forEach(utxo => {
      if (utxo.status.confirmed) {
        total += utxo.value;
      }
    });
  });
  return total;
});