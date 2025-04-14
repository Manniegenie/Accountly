const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/user');
const config = require('./config');
const { startBinancePoller } = require('../jobs/binancepoller');
const { startMonoPoller } = require('../jobs/monopoller');

router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    // Find the user by email.
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Compare password.
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password." });
    }

    // Prepare payload for JWT using user id from the User schema.
    const payload = {
      id: user._id,
      email: user.email,
      username: user.username
    };

    // Generate JWT token (expires in 1 hour).
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
    
    // Start pollers:
    // If user has Binance credentials, start the Binance poller.
    if (user.binanceKey && user.binanceSecret) {
      const binanceIntervalId = startBinancePoller(user._id);
      console.log(`Binance poller started for user ${user._id}`);
    } else {
      console.log(`User ${user._id} does not have Binance credentials.`);
    }
    // If user has a Mono account linked, start the Mono poller.
    if (user.monoAccountId) {
      const monoIntervalId = startMonoPoller(user._id);
      console.log(`Mono poller started for user ${user._id}`);
    } else {
      console.log(`User ${user._id} does not have a Mono account linked.`);
    }

    // Return successful sign-in response.
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
