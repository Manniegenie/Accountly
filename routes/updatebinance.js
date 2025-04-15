// routes/updateBinance.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');

// This middleware is assumed to be applied globally so that req.user is set.
router.put('/update-binance', async (req, res) => {
  try {
    const userId = req.user.id; // From authentication middleware
    const { binanceKey, binanceSecret } = req.body;
    
    if (!binanceKey || !binanceSecret) {
      return res.status(400).json({ error: "Both binanceKey and binanceSecret are required." });
    }
    
    // Update the authenticated user’s record with the provided credentials.
    // This will update only the single document that belongs to that user.
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { binanceKey, binanceSecret },
      { new: true, runValidators: true } // Return the updated document
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }
    
    res.json({
      success: true,
      message: "Binance credentials updated successfully.",
      data: {
        userId: updatedUser.userId,
        binanceKey: updatedUser.binanceKey,
        binanceSecret: updatedUser.binanceSecret
      }
    });
  } catch (error) {
    console.error("Error updating Binance credentials:", error);
    res.status(500).json({ error: "An error occurred while updating Binance credentials." });
  }
});

module.exports = router;
