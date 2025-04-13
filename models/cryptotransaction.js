// models/CryptoTransaction.js
const mongoose = require('mongoose');

const CryptoTransactionSchema = new mongoose.Schema({
  client: String,
  amount: Number,
  timestamp: Date,
  wallet: String,
  currency: String,
  conversionRate: { type: Number, required: false },
  transactionId: { type: String, unique: true, required: true } // Added for duplicate checking
});

module.exports = mongoose.models.CryptoTransaction || mongoose.model('CryptoTransaction', CryptoTransactionSchema);
