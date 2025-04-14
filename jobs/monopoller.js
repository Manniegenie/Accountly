// jobs/monoPoller.js
const axios = require('axios');
const config = require('../routes/config');
const User = require('../models/user');
const BankTransaction = require('../models/banktransaction');

async function pollMonoForUser(userId) {
  try {
    // Retrieve the user record.
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    // Check if the user has a Mono account.
    if (!user.monoAccountId) {
      console.log(`No Mono account linked for user ${userId}.`);
      return;
    }

    const url = `${config.mono.baseUrl}/v2/accounts/${user.monoAccountId}/transactions?paginate=false`;
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'mono-sec-key': config.mono.secretKey, // Mono credentials come from config
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
            client: userId,
            type: tx.type,
            balance: tx.balance,
            category: tx.category,
          });
          await newTx.save();
          console.log(`Stored new Mono transaction: ${tx.id} for user ${userId}`);
        } else {
          console.log(`Mono transaction ${tx.id} exists; skipping.`);
        }
      }
    } else {
      console.error(`Unexpected response for Mono transactions of user ${userId}`);
    }
  } catch (error) {
    console.error("Error in pollMonoForUser:", error.message);
  }
}

function startMonoPoller(userId) {
  // Immediately poll once.
  pollMonoForUser(userId);
  // Schedule polling every 2 minutes.
  return setInterval(() => {
    pollMonoForUser(userId);
  }, 120000);
}

module.exports = { startMonoPoller, pollMonoForUser };
