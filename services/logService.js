// services/logService.js
const BankTransaction = require('../models/banktransaction');
const CryptoTransaction = require('../models/CryptoTransaction');

async function getUnifiedTransactionLog() {
  try {
    // Retrieve all bank and crypto transactions in parallel
    const [bankTxns, cryptoTxns] = await Promise.all([
      BankTransaction.find({}).lean(),
      CryptoTransaction.find({}).lean()
    ]);

    // Build a unified log list
    const unifiedLogs = [];

    // Process bank transactions (from Mono)
    bankTxns.forEach(tx => {
      unifiedLogs.push({
        Type: 'Bank',
        TransactionID: tx.transactionId, // Unique ID from Mono
        Amount: tx.amount,
        Client: tx.client,
        Timestamp: new Date(tx.timestamp).toLocaleString(),
        Narration: tx.narration || '',
        Category: tx.category || ''
      });
    });

    // Process crypto transactions (from Binance)
    cryptoTxns.forEach(tx => {
      unifiedLogs.push({
        Type: 'Crypto',
        TransactionID: tx._id, // Using the MongoDB _id as an identifier
        Amount: tx.amount,
        Client: tx.client,
        Timestamp: new Date(tx.timestamp).toLocaleString(),
        Wallet: tx.wallet,
        ConversionRate: tx.conversionRate
      });
    });

    // Sort the unified logs by timestamp (ascending order)
    unifiedLogs.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));

    // Optionally, you can log the logs as a table to the console
    console.table(unifiedLogs);

    return unifiedLogs;
  } catch (error) {
    console.error("Error in getUnifiedTransactionLog:", error);
    throw error;
  }
}

module.exports = { getUnifiedTransactionLog };
