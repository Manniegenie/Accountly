const mongoose = require('mongoose');

const InferredDealSchema = new mongoose.Schema({
  fiatTransactions:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'BankTransaction' }],
  cryptoTransactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CryptoTransaction' }],
  transactionGroupHash: { type: String, unique: true },
  effectiveRate:      { type: Number },
  errorPercent:       { type: Number },
  status:             { type: String },
  client:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 👈 new field
  createdAt:          { type: Date, default: Date.now }
});

module.exports = mongoose.models.InferredDeal || mongoose.model('InferredDeal', InferredDealSchema);
