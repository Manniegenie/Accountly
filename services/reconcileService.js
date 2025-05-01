const crypto = require('crypto');
const deepseekService = require('./deepseekService');
const InferredDeal = require('../models/inferreddeal');
const BankTransaction = require('../models/banktransaction');
const CryptoTransaction = require('../models/cryptotransaction');

/**
 * Generates a SHA-256 hash from sorted bank + crypto transaction IDs.
 */
function generateTransactionGroupHash(bankTxs, cryptoTxs) {
  const ids = [
    ...bankTxs.map(tx => String(tx._id)),
    ...cryptoTxs.map(tx => String(tx._id))
  ].sort();

  const hash = crypto.createHash('sha256').update(ids.join(',')).digest('hex');
  return hash;
}

/**
 * Reconciles the 5 most recent transactions for a user, avoids duplicate Deepseek calls.
 *
 * @param {String} userId - The MongoDB ObjectId of the user
 * @returns {Promise<Object>} - Message and array of inferred deals
 */
async function reconcileLatestTransactions(userId) {
  try {
    const marketRate = 1600;

    // Fetch user's most recent 5 bank and crypto transactions
    const bankTransactions = await BankTransaction.find({ client: userId })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    const cryptoTransactions = await CryptoTransaction.find({ client: userId })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    if (!bankTransactions.length || !cryptoTransactions.length) {
      throw new Error("Insufficient bank or crypto transactions for reconciliation.");
    }

    const transactionGroupHash = generateTransactionGroupHash(bankTransactions, cryptoTransactions);

    // Prevent duplicate processing
    const existingDeal = await InferredDeal.findOne({ transactionGroupHash, client: userId });
    if (existingDeal) {
      console.log("🛑 Duplicate transaction group. Skipping Deepseek.");
      return {
        message: "Duplicate transaction group. Skipped Deepseek.",
        deals: [existingDeal]
      };
    }

    const promptData = {
      instructions:
        "You are provided with structured transaction data from both bank and crypto sources. Determine if these transactions represent a matching deal. A deal is defined as a fiat inflow (from bank transactions) that corresponds to one or more crypto outflows at a conversion rate that is within ±2% of the provided market rate. Group transactions that occur within a 12-hour window as part of the same deal. For each inferred deal, return a JSON object containing: fiatTransactionIds (an array), cryptoTransactionIds (an array), effectiveRate (calculated from the grouped transactions), errorPercentage (the percentage difference compared to the market rate), and a status flag ('valid', 'overpayment', or 'underpayment').",
      market_rate_at_time: marketRate,
      bank_transactions: bankTransactions,
      crypto_transactions: cryptoTransactions,
    };

    const deepseekResponse = await deepseekService.sendPrompt(promptData);

    if (!deepseekResponse || !Array.isArray(deepseekResponse.deals)) {
      throw new Error("Invalid response from Deepseek service.");
    }

    const savedDeals = [];

    for (const deal of deepseekResponse.deals) {
      const newDeal = new InferredDeal({
        fiatTransactions: deal.fiatTransactionIds,
        cryptoTransactions: deal.cryptoTransactionIds,
        effectiveRate: deal.effectiveRate,
        errorPercent: deal.errorPercentage,
        status: deal.status,
        transactionGroupHash,
        client: userId
      });

      const saved = await newDeal.save();
      savedDeals.push(saved);
    }

    return {
      message: "Reconciliation successful.",
      deals: savedDeals
    };
  } catch (error) {
    console.error("❌ Error in reconcileLatestTransactions:", error.message);
    throw error;
  }
}

module.exports = { reconcileLatestTransactions };
