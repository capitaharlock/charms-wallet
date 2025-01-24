import axios from 'axios';

const API_URL = 'http://localhost:9123';

export interface Wallet {
  public_key: string;
  private_key: string;
  address: string;
}

export interface BalanceResponse {
  address: string;
  balance: number;
  unconfirmed_balance: number;
}

const api = {
  async createWallet(password: string): Promise<Wallet> {
    const response = await axios.post(`${API_URL}/wallet/create`, { password });
    return response.data;
  },

  async getBalance(address: string): Promise<BalanceResponse> {
    console.log('Fetching balance for:', address);
    try {
      const response = await axios.get(`${API_URL}/wallet/balance/${address}`);
      console.log('Balance response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Balance fetch error:', error);
      throw error;
    }
  }
};

export default api;
