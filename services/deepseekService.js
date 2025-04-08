const axios = require('axios');
const config = require('./routes/config');


// AIML API endpoint and API key
const AIML_API_URL = "https://api.aimlapi.com/chat/completions";
const AIML_API_KEY = process.config.AIML_API_KEY;

/**
 * Sends a prompt to the AIML API (Deepseek chat service) and returns the response.
 *
 * @param {Object} promptData - Contains instructions and transaction data.
 * @param {string} promptData.instructions - The instructions for matching transactions.
 * @param {number|string} promptData.market_rate_at_time - The market rate at the time of the transactions.
 * @param {Array} promptData.bank_transactions - Array of bank transactions.
 * @param {Array} promptData.crypto_transactions - Array of crypto transactions.
 * @returns {Promise<Object>} - The response data from the AIML API.
 */
async function sendPrompt(promptData) {
  try {
    // Build a message that incorporates the provided prompt data.
    const messageContent = `
Instructions: ${promptData.instructions}
Market Rate at Time: ${promptData.market_rate_at_time}
Bank Transactions: ${JSON.stringify(promptData.bank_transactions)}
Crypto Transactions: ${JSON.stringify(promptData.crypto_transactions)}
    `.trim();

    // Construct the payload following the AIML API format.
    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ],
      max_tokens: 512,
      stream: false,
    };

    // Post the payload to the AIML API.
    const response = await axios.post(AIML_API_URL, payload, {
      headers: {
        "Authorization": `Bearer ${AIML_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error calling AIML API:", error.message);
    throw error;
  }
}

module.exports = { sendPrompt };
