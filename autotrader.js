require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const { SMA } = require('technicalindicators');

// === Binance Configuration ===
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const BINANCE_URL = 'https://api.binance.com';

const SYMBOL = 'BTCUSDT';
const INTERVAL = '5m';
const QUANTITY = 0.001;

if (!API_KEY || !API_SECRET) {
  console.error("❌ API credentials missing in .env");
  process.exit(1);
}

// === Logging ===
const logFile = 'trading-log.txt';

function logToFile(message) {
  const time = new Date().toISOString();
  fs.appendFileSync(logFile, `[${time}] ${message}\n`);
}

// === SMA Crossover Tracking ===
let prevSMA5 = null;
let prevSMA10 = null;

// === Fetch Recent Candle Closes ===
async function getRecentCandles() {
  const { data } = await axios.get(`${BINANCE_URL}/api/v3/klines`, {
    params: { symbol: SYMBOL, interval: INTERVAL, limit: 20 }
  });
  return data.map(k => parseFloat(k[4])); // Use close prices only
}

// === SMA Cross Strategy ===
function smaCrossoverStrategy(closes) {
  const sma5 = SMA.calculate({ period: 5, values: closes });
  const sma10 = SMA.calculate({ period: 10, values: closes });

  const latestSMA5 = sma5.at(-1);
  const latestSMA10 = sma10.at(-1);

  logToFile(`SMA5: ${latestSMA5}, SMA10: ${latestSMA10}`);

  if (prevSMA5 !== null && prevSMA10 !== null) {
    const isBullish = prevSMA5 < prevSMA10 && latestSMA5 > latestSMA10;
    const isBearish = prevSMA5 > prevSMA10 && latestSMA5 < latestSMA10;

    prevSMA5 = latestSMA5;
    prevSMA10 = latestSMA10;

    if (isBullish) return 'BUY';
    if (isBearish) return 'SELL';
  }

  prevSMA5 = latestSMA5;
  prevSMA10 = latestSMA10;
  return null;
}

// === Place Real Market Order ===
async function placeOrder(side) {
  const timestamp = Date.now();
  const params = `symbol=${SYMBOL}&side=${side}&type=MARKET&quantity=${QUANTITY}&timestamp=${timestamp}`;
  const signature = crypto.createHmac('sha256', API_SECRET).update(params).digest('hex');

  try {
    const { data } = await axios.post(`${BINANCE_URL}/api/v3/order?${params}&signature=${signature}`, {}, {
      headers: {
        'X-MBX-APIKEY': API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log(`✅ ${side} order placed: OrderId=${data.orderId}`);
    logToFile(`✅ ${side} order placed: ${JSON.stringify(data)}`);

  } catch (err) {
    const errorData = err.response?.data || err.message;
    console.error(`❌ Order failed:`, errorData);
    logToFile(`❌ Order failed: ${JSON.stringify(errorData)}`);
  }
}

// === Auto-Trading Loop ===
async function autoTradeLoop() {
  try {
    const closes = await getRecentCandles();
    const latestClose = closes.at(-1);
    console.log(`📈 Latest candle close: ${latestClose}`);
    logToFile(`📈 Latest candle close: ${latestClose}`);

    const signal = smaCrossoverStrategy(closes);

    if (signal) {
      logToFile(`🔔 Trade Signal Detected: ${signal}`);
      await placeOrder(signal);
    } else {
      logToFile('🟡 No trade signal this round');
    }

  } catch (err) {
    console.error('Loop Error:', err.message);
    logToFile(`❌ Loop Error: ${err.message}`);
  }
}

// === Launch Bot ===
console.log('🚀 Starting SMA crossover bot...');
autoTradeLoop(); // Run once immediately
setInterval(autoTradeLoop, 5 * 60 * 1000); // Every 5 minutes