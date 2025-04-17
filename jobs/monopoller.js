const axios = require('axios');
const axiosRetry = require('axios-retry');
const mongoose = require('mongoose');
const User = require('./models/user');
const BankTransaction = require('./models/banktransaction');
const config = require('../routes/config');

// Configure axios with retries
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000, // 1s, 2s, 3s
  retryCondition: (error) => {
    return error.code === 'EAI_AGAIN' || error.response?.status >= 500;
  }
});

/**
 * Polls Mono for new bank transactions for all users with a Mono account ID.
 */
async function pollMonoTransactions() {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Fetch users with Mono account IDs
    const users = await User.find({
      monoAccountId: { $exists: true, $ne: '' }
    }).session(session);

    if (!users.length) {
      console.log('No users with Mono account IDs found.');
      await session.commitTransaction();
      session.endSession();
      return;
    }

    for (const user of users) {
      try {
        // Validate Mono account ID
        if (!user.monoAccountId) {
          console.log(`Skipping user ${user._id}: No Mono account ID.`);
          continue;
        }

        // Fetch transactions from Mono API
        const url = `${config.mono.baseUrl}/v2/accounts/${user.monoAccountId}/transactions?paginate=false`;
        const response = await axios.get(url, {
          headers: {
            accept: 'application/json',
            'mono-sec-key': config.mono.secretKey
          }
        });

        const transactions = response.data?.data || [];
        if (!transactions.length) {
          console.log(`No new transactions for user ${user._id}.`);
          continue;
        }

        for (const tx of transactions) {
          // Check if transaction exists
          const exists = await BankTransaction.findOne({ transactionId: tx.id }).session(session);
          if (exists) continue;

          // Save new BankTransaction
          const newBankTx = new BankTransaction({
            source: 'mono',
            transactionId: tx.id,
            amount: Number(tx.amount) || 0,
            narration: tx.narration || '',
            timestamp: tx.date ? new Date(tx.date) : new Date(),
            client: user._id.toString(),
            type: tx.type || 'unknown',
            balance: Number(tx.balance) || 0,
            category: tx.category || 'uncategorized'
          });

          await newBankTx.save({ session });
          console.log(`Saved Mono transaction ${tx.id} for user ${user._id} at ${new Date().toISOString()}`);
        }
      } catch (error) {
        console.error(`Error for user ${user._id}:`, {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          response: error.response?.data,
          stack: error.stack
        });
      }
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Mono polling error:', {
      message: error.message,
      stack: error.stack
    });
  }
}

module.exports = { pollMonoTransactions };