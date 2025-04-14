const mongoose = require('mongoose');

const CryptoTransactionSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  transactionFee: { type: Number },
  timestamp: { type: Date, required: true },         // applyTime from Binance
  completeTime: { type: Date },                      // completeTime from Binance
  wallet: { type: String, default: 'Binance' },
  currency: { type: String, required: true },        // tx.coin
  conversionRate: { type: Number },
  transactionId: { type: String, unique: true, required: true }, // tx.id
  address: { type: String },
  txId: { type: String },
  network: { type: String },
  transferType: { type: Number },  // 0: external, 1: internal
  withdrawOrderId: { type: String },
  info: { type: String },
  confirmNo: { type: Number },
  status: { type: Number },        // 6: completed, etc.
});

module.exports = mongoose.models.CryptoTransaction || mongoose.model('CryptoTransaction', CryptoTransactionSchema);
