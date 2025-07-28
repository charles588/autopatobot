require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const { SMA } = require('technicalindicators');

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const BINANCE_URL = 'https://api.binance.com';
const SYMBOL = 'BTCUSDT';
const INTERVAL = '5m';
const QUANTITY = 0.001;

let prevSMA5 = null;
let prevSMA10 = null;

function logToFile(message) {
  const time = new Date().toISOString();
  fs.appendFileSync('trading-log.txt', `[${time}] ${message}\n`);
}

// === Controller: Fetch Candlestick ===
async function getCandles(req, res) {
  try {
    const { data } = await axios.get(`${BINANCE_URL}/api/v3/klines`, {
      params: { symbol: SYMBOL, interval: INTERVAL, limit: 1 },
    });

    const [time, open, high, low, close] = data[0];
    return res.json({
      t: time,
      o: parseFloat(open),
      h: parseFloat(high),
      l: parseFloat(low),
      c: parseFloat(close),
    });
  } catch (err) {
    console.error('❌ Candle fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch candle' });
  }
}

// === Controller: Execute Trade ===
async function executeTrade(req, res) {
  try {
    const closes = await getRecentCloses();
    const latestClose = closes.at(-1);
    const signal = smaCrossoverStrategy(closes);

    logToFile(`📈 Candle Close: ${latestClose}`);
    logToFile(`🔎 SMA Signal: ${signal}`);

    if (signal) {
      await placeOrder(signal);
      return res.json({ success: true, signal });
    }

    return res.json({ success: false, message: 'No signal' });
  } catch (err) {
    console.error('❌ Trade execution error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// === Helpers ===
async function getRecentCloses() {
  const { data } = await axios.get(`${BINANCE_URL}/api/v3/klines`, {
    params: { symbol: SYMBOL, interval: INTERVAL, limit: 20 }
  });
  return data.map(k => parseFloat(k[4]));
}

function smaCrossoverStrategy(closes) {
  const sma5 = SMA.calculate({ period: 5, values: closes });
  const sma10 = SMA.calculate({ period: 10, values: closes });

  const latestSMA5 = sma5.at(-1);
  const latestSMA10 = sma10.at(-1);

  const isBullish = prevSMA5 < prevSMA10 && latestSMA5 > latestSMA10;
  const isBearish = prevSMA5 > prevSMA10 && latestSMA5 < latestSMA10;

  prevSMA5 = latestSMA5;
  prevSMA10 = latestSMA10;

  if (isBullish) return 'BUY';
  if (isBearish) return 'SELL';
  return null;
}

async function placeOrder(side) {
  const timestamp = Date.now();
  const params = `symbol=${SYMBOL}&side=${side}&type=MARKET&quantity=${QUANTITY}&timestamp=${timestamp}`;
  const signature = crypto.createHmac('sha256', API_SECRET).update(params).digest('hex');

  const url = `${BINANCE_URL}/api/v3/order?${params}&signature=${signature}`;
  const headers = {
    'X-MBX-APIKEY': API_KEY,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  try {
    const { data } = await axios.post(url, {}, { headers });
    logToFile(`✅ ${side} order placed: ${JSON.stringify(data)}`);
    return data;
  } catch (err) {
    const msg = err.response?.data || err.message;
    logToFile(`❌ Order failed: ${JSON.stringify(msg)}`);
    throw new Error('Order failed: ' + JSON.stringify(msg));
  }
}

module.exports = {
  getCandles,
  executeTrade
};