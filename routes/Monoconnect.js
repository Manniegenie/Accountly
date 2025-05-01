const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('./config'); // Your config file
const User = require('../models/user');
const { body, param, validationResult } = require('express-validator');

// Config values
const { secret, baseUrl } = config.Mono;
const redirectUrl = config.redirect_url;

// Mono request headers
const monoHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'mono-sec-key': secret,
};

// Utility for handling API errors
const handleApiError = (res, error, defaultMessage) => {
  const status = error.response?.status || 500;
  const message = error.response?.data?.message || defaultMessage;
  console.error(`${defaultMessage}:`, {
    message: error.message,
    response: error.response?.data,
    status,
  });
  return res.status(status).json({ success: false, error: message });
};

// Validate Mono callback
const validateCallback = [
  body('code').notEmpty().withMessage('Code parameter is required'),
];

// Validate Mono account sync route
const validateAccountId = [
  param('accountId').notEmpty().withMessage('Account ID is required'),
];

// ---------------------------------------------
// POST /monoconnect/initiate
// ---------------------------------------------
router.post('/initiate', async (req, res) => {
  try {
    const userId = req.user?.id || 'demo-user-id';

    const customer = {
      name: 'Samuel Olamide',
      email: 'samuel@neem.com',
    };

    const meta = {
      ref: userId,
    };

    const response = await axios.post(
      `${baseUrl}/v2/accounts/initiate`,
      {
        customer,
        meta,
        scope: 'auth',
        redirect_url: redirectUrl,
      },
      { headers: monoHeaders }
    );

    const monoUrl = response.data?.data?.mono_url;
    if (!monoUrl) {
      console.error('No mono_url in response:', response.data);
      return res.status(500).json({ success: false, error: 'Mono URL not found' });
    }

    console.log('✅ Mono URL:', monoUrl);
    return res.status(200).json({ success: true, mono_url: monoUrl });
  } catch (error) {
    return handleApiError(res, error, 'Mono initiation failed');
  }
});

// ---------------------------------------------
// POST /monoconnect/callback
// ---------------------------------------------
router.post('/callback', validateCallback, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { code } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User authentication required' });
    }

    const response = await axios.post(
      `${baseUrl}/v2/accounts/auth`,
      { code },
      { headers: monoHeaders }
    );

    const accountId = response.data.data?.id || response.data.id;
    if (!accountId) {
      console.error('No accountId in response:', response.data);
      return res.status(500).json({ success: false, error: 'No account ID returned' });
    }

    const existingUser = await User.findOne({ monoAccountId: accountId });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({
        success: false,
        error: 'This Mono account is already linked to another user',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { monoAccountId: accountId },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log('✅ User updated with Mono account:', { userId, accountId });
    return res.status(200).json({ success: true, data: { accountId } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'This Mono account is already linked to another user',
      });
    }
    return handleApiError(res, error, 'Mono callback failed');
  }
});

// ---------------------------------------------
// GET /monoconnect/account/:accountId/status
// ---------------------------------------------
router.get('/account/:accountId/status', validateAccountId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { accountId } = req.params;
    const response = await axios.get(`${baseUrl}/v1/accounts/${accountId}/sync`, {
      headers: monoHeaders,
    });

    return res.status(200).json({
      success: true,
      dataStatus: response.data.status || 'UNKNOWN',
    });
  } catch (error) {
    return handleApiError(res, error, 'Failed to check data status');
  }
});

module.exports = router;
