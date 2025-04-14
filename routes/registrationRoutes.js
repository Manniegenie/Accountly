const express = require('express');
const router = express.Router();
const PendingUser = require('../models/pendinguser');
const User = require('../models/user');  // Use correct casing for your model file

// POST: /api/registration/complete
// Expected payload: { email: "user@example.com", password: "newPassword" }
router.post('/complete', async (req, res) => {
  const { email, password } = req.body;

  // Validate that both email and password have been provided.
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    // Find the pending user by email.
    const pendingUser = await PendingUser.findOne({ email });
    if (!pendingUser) {
      return res.status(404).json({ message: "Pending user not found." });
    }

    // Create a new full user using data from the pending user and the provided password.
    const fullUser = new User({
      username: pendingUser.username,
      email: pendingUser.email,
      binanceKey: pendingUser.binanceKey,
      binanceSecret: pendingUser.binanceSecret,
      // The password field will trigger the pre-save hook to hash the password.
      password
    });

    // Save the new full user record.
    await fullUser.save();

    // Remove the pending user record.
    await PendingUser.deleteOne({ email });

    // Convert fullUser to JSON so that virtual fields like userId are included.
    const userJSON = fullUser.toJSON();

    res.status(201).json({ 
      message: "User registration completed successfully.", 
      user: userJSON
    });
  } catch (err) {
    console.error("Error during registration completion:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

module.exports = router;
