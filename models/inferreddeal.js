const mongoose = require('mongoose');

const InferredDealSchema = new mongoose.Schema({
  fiatTransactions:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'BankTransaction' }],
  cryptoTransactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CryptoTransaction' }],
  effectiveRate:      { type: Number },
  errorPercent:       { type: Number },
  status:             { type: String },
  createdAt:          { type: Date, default: Date.now }
});

module.exports = mongoose.model('InferredDeal', InferredDealSchema);
