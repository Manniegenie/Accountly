const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/user');
const config = require('./config'); // Assuming you have a config file with jwtSecret & other config values.

// POST: /api/auth/signin
// Expected JSON payload: { email: "user@example.com", password: "userPassword" }
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  // Validate that both email and password are provided.
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    // Find the user in the database by email.
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Compare the provided password with the stored hashed password.
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password." });
    }

    // Prepare the payload for the token.
    const payload = {
      id: user._id,
      email: user.email,
      username: user.username
    };

    // Generate a JWT token.
    // Note: Adjust expiration as needed. This example sets it to expire in 1 hour.
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });

    // Successful authentication response
    res.status(200).json({
      message: "Sign in successful.",
      token, // Return the token so it can be used for subsequent requests
      user: {
        id: user._id,
        username: user.username,
        email: user.email
        // Exclude sensitive info such as the password.
      }
    });
  } catch (error) {
    console.error("Error during sign in:", error);
    res.status(500).json({ message: "Server error during sign in." });
  }
});

module.exports = router;
