import axios from 'axios';

const API_URL = process.env.VITE_WALLET_API_URL || 'https://api.charms.proars.com';

const transferCharms = async (recipient: string, amount: number, spellJson: string, fundingUtxoId: string) => {
    // Validate inputs
    if (!spellJson?.trim()) {
        throw new Error('Spell JSON is required');
    }
    if (!recipient?.trim()) {
        throw new Error('Recipient address is required');
    }
    if (!fundingUtxoId?.trim()) {
        throw new Error('Funding UTXO ID is required');
    }

    try {
        // Log the full request for debugging
        console.log('Sending transfer request:', {
            recipient,
            amount,
            fundingUtxoId,
            spellJson // Log full spell for debugging
        });

        // Log the full spell for debugging
        console.log('Spell YAML:', spellJson);

        // Basic YAML validation
        if (!spellJson.includes('version:') ||
            !spellJson.includes('apps:') ||
            !spellJson.includes('ins:') ||
            !spellJson.includes('outs:')) {
            throw new Error('Invalid spell format: missing required sections');
        }

        const response = await axios.post(`${API_URL}/wallet/transfer_charms`, {
            spell_json: spellJson,
            funding_utxo_id: fundingUtxoId,
            destination_address: recipient
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            validateStatus: (status) => {
                // Consider only network errors as failures
                // Let the application handle HTTP error responses
                return status >= 200 && status < 600;
            }
        });

        // Log the full response for debugging
        console.log('Transfer response:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data
        });

        if (response.status >= 400) {
            throw new Error(response.data?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.data;
    } catch (error: any) {
        // Log detailed error information
        const errorDetails = {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            requestData: {
                spell_json: spellJson,
                funding_utxo_id: fundingUtxoId,
                destination_address: recipient
            }
        };
        console.error('Transfer request failed:', errorDetails);

        if (error.response?.status === 0) {
            throw new Error('Network error: Unable to reach the server');
        }

        // Extract the most specific error message available
        const errorMessage = error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            'Transfer request failed';

        // Include HTTP status in error if available
        if (error.response?.status) {
            throw new Error(`Transfer failed (${error.response.status}): ${errorMessage}`);
        } else {
            throw new Error(`Transfer failed: ${errorMessage}`);
        }
    }
};

export default transferCharms;
