const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');

// Example route:
router.post('/trade', tradeController.executeTrade);

module.exports = router;