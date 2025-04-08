// models/BankTransaction.js
const mongoose = require('mongoose');

const BankTransactionSchema = new mongoose.Schema({
  source: { type: String, required: true }, // e.g., 'mono', 'bank'
  monoAccountId: { type: String },          // Only for Mono-related transactions
  transactionId: { type: String, unique: true }, // Unique transaction ID from Mono
  amount: Number,
  timestamp: { type: Date, default: Date.now },
  narration: String,
  client: String,
  // Optional fields from Mono:
  type: String,     // e.g., 'debit', 'credit'
  balance: Number,  // balance after transaction
  category: String  // e.g., 'bank_charges'
});

module.exports = mongoose.model('BankTransaction', BankTransactionSchema);
