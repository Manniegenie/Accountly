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
    default: 'Unknown', // Not provided by balance endpoint
  },
  accountType: {
    type: String,
    default: '', // Not provided by balance endpoint
  },
  fetchedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('BankBalanceLog', bankBalanceSchema);
