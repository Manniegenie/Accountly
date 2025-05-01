const axios = require('axios'); // ✅ CORRECT
const { default: axiosRetry } = require('axios-retry');
const User = require('../models/user');
const BankTransaction = require('../models/banktransaction');
const config = require('../routes/config');

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) =>
    error.response?.status >= 500 || error.code === 'ECONNABORTED',
});

async function pollMonoTransactions() {
  try {
    const users = await User.find(
      { monoAccountId: { $exists: true, $ne: '' } },
      'username monoAccountId _id lastSyncedAt'
    );

    if (!users.length) {
      console.log('No users with valid Mono account IDs found.');
      return;
    }

    for (const user of users) {
      const accountIds = Array.isArray(user.monoAccountId)
        ? user.monoAccountId
        : [user.monoAccountId];

      const syncStart = user.lastSyncedAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const isInitialSync = !user.lastSyncedAt;

      for (const accountId of accountIds) {
        try {
          const response = await axios.get(
            `https://api.withmono.com/v2/accounts/${accountId}/transactions?paginate=false`,
            {
              headers: {
                accept: 'application/json',
                'mono-sec-key': config.Mono.secret,
                'x-real-time': 'true',
              },
            }
          );

          const transactions = response.data.data;

          if (!Array.isArray(transactions) || transactions.length === 0) {
            console.log(
              `No recent transactions for account ${accountId} of user ${user.username}`
            );
            continue;
          }

          let newTxCount = 0;

          for (const tx of transactions) {
            const txDate = new Date(tx.date);
            if (txDate < syncStart) continue;

            const exists = await BankTransaction.findOne({
              transactionId: tx.id,
              client: user._id,
            });

            if (exists) continue;

            await BankTransaction.create({
              source: 'mono',
              transactionId: tx.id,
              amount: tx.amount / 100,
              narration: tx.narration,
              timestamp: txDate,
              client: user._id,
              type: ['credit', 'debit'].includes(tx.type) ? tx.type : 'unknown',
              balance: tx.balance / 100,
              category: tx.category || 'unknown',
            });

            newTxCount++;
            if (!isInitialSync) {
              console.log(`Saved transaction ${tx.id} for user ${user.username}`);
            }
          }

          // Update lastSyncedAt if we saved anything
          if (newTxCount > 0) {
            await User.findByIdAndUpdate(user._id, {
              lastSyncedAt: new Date(),
            });

            if (isInitialSync) {
              console.log(`✅ Synced ${newTxCount} transactions for ${user.username} (initial sync)`);
            } else {
              console.log(`✅ Synced ${newTxCount} new transactions for ${user.username}`);
            }
          }
        } catch (apiError) {
          const status = apiError.response?.status;
          if (status === 404) {
            console.warn(
              `Mono account ${accountId} not found for user ${user.username}. It may have been revoked.`
            );
          } else {
            console.error(
              `Error fetching transactions for account ${accountId} of user ${user.username}:`,
              apiError.response?.data || apiError.message
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in pollMonoTransactions:', error.message);
  }
}

function startMonoPoller() {
  pollMonoTransactions();
  setInterval(pollMonoTransactions, 15 * 60 * 1000); // every 15 mins
}

module.exports = { startMonoPoller };
