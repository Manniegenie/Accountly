// authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/user');
const config = require('./config');
const { startBinancePoller } = require('../jobs/binancepoller');
const { startMonoPoller } = require('../jobs/monopoller');
// Update the import to match the correct file and function name
const { startReconcileScheduler } = require('../jobs/reconcileScheduler');

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

    // Start Binance poller if credentials exist.
    if (user.binanceKey && user.binanceSecret) {
      startBinancePoller(user._id);
      console.log(`Binance poller started for user ${user._id}`);
    } else {
      console.log(`User ${user._id} does not have Binance credentials.`);
    }

    // Start Mono poller if account linked.
    if (user.monoAccountId) {
      startMonoPoller(user._id);
      console.log(`Mono poller started for user ${user._id}`);
    } else {
      console.log(`User ${user._id} does not have a Mono account linked.`);
    }

    // Start the global reconciliation scheduler (no market rate parameter)
    startReconcileScheduler();
    console.log("Reconciliation scheduler started globally.");

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
