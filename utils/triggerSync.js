const axios = require('axios');
const config = require('../routes/config');
const winston = require('winston');

// Logger (or replace with your existing logger)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()],
});

/**
 * Triggers Mono sync for a given accountId.
 * Returns true if successful, false otherwise.
 */
async function triggerMonoSync(accountId) {
  try {
    const response = await axios.post(
      `${config.Mono.baseUrl}/v2/accounts/${accountId}/sync`,
      null,
      {
        headers: {
          'mono-sec-key': config.Mono.secret,
          Accept: 'application/json',
        },
        timeout: 10000,
      }
    );

    const status = response.data?.status;

    if (status === 'successful') {
      logger.info('Mono sync triggered successfully', { accountId });
      return true;
    } else {
      logger.warn('Mono sync failed', { accountId, status });
      return false;
    }

  } catch (error) {
    logger.error('Error triggering Mono sync', {
      accountId,
      message: error.response?.data?.message || error.message,
    });
    return false;
  }
}

module.exports = triggerMonoSync;
