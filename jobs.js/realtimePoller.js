// jobs/realtimePoller.js
const axios = require('axios');
const config = require('./routes/config');
const BankTransaction = require('./models/BankTransaction');
const CryptoTransaction = require('./models/CryptoTransaction');
const { fetchUSDTtoNairaRate } = require('./services/rateService');

/**
 * Polls Binance for new crypto transactions.
 * This function fetches the Binance account data from our internal endpoint,
 * stores new crypto transactions in CryptoTransaction, and triggers reconciliation.
 */
async function pollBinance() {
  try {
    const binanceResponse = await axios.get(`http://localhost:${config.port}/binance/account`);
    const accountData = binanceResponse.data;
    console.log('Fetched Binance account data:', accountData);

    const currentRate = await fetchUSDTtoNairaRate();
    console.log('Fetched current USDT to NGN rate:', currentRate);

    // Process and store each USDT balance as a crypto transaction.
    const usdtBalances = accountData.balances.filter(b => b.asset === 'USDT');
    for (const balance of usdtBalances) {
      const txData = {
        asset: balance.asset,
        amount: balance.free, // assuming "free" balance is the available amount
        timestamp: Date.now(),
        client: accountData.accountId // adjust based on your client identification logic
      };
      await new CryptoTransaction({
        client: txData.client,
        amount: txData.amount,
        timestamp: new Date(txData.timestamp),
        wallet: "Binance",
        currency: txData.asset,
        conversionRate: currentRate
      }).save();
    }

    // Optionally, trigger reconciliation with Binance data.
    await triggerReconciliation(accountData.balances, currentRate);
  } catch (error) {
    console.error("Error in pollBinance:", error.message);
  }
}

/**
 * Fetches Mono transaction history for a given bank account using its monoAccountId.
 * Uses the Mono API endpoint with paginate=false to get all transactions.
 */
async function fetchMonoTransactions(accountId) {
  try {
    const url = `${config.mono.baseUrl}/v2/accounts/${accountId}/transactions?paginate=false`;
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'mono-sec-key': config.mono.secretKey
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching transactions for account ${accountId}:`, error.message);
    throw error;
  }
}

/**
 * Polls Mono for new bank transactions for each linked account.
 * For each linked account (stored in BankTransaction with a monoAccountId),
 * fetches its transaction history from Mono and stores any new transactions.
 */
async function pollMono() {
  try {
    // Retrieve all linked bank accounts.
    // For this example, we assume that documents with a non-empty monoAccountId represent linked accounts.
    const linkedAccounts = await BankTransaction.find({ monoAccountId: { $exists: true, $ne: null } });
    for (const account of linkedAccounts) {
      const monoResponse = await fetchMonoTransactions(account.monoAccountId);
      // Expecting monoResponse.data to be an array of transactions.
      if (monoResponse && Array.isArray(monoResponse.data)) {
        for (const tx of monoResponse.data) {
          // Check if this transaction already exists using its unique transaction ID.
          const exists = await BankTransaction.findOne({ transactionId: tx.id });
          if (!exists) {
            const newTx = new BankTransaction({
              source: 'mono',
              monoAccountId: account.monoAccountId,
              transactionId: tx.id,
              amount: tx.amount,
              narration: tx.narration,
              timestamp: new Date(tx.date),
              client: account.client || "default_client",
              type: tx.type,       // e.g., 'debit' or 'credit'
              balance: tx.balance, // balance after transaction
              category: tx.category
            });
            await newTx.save();
            console.log(`Stored new Mono transaction: ${tx.id} for account ${account.monoAccountId}`);
            // Optionally, you can trigger reconciliation here based on new bank data.
          }
        }
      } else {
        console.error(`Unexpected response format for Mono transactions of account ${account.monoAccountId}`);
      }
    }
  } catch (error) {
    console.error("Error in pollMono:", error.message);
  }
}

/**
 * Triggers reconciliation by sending the latest data to the reconciliation endpoint.
 * In this template, it sends Binance data (crypto transactions) along with the current rate.
 * You can later enhance this to merge Mono bank transactions as well.
 */
async function triggerReconciliation(balances, currentRate) {
  try {
    const payload = {
      bankTransactions: [], // Placeholder for bank transactions, if you want to merge them here.
      cryptoTransactions: balances.filter(b => b.asset === 'USDT'),
      marketRate: currentRate
    };

    const reconResponse = await axios.post(`http://localhost:${config.port}/reconcile`, payload);
    console.log("Reconciliation result:", reconResponse.data);
  } catch (error) {
    console.error("Error triggering reconciliation:", error.message);
  }
}

// Set polling intervals. Adjust as needed.
setInterval(pollBinance, 60000); // Poll Binance every 60 seconds.
setInterval(pollMono, 60000);    // Poll Mono every 60 seconds.
