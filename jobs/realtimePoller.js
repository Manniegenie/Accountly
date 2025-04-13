// jobs/realtimePoller.js
const axios = require('axios');
const config = require('../routes/config');
const BankTransaction = require('../models/banktransaction');
const CryptoTransaction = require('../models/cryptotransaction');
const { fetchUSDTtoNairaRate } = require('../services/rateService');
const { reconcileTransactions } = require('../services/reconcileService');

/**
 * Polls Binance for new crypto transactions using a user’s Binance credentials.
 * Uses the provided Binance API key and secret to request account data.
 *
 * @param {String} binanceKey - The user's Binance API key.
 * @param {String} binanceSecret - The user's Binance secret key.
 */
async function pollBinance(binanceKey, binanceSecret) {
  try {
    // Pass user keys as custom headers (adjust header names as needed)
    const headers = {
      'X-Binance-Key': binanceKey,
      'X-Binance-Secret': binanceSecret,
    };

    const binanceResponse = await axios.get(`http://localhost:${config.port}/binance/account`, { headers });
    const accountData = binanceResponse.data;
    console.log('Fetched Binance account data:', accountData);

    // Attempt to get the current rate. If fails, use a default value.
    let currentRate;
    try {
      currentRate = await fetchUSDTtoNairaRate();
      console.log('Fetched current USDT to NGN rate:', currentRate);
    } catch (rateError) {
      console.error("Error fetching conversion rate, using default value (1):", rateError.message);
      currentRate = 1; // Fallback default conversion rate
    }

    // Process and store each USDT balance as a crypto transaction.
    // NOTE: For duplicate checks to work for crypto transactions, we assume a unique field `transactionId`.
    // If the Binance API does not provide one, we generate a composite key.
    const usdtBalances = accountData.balances.filter(b => b.asset === 'USDT');
    for (const balance of usdtBalances) {
      // Generate a unique transaction identifier (if not provided by the API).
      const transactionId = balance.transactionId || `${accountData.accountId}-${balance.asset}-${Date.now()}`;

      const txData = {
        asset: balance.asset,
        amount: balance.free, // assuming "free" is the available amount
        timestamp: Date.now(),
        client: accountData.accountId,
        transactionId,
      };

      // Check for duplicate crypto transaction using the unique transactionId.
      const exists = await CryptoTransaction.findOne({ transactionId: txData.transactionId });
      if (!exists) {
        await new CryptoTransaction({
          client: txData.client,
          amount: txData.amount,
          timestamp: new Date(txData.timestamp),
          wallet: "Binance",
          currency: txData.asset,
          conversionRate: currentRate,
          transactionId: txData.transactionId  // This field must be present in your CryptoTransaction model.
        }).save();
        console.log(`Stored new crypto transaction: ${txData.transactionId}`);
      } else {
        console.log(`Crypto transaction ${txData.transactionId} already exists. Skipping.`);
      }
    }

    // After processing Binance data, trigger reconciliation.
    // Even if Mono API is down, we trigger reconciliation using the available rate and stored Binance data.
    await triggerReconciliation(accountData.accountId, currentRate);
  } catch (error) {
    console.error("Error in pollBinance:", error.message);
  }
}

/**
 * Polls Mono for new bank transactions for a given user.
 *
 * @param {String} monoAccountId - The Mono account ID linked to the user.
 * @param {String} client - Identifier for the user, which can be their user ID.
 */
async function pollMono(monoAccountId, client) {
  try {
    // Construct the Mono API endpoint URL using the provided monoAccountId.
    const url = `${config.mono.baseUrl}/v2/accounts/${monoAccountId}/transactions?paginate=false`;
    
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'mono-sec-key': config.mono.secretKey,
      }
    });
    
    // Expecting response.data.data to be an array of transactions.
    if (response.data && Array.isArray(response.data.data)) {
      for (const tx of response.data.data) {
        // Check if this transaction already exists using its unique transactionId.
        const exists = await BankTransaction.findOne({ transactionId: tx.id });
        if (!exists) {
          const newTx = new BankTransaction({
            source: 'mono',
            transactionId: tx.id,
            amount: tx.amount,
            narration: tx.narration,
            timestamp: new Date(tx.date),
            client, // assign the user identifier
            type: tx.type,       // e.g., 'debit' or 'credit'
            balance: tx.balance, // balance after transaction
            category: tx.category
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
    // Do not crash: The error is logged but the overall process continues.
  }
}

/**
 * Triggers reconciliation by gathering the latest bank and crypto transactions from the database
 * and calling the reconciliation service.
 *
 * @param {String} client - The identifier for the user/client.
 * @param {number} currentRate - The current USDT to NGN conversion rate.
 */
async function triggerReconciliation(client, currentRate) {
  try {
    // Retrieve the latest bank transactions (Mono) from the database.
    const bankTransactions = await BankTransaction.find({ client }).lean();
    // Retrieve the latest crypto transactions from the database.
    const cryptoTransactions = await CryptoTransaction.find({ client }).lean();

    const payload = {
      bankTransactions,
      cryptoTransactions,
      marketRate: currentRate,
    };

    // Call the reconciliation service directly.
    const result = await reconcileTransactions(payload);
    console.log("Reconciliation result:", result);
  } catch (error) {
    console.error("Error triggering reconciliation:", error.message);
  }
}

/**
 * Starts polling for both Binance and Mono for the given user.
 * If any required credentials are missing, logs an error and does not start the pollers.
 *
 * @param {Object} user - The user object containing necessary credentials.
 */
function startUserPollers(user) {
  if (!user.binanceKey || !user.binanceSecret) {
    console.error("Cannot start pollers: Binance API credentials are missing for user", user._id);
    return;
  }

  if (!user.monoAccountId) {
    console.error("Cannot start pollers: Mono account ID is missing for user", user._id);
    return;
  }

  // Set interval for Binance polling every 2 minutes.
  setInterval(() => {
    pollBinance(user.binanceKey, user.binanceSecret);
  }, 120000);

  // Set interval for Mono polling every 2 minutes.
  setInterval(() => {
    pollMono(user.monoAccountId, user._id.toString());
  }, 120000);

  console.log(`Started pollers for user ${user._id}`);
}

// Export functions for use by other modules.
module.exports = { pollBinance, pollMono, startUserPollers };
