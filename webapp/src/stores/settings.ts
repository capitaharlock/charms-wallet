import { writable } from 'svelte/store';

const DEFAULT_API_URL = 'http://localhost:3333';

// Initialize from localStorage or use default
const storedApiUrl = localStorage.getItem('charmsApiUrl') || DEFAULT_API_URL;

export const apiUrl = writable<string>(storedApiUrl);

export const saveApiUrl = (value: string) => {
    localStorage.setItem('charmsApiUrl', value);
    apiUrl.set(value);
};
