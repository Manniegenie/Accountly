const mongoose = require('mongoose');

const CryptoTransactionSchema = new mongoose.Schema({
  client: String,
  amount: Number,
  timestamp: Date,
  wallet: String,
  currency: String,
  conversionRate: { type: Number, required: false } // New field for the rate
});

module.exports = mongoose.model('CryptoTransaction', CryptoTransactionSchema);
