const axios = require('axios');
const config = require('../routes/config');
const User = require('../models/user');
const BankTransaction = require('../models/banktransaction');

/**
 * Polls Mono for new bank transactions for the specified user.
 */
async function pollMonoForUser(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return console.error(`User ${userId} not found.`);
    if (!user.monoAccountId) {
      return console.log(`No Mono account ID for user ${userId}.`);
    }

    const url = `${config.mono.baseUrl}/v2/accounts/${user.monoAccountId}/transactions?paginate=false`;
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'mono-sec-key': config.mono.secretKey,
      }
    });

    const transactions = response.data?.data || [];
    for (const tx of transactions) {
      const exists = await BankTransaction.findOne({ transactionId: tx.id });
      if (exists) continue;

      await new BankTransaction({
        source: 'mono',
        transactionId: tx.id,
        amount: tx.amount,
        narration: tx.narration,
        timestamp: new Date(tx.date),
        client: userId,
        type: tx.type,
        balance: tx.balance,
        category: tx.category,
      }).save();

      console.log(`Saved Mono tx ${tx.id} for user ${userId}`);
    }
  } catch (error) {
    console.error("Error in Mono poller:", error.message);
  }
}

/**
 * Schedules Mono poller to run every 2 minutes and stops it after 1 hour.
 * 
 * @param {String} userId 
 * @returns {NodeJS.Timeout} The interval ID
 */
function scheduleMonoPoller(userId) {
  // Run immediately
  pollMonoForUser(userId);

  // Schedule polling every 2 minutes (120,000 ms)
  const intervalId = setInterval(() => pollMonoForUser(userId), 120000);

  // Stop polling after 1 hour (3,600,000 ms)
  setTimeout(() => {
    clearInterval(intervalId);
    console.log(`Mono poller stopped after 1 hour for user ${userId}`);
  }, 3600000);

  return intervalId;
}

module.exports = { pollMonoForUser, scheduleMonoPoller };
