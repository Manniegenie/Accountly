// poller.js
const User = require('../models/user');
const CryptoTransaction = require('../models/cryptotransaction');
const Binance = require('node-binance-api'); // Make sure to install this library

async function pollUserWithdrawals() {
  try {
    // Fetch all users with Binance credentials set.
    const users = await User.find({ 
      binanceKey: { $exists: true, $ne: '' },
      binanceSecret: { $exists: true, $ne: '' }
    });

    if (!users.length) {
      console.log('No users with Binance credentials found.');
      return;
    }

    // Calculate the time window: current time and 5 minutes ago.
    const currentTime = Date.now();
    const fiveMinutesAgo = currentTime - (5 * 60 * 1000);

    for (const user of users) {
      // Create a Binance client instance for each user.
      const binance = new Binance().options({
        APIKEY: user.binanceKey,
        APISECRET: user.binanceSecret,
        useServerTime: true,
        recvWindow: 60000
      });

      console.log(`Fetching withdrawal history for user ${user.userId} from ${new Date(fiveMinutesAgo).toISOString()} to ${new Date(currentTime).toISOString()}`);

      let withdrawals;
      try {
        // Fetch withdrawal history limited to the last 5 minutes.
        withdrawals = await binance.withdrawHistory({
          startTime: fiveMinutesAgo,
          endTime: currentTime,
          recvWindow: 60000
        });
      } catch (err) {
        console.error(`Error fetching withdrawals for user ${user.userId}:`, err.response?.data || err.message);
        // Continue with the next user even if one fails.
        continue;
      }

      if (!Array.isArray(withdrawals)) {
        console.error(`Unexpected format for withdrawals for user ${user.userId}`);
        continue;
      }

      // Process each withdrawal in the time window.
      for (const withdrawal of withdrawals) {
        // Check if the transaction already exists in the CryptoTransaction collection.
        const exists = await CryptoTransaction.findOne({ transactionId: withdrawal.id });
        if (exists) continue;
  
        // Create a new CryptoTransaction with mapped values.
        const newCryptoTx = new CryptoTransaction({
          client: user._id,
          amount: Number(withdrawal.amount),
          transactionFee: Number(withdrawal.transactionFee),
          timestamp: withdrawal.applyTime ? new Date(withdrawal.applyTime) : new Date(),
          completeTime: withdrawal.completeTime ? new Date(withdrawal.completeTime) : undefined,
          wallet: 'Binance',
          currency: withdrawal.coin,
          conversionRate: null,
          transactionId: withdrawal.id,
          address: withdrawal.address,
          txId: withdrawal.txId,
          network: withdrawal.network,
          transferType: withdrawal.transferType,
          withdrawOrderId: withdrawal.withdrawOrderId,
          info: withdrawal.info,
          confirmNo: withdrawal.confirmNo,
          status: withdrawal.status
        });
  
        try {
          await newCryptoTx.save();
          console.log(`Saved new withdrawal ${withdrawal.id} for user ${user.userId}`);
        } catch (saveErr) {
          console.error(`Error saving withdrawal ${withdrawal.id} for user ${user.userId}:`, saveErr);
        }
      }
    }
  } catch (error) {
    console.error('Error in pollUserWithdrawals:', error);
  }
}

// Function to start the poller: execute immediately, then every 5 minutes.
function startPoller() {
  pollUserWithdrawals();
  setInterval(pollUserWithdrawals, 5 * 60 * 1000); // 300,000 ms = 5 minutes
}

module.exports = { startPoller };
