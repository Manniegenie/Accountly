const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/user');
const config = require('./config');

// ✅ Pollers
const { startUserPortfolioPolling } = require('../jobs/cryptobalancepoller');
const { startUserBankPolling } = require('../jobs/bankbalancepoller'); // 👈 Import bank poller

router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password." });
    }

    const payload = {
      id: user._id,
      email: user.email,
      username: user.username
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });

    // ✅ Start Binance crypto poller
    if (user.binanceKey && user.binanceSecret) {
      startUserPortfolioPolling(user);
    } else {
      console.log(`User ${user._id} has no Binance credentials, skipping crypto poller.`);
    }

    // ✅ Start Mono bank poller
    if (user.monoAccountId) {
      startUserBankPolling(user);
    } else {
      console.log(`User ${user._id} has no monoAccountId, skipping bank poller.`);
    }

    res.status(200).json({
      message: "Sign in successful.",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Error during sign in:", error);
    res.status(500).json({ message: "Server error during sign in." });
  }
});

module.exports = router;
