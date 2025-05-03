const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const config = require('../routes/config');
const BankBalanceLog = require('../models/bankbalance');
const winston = require('winston');

// Logger (replace if you already have one)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

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
      logger.warn('Invalid Mono webhook signature');
      return res.status(403).send('Invalid signature');
    }

    const event = req.body;
    const data = event.data;

    logger.info('Received Mono webhook', { event: event.event, accountId: data?._id });

    if (event.event === 'account_updated' && data) {
      const accountId = data._id;

      await BankBalanceLog.findOneAndUpdate(
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

      logger.info('Bank balance updated via webhook', { accountId, balance: data.balance });
    }

    return res.status(200).send('Webhook received');
  } catch (err) {
    logger.error('Webhook error', { message: err.message });
    return res.status(500).send('Internal error');
  }
});

module.exports = router;
