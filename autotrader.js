require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const { SMA } = require('technicalindicators');

// Binance API
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

const BINANCE_URL = 'https://api.binance.com';
const SYMBOL = 'BTCUSDT';
const INTERVAL = '5m';
const QUANTITY = 0.001;

const logFile = 'trading-log.txt';

function logToFile(message) {
    const time = new Date().toISOString();
    fs.appendFileSync(logFile, `[${time}] ${message}\n`);
}

// === Get latest 20 candles for SMA calculation ===
async function getRecentCandles() {
    const res = await axios.get(`${BINANCE_URL}/api/v3/klines`, {
        params: { symbol: SYMBOL, interval: INTERVAL, limit: 20 }
    });

    return res.data.map(k => parseFloat(k[4])); // close prices
}

// === SMA Cross Strategy ===
let prevSMA5 = null;
let prevSMA10 = null;

function smaCrossoverStrategy(closes) {
    const sma5 = SMA.calculate({ period: 5, values: closes });
    const sma10 = SMA.calculate({ period: 10, values: closes });

    const latestSMA5 = sma5[sma5.length - 1];
    const latestSMA10 = sma10[sma10.length - 1];

    if (prevSMA5 !== null && prevSMA10 !== null) {
        const isBullish = prevSMA5 < prevSMA10 && latestSMA5 > latestSMA10;
        const isBearish = prevSMA5 > prevSMA10 && latestSMA5 < latestSMA10;

        logToFile(`SMA5: ${latestSMA5}, SMA10: ${latestSMA10}`);

        if (isBullish) return 'BUY';
        if (isBearish) return 'SELL';
    }

    prevSMA5 = latestSMA5;
    prevSMA10 = latestSMA10;
    return null;
}

// === Execute Real Order ===
async function placeOrder(side) {
    const timestamp = Date.now();
    const query = `symbol=${SYMBOL}&side=${side}&type=MARKET&quantity=${QUANTITY}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', API_SECRET).update(query).digest('hex');

    try {
        const res = await axios.post(`${BINANCE_URL}/api/v3/order?${query}&signature=${signature}`, {}, {
            headers: {
                'X-MBX-APIKEY': API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log(`✔️ ${side} order placed:`, res.data);
        logToFile(`✔️ ${side} order placed: OrderId=${res.data.orderId}`);
    } catch (err) {
        const errorMsg = err.response?.data || err.message;
        console.error(`❗ Order failed:`, errorMsg);
        logToFile(`❗ Order failed: ${JSON.stringify(errorMsg)}`);
    }
}

// === Main Auto-Trading Loop ===
async function autoTradeLoop() {
    try {
        const closes = await getRecentCandles();
        const latestClose = closes[closes.length - 1];
        console.log(`📊 Candle close: ${latestClose}`);
        logToFile(`📊 Candle close: ${latestClose}`);

        const signal = smaCrossoverStrategy(closes);

        if (signal) {
            await placeOrder(signal);
        } else {
            logToFile('🚫 No trade signal');
        }

    } catch (err) {
        console.error('Loop Error:', err.message);
        logToFile(`Loop Error: ${err.message}`);
    }
}

// === Start Bot ===
console.log('🚀 Starting auto-trader with SMA strategy...');
autoTradeLoop(); // Run immediately
setInterval(autoTradeLoop, 5 * 60 * 1000); // Run every 5 minutes