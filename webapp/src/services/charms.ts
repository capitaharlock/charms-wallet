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
  uniqueId: string;  // Added unique identifier
  id: string;
  amount: number;
  app: string;
  outputIndex: number;  // Added output index
}

class CharmsService {
  private readonly API_BASE = 'https://api-t4.charms.dev';

  async getCharmsByTx(txId: string): Promise<ProcessedCharm[]> {
    try {
      const response = await fetch(`${this.API_BASE}/spells/${txId}`);
      const data: CharmData = await response.json();
      
      return this.processCharmsData(data);
    } catch (error) {
      console.error('Error fetching charms:', error);
      throw error;
    }
  }

  private processCharmsData(data: CharmData): ProcessedCharm[] {
    const charms: ProcessedCharm[] = [];
    
    data.outs.forEach((out, outputIndex) => {
      if (out.charms) {
        Object.entries(out.charms).forEach(([id, amount]) => {
          const appId = id.replace('$', '');
          const app = data.apps[id] || 'Unknown App';
          
          charms.push({
            uniqueId: `${appId}-${outputIndex}-${amount}`,  // Create unique identifier
            id: appId,
            amount,
            app,
            outputIndex
          });
        });
      }
    });

    return charms;
  }

  // For development, return hardcoded data
  async getMockCharms(): Promise<ProcessedCharm[]> {
    const mockData: CharmData = {
      "version": 0,
      "apps": {
        "$0000": "n/f54f6d40bd4ba808b188963ae5d72769ad5212dd1d29517ecc4063dd9f033faa/7df792057addc74f1a6ca23da5b8b82475a7c31c3a4d45266c16a604c62eba4c",
        "$0001": "t/f54f6d40bd4ba808b188963ae5d72769ad5212dd1d29517ecc4063dd9f033faa/7df792057addc74f1a6ca23da5b8b82475a7c31c3a4d45266c16a604c62eba4c"
      },
      "ins": [
        {"utxo_id": "d967158ab51d9114e103b090d2b5b62eba46a91fa68787f5526653b06571c71a:0"},
        {"utxo_id": "7a38fb4857f92baacf73ca59dbe061d67ff4fdfcd59cc441099a9a7dc76956f6:1"}
      ],
      "outs": [
        {"charms": {"$0000": 30580}},
        {},
        {"charms": {"$0001": 69000}},
        {"charms": {"$0001": 420}}
      ]
    };

    return this.processCharmsData(mockData);
  }
}

export const charmsService = new CharmsService();
