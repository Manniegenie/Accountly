// binanceUserStream.js

// Polyfill for fetch (for Node.js < 18)
if (typeof fetch === 'undefined') {
  console.log('Global fetch is not available, setting up node-fetch polyfill.');
  globalThis.fetch = require('node-fetch');
}

const axios = require('axios');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const util = require('util');

const User = require('../models/user');
const CryptoTransaction = require('../models/cryptotransaction');

/**
 * Obtains a listenKey for a user’s data stream.
 * Uses the REST endpoint /api/v3/userDataStream.
 * Note: Only the API key (not the secret) is needed for this call.
 */
async function getListenKey(apiKey) {
  try {
    const response = await axios.post('https://api.binance.com/api/v3/userDataStream', null, {
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    });
    return response.data.listenKey;
  } catch (err) {
    throw new Error('Failed to obtain listenKey: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
  }
}

/**
 * Keeps the listenKey alive by sending a PUT request every 30 minutes.
 */
function startKeepAlive(listenKey, apiKey) {
  setInterval(async () => {
    try {
      await axios.put(`https://api.binance.com/api/v3/userDataStream?listenKey=${listenKey}`, null, {
        headers: { 'X-MBX-APIKEY': apiKey },
      });
      console.log('Sent keep-alive for listenKey:', listenKey);
    } catch (err) {
      console.error('Error sending keep-alive for listenKey:', listenKey, err.response ? util.inspect(err.response.data, { depth: null }) : err.message);
    }
  }, 30 * 60 * 1000); // every 30 minutes
}

/**
 * Processes a balance update event from the user data stream.
 * If the event indicates a negative balance delta (withdrawal),
 * it generates a unique transaction id and saves it if it doesn't exist.
 */
async function processBalanceUpdate(user, event) {
  // Only process if the delta is negative
  const delta = parseFloat(event.d);
  if (delta >= 0) {
    return; // Not a withdrawal
  }

  // Construct a pseudo-unique transaction id.
  // You can adjust this logic as needed.
  const transactionId = `${user._id}-${event.E}-${event.a}`;
  console.log(`Detected withdrawal event for user ${user.userId}: transactionId: ${transactionId}, asset: ${event.a}, amount: ${Math.abs(delta)}`);

  // Check if the transaction already exists.
  const exists = await CryptoTransaction.findOne({ transactionId });
  if (exists) {
    console.log(`Withdrawal transaction ${transactionId} already processed for user ${user.userId}.`);
    return;
  }

  // Create a new crypto transaction record.
  const newCryptoTx = new CryptoTransaction({
    client: user._id,
    amount: Math.abs(delta),
    transactionFee: 0, // Fee information is not provided in this event.
    timestamp: new Date(event.E),
    completeTime: undefined,
    wallet: 'Binance',
    currency: event.a,
    conversionRate: null,
    transactionId,
    address: '', // Not provided in the balanceUpdate event.
    txId: '',
    network: '',
    transferType: 0,
    withdrawOrderId: '',
    info: 'Withdrawal via balanceUpdate event',
    confirmNo: 0,
    status: 'withdrawal'
  });

  try {
    await newCryptoTx.save();
    console.log(`Saved new withdrawal transaction ${transactionId} for user ${user.userId}`);
  } catch (saveErr) {
    console.error(`Error saving withdrawal transaction ${transactionId} for user ${user.userId}:`, util.inspect(saveErr, { depth: null }));
  }
}

/**
 * Set up a Binance User Data WebSocket stream for a given user.
 */
async function setupUserStream(user) {
  try {
    // Obtain a listenKey using the user's API key.
    const listenKey = await getListenKey(user.binanceKey);
    console.log(`Obtained listenKey for user ${user.userId}:`, listenKey);

    // Start the keep-alive process for this listenKey.
    startKeepAlive(listenKey, user.binanceKey);

    // Connect to the WebSocket endpoint using the listenKey.
    const wsUrl = `wss://stream.binance.com:9443/ws/${listenKey}`;
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.log(`WebSocket connection opened for user ${user.userId}.`);
    });

    ws.on('message', async (data) => {
      try {
        const event = JSON.parse(data);
        console.log(`Received event for user ${user.userId}:`, JSON.stringify(event, null, 2));
        if (event.e === 'balanceUpdate') {
          // Process balance update events (potential withdrawals).
          await processBalanceUpdate(user, event);
        }
        // Add additional event types (e.g., executionReport) if desired.
      } catch (err) {
        console.error(`Error processing message for user ${user.userId}:`, err);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${user.userId}:`, error);
    });

    ws.on('close', () => {
      console.log(`WebSocket connection closed for user ${user.userId}. Attempting reconnect in 5 seconds...`);
      setTimeout(() => setupUserStream(user), 5000);
    });
  } catch (err) {
    console.error(`Error setting up data stream for user ${user.userId}:`, err);
  }
}

/**
 * Set up user streams for all users with Binance credentials.
 */
async function setupAllUserStreams() {
  try {
    const users = await User.find({
      binanceKey: { $exists: true, $ne: '' },
      binanceSecret: { $exists: true, $ne: '' }
    });
    if (!users.length) {
      console.log('No users with Binance credentials found.');
      return;
    }

    for (const user of users) {
      setupUserStream(user);
    }
  } catch (err) {
    console.error('Error setting up user streams:', err);
  }
}

// Start the process.
setupAllUserStreams();
