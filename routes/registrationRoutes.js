// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const BankTransaction = require('../models/banktransaction');
const CryptoTransaction = require('../models/cryptotransaction');
const InferredDeal = require('../models/inferreddeal');

router.post('/register', async (req, res) => {
  try {
    // Build user object without empty strings for sparse unique fields
    const userData = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      monoAccountId: ''
    };

    // Only add binanceKey/Secret if provided
    if (req.body.binanceKey) userData.binanceKey = req.body.binanceKey;
    if (req.body.binanceSecret) userData.binanceSecret = req.body.binanceSecret;

    const newUser = new User(userData);
    await newUser.save();

    // Create placeholder BankTransaction
    const placeholderBankTransaction = new BankTransaction({
      source: 'manual',
      transactionId: `${newUser._id}-placeholder-bank`,
      amount: 0,
      narration: '',
      timestamp: new Date(),
      client: newUser._id.toString(),
      type: 'credit',
      balance: 0,
      category: 'setup'
    });
    await placeholderBankTransaction.save();

    // Create placeholder CryptoTransaction
    const placeholderCryptoTransaction = new CryptoTransaction({
      client: newUser._id,
      amount: 0,
      transactionFee: 0,
      timestamp: new Date(),
      completeTime: new Date(),
      wallet: '',
      currency: 'placeholder',
      conversionRate: 0,
      transactionId: `${newUser._id}-placeholder-crypto`,
      address: '',
      txId: '',
      network: '',
      transferType: 0,
      withdrawOrderId: '',
      info: '',
      confirmNo: 0,
      status: 0
    });
    await placeholderCryptoTransaction.save();

    // Create inferred deal referencing placeholders
    const inferredDeal = new InferredDeal({
      fiatTransactions: [placeholderBankTransaction._id],
      cryptoTransactions: [placeholderCryptoTransaction._id],
      effectiveRate: 0,
      errorPercent: 0,
      status: ''
    });
    await inferredDeal.save();

    return res.status(201).json({
      message: 'User registration successful and placeholder documents created.',
      userId: newUser.userId
    });
  } catch (error) {
    console.error('Error during registration and document creation:', error);
    return res.status(500).json({ error: 'An error occurred during registration.' });
  }
});

module.exports = router;
