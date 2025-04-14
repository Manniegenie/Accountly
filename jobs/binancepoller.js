const axios = require('axios');
const crypto = require('crypto');
const config = require('../routes/config');
const User = require('../models/user');
const CryptoTransaction = require('../models/cryptotransaction');
const { fetchUSDTtoNairaRate } = require('../services/rateService');

/**
 * Polls Binance for successful withdrawal transactions within the last 3 hours.
 * Saves them to the CryptoTransaction collection.
 * 
 * @param {String} userId - The MongoDB user ID
 */
async function pollBinanceForUser(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User ${userId} not found.`);
      return;
    }

    if (!user.binanceKey || !user.binanceSecret) {
      console.log(`No Binance credentials for user ${userId}.`);
      return;
    }

    const now = Date.now();
    const threeHoursAgo = now - 3 * 60 * 60 * 1000;

    const query = `startTime=${threeHoursAgo}&endTime=${now}&timestamp=${now}`;
    const signature = crypto.createHmac('sha256', user.binanceSecret).update(query).digest('hex');
    const finalUrl = `https://api.binance.com/sapi/v1/capital/withdraw/history?${query}&signature=${signature}`;

    const response = await axios.get(finalUrl, {
      headers: {
        'X-MBX-APIKEY': user.binanceKey
      }
    });

    const withdrawals = (response.data || []).filter(tx => tx.status === 6); // Only successful

    let rate;
    try {
      rate = await fetchUSDTtoNairaRate();
    } catch (err) {
      console.warn("Rate fetch failed. Using fallback rate of 1.");
      rate = 1;
    }

    for (const tx of withdrawals) {
      const exists = await CryptoTransaction.findOne({ transactionId: tx.id });
      if (exists) continue;

      await new CryptoTransaction({
        client: userId,
        amount: Number(tx.amount),
        transactionFee: Number(tx.transactionFee),
        timestamp: new Date(tx.applyTime),
        completeTime: tx.completeTime ? new Date(tx.completeTime) : undefined,
        wallet: 'Binance',
        currency: tx.coin,
        conversionRate: rate,
        transactionId: tx.id,
        address: tx.address,
        txId: tx.txId,
        network: tx.network,
        transferType: tx.transferType,
        withdrawOrderId: tx.withdrawOrderId,
        info: tx.info,
        confirmNo: tx.confirmNo,
        status: tx.status
      }).save();

      console.log(`Saved successful Binance withdrawal tx ${tx.id} for user ${userId}`);
    }

  } catch (error) {
    console.error("Error in Binance poller:", error.response?.data || error.message);
  }
}

/**
 * Schedules Binance poller to run every 2 minutes.
 * 
 * @param {String} userId 
 * @returns {NodeJS.Timeout}
 */
function scheduleBinancePoller(userId) {
  pollBinanceForUser(userId);
  return setInterval(() => pollBinanceForUser(userId), 120000);
}

module.exports = {
  pollBinanceForUser,
  scheduleBinancePoller
};
