// src/services/charms.ts
import type { UTXO } from './utxo';
import { apiUrl } from '../stores/settings';

export interface CharmOut {
  charms: {
    [key: string]: number;
  };
}

export interface CharmData {
  version: number;
  apps: {
    [key: string]: string;
  };
  ins: Array<{
    utxo_id: string;
  }>;
  outs: CharmOut[];
}

export interface ProcessedCharm {
  uniqueId: string;
  id: string;
  amount: number;
  app: string;
  outputIndex: number;
  txid: string;
}

class CharmsService {
  private API_BASE: string = '';
  private unsubscribe: () => void;
  private cachedCharms: Map<string, ProcessedCharm[]> = new Map();

  clearCache() {
    this.cachedCharms.clear();
  }

  constructor() {
    // Initialize with the current value and store unsubscribe function
    this.unsubscribe = apiUrl.subscribe(value => {
      this.API_BASE = value;
    });
  }

  // Clean up subscription when service is destroyed
  destroy() {
    this.unsubscribe();
    this.cachedCharms.clear();
  }

  async getCharmsByTx(txId: string): Promise<ProcessedCharm[]> {
    try {
      // Check cache first
      if (this.cachedCharms.has(txId)) {
        console.log('Using cached charms for TX:', txId);
        return this.cachedCharms.get(txId) || [];
      }

      console.log('Fetching charms for TX:', txId);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${this.API_BASE}/spells/${txId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      console.log('Response status:', response.status);

      if (!response.ok) {
        console.warn(`No charms found for tx ${txId} (status: ${response.status})`);
        return [];
      }

      const data = await response.json();
      console.log('Raw response data:', JSON.stringify(data, null, 2));

      const processed = this.processCharmsData(data, txId);
      console.log('Processed charms for tx:', processed);

      // Cache the results
      this.cachedCharms.set(txId, processed);

      return processed;
    } catch (error) {
      console.error(`Error fetching charms for tx ${txId}:`, error);
      // Return cached data if available on error
      return this.cachedCharms.get(txId) || [];
    }
  }

  private processCharmsData(data: CharmData, txId: string): ProcessedCharm[] {
    try {
      console.log('Processing data for tx:', txId);
      const charms: ProcessedCharm[] = [];

      if (!data.outs || !Array.isArray(data.outs)) {
        console.warn('No outs array in data:', data);
        return [];
      }

      data.outs.forEach((out, outputIndex) => {
        console.log(`Processing output ${outputIndex}:`, out);
        if (out && out.charms) {
          console.log('Found charms:', out.charms);
          Object.entries(out.charms).forEach(([id, amount]) => {
            console.log('Processing charm entry:', { id, amount });
            const appId = id.replace('$', '');
            const app = data.apps?.[id] || 'Unknown App';

            const charm: ProcessedCharm = {
              uniqueId: `${txId}-${appId}-${outputIndex}-${amount}`,
              id: appId,
              amount,
              app,
              outputIndex,
              txid: txId
            };
            console.log('Created charm object:', charm);
            charms.push(charm);
          });
        }
      });

      console.log(`Processed ${charms.length} charms for tx ${txId}`);
      return charms;
    } catch (error) {
      console.error('Error processing charms data:', error);
      return [];
    }
  }

  async getCharmsByUTXOs(utxos: { [address: string]: UTXO[] }): Promise<ProcessedCharm[]> {
    try {
      console.log('Getting charms for UTXOs:', utxos);
      const allTxIds = new Set<string>();

      Object.entries(utxos).forEach(([address, addressUtxos]) => {
        console.log(`Processing UTXOs for address ${address}:`, addressUtxos);
        addressUtxos.forEach(utxo => {
          allTxIds.add(utxo.txid);
        });
      });

      const txIdArray = Array.from(allTxIds);
      console.log('Found transaction IDs:', txIdArray);

      // Process transactions in parallel with a limit of 3 concurrent requests
      const allCharms: ProcessedCharm[] = [];
      const batchSize = 3;

      for (let i = 0; i < txIdArray.length; i += batchSize) {
        const batch = txIdArray.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(txId => this.getCharmsByTx(txId))
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            console.log(`Found ${result.value.length} charms in tx ${batch[index]}:`, result.value);
            allCharms.push(...result.value);
          }
        });
      }

      console.log('Final total charms:', allCharms);
      return allCharms;
    } catch (error) {
      console.error('Error fetching charms:', error);
      // Return all cached charms if available
      const cachedResults = Array.from(this.cachedCharms.values()).flat();
      return cachedResults;
    }
  }
}

export const charmsService = new CharmsService();
