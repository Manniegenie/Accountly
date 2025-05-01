const axios = require('axios');
const config = require('../routes/config');

const AIML_API_URL = "https://api.aimlapi.com/chat/completions";
const AIML_API_KEY = config.deepseek.key;

async function sendPrompt(promptData) {
  try {
    const messageContent = `
Instructions: ${promptData.instructions}
Market Rate at Time: ${promptData.market_rate_at_time}
Bank Transactions: ${JSON.stringify(promptData.bank_transactions)}
Crypto Transactions: ${JSON.stringify(promptData.crypto_transactions)}
    `.trim();

    const payload = {
      model: "gpt-4o",
      messages: [{ role: "user", content: messageContent }],
      max_tokens: 1024,
      stream: false,
    };

    const response = await axios.post(AIML_API_URL, payload, {
      headers: {
        "Authorization": `Bearer ${AIML_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const content = response.data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from Deepseek.");
    }

    // Try to parse content as JSON
    const json = JSON.parse(content);

    // Optional: validate it's what we expect
    if (!Array.isArray(json.deals)) {
      throw new Error("Parsed content does not include a valid deals array.");
    }

    return json;
  } catch (error) {
    console.error("❌ Error calling or parsing AIML API:", error.message);
    throw error;
  }
}

module.exports = { sendPrompt };
