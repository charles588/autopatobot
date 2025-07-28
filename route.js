const express = require('express');
const router = express.Router();
const candleController = require('../controllers/candleController');

router.get('/candle', candleController.getCandles);

// Example route:
router.post('/trade', tradeController.executeTrade);

module.exports = router;