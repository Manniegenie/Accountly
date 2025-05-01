// models/portfoliolog.js
const mongoose = require('mongoose');

const PortfolioLogSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  totalValueUSD: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

// Index for fast querying latest log per user
PortfolioLogSchema.index({ client: 1, timestamp: -1 });

module.exports = mongoose.model('PortfolioLog', PortfolioLogSchema);
