
---

# AI Accounting Software for OTC Crypto Traders

This project is a custom AI-powered accounting tool designed to help OTC crypto traders track and consolidate financial data from their crypto wallets and fiat bank accounts at scale. The software aggregates transaction data from various sources (e.g., Binance for crypto and Mono for bank data), processes it, and leverages an AI reconciliation engine (Deepseek/AIML API) to identify matching deals based on current market rates.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Polling and Reconciliation](#polling-and-reconciliation)
- [License](#license)

---

## Overview

This application consolidates financial transaction data from both crypto and traditional banking sources. It:
- Polls Binance for real-time crypto transaction data.
- Polls Mono for bank transaction history.
- Stores data in MongoDB using custom transaction models.
- Uses an AI reconciliation service to infer deals that link fiat inflows with crypto outflows at acceptable conversion rates.
- Provides RESTful endpoints for account data, reconciliation processing, and integration with external APIs.

---

## Features

- **Real-time Data Polling**  
  Continuously fetches data from Binance and Mono to capture the latest transactions.

- **Transaction Storage**  
  Stores both crypto and bank transactions in MongoDB using defined models.

- **AI-Powered Reconciliation**  
  Integrates with the Deepseek (AIML) API to compare transactions and determine matching deals based on a provided market rate.

- **API Endpoints for Data Exchange**  
  Exposes RESTful endpoints for querying Binance account details, initiating Mono connections, and processing reconciliation requests.

---

## Project Structure

```
.
├── config.js              # Application configurations and environment variables.
├── jobs
│   └── realtimePoller.js  # Polling logic for Binance and Mono transactions.
├── models
│   ├── BankTransaction.js # Model for bank transactions.
│   ├── CryptoTransaction.js  # Model for crypto transactions.
│   └── InferredDeal.js       # Model for inferred deal matching.
├── routes
│   ├── binance.js         # Endpoint to query Binance account info.
│   ├── mono.js            # Endpoints for Mono API integration.
│   ├── reconcile.js       # Endpoint for reconciling transactions using AI.
│   └── config.js          # Config for routes and external API keys.
├── services
│   ├── deepseekService.js # Service to call the AIML API for reconciliation.
│   └── rateService.js     # Service to fetch current exchange rates.
├── package.json           # Project manifest.
└── server.js              # Main server file.
```

---

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/ai-accounting-otc.git
   cd ai-accounting-otc
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**

   Create a `.env` file in the project root and add your configuration variables. Example:

   ```bash
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/your_database
   BINANCE_API_KEY=your_binance_api_key
   BINANCE_API_SECRET=your_binance_api_secret
   MONO_SECRET_KEY=your_mono_secret_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   EXCHANGE_RATE_API_URL=https://api.exchangerate.example
   AIML_API_KEY=your_aiml_api_key
   ```

4. **Start the Server**

   ```bash
   npm start
   ```

   The server should run on the specified port (default: http://localhost:3000).

---

## Configuration

All configuration settings are managed via environment variables (using a `.env` file) and loaded in the `config.js` file. The configurations include settings for:
- Port and MongoDB URI.
- API keys for Binance, Mono, and AI reconciliation (Deepseek/AIML).
- External API endpoints (e.g., for exchange rates).

---

## API Endpoints

### Binance Endpoints
- **GET `/binance/account`**  
  Retrieves real-time account information from Binance using HMAC signature authentication.

### Mono Endpoints
- **GET `/mono/account`**  
  Initiates connection with the Mono API to fetch bank account details.  
- **GET `/mono/callback`**  
  Callback endpoint to handle Mono's response after authentication.

### Reconciliation Endpoint
- **POST `/reconcile`**  
  Accepts payloads containing bank transactions, crypto transactions, and a market rate. It calls the Deepseek (AIML) API to process and infer deals based on matching rules.

---

## Polling and Reconciliation

The application uses scheduled jobs located in the `jobs/realtimePoller.js` file to continuously poll for new transactions:
- **pollBinance**: Fetches crypto balances (specifically USDT) from Binance, applies a current conversion rate, and stores each transaction.
- **pollMono**: Polls Mono for new bank transactions by querying all linked bank accounts and comparing with stored transaction IDs.

After fetching new data, the `triggerReconciliation` function sends the latest transaction data and the current market rate to the reconciliation endpoint, where it is processed by the Deepseek reconciliation service.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

