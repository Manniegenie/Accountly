const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const deepseekService = require('../services/deepseekService.js');



router.post(
  '/',
  [
    // Validate that marketRate is provided and is numeric.
    body('marketRate')
      .exists().withMessage('Market rate is required')
      .isNumeric().withMessage('Market rate must be a number'),
    // Validate that bankTransactions is provided as an array.
    body('bankTransactions')
      .exists().withMessage('Bank transactions are required')
      .isArray().withMessage('Bank transactions must be an array'),
    // Validate that cryptoTransactions is provided as an array.
    body('cryptoTransactions')
      .exists().withMessage('Crypto transactions are required')
      .isArray().withMessage('Crypto transactions must be an array'),
  ],
  async (req, res, next) => {
    try {
      // Check for validation errors.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { marketRate, bankTransactions, cryptoTransactions } = req.body;
      
      // Construct the Deepseek prompt payload.
      const promptData = {
        instructions: "You are provided with structured transaction data from both bank and crypto sources. Determine if these transactions represent a matching deal. A deal is defined as a fiat inflow (from bank transactions) that corresponds to one or more crypto outflows at a conversion rate that is within ±2% of the provided market rate. Group transactions that occur within a 12-hour window as part of the same deal. For each inferred deal, return a JSON object containing: fiatTransactionIds (an array), cryptoTransactionIds (an array), effectiveRate (calculated from the grouped transactions), errorPercentage (the percentage difference compared to the market rate), and a status flag ('valid', 'overpayment', or 'underpayment').",
        market_rate_at_time: marketRate,
        bank_transactions: bankTransactions,
        crypto_transactions: cryptoTransactions
      };

      // Call Deepseek service to process the prompt.
      const deepseekResponse = await deepseekService.sendPrompt(promptData);
      return res.json(deepseekResponse);
    } catch (error) {
      console.error("Error in reconciliation endpoint:", error.message);
      next(error);
    }
  }
);

module.exports = router;
