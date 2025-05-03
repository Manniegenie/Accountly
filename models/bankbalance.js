const mongoose = require('mongoose');

const bankBalanceSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Webhook won't always have this, can be added later if needed
  },
  monoUserId: {
    type: String, // From data.user_id in webhook
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
    type: String, // data.name (e.g., "SAMUEL OLAMIDE NOMO")
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
