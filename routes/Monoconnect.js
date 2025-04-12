const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('./config'); // Adjust the path as needed

// Endpoint to initiate connection with Mono
router.get('/account', async (req, res, next) => {
  try {
    const options = {
      method: "POST",
      url: "https://api.withmono.com/v2/accounts/initiate",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "mono-sec-key": config.mono.secretKey, // use the key from config
      },
      data: {
        customer: {
          name: "Paylot",
          email: "Paylot"
        },
        meta: { ref: "99008877TEST" },
        scope: "auth",
        redirect_url: "https://mono.co"
      }
    };

    const response = await axios.request(options);
    console.log("Initiate response:", response.data);
    return res.json(response.data);
  } catch (error) {
    console.error("Mono API error (initiate):", error.message);
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

    const options = {
      method: "POST",
      url: "https://api.withmono.com/v2/accounts/auth",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "mono-sec-key": config.mono.secretKey, // use the key from config
      },
      data: { code }
    };

    const response = await axios.request(options);
    console.log("Mono callback response:", response.data);
    return res.json(response.data);
  } catch (error) {
    console.error("Error in Mono callback:", error.message);
    next(error);
  }
});

module.exports = router;
