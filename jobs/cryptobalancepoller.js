// jobs/portfoliopoller.js
const { Spot } = require('@binance/connector');
const PortfolioLog = require('../models/cryptobalance');
const Bottleneck = require('bottleneck');
const winston = require('winston');

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

const activePollers = new Map();

async function refreshPrices(client) {
  const pricesResponse = await limiter.schedule(() => client.tickerPrice());
  return new Map(pricesResponse.data.map(p => [p.symbol, parseFloat(p.price)]));
}

async function fetchTotalPortfolioValue(user) {
  const client = new Spot(user.binanceKey, user.binanceSecret, { timeout: CONFIG.REQUEST_TIMEOUT_MS });

  try {
    const accountResponse = await limiter.schedule(() => client.account());
    const balances = accountResponse.data.balances;

    if (!Array.isArray(balances)) {
      logger.error('Unexpected balances format', { userId: user._id });
      throw new Error('Invalid balances format');
    }

    const prices = await refreshPrices(client);
    let totalValueUSD = 0;

    for (const balance of balances) {
      const free = parseFloat(balance.free);
      const locked = parseFloat(balance.locked);
      const total = free + locked;

      if (total <= 0) continue;

      const asset = balance.asset.toUpperCase();
      let price = 1; // USDT assumed 1

      if (asset !== 'USDT') {
        const symbol = `${asset}USDT`;
        price = prices.get(symbol) || 0;

        if (!price) {
          // Try asset priced in BTC
          const assetBtcPrice = prices.get(`${asset}BTC`);
          const btcUsdtPrice = prices.get('BTCUSDT');

          if (assetBtcPrice && btcUsdtPrice) {
            price = assetBtcPrice * btcUsdtPrice;
          }
        }
      }

      totalValueUSD += total * price;
    }

    // Save to PortfolioLog
    await PortfolioLog.create({
      client: user._id,
      totalValueUSD: totalValueUSD.toFixed(2),
    });

    logger.info('Portfolio log saved', {
      userId: user._id,
      totalValueUSD: totalValueUSD.toFixed(2),
    });

  } catch (err) {
    logger.error('Error fetching portfolio value', {
      userId: user._id,
      message: err.message,
    });
    throw err;
  }
}

async function startUserPortfolioPolling(user) {
  const userId = user._id.toString();

  if (activePollers.has(userId)) {
    logger.info('Poller already running', { userId });
    return;
  }

  logger.info('Starting portfolio poller', { userId });

  const poll = async () => {
    try {
      await fetchTotalPortfolioValue(user);
    } catch (err) {
      logger.error('Polling error', { userId, message: err.message });
    }

    if (activePollers.has(userId)) {
      activePollers.set(userId, setTimeout(poll, CONFIG.POLLING_INTERVAL_MS));
    }
  };

  activePollers.set(userId, setTimeout(poll, 0));
}

function stopUserPortfolioPolling(userId) {
  userId = userId.toString();
  const intervalId = activePollers.get(userId);

  if (intervalId) {
    clearTimeout(intervalId);
    activePollers.delete(userId);
    logger.info('Stopped portfolio poller', { userId });
  }
}

function shutdown() {
  activePollers.forEach((_, userId) => stopUserPortfolioPolling(userId));
  logger.info('All portfolio pollers stopped');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { startUserPortfolioPolling, stopUserPortfolioPolling, shutdown };
