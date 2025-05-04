const express = require('express');
const router = express.Router();
const BankBalanceLog = require('../models/bankbalance');
const User = require('../models/user');
const triggerMonoSync = require('../utils/triggerSync');
const config = require('../routes/config');
const axios = require('axios');

// GET /bankinfo/bank-balance - Get the latest fiat bank balance
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
    let balanceLog = await BankBalanceLog.findOne({ accountId });

    const now = Date.now();
    const isStale = !balanceLog || (now - new Date(balanceLog.fetchedAt).getTime()) > 5 * 60 * 1000;

    if (!balanceLog || isStale) {
      await triggerMonoSync(accountId);
      await new Promise(res => setTimeout(res, 8000));

      const response = await axios.get(`${config.Mono.baseUrl}/v2/accounts/${accountId}/balance`, {
        headers: {
          'mono-sec-key': config.Mono.secret,
          Accept: 'application/json',
        },
      });

      const data = response.data?.data;

      if (!data || typeof data.balance !== 'number') {
        return res.status(502).json({
          success: false,
          message: 'Invalid balance data received from Mono.',
        });
      }

      balanceLog = await BankBalanceLog.findOneAndUpdate(
        { accountId },
        {
          monoUserId: data.user_id,
          balance: data.balance,
          currency: data.currency || 'NGN',
          accountNumber: data.account_number,
          name: data.name,
          bankName: 'Unknown',
          fetchedAt: new Date(),
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }

    res.status(200).json({
      success: true,
      data: {
        balance: balanceLog.balance,
        currency: balanceLog.currency,
        fetchedAt: balanceLog.fetchedAt,
      }
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
