require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/reconciliation',
  deepseek: {
    key: process.env.DEEPSEEK_API_KEY
  },
  exchangeRateApiUrl: process.env.EXCHANGE_RATE_API_URL,
  binance: {
    key: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET
  }
};
