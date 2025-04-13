// models/BankTransaction.js
const mongoose = require('mongoose');

const BankTransactionSchema = new mongoose.Schema({
  source:       { type: String, required: true },            // e.g., 'mono'
  transactionId:{ type: String, required: true, unique: true },  // Unique transaction reference
  amount:       { type: Number, required: true },
  narration:    { type: String },
  timestamp:    { type: Date, required: true },
  client:       { type: String, required: true },            // Identifier for the user (or you could use mongoose.Schema.Types.ObjectId)
  type:         { type: String, enum: ['debit', 'credit'], required: true },
  balance:      { type: Number },                              // Balance after the transaction
  category:     { type: String }
});

module.exports = mongoose.models.BankTransaction || mongoose.model('BankTransaction', BankTransactionSchema);
