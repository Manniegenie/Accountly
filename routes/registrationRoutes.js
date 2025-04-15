// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const BankTransaction = require('../models/banktransaction');
const CryptoTransaction = require('../models/cryptotransaction');
const InferredDeal = require('../models/inferreddeal');

router.post('/register', async (req, res) => {
  try {
    // Create and save the new user using data from the request
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      // If there is no data yet for these optional fields, they can be omitted or left as empty strings.
      binanceKey: '',
      binanceSecret: '',
      monoAccountId: ''
      // other fields can be added here...
    });
    await newUser.save();

    // Create a placeholder BankTransaction document
    // Note: We need to satisfy all required fields. We use a dummy reference for transactionId.
    const placeholderBankTransaction = new BankTransaction({
      source: '', // can be updated later when data is available
      transactionId: `${newUser._id}-placeholder-bank`, // dummy unique ID
      amount: 0,  // no real transaction amount yet
      narration: '',
      timestamp: new Date(),  // using current time as a placeholder
      client: newUser._id.toString(),  // storing the user's id; adjust type if you decide to use ObjectId
      type: 'credit',  // choose one; update later if necessary
      balance: 0,
      category: ''
    });
    await placeholderBankTransaction.save();

    // Create a placeholder CryptoTransaction document
    // As above, provide defaults for required values.
    const placeholderCryptoTransaction = new CryptoTransaction({
      client: newUser._id,
      amount: 0,  
      transactionFee: 0,
      timestamp: new Date(),  // using current time as a placeholder
      completeTime: new Date(), // if there isn’t real data yet, this can be adjusted later
      wallet: '',  // default wallet name; update later if needed
      currency: '', // left blank until real coin info is provided
      conversionRate: 0,
      transactionId: `${newUser._id}-placeholder-crypto`, // dummy unique ID
      address: '',
      txId: '',
      network: '',
      transferType: 0, // default value; 0 means external by your schema comment
      withdrawOrderId: '',
      info: '',
      confirmNo: 0,
      status: 0
    });
    await placeholderCryptoTransaction.save();

    // Create an InferredDeal document that references the created transaction placeholders.
    // Since transactions are arrays, we start with the placeholder IDs.
    const inferredDeal = new InferredDeal({
      fiatTransactions: [placeholderBankTransaction._id],
      cryptoTransactions: [placeholderCryptoTransaction._id],
      effectiveRate: 0,
      errorPercent: 0,
      status: ''  // to be updated later based on deal inference logic
      // createdAt will be set automatically
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
