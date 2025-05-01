// banktransaction.js
const mongoose = require('mongoose');

const BankTransactionSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true,
    default: 'mono'
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be greater than 0']
  },
  narration: {
    type: String,
    maxlength: [500, 'Narration cannot exceed 500 characters']
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['debit', 'credit', 'unknown'],
    required: true
  },
  balance: {
    type: Number,
    min: [0, 'Balance cannot be negative']
  },
  category: {
    type: String,
    enum: ['unknown', 'bank_charges', 'transfer', 'bill_payment', 'other'],
    default: 'unknown'
  }
});

BankTransactionSchema.index({ client: 1, timestamp: -1 });

module.exports = mongoose.models.BankTransaction || mongoose.model('BankTransaction', BankTransactionSchema);