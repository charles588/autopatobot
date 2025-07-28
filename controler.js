require('dotenv').config(); // ✅ Load environment variables

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const BINANCE_URL = 'https://api.binance.com';

if (!API_KEY || !API_SECRET) {
  console.error("❌ API_KEY or API_SECRET missing in .env file");
  process.exit(1);
}

const logFile = 'trading-log.txt';

function logToFile(message) {
  const time = new Date().toISOString();
  fs.appendFileSync(logFile, `[${time}] ${message}\n`);
}
exports.getCandles = async (req, res) => {
  const symbol = req.query.symbol || 'BTCUSDT';
  const interval = req.query.interval || '5m';

  // ✅ Put your log here (now symbol and interval are defined)
  console.log('🔍 Symbol:', symbol, '| Interval:', interval);

  try {
    const { data } = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol,
        interval,
        limit: 50
      }
    });

    const candles = data.map(k => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4])
    }));

    if (!candles.length) {
      return res.status(404).json({ error: 'No candles fetched' });
    }

    res.json({ candles });

  } catch (error) {
    console.error('Candle fetch error:', error.message);
    res.status(500).json({ error: 'Error fetching candles', details: error.message });
  }
};
exports.executeTrade = async (req, res) => {
  const { action, quantity, symbol } = req.body;

  if (!action || !quantity || !symbol) {
    return res.status(400).json({
      error: "Missing required fields: action, quantity, or symbol."
    });
  }

  const side = action.toUpperCase();
  const timestamp = Date.now();
  const fixedQty = parseFloat(quantity).toFixed(6); // Optional precision fix

  const params = new URLSearchParams({
    symbol,
    side,
    type: 'MARKET',
    quantity: fixedQty,
    timestamp: timestamp.toString()
  });

  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(params.toString())
    .digest('hex');

  params.append('signature', signature);

  logToFile(`🔁 Trade Request: ${side} ${fixedQty} ${symbol}`);

  try {
    const response = await axios.post(`${BINANCE_URL}/api/v3/order`, params.toString(), {
      headers: {
        'X-MBX-APIKEY': API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    logToFile(`✅ Trade SUCCESS: ${side} ${fixedQty} ${symbol} | Response: ${JSON.stringify(response.data)}`);

    res.json({
      message: 'Trade executed successfully',
      data: response.data
    });

  } catch (error) {
    const errMsg = error.response?.data || error.message;
    logToFile(`❌ Trade ERROR: ${JSON.stringify(errMsg)}`);

    res.status(500).json({
      error: 'Trade failed',
      reason: error.response?.data?.msg || error.message || 'Unknown error',
      binanceError: error.response?.data || null
    });
  }
};