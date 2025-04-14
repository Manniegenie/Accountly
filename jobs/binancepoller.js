// jobs/binancePoller.js
const axios = require('axios');
const config = require('../routes/config');
const User = require('../models/user');
const CryptoTransaction = require('../models/cryptotransaction');
const { fetchUSDTtoNairaRate } = require('../services/rateService');
const { reconcileTransactions } = require('../services/reconcileService');

async function pollBinanceForUser(userId) {
  try {
    // Look up the user from the database.
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    // Check if Binance credentials exist
    if (!user.binanceKey || !user.binanceSecret) {
      console.log(`No Binance credentials for user ${userId}.`);
      return;
    }

    const headers = {
      'X-Binance-Key': user.binanceKey,
      'X-Binance-Secret': user.binanceSecret,
    };

    // Call the Binance account endpoint.
    const binanceResponse = await axios.get(`http://localhost:${config.port}/binance/account`, { headers });
    const accountData = binanceResponse.data;
    console.log(`Fetched Binance account data for ${accountData.accountId}:`, accountData);

    // Retrieve current conversion rate.
    let currentRate;
    try {
      currentRate = await fetchUSDTtoNairaRate();
      console.log(`Fetched current USDT to NGN rate: ${currentRate}`);
    } catch (rateError) {
      console.error("Error fetching conversion rate, using default value (1):", rateError.message);
      currentRate = 1;
    }

    // Process the Binance USDT balances.
    const usdtBalances = accountData.balances.filter(b => b.asset === 'USDT');
    for (const balance of usdtBalances) {
      const transactionId = balance.transactionId || `${accountData.accountId}-${balance.asset}-${Date.now()}`;

      const txData = {
        asset: balance.asset,
        amount: balance.free, // assuming "free" is the available amount
        timestamp: Date.now(),
        client: accountData.accountId,
        transactionId,
      };

      const exists = await CryptoTransaction.findOne({ transactionId: txData.transactionId });
      if (!exists) {
        await new CryptoTransaction({
          client: txData.client,
          amount: txData.amount,
          timestamp: new Date(txData.timestamp),
          wallet: "Binance",
          currency: txData.asset,
          conversionRate: currentRate,
          transactionId: txData.transactionId,
        }).save();
        console.log(`Stored new Binance transaction: ${txData.transactionId}`);
      } else {
        console.log(`Binance transaction ${txData.transactionId} already exists; skipping.`);
      }
    }

    // Optionally, trigger reconciliation.
    await reconcileTransactions(accountData.accountId, currentRate);
  } catch (error) {
    console.error("Error in pollBinanceForUser:", error.message);
  }
}

function startBinancePoller(userId) {
  // Immediately poll once.
  pollBinanceForUser(userId);
  // Schedule polling every 2 minutes.
  return setInterval(() => {
    pollBinanceForUser(userId);
  }, 120000);
}

module.exports = { startBinancePoller, pollBinanceForUser };
