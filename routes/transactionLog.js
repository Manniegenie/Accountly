// routes/transactionLog.js
const express = require('express');
const router = express.Router();
const { getUnifiedTransactionLog } = require('../services/logService');

// GET /api/logs - Returns unified transaction logs as JSON.
router.get('/', async (req, res) => {
  try {
    const logs = await getUnifiedTransactionLog();
    res.json({ logs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
