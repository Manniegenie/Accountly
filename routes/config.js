require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGODB_URI,
  deepseek: {
    key: process.env.DEEPSEEK_API_KEY
  },
  exchangeRateApiUrl: process.env.EXCHANGE_RATE_API_URL,
  binance: {
    key: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET
  },
  Mono: {
    webhookSecret: process.env.MONO_WEBHOOK_SECRET,
    key: process.env.MONO_PUBLIC_KEY,
    secret: process.env.MONO_PRIVATE_KEY,
    baseUrl: process.env.MONO_BASE_URL
},
redirect_url: process.env.MONO_REDIRECT_URL,

jwtSecret: process.env.JWT_SECRET || 'yourSuperSecretKey'
};

