// scheduler.js
const cron = require('node-cron');
const mongoose = require('mongoose');
const config = require('./routes/config');
const { getUnifiedTransactionLog } = require('../services/logService');

// Connect to MongoDB before scheduling (if this scheduler runs as an independent process)
mongoose.connect(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB for scheduler"))
  .catch(err => console.error("MongoDB connection error in scheduler:", err));

// Schedule the task to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running scheduled transaction log fetch...');
  try {
    const logs = await getUnifiedTransactionLog();
    // Here you can perform additional actions with the logs if needed.
    // Currently, the log service already outputs a table to the console via console.table()
  } catch (error) {
    console.error("Scheduler error while fetching logs:", error);
  }
});

console.log('Scheduler started: transaction logs will be fetched every 5 minutes.');
