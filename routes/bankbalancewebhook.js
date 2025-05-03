const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const config = require('./config');
const BankBalanceLog = require('../models/bankbalance');

// Verify webhook signature
function isValidSignature(req) {
  const signature = req.headers['mono-webhook-signature'];
  const computedHash = crypto
    .createHmac('sha512', config.Mono.webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return signature === computedHash;
}

router.post('/webhook', async (req, res) => {
  try {
    if (!isValidSignature(req)) {
      console.warn('Invalid Mono webhook signature');
      return res.status(403).send('Invalid signature');
    }

    const event = req.body;
    const data = event.data;

    console.log('📩 Mono webhook received:', { event: event.event, user: data?.user_id });

    if (event.event === 'account_updated' && data) {
      const accountId = data._id;

      await BankBalanceLog.findOneAndUpdate(
        { accountId },
        {
          balance: data.balance,
          currency: data.currency || 'NGN',
          accountNumber: data.account_number,
          fetchedAt: new Date(),
        },
        { new: true }
      );

      console.log('✅ Bank balance updated via webhook', { accountId, balance: data.balance });
    }

    return res.status(200).send('Webhook received');

  } catch (err) {
    console.error('❌ Error handling Mono webhook', { message: err.message });
    return res.status(500).send('Internal error');
  }
});

module.exports = router;
