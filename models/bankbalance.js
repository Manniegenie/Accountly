const mongoose = require('mongoose');

const bankBalanceSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  monoUserId: {
    type: String,
    required: false,
  },
  accountId: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: false,
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
  fetchedAt: {
    type: Date,
    default: Date.now,
  },
});

bankBalanceSchema.index({ accountId: 1 }, { unique: true });

module.exports = mongoose.model('BankBalanceLog', bankBalanceSchema);
