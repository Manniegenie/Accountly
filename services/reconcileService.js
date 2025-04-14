// services/reconcileService.js
const deepseekService = require('./deepseekService');
const InferredDeal = require('../models/inferreddeal');

/**
 * Validates the input data for reconciliation.
 *
 * @param {Object} data - The reconciliation payload.
 * @param {number} data.marketRate - The market rate; must be a number.
 * @param {Array} data.bankTransactions - Array of bank transaction objects.
 * @param {Array} data.cryptoTransactions - Array of crypto transaction objects.
 * @throws {Error} If validation fails.
 */
function validateReconciliationData({ marketRate, bankTransactions, cryptoTransactions }) {
  if (marketRate === undefined || marketRate === null) {
    throw new Error("Market rate is required.");
  }
  if (typeof marketRate !== "number") {
    throw new Error("Market rate must be a number.");
  }
  if (!Array.isArray(bankTransactions)) {
    throw new Error("Bank transactions must be an array.");
  }
  if (!Array.isArray(cryptoTransactions)) {
    throw new Error("Crypto transactions must be an array.");
  }
}

/**
 * Reconciles bank and crypto transactions against the provided market rate.
 *
 * The process involves sending a prompt to the Deepseek service with the instructions
 * and the structured transaction data. The Deepseek service is expected to return an array
 * of inferred deals. Each inferred deal object should include:
 *  - fiatTransactionIds: Array of BankTransaction IDs.
 *  - cryptoTransactionIds: Array of CryptoTransaction IDs.
 *  - effectiveRate: Calculated rate from the grouped transactions.
 *  - errorPercentage: Percentage difference compared to the market rate.
 *  - status: A flag ('valid', 'overpayment', or 'underpayment').
 *
 * For each inferred deal, a new document is created in the InferredDeal collection.
 *
 * @param {Object} params - Parameters for reconciliation.
 * @param {number} params.marketRate - The current market rate.
 * @param {Array} params.bankTransactions - Bank transaction data.
 * @param {Array} params.cryptoTransactions - Crypto transaction data.
 * @returns {Promise<Object>} - An object containing a message and an array of saved inferred deals.
 */
async function reconcileTransactions({ marketRate, bankTransactions, cryptoTransactions }) {
  try {
    // Validate input parameters.
    validateReconciliationData({ marketRate, bankTransactions, cryptoTransactions });
    
    // Construct the prompt payload for Deepseek.
    const promptData = {
      instructions:
        "You are provided with structured transaction data from both bank and crypto sources. Determine if these transactions represent a matching deal. A deal is defined as a fiat inflow (from bank transactions) that corresponds to one or more crypto outflows at a conversion rate that is within ±2% of the provided market rate. Group transactions that occur within a 12-hour window as part of the same deal. For each inferred deal, return a JSON object containing: fiatTransactionIds (an array), cryptoTransactionIds (an array), effectiveRate (calculated from the grouped transactions), errorPercentage (the percentage difference compared to the market rate), and a status flag ('valid', 'overpayment', or 'underpayment').",
      market_rate_at_time: marketRate,
      bank_transactions: bankTransactions,
      crypto_transactions: cryptoTransactions,
    };

    // Call the Deepseek service with the prompt.
    const deepseekResponse = await deepseekService.sendPrompt(promptData);
    if (!deepseekResponse) {
      throw new Error("No response received from the Deepseek service.");
    }

    // Assume the Deepseek response returns an object with an array property "deals".
    const deals = deepseekResponse.deals || [];
    const savedDeals = [];

    // Iterate through each inferred deal provided by Deepseek.
    for (const deal of deals) {
      // Format the response to match your InferredDeal schema.
      // Here we assume the deepseek response keys match the property names below.
      const newDeal = new InferredDeal({
        fiatTransactions: deal.fiatTransactionIds,         // Array of BankTransaction document IDs.
        cryptoTransactions: deal.cryptoTransactionIds,       // Array of CryptoTransaction document IDs.
        effectiveRate: deal.effectiveRate,
        errorPercent: deal.errorPercentage,                  // Maps errorPercentage to errorPercent.
        status: deal.status
        // createdAt is automatically set by the schema default.
      });

      // Save the inferred deal into the database.
      const savedDeal = await newDeal.save();
      savedDeals.push(savedDeal);
    }

    // Return a formatted JSON response.
    return {
      message: "Reconciliation successful.",
      deals: savedDeals
    };
  } catch (error) {
    console.error("Error in reconcileTransactions:", error.message);
    throw error;
  }
}

module.exports = { reconcileTransactions };