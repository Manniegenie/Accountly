// routes/binancePoll.js
const express = require('express');
const router = express.Router();
const CryptoTransaction = require('../models/banktransaction.js');

// GET /api/binance/poll
router.get('/poll', async (req, res) => {
  try {
    // Ensure req.user exists; authentication middleware should set this.
    const userId = req.user.id;
    
    // Query the banktransaction collection for the last 5 transactions for this user,
    // sorted by the timestamp in descending order.
    const transactions = await CryptoTransaction.find({ client: userId })
      .sort({ timestamp: -1 })
      .limit(5);
    
    res.json({ data: transactions });
  } catch (error) {
    console.error("Error fetching latest crypto transactions:", error);
    res.status(500).json({ error: "Error fetching latest crypto transactions." });
  }
});

module.exports = router;
