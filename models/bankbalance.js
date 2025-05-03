const mongoose = require('mongoose');

const bankBalanceSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accountId: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  bankName: {
    type: String,
    default: 'Unknown',
  },
  accountType: {
    type: String,
    default: '',
  },
  fetchedAt: {
    type: Date,
    default: Date.now,
  }
});

// Ensure uniqueness for each account per user
bankBalanceSchema.index({ client: 1, accountId: 1, accountNumber: 1 }, { unique: true });

module.exports = mongoose.model('BankBalanceLog', bankBalanceSchema);
