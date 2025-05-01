// models/bankbalance.js
const mongoose = require('mongoose');

const bankBalanceSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  accountId: String,
  bankName: String,
  balance: Number,
  currency: String,
  accountType: String,
  accountNumber: String,
  fetchedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BankBalanceLog', bankBalanceSchema);
