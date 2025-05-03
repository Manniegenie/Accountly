const express = require('express');
const router = express.Router();
const BankBalanceLog = require('../models/bankbalance');
const User = require('../models/user'); // ✅ Add this
const triggerMonoSync = require('../utils/triggerSync');
const config = require('../routes/config');
const axios = require('axios');

router.get('/bank-balance', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized: no user ID in token' });

    // ✅ Look up the full user from DB
    const user = await User.findById(userId).lean();

    if (!user || !user.monoAccountId) {
      return res.status(400).json({ error: 'Mono account not linked' });
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
        return res.status(502).json({ error: 'Invalid balance data from Mono' });
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

    return res.status(200).json({ data: { balance: balanceLog.balance } });

  } catch (err) {
    console.error('Error in /bank-balance/latest:', err);
    res.status(500).json({ error: 'Internal error fetching fiat balance' });
  }
});

module.exports = router;
