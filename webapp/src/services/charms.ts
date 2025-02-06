// src/services/charms.ts
import type { UTXO } from './utxo';
import { apiUrl } from '../stores/settings';

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

  constructor() {
    this.unsubscribe = apiUrl.subscribe(value => {
      this.API_BASE = value;
    });
  }

  destroy() {
    this.unsubscribe();
  }

  async getCharmsByUTXOs(utxos: { [address: string]: UTXO[] }): Promise<ProcessedCharm[]> {
    try {
      // Get all unique transaction IDs
      const txIds = [...new Set(Object.values(utxos).flat().map(utxo => utxo.txid))];

      // Make all requests in parallel
      const responses = await Promise.all(
        txIds.map(async txId => {
          const response = await fetch(`${this.API_BASE}/spells/${txId}`);
          if (!response.ok) return null;
          return response.json();
        })
      );

      // Process all responses
      const charms: ProcessedCharm[] = [];
      responses.forEach((data, index) => {
        if (!data || !data.outs) return;

        const txId = txIds[index];
        data.outs.forEach((out: any, outputIndex: number) => {
          if (!out.charms) return;

          Object.entries(out.charms).forEach(([id, amount]) => {
            const appId = id.replace('$', '');
            const app = data.apps?.[id] || 'Unknown App';
            charms.push({
              uniqueId: `${txId}-${appId}-${outputIndex}-${amount}`,
              id: appId,
              amount: amount as number,
              app,
              outputIndex,
              txid: txId
            });
          });
        });
      });

      return charms;
    } catch (error) {
      console.error('Error fetching charms:', error);
      return [];
    }
  }
}

export const charmsService = new CharmsService();
