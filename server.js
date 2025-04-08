const express = require('express');
const mongoose = require('mongoose');
const config = require('./routes/config');
const reconcileRoutes = require('./routes/reconcile');
const binanceRoutes = require('./routes/binance');

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error(err));

// Set up routes
app.use('/reconcile', reconcileRoutes);
app.use('/binance', binanceRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
