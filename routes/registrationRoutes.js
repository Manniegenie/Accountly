const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user');
const PendingUser = require('../models/pendinguser');
const BankTransaction = require('../models/banktransaction');
const CryptoTransaction = require('../models/cryptotransaction');
const InferredDeal = require('../models/inferreddeal');

/**
 * POST /register
 * Registers a user from PendingUser and creates placeholder transactions.
 * @param {Object} req.body - User registration data
 * @param {string} req.body.email - User's email (must match a PendingUser)
 * @param {string} [req.body.username] - User's username (optional, uses PendingUser if provided)
 * @param {string} [req.body.password] - User's password (optional, uses PendingUser if provided)
 * @param {string} [req.body.binanceKey] - Binance API key (optional)
 * @param {string} [req.body.binanceSecret] - Binance API secret (optional)
 * @returns {Object} JSON response with userId and success message
 */
router.post('/register', async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Validate required fields
    if (!req.body.email) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Email is required.' });
    }

    // Check if user exists in PendingUser
    const pendingUser = await PendingUser.findOne({ email: req.body.email }).session(session);
    if (!pendingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'No pending user found with this email.' });
    }

    // Check if email is already registered in User collection
    const existingUser = await User.findOne({ email: req.body.email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Build user object, prioritizing PendingUser data
    const userData = {
      username: pendingUser.username,
      email: pendingUser.email,
      password: pendingUser.password || req.body.password,
      monoAccountId: ''
    };

    // Add Binance credentials (prefer req.body if provided, else use PendingUser)
    if (req.body.binanceKey) userData.binanceKey = req.body.binanceKey;
    else if (pendingUser.binanceKey) userData.binanceKey = pendingUser.binanceKey;
    if (req.body.binanceSecret) userData.binanceSecret = req.body.binanceSecret;
    else if (pendingUser.binanceSecret) userData.binanceSecret = pendingUser.binanceSecret;

    // Override username and password if provided in request
    if (req.body.username) userData.username = req.body.username;
    if (req.body.password) userData.password = req.body.password; // Will be hashed by User pre-save hook

    // Create and save new user
    const newUser = new User(userData);
    await newUser.save({ session });

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
    await placeholderBankTransaction.save({ session });

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
    await placeholderCryptoTransaction.save({ session });

    // Create inferred deal referencing placeholders
    const inferredDeal = new InferredDeal({
      fiatTransactions: [placeholderBankTransaction._id],
      cryptoTransactions: [placeholderCryptoTransaction._id],
      effectiveRate: 0,
      errorPercent: 0,
      status: ''
    });
    await inferredDeal.save({ session });

    // Delete PendingUser
    await PendingUser.deleteOne({ _id: pendingUser._id }).session(session);
    console.log(`Removed pending user ${pendingUser.email}`);

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Return success response
    return res.status(201).json({
      message: 'User registration successful and placeholder documents created.',
      userId: newUser.userId
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error during registration:', {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: 'An error occurred during registration.' });
  }
});

module.exports = router;