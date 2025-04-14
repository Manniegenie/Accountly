const axios = require('axios');
const config = require('../routes/config');
const BankTransaction = require('../models/banktransaction');
const CryptoTransaction = require('../models/cryptotransaction');
const { fetchUSDTtoNairaRate } = require('../services/rateService');
const { reconcileTransactions } = require('../services/reconcileService');
const PendingDeal = require('../models/pendingdeal');

// Global in-memory store to track active pollers by user id.
const activePollers = new Map();

/**
 * Polls Binance for new crypto transactions using a user’s Binance credentials.
 */
async function pollBinance(binanceKey, binanceSecret) {
  try {
    const headers = {
      'X-Binance-Key': binanceKey,
      'X-Binance-Secret': binanceSecret,
    };

    const binanceResponse = await axios.get(`http://localhost:${config.port}/binance/account`, { headers });
    const accountData = binanceResponse.data;
    console.log(`Fetched Binance account data for ${accountData.accountId}:`, accountData);

    let currentRate;
    try {
      currentRate = await fetchUSDTtoNairaRate();
      console.log(`Fetched current USDT to NGN rate: ${currentRate}`);
    } catch (rateError) {
      console.error("Error fetching conversion rate, using default value (1):", rateError.message);
      currentRate = 1;
    }

    const usdtBalances = accountData.balances.filter(b => b.asset === 'USDT');
    for (const balance of usdtBalances) {
      const transactionId = balance.transactionId || `${accountData.accountId}-${balance.asset}-${Date.now()}`;

      const txData = {
        asset: balance.asset,
        amount: balance.free,
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
        console.log(`Stored new crypto transaction: ${txData.transactionId}`);
      } else {
        console.log(`Crypto transaction ${txData.transactionId} already exists. Skipping.`);
      }
    }

    // Trigger reconciliation after processing Binance data.
    await triggerReconciliation(accountData.accountId, currentRate);
  } catch (error) {
    console.error("Error in pollBinance:", error.message);
  }
}

/**
 * Polls Mono for new bank transactions for a given user.
 */
async function pollMono(monoAccountId, client) {
  try {
    const url = `${config.mono.baseUrl}/v2/accounts/${monoAccountId}/transactions?paginate=false`;
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'mono-sec-key': config.mono.secretKey,
      },
    });
    
    if (response.data && Array.isArray(response.data.data)) {
      for (const tx of response.data.data) {
        const exists = await BankTransaction.findOne({ transactionId: tx.id });
        if (!exists) {
          const newTx = new BankTransaction({
            source: 'mono',
            transactionId: tx.id,
            amount: tx.amount,
            narration: tx.narration,
            timestamp: new Date(tx.date),
            client, // user id or identifier
            type: tx.type,
            balance: tx.balance,
            category: tx.category,
          });
          await newTx.save();
          console.log(`Stored new Mono transaction: ${tx.id} for account ${monoAccountId}`);
        } else {
          console.log(`Mono transaction ${tx.id} already exists. Skipping.`);
        }
      }
    } else {
      console.error(`Unexpected response format for Mono transactions of account ${monoAccountId}`);
    }
  } catch (error) {
    console.error("Error in pollMono:", error.message);
  }
}

/**
 * Triggers reconciliation by fetching the most recent transaction from both sources,
 * saving a new PendingDeal record, and calling the reconciliation service.
 */
async function triggerReconciliation(client, currentRate) {
  try {
    // Retrieve the most recent bank (Mono) transaction.
    const bankTransaction = await BankTransaction.findOne({ client })
      .sort({ timestamp: -1 })
      .lean();
    // Retrieve the most recent crypto transaction.
    const cryptoTransaction = await CryptoTransaction.findOne({ client })
      .sort({ timestamp: -1 })
      .lean();

    const bankTransactions = bankTransaction ? [bankTransaction] : [];
    const cryptoTransactions = cryptoTransaction ? [cryptoTransaction] : [];

    const totalCryptoAmount = cryptoTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalMonoAmount = bankTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    const pendingDeal = new PendingDeal({
      cryptoAmount: totalCryptoAmount,
      monoAmount: totalMonoAmount,
      rate: currentRate,
    });
    await pendingDeal.save();
    console.log("Saved new pending deal record");

    const payload = {
      bankTransactions,
      cryptoTransactions,
      marketRate: currentRate,
    };

    const result = await reconcileTransactions(payload);
    console.log("Reconciliation result:", result);
  } catch (error) {
    console.error("Error triggering reconciliation:", error.message);
  }
}

/**
 * Schedules pollers for a specific user. This function is called during sign in.
 * It runs the pollers immediately and then sets up intervals to call them every 2 minutes.
 *
 * @param {Object} user - The user object containing their credentials.
 */
function startUserPollers(user) {
  const userId = user._id.toString();
  // Optionally, run the pollers immediately:
  pollBinance(user.binanceKey, user.binanceSecret);
  pollMono(user.monoAccountId, userId);

  // Now schedule them to run every 2 minutes.
  const binanceInterval = setInterval(() => {
    pollBinance(user.binanceKey, user.binanceSecret);
  }, 120000);

  const monoInterval = setInterval(() => {
    pollMono(user.monoAccountId, userId);
  }, 120000);

  // Store the interval IDs so you can clear them later if needed.
  activePollers.set(userId, { binanceInterval, monoInterval });
  console.log(`Started pollers for user ${userId}`);
}

module.exports = { pollBinance, pollMono, startUserPollers };
