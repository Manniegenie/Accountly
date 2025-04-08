const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const config = require('./routes/config');

// Endpoint to fetch real-time account info from Binance
router.get('/account', async (req, res, next) => {
  try {
    // Use API credentials from config (in a real-world scenario, these might come from user-specific settings)
    const apiKey = config.binance.key;
    const apiSecret = config.binance.secret;
    const baseUrl = 'https://api.binance.com';

    // Create query string with timestamp (you may add additional parameters if needed)
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    // Generate the HMAC SHA256 signature
    const signature = crypto.createHmac('sha256', apiSecret)
                            .update(queryString)
                            .digest('hex');
    // Construct the URL for the account endpoint
    const url = `${baseUrl}/api/v3/account?${queryString}&signature=${signature}`;

    // Call the Binance API
    const response = await axios.get(url, {
      headers: { 'X-MBX-APIKEY': apiKey }
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching Binance account info:", error.message);
    next(error);
  }
});

module.exports = router;
