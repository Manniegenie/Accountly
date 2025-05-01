const mongoose = require('mongoose');

const CryptoTransactionSchema = new mongoose.Schema({
  client:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:          { type: Number, required: true },                          // withdrawal.amount
  transactionFee:  { type: Number, default: 0 },                              // withdrawal.transactionFee
  timestamp:       { type: Date, required: true },                            // withdrawal.applyTime
  completeTime:    { type: Date },                                            // withdrawal.completeTime (optional)
  wallet:          { type: String, default: 'Binance' },                      // Source wallet
  currency:        { type: String, required: true },                          // withdrawal.coin
  transactionId:   { type: String, unique: true, required: true },            // withdrawal.txId (blockchain hash)
  withdrawalId:    { type: String, unique: true },                            // withdrawal.id (Binance internal ID)
  address:         { type: String },                                          // withdrawal.address
  network:         { type: String },                                          // withdrawal.network
  transferType:    { type: Number },                                          // withdrawal.transferType (0: external, 1: internal)
  withdrawOrderId: { type: String },                                          // withdrawal.withdrawOrderId (optional)
  info:            { type: String, default: '' },                             // withdrawal.info (optional)
  confirmNo:       { type: Number, default: 0 },                              // withdrawal.confirmNo (optional)
  status:          { type: Number }                                           // withdrawal.status (e.g., 6: completed)
});

module.exports = mongoose.models.CryptoTransaction || mongoose.model('CryptoTransaction', CryptoTransactionSchema);