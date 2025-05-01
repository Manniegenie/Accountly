const axios = require('./node_modules/axios/index.d.cts');
const axiosRetry = require('axios-retry');
console.log('axiosRetry:', typeof axiosRetry, axiosRetry);
axiosRetry.default(axios, { retries: 3 });
console.log('Setup complete');