const express = require('express');
const router = express.Router();
const BankBalanceLog = require('../models/bankbalance');
const User = require('../models/user');

// GET /bankinfo/bank-balance - Get the latest fiat bank balance from DB only
router.get('/bank-balance', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No user ID in token.',
      });
    }

    const user = await User.findById(userId).lean();

    if (!user || !user.monoAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Mono account not linked.',
      });
    }

    const accountId = String(user.monoAccountId).trim();

    // Get the latest bank balance entry for this mono account
    const latestLog = await BankBalanceLog
      .findOne({ accountId })
      .sort({ fetchedAt: -1 })
      .select('balance currency fetchedAt'); // optional: select only needed fields

    if (!latestLog) {
      return res.status(404).json({
        success: false,
        message: 'No bank balance found for this account.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        balance: latestLog.balance,
        currency: latestLog.currency,
        fetchedAt: latestLog.fetchedAt,
      },
    });

  } catch (err) {
    console.error('Error fetching bank balance:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching bank balance.',
    });
  }
});

module.exports = router;
