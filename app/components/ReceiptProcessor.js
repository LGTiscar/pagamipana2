import { Buffer } from 'buffer';
import axios from 'axios';

class BillItem {
  constructor({ name, price, quantity = 1, unitPrice }) {
    this.name = name;
    this.price = price;
    this.quantity = quantity;
    this.unitPrice = unitPrice ?? price / quantity;
  }

  static create({ name, price, quantity = 1, unitPrice }) {
    return new BillItem({
      name,
      price,
      quantity,
      unitPrice: unitPrice ?? price / quantity,
    });
  }
}

export default class ReceiptProcessor {
  constructor() {
    // Access the API key directly from process.env
    this.apiKey = process.env.EXPO_PUBLIC_API_KEY;
    // Updated logging
    console.log('API Key loaded via process.env.EXPO_PUBLIC_API_KEY:', this.apiKey ? `Yes (length: ${this.apiKey.length})` : 'No/Undefined');
    if (!this.apiKey) {
      console.warn("API Key not found or not a string in process.env.EXPO_PUBLIC_API_KEY. Check your .env file (must start with EXPO_PUBLIC_).");
    }
  }

  async processReceipt(imageBytes) {
    if (!this.apiKey) {
      const errorMsg = "API Key is not configured correctly. Please check setup.";
      console.error("Cannot process receipt: " + errorMsg);
      throw new Error(errorMsg);
    }
    try {
      // Convert image to base64
      const base64Image = Buffer.from(imageBytes).toString('base64');

      // Define the prompt
      const prompt = `
You are an expert at analyzing restaurant receipts. 
    
Please carefully examine this receipt image and extract:
1. All individual menu items with their exact names, quantities, unit prices, and total prices
2. The total amount of the bill

Format your response as a clean JSON object with this exact structure:
{
"items": [
  {"name": "Item Name 1", "quantity": 2, "unitPrice": 10.99, "totalPrice": 21.98},
  {"name": "Item Name 2", "quantity": 1, "unitPrice": 5.99, "totalPrice": 5.99}
],
"total": 27.97
}

Be precise with item names, quantities, and prices. If you can't read something clearly, make your best guess.
For quantities, if not explicitly stated, assume 1.
For unit prices, divide the total price by the quantity.
For total prices, multiply the unit price by the quantity.

IMPORTANT: Your response must ONLY contain this JSON object and nothing else.
`;

      // Prepare request to Google's Gemini API
      const url =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

      const payload = {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generation_config: {
          temperature: 0.2,
          max_output_tokens: 4000,
        },
      };

      console.log('Making request to Gemini API...');
      
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
      });

      console.log('Response status:', response.status);
      // Log a summary of the response but not the full data which might be too large
      console.log('Response data structure:', Object.keys(response.data));

      if (response.status === 200) {
        const jsonResponse = response.data;

        // Check if the expected keys exist in the response
        if (
          !jsonResponse.candidates ||
          jsonResponse.candidates.length === 0 ||
          !jsonResponse.candidates[0].content ||
          !jsonResponse.candidates[0].content.parts ||
          jsonResponse.candidates[0].content.parts.length === 0
        ) {
          const errorMsg = 'Unexpected response structure from Gemini API';
          console.error(errorMsg, JSON.stringify(jsonResponse));
          throw new Error(errorMsg);
        }

        const text = jsonResponse.candidates[0].content.parts[0].text;

        // Extract JSON from the response
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const parsedResponse = JSON.parse(jsonStr);

          // Check if the parsed response contains the expected keys
          if (!parsedResponse.items || !parsedResponse.total) {
            const errorMsg = 'Parsed response is missing required keys: items or total';
            console.error(errorMsg, JSON.stringify(parsedResponse));
            throw new Error(errorMsg);
          }

          const items = parsedResponse.items;
          return items.map((item) => {
            // Ensure all required keys exist in each item
            if (
              !item.name ||
              item.quantity === undefined ||
              item.unitPrice === undefined ||
              item.totalPrice === undefined
            ) {
              const errorMsg = 'Item is missing required keys: name, quantity, unitPrice, or totalPrice';
              console.error(errorMsg, JSON.stringify(item));
              throw new Error(errorMsg);
            }

            return BillItem.create({
              name: item.name,
              price: item.totalPrice,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            });
          });
        } else {
          const errorMsg = 'Failed to extract JSON object from response text';
          console.error(errorMsg, text);
          throw new Error(errorMsg);
        }
      }

      const errorMsg = `Failed to process receipt: HTTP Status ${response.status}`;
      console.error(errorMsg, response.data);
      throw new Error(errorMsg);
    } catch (e) {
      // Enhanced error logging with details as requested
      console.error('Error processing receipt:', e);
      
      // Check for specific axios error properties
      if (e.response) {
        // The request was made and the server responded with a status code outside of 2xx
        console.error('ERROR - Gemini API error response:', {
          status: e.response.status,
          statusText: e.response.statusText,
          data: JSON.stringify(e.response.data, null, 2)
        });
        
        // Create a detailed error message with the actual API error
        let errorDetails = '';
        
        if (e.response.data && e.response.data.error) {
          const apiError = e.response.data.error;
          errorDetails = `${apiError.message || ''} (Code: ${apiError.code || 'unknown'}) ${apiError.status || ''}`;
          // Log the full error object for debugging
          console.error('GEMINI API ERROR DETAILS:', JSON.stringify(apiError, null, 2));
        } else {
          errorDetails = `Status: ${e.response.status} - ${e.response.statusText || 'Unknown error'}`;
          console.error('RAW ERROR RESPONSE:', JSON.stringify(e.response.data, null, 2));
        }
        
        // Create a custom error object with apiErrorDetails property
        const error = new Error(`Gemini API Error: ${errorDetails}`);
        error.apiErrorDetails = errorDetails;
        throw error;
      } else if (e.request) {
        // The request was made but no response was received
        console.error('NETWORK ERROR - No response received from Gemini API:', e.request);
        const error = new Error(`No response from Gemini API: Network error or timeout`);
        error.apiErrorDetails = 'Network error or timeout - server did not respond';
        throw error;
      } else {
        // Something happened in setting up the request
        console.error('REQUEST SETUP ERROR:', e.message);
        const error = new Error(`Error processing receipt: ${e.message}`);
        error.apiErrorDetails = e.message;
        throw error;
      }
    }
  }
}
