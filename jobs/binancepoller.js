const { Spot } = require('@binance/connector');
const User = require('../models/user');
const CryptoTransaction = require('../models/cryptotransaction');

async function pollUserWithdrawals() {
  try {
    // Fetch users with Binance credentials
    const users = await User.find({
      binanceKey: { $exists: true, $ne: '' },
      binanceSecret: { $exists: true, $ne: '' }
    });

    if (!users.length) {
      console.log('No users with Binance credentials found.');
      return;
    }

    for (const user of users) {
      // Initialize Binance client
      const client = new Spot(user.binanceKey, user.binanceSecret);

      try {
        // Calculate time window (72 hours)
        const endTime = Date.now();
        const startTime = endTime - (72 * 60 * 60 * 1000);

        // Fetch withdrawal history
        const response = await client.withdrawHistory({
          startTime,
          endTime,
          recvWindow: 60000
        });
        const withdrawals = response.data;

        // Validate response
        if (!Array.isArray(withdrawals)) {
          console.error(`Unexpected withdrawals format for user ${user.userId}:`, withdrawals);
          continue;
        }

        if (withdrawals.length === 0) {
          console.log(`No withdrawals found for user ${user.userId} in the past 72 hours.`);
        }

        // Process each withdrawal
        for (const withdrawal of withdrawals) {
          // Check for existing transaction
          const exists = await CryptoTransaction.findOne({ transactionId: withdrawal.txId });
          if (exists) continue;

          // Validate amount and fee
          if (isNaN(Number(withdrawal.amount)) || isNaN(Number(withdrawal.transactionFee))) {
            console.error(`Invalid amount or fee for withdrawal ${withdrawal.txId} for user ${user.userId}`);
            continue;
          }

          // Create new transaction
          const newCryptoTx = new CryptoTransaction({
            client: user._id,
            amount: Number(withdrawal.amount),
            transactionFee: Number(withdrawal.transactionFee),
            timestamp: withdrawal.applyTime ? new Date(withdrawal.applyTime) : new Date(),
            completeTime: withdrawal.completeTime ? new Date(withdrawal.completeTime) : undefined,
            wallet: 'Binance',
            currency: withdrawal.coin,
            conversionRate: null,
            transactionId: withdrawal.txId,
            address: withdrawal.address,
            txId: withdrawal.txId,
            network: withdrawal.network,
            transferType: withdrawal.transferType,
            withdrawOrderId: withdrawal.withdrawOrderId,
            info: withdrawal.info || '',
            confirmNo: withdrawal.confirmNo || 0,
            status: withdrawal.status
          });

          // Save transaction
          await newCryptoTx.save();
          console.log(`Saved withdrawal ${withdrawal.txId} for user ${user.userId}`);
        }
      } catch (err) {
        // Log detailed error
        console.error(`Error for user ${user.userId}:`, {
          message: err.message,
          code: err.code || (err.response && err.response.data && err.response.data.code),
          data: err.response && err.response.data ? err.response.data : null
        });
      }
    }
  } catch (error) {
    console.error('Error in pollUserWithdrawals:', error);
  }
}

function startPoller() {
  pollUserWithdrawals();
  setInterval(pollUserWithdrawals, 15 * 60 * 1000); // Run every 15 minutes
}

module.exports = { startPoller };