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

exports.executeTrade = async (req, res) => {
    const { action, quantity, symbol } = req.body;

    if (!action || !quantity || !symbol) {
        return res.status(400).json({ error: "Missing required fields: action, quantity, or symbol." });
    }

    const side = action.toUpperCase();
    const timestamp = Date.now();
    const fixedQty = parseFloat(quantity).toFixed(6); // Optional precision fix

    const queryString = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${fixedQty}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', API_SECRET)
        .update(queryString)
        .digest('hex');

    const fullQuery = `${queryString}&signature=${signature}`;

    logToFile(`Trade Request: ${side} ${fixedQty} ${symbol}`);

    try {
        const response = await axios.post(`${BINANCE_URL}/api/v3/order`, fullQuery, {
            headers: {
                'X-MBX-APIKEY': API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        logToFile(`Trade SUCCESS: ${side} ${fixedQty} ${symbol} | Response: ${JSON.stringify(response.data)}`);
        res.json({ message: 'Trade executed successfully', data: response.data });

    } catch (error) {
        const errMsg = error.response?.data || error.message;
        logToFile(`Trade ERROR: ${JSON.stringify(errMsg)}`);
        res.status(500).json({ error: 'Trade failed', details: errMsg });
    }
};