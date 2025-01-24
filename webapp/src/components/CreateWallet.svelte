<script lang="ts">
  import { wallet } from '../stores/wallet';
  import api from '../services/api';
  import CryptoJS from 'crypto-js';

  let password = '';
  let confirmPassword = '';
  let loading = false;
  let error = '';
  let step = 1; // 1: Enter Password, 2: Confirm Password
  let passwordStrength = 0;

  function checkPasswordStrength(pwd: string): number {
    let strength = 0;
    if (pwd.length >= 8) strength += 1;
    if (pwd.match(/[a-z]+/)) strength += 1;
    if (pwd.match(/[A-Z]+/)) strength += 1;
    if (pwd.match(/[0-9]+/)) strength += 1;
    if (pwd.match(/[^a-zA-Z0-9]+/)) strength += 1;
    return strength;
  }

  $: passwordStrength = password ? checkPasswordStrength(password) : 0;

  function getStrengthColor(strength: number): string {
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  async function handleCreate() {
    try {
      loading = true;
      error = '';

      if (step === 1) {
        if (passwordStrength < 3) {
          error = 'Please use a stronger password';
          return;
        }
        step = 2;
        return;
      }

      if (password !== confirmPassword) {
        error = 'Passwords do not match';
        return;
      }

      const newWallet = await api.createWallet(password);
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(newWallet), password).toString();
      localStorage.setItem('encrypted_wallet', encrypted);
      wallet.setWallet(newWallet);
      password = '';
      confirmPassword = '';
    } catch (e) {
      error = 'Failed to create wallet';
      console.error(e);
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-md mx-auto">
  <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
    <div class="space-y-6">
      <!-- Steps indicator -->
      <div class="flex justify-between mb-8">
        <div class="relative w-full">
          <div class="absolute top-2 w-full h-0.5 bg-gray-200">
            <div 
              class="absolute h-0.5 bg-blue-500 transition-all duration-500" 
              style="width: {step === 1 ? '50%' : '100%'}"
            ></div>
          </div>
          <div class="relative flex justify-between">
            <div class="flex flex-col items-center">
              <div class="rounded-full h-5 w-5 bg-blue-500 flex items-center justify-center">
                <span class="text-white text-xs">1</span>
              </div>
              <span class="mt-2 text-xs text-gray-500">Create Password</span>
            </div>
            <div class="flex flex-col items-center">
              <div class="{`rounded-full h-5 w-5 flex items-center justify-center ${step === 2 ? 'bg-blue-500' : 'bg-gray-200'}`}">
                <span class="{`text-xs ${step === 2 ? 'text-white' : 'text-gray-500'}`}">2</span>
              </div>
              <span class="mt-2 text-xs text-gray-500">Confirm Password</span>
            </div>
          </div>
        </div>
      </div>

      <form on:submit|preventDefault={handleCreate} class="space-y-6">
        {#if step === 1}
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Create Password
            </label>
            <div class="mt-1">
              <input
                id="password"
                type="password"
                bind:value={password}
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter a strong password"
              />
            </div>
            
            <!-- Password strength indicator -->
            <div class="mt-2">
              <div class="flex h-1.5 rounded-full bg-gray-200 overflow-hidden">
                {#each Array(5) as _, i}
                  <div 
                    class="w-1/5 h-full transition-colors duration-300 {i < passwordStrength ? getStrengthColor(passwordStrength) : ''}"
                  ></div>
                {/each}
              </div>
              <p class="mt-1 text-xs text-gray-500">
                Password strength: 
                {#if passwordStrength <= 2}
                  <span class="text-red-500">Weak</span>
                {:else if passwordStrength <= 3}
                  <span class="text-yellow-500">Medium</span>
                {:else}
                  <span class="text-green-500">Strong</span>
                {/if}
              </p>
            </div>

            <ul class="mt-2 text-xs text-gray-500 list-disc list-inside">
              <li>At least 8 characters</li>
              <li>Include uppercase & lowercase letters</li>
              <li>Include numbers and special characters</li>
            </ul>
          </div>
        {:else}
          <div>
            <label for="confirm-password" class="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div class="mt-1">
              <input
                id="confirm-password"
                type="password"
                bind:value={confirmPassword}
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Confirm your password"
              />
            </div>
          </div>
        {/if}

        {#if error}
          <div class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        {/if}

        <div class="flex items-center justify-between">
          {#if step === 2}
            <button
              type="button"
              on:click={() => { step = 1; error = ''; }}
              class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back
            </button>
          {:else}
            <div></div>
          {/if}
          
          <button
            type="submit"
            disabled={loading}
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {#if loading}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            {/if}
            {loading ? 'Creating...' : step === 1 ? 'Continue' : 'Create Wallet'}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
