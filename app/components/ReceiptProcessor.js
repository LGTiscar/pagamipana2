import { Buffer } from 'buffer';
import axios from 'axios';
// Remove the old import
// import { GEMINI_API_KEY } from '@env';
// Add the correct import for Expo environment variables
import Constants from 'expo-constants';

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
    // Access the API key from Expo's Constants
    this.apiKey = Constants.expoConfig?.extra?.apiKey;
    // Add a log to check if the key was loaded
    console.log('API Key loaded via Constants:', this.apiKey ? `Yes (length: ${this.apiKey.length})` : 'No/Undefined');
    if (!this.apiKey) {
      console.warn("API Key not found in Constants.expoConfig.extra.apiKey. Check your .env file and app.json configuration.");
    }
  }

  async processReceipt(imageBytes) {
    // Add a check at the beginning of the function
    if (!this.apiKey) {
      console.error("Cannot process receipt: API Key is missing.");
      throw new Error("API Key is not configured. Please check setup.");
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
      console.log('Response data:', response.data);

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
          throw new Error('Unexpected response structure from Gemini API');
        }

        const text = jsonResponse.candidates[0].content.parts[0].text;

        // Extract JSON from the response
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const parsedResponse = JSON.parse(jsonStr);

          // Check if the parsed response contains the expected keys
          if (!parsedResponse.items || !parsedResponse.total) {
            throw new Error('Parsed response is missing required keys: items or total');
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
              throw new Error(
                'Item is missing required keys: name, quantity, unitPrice, or totalPrice'
              );
            }

            return BillItem.create({
              name: item.name,
              price: item.totalPrice,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            });
          });
        } else {
          throw new Error('Failed to extract JSON object from response text');
        }
      }

      throw new Error(`Failed to process receipt: ${response.status}`);
    } catch (e) {
      console.error('Error processing receipt:', e);
      throw new Error(`Error processing receipt: ${e.message}`);
    }
  }
}
