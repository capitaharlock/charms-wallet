import { writable } from 'svelte/store';
import type { Wallet } from '../services/api';

function createWalletStore() {
  const { subscribe, set, update } = writable<Wallet | null>(null);

  return {
    subscribe,
    setWallet: (wallet: Wallet) => set(wallet),
    clear: () => set(null)
  };
}

export const wallet = createWalletStore();
