const express = require('express');
const router = express.Router();
const PortfolioLog = require('../models/cryptobalance'); // ✅ Correct model!

// GET /portfolio/latest - Get the latest total portfolio value
router.get('/portfolio/latest', async (req, res) => {
  try {
    const latestLog = await PortfolioLog
      .findOne({ client: req.user.id })
      .sort({ timestamp: -1 })
      .select('totalValueUSD timestamp'); // ✅ Select only needed fields

    if (!latestLog) {
      return res.status(404).json({ 
        success: false, 
        message: 'No portfolio log found.' 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        totalValueUSD: latestLog.totalValueUSD,
        timestamp: latestLog.timestamp,
      }
    });

  } catch (err) {
    console.error('Error fetching latest portfolio:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching latest portfolio.' 
    });
  }
});

module.exports = router;
