// routes/log.js
const express = require('express');
const router = express.Router();
const BankTransaction = require('../models/banktransaction');
const CryptoTransaction = require('../models/cryptotransaction');
const InferredDeal = require('../models/inferreddeal');

// GET /api/log/top5 - Fetch the top 5 transactions from each collection.
// If fewer than 5 records exist in any collection, return only those available.
router.get('/top5', async (req, res) => {
  try {
    // Fetch the top 5 Bank Transactions, sorted by the most recent timestamp.
    const bankTransactions = await BankTransaction.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .exec();

    // Fetch the top 5 Crypto Transactions, sorted by the most recent timestamp.
    const cryptoTransactions = await CryptoTransaction.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .exec();

    // Fetch the top 5 Inferred Deals, sorted by the most recent creation date.
    const inferredDeals = await InferredDeal.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    res.json({
      bankTransactions,
      cryptoTransactions,
      inferredDeals
    });
  } catch (error) {
    console.error('Error fetching top 5 transactions:', error);
    res.status(500).json({ error: 'Server error fetching top 5 transactions.' });
  }
});

module.exports = router;
