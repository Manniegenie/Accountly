const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Use the User model

// POST: /api/users/update-binance
// Expected payload: { binanceKey, binanceSecret }
router.post('/update-binance', async (req, res) => {
  // Extract Binance credentials from the request body.
  const { binanceKey, binanceSecret } = req.body;

  // Validate required fields.
  if (!binanceKey || !binanceSecret) {
    return res.status(400).json({ message: 'Binance Key and Binance Secret are required.' });
  }

  try {
    // Assumes req.user is set by previous authentication middleware.
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });     }

    // Update the Binance credentials.
    user.binanceKey = binanceKey;
    user.binanceSecret = binanceSecret;

    // Save the updated user record.
    await user.save();
    res.status(200).json({ message: 'Binance credentials updated successfully.' });
  } catch (error) {
    console.error("Error updating Binance credentials:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
