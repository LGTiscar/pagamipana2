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
    // No longer need to store the API key as we're using the backend
    this.apiUrl = 'http://0.0.0.0:8000/api/ocr/generate';
  }

  async processReceipt(imageBytes) {
    try {
      console.log('Making request to OCR backend API...');
      
      // Create a FormData object
      const formData = new FormData();
      
      // En React Native, podemos añadir el archivo directamente sin necesidad de crear un Blob
      // Creamos un objeto tipo archivo con los datos necesarios
      formData.append('file', {
        uri: 'data:image/jpeg;base64,' + Buffer.from(imageBytes).toString('base64'),
        type: 'image/jpeg',
        name: 'receipt.jpg',
      });
      
      // Send the formData with the image file to the backend
      const response = await axios.post(this.apiUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response data structure:', Object.keys(response.data));

      if (response.status === 200) {
        const jsonData = response.data;

        // The backend should return the parsed items directly
        if (!jsonData.items || !jsonData.total) {
          const errorMsg = 'Backend response is missing required keys: items or total';
          console.error(errorMsg, JSON.stringify(jsonData));
          throw new Error(errorMsg);
        }

        const items = jsonData.items;
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
      }

      const errorMsg = `Failed to process receipt: HTTP Status ${response.status}`;
      console.error(errorMsg, response.data);
      throw new Error(errorMsg);
    } catch (e) {
      // Enhanced error logging with details
      console.error('Error processing receipt:', e);
      
      // Check for specific axios error properties
      if (e.response) {
        // The request was made and the server responded with a status code outside of 2xx
        console.error('ERROR - Backend API error response:', {
          status: e.response.status,
          statusText: e.response.statusText,
          data: JSON.stringify(e.response.data, null, 2)
        });
        
        // Create a detailed error message with the actual API error
        let errorDetails = '';
        
        if (e.response.data && e.response.data.error) {
          const apiError = e.response.data.error;
          errorDetails = `${apiError.message || ''} (Code: ${apiError.code || 'unknown'}) ${apiError.status || ''}`;
          console.error('BACKEND API ERROR DETAILS:', JSON.stringify(apiError, null, 2));
        } else {
          errorDetails = `Status: ${e.response.status} - ${e.response.statusText || 'Unknown error'}`;
          console.error('RAW ERROR RESPONSE:', JSON.stringify(e.response.data, null, 2));
        }
        
        // Create a custom error object with apiErrorDetails property
        const error = new Error(`Backend API Error: ${errorDetails}`);
        error.apiErrorDetails = errorDetails;
        throw error;
      } else if (e.request) {
        // The request was made but no response was received
        console.error('NETWORK ERROR - No response received from backend API:', e.request);
        const error = new Error(`No response from backend API: Network error or timeout`);
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
