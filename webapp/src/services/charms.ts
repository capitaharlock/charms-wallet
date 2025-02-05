// src/services/charms.ts
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
  private readonly API_BASE = 'https://api-t4.charms.dev';

  async getCharmsByTx(txId: string): Promise<ProcessedCharm[]> {
    try {
      console.log('Fetching charms for TX:', txId);
      const response = await fetch(`${this.API_BASE}/spells/${txId}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        console.warn(`No charms found for tx ${txId} (status: ${response.status})`);
        return [];
      }

      const data = await response.json();
      console.log('Raw response data:', JSON.stringify(data, null, 2));

      const processed = this.processCharmsData(data, txId);
      console.log('Processed charms for tx:', processed);
      
      return processed;
    } catch (error) {
      console.error(`Error fetching charms for tx ${txId}:`, error);
      return [];
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

    const allCharms: ProcessedCharm[] = [];
    for (const txId of txIdArray) {
      const charms = await this.getCharmsByTx(txId);
      if (charms.length > 0) {
        console.log(`Found ${charms.length} charms in tx ${txId}:`, charms);
        allCharms.push(...charms);
      }
    }

    console.log('Final total charms:', allCharms);
    return allCharms;
  }
}

export const charmsService = new CharmsService();