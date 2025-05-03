const axios = require('axios');
const Bottleneck = require('bottleneck');
const winston = require('winston');
const BankBalanceLog = require('../models/bankbalance'); // Make sure this path is correct
const config = require('../routes/config'); // Adjust path if needed

// Configurations
const CONFIG = {
  POLLING_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  REQUEST_TIMEOUT_MS: 10000,
  MAX_CONCURRENT_REQUESTS: 10,
  MIN_REQUEST_INTERVAL_MS: 100,
};

const limiter = new Bottleneck({
  maxConcurrent: CONFIG.MAX_CONCURRENT_REQUESTS,
  minTime: CONFIG.MIN_REQUEST_INTERVAL_MS,
});

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const monoSecretKey = config.Mono.secret;
const monoBaseUrl = config.Mono.baseUrl;

const activeBankPollers = new Map();

async function fetchBankBalance(user) {
  const accountId = user.monoAccountId;

  if (!accountId) {
    logger.warn('Missing monoAccountId for user', { userId: user._id });
    return;
  }

  try {
    const response = await limiter.schedule(() =>
      axios.get(`${monoBaseUrl}/v2/accounts/${accountId}/balance`, {
        headers: {
          'mono-sec-key': monoSecretKey,
          Accept: 'application/json',
        },
        timeout: CONFIG.REQUEST_TIMEOUT_MS,
      })
    );

    const data = response.data?.data;
    if (!data || typeof data.balance !== 'number') {
      throw new Error('Invalid or missing balance data');
    }

    await BankBalanceLog.create({
      client: user._id,
      accountId: data.id,
      accountNumber: data.account_number,
      balance: data.balance,
      currency: data.currency || 'NGN',
      bankName: 'Unknown',
      accountType: '',
      fetchedAt: new Date(),
    });

    logger.info('Bank balance logged', {
      userId: user._id,
      balance: data.balance,
    });

  } catch (err) {
    logger.error('Error fetching bank balance', {
      userId: user._id,
      message: err.response?.data?.message || err.message,
    });
  }
}

async function startUserBankPolling(user) {
  const userId = user._id.toString();

  if (activeBankPollers.has(userId)) {
    logger.info('Bank poller already running', { userId });
    return;
  }

  logger.info('Starting bank poller', { userId });

  const poll = async () => {
    try {
      await fetchBankBalance(user);
    } catch (err) {
      logger.error('Bank polling error', { userId, message: err.message });
    }

    if (activeBankPollers.has(userId)) {
      activeBankPollers.set(userId, setTimeout(poll, CONFIG.POLLING_INTERVAL_MS));
    }
  };

  activeBankPollers.set(userId, setTimeout(poll, 0));
}

function stopUserBankPolling(userId) {
  userId = userId.toString();
  const intervalId = activeBankPollers.get(userId);

  if (intervalId) {
    clearTimeout(intervalId);
    activeBankPollers.delete(userId);
    logger.info('Stopped bank poller', { userId });
  }
}

function shutdown() {
  activeBankPollers.forEach((_, userId) => stopUserBankPolling(userId));
  logger.info('All bank pollers stopped');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { startUserBankPolling, stopUserBankPolling, shutdown };
