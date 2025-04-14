// jobs/reconcileScheduler.js

const { reconcileTransactions } = require('../services/reconcileservice');
const BankTransaction = require('../models/banktransaction');
const CryptoTransaction = require('../models/cryptotransaction');
const { fetchUSDTtoNairaRate } = require('../services/rateService');

function startReconciliationScheduler() {
  console.log("Reconciliation scheduler started.");

  // Run every 5 minutes.
  const intervalId = setInterval(async () => {
    try {
      // Get the market rate (fallback to 1530 if fetching fails).
      let marketRate;
      try {
        marketRate = await fetchUSDTtoNairaRate();
      } catch (err) {
        console.error("Error fetching market rate. Using fallback rate 1530");
        marketRate = 1530;
      }
      
      // Get all bank and crypto transactions.
      const bankTransactions = await BankTransaction.find();
      const cryptoTransactions = await CryptoTransaction.find();

      // Run reconciliation with the gathered data.
      await reconcileTransactions({
        marketRate,
        bankTransactions,
        cryptoTransactions
      });

      console.log("Reconciliation executed successfully.");
    } catch (err) {
      console.error("Error during reconciliation cycle:", err.message);
    }
  }, 5 * 60 * 1000); // every 5 minutes

  // Stop the scheduler after 1 hour.
  setTimeout(() => {
    clearInterval(intervalId);
    console.log("Reconciliation scheduler stopped after 1 hour.");
  }, 60 * 60 * 1000); // 1 hour

  return intervalId;
}

module.exports = { startReconciliationScheduler };
