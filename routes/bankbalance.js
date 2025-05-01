const express = require('express');
const router = express.Router();
const BankBalanceLog = require('../models/bankbalance'); // ✅ Your bank balance model

// GET /bankbalance/latest - Get the latest bank balance for the logged-in user
router.get('/bankbalance', async (req, res) => {
  try {
    const latestLog = await BankBalanceLog
      .findOne({ client: req.user.id })
      .sort({ fetchedAt: -1 })
      .select('balance currency bankName fetchedAt'); // ✅ Only necessary fields

    if (!latestLog) {
      return res.status(404).json({ 
        success: false, 
        message: 'No bank balance record found.' 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        balance: latestLog.balance,
        currency: latestLog.currency,
        bankName: latestLog.bankName,
        fetchedAt: latestLog.fetchedAt,
      }
    });

  } catch (err) {
    console.error('Error fetching latest bank balance:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching bank balance.' 
    });
  }
});

module.exports = router;
