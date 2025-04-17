const express = require('express');
const router = express.Router();
const User = require('../models/user');
const BankTransaction = require('../models/banktransaction');
const CryptoTransaction = require('../models/cryptotransaction');
const InferredDeal = require('../models/inferreddeal');
const { manageListRecipient } = require('../mailjet');

/**
 * POST /register
 * Registers a new user, creates placeholder transactions, and subscribes the user to a Mailjet contact list.
 * @param {Object} req.body - User registration data
 * @param {string} req.body.username - User's username
 * @param {string} req.body.email - User's email
 * @param {string} req.body.password - User's password
 * @param {string} [req.body.binanceKey] - Binance API key (optional)
 * @param {string} [req.body.binanceSecret] - Binance API secret (optional)
 * @returns {Object} JSON response with userId and success message
 */
router.post('/register', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.username || !req.body.email || !req.body.password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    // Build user object, omitting empty strings for sparse unique fields
    const userData = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      monoAccountId: ''
    };

    // Add Binance credentials if provided
    if (req.body.binanceKey) userData.binanceKey = req.body.binanceKey;
    if (req.body.binanceSecret) userData.binanceSecret = req.body.binanceSecret;

    // Create and save new user
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
      transactionId: `${newUser._id}-placeholder-crypto`,
      address: '',
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

    // Subscribe user to Mailjet contact list (ListID: 10538655)
    try {
      await manageListRecipient({
        contactAlt: req.body.email,
        isUnsubscribed: false // Subscribe the user
      });
      console.log(`Subscribed ${req.body.email} to Mailjet list 10538655`);
    } catch (mailjetError) {
      // Log Mailjet error but don't fail registration
      console.error(`Failed to subscribe ${req.body.email} to Mailjet list:`, mailjetError.message);
    }

    // Return success response
    return res.status(201).json({
      message: 'User registration successful and placeholder documents created.',
      userId: newUser.userId
    });
  } catch (error) {
    console.error('Error during registration:', {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: 'An error occurred during registration.' });
  }
});

module.exports = router;