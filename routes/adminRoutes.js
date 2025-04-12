// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/pendinguser');

// POST: /api/admin/add-user
// Expected JSON payload: { email: "user@example.com", username: "userName" }
router.post('/add-user', async (req, res) => {
  const { email, username } = req.body;

  // Validate that both email and username have been provided.
  if (!email || !username) {
    return res.status(400).json({ message: "Email and username are required." });
  }

  try {
    // Check if the user already exists.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    // Create a new user with the provided email and username.
    // Binance credentials will be set later via another route.
    const newUser = new User({
      username,
      email,
      password: "",       //// Initially empty; will be updated via another route.
      binanceKey: "",    // Initially empty; will be updated via another route.
      binanceSecret: ""  // Initially empty; will be updated via another route.
    });

    // Save the new user document in the database.
    await newUser.save();

    res.status(201).json({ message: "User created successfully.", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error while creating user." });
  }
});

module.exports = router;
