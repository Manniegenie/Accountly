// monoconnect.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('./config'); // Ensure your config file exports Mono keys

// Endpoint to initiate connection with Mono
router.get('/account', async (req, res, next) => {
  try {
    // Build the options for Mono's initiate API call.
    const options = {
      method: "POST",
      url: "https://api.withmono.com/v2/accounts/initiate",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "mono-sec-key": config.Mono.secret,  // Use the correct property from your config
      },
      data: {
        customer: {
          name: "Paylot",
          email: "paylot@example.com"  // Replace with a valid email if needed.
        },
        meta: { ref: "99008877TEST" },
        scope: "auth",
        redirect_url: "http://localhost:3000/monoconnect/callback"  // Update the redirect URL as needed.
      }
    };

    const response = await axios.request(options);
    console.log("Initiate response:", response.data);
    return res.json(response.data);
  } catch (error) {
    console.error("Mono API error (initiate):", error.response ? error.response.data : error.message);
    next(error);
  }
});

// Callback endpoint to handle a successful Mono connection
router.get('/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Code parameter is required' });
    }

    // Build the options for Mono's authentication API call.
    const options = {
      method: "POST",
      url: "https://api.withmono.com/v2/accounts/auth",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "mono-sec-key": config.Mono.secret,  // Use the correct property from your config.
      },
      data: { code }
    };

    const response = await axios.request(options);
    console.log("Mono callback response:", response.data);
    return res.json(response.data);
  } catch (error) {
    console.error("Error in Mono callback:", error.response ? error.response.data : error.message);
    next(error);
  }
});

module.exports = router;
