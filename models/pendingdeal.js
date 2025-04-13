// models/pendingdeal.js
const mongoose = require('mongoose');

const PendingDealSchema = new mongoose.Schema({
  cryptoAmount: { type: Number, required: true },
  monoAmount: { type: Number, required: true },
  rate: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to keep maximum of 5 entries in the collection.
PendingDealSchema.pre('save', async function(next) {
  try {
    // Count how many pending deals are present.
    const count = await this.constructor.countDocuments();
    if (count >= 5) {
      // Remove the oldest entry (lowest createdAt)
      const oldest = await this.constructor.findOne().sort({ createdAt: 1 });
      if (oldest) {
        await oldest.remove();
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.models.PendingDeal || mongoose.model('PendingDeal', PendingDealSchema);
