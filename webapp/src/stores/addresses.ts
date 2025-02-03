import { writable } from 'svelte/store';

export interface AddressEntry {
  address: string;
  index: number;
  created: string;
}

function createAddressStore() {
  const { subscribe, set, update } = writable<AddressEntry[]>([]);

  return {
    subscribe,
    addAddress: (address: AddressEntry) => update(addresses => {
      const newAddresses = [...addresses, address];
      localStorage.setItem('wallet_addresses', JSON.stringify(newAddresses));
      return newAddresses;
    }),
    loadAddresses: () => {
      const stored = localStorage.getItem('wallet_addresses');
      if (stored) {
        set(JSON.parse(stored));
      }
    },
    clear: () => {
      localStorage.removeItem('wallet_addresses');
      set([]);
    }
  };
}

export const addresses = createAddressStore();