import { writable } from "svelte/store"
import type { Wallet } from "../services/api"

const WALLET_STORAGE_KEY = "bitcoin_wallet"
const ENCRYPTED_WALLET_KEY = "encrypted_wallet"

function createWalletStore() {
    // Load initial state from localStorage
    const storedWallet = localStorage.getItem(WALLET_STORAGE_KEY)
    const initialWallet = storedWallet ? JSON.parse(storedWallet) : null

    const { subscribe, set, update } = writable<Wallet | null>(initialWallet)

    return {
        subscribe,
        setWallet: (wallet: Wallet) => {
            localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet))
            set(wallet)
        },
        clear: () => {
            localStorage.removeItem(WALLET_STORAGE_KEY)
            localStorage.removeItem(ENCRYPTED_WALLET_KEY)
            set(null)
        },
    }
}

export const wallet = createWalletStore()
