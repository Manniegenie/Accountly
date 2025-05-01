const User = require('../models/user');
const { reconcileLatestTransactions } = require('../services/reconcileService');

/**
 * Polls all users and runs reconciliation every 15 minutes.
 */
async function pollUserReconciliation() {
  try {
    const users = await User.find({}); // You can filter further if needed

    for (const user of users) {
      try {
        console.log(`🔄 Running reconciliation for ${user.username}`);
        const result = await reconcileLatestTransactions(user._id);
        console.log(`✅ ${result.message} for ${user.username}`);
      } catch (userError) {
        console.error(`❌ Failed reconciliation for ${user.username}:`, userError.message);
      }
    }
  } catch (err) {
    console.error('🔥 Failed to load users for reconciliation:', err.message);
  }
}

function startReconcilePoller() {
  pollUserReconciliation();
  setInterval(pollUserReconciliation, 15 * 60 * 1000); // every 15 minutes
}

module.exports = { startReconcilePoller };
