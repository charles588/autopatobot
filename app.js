require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors'); // ✅ ADD CORS

const app = express();
const port = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());                   // ✅ ENABLE CORS for all origins
app.use(express.static('public')); 
app.use(express.json());

// ===== ROUTES =====

// ✅ Get latest 5m candlestick from Binance
app.get('/api/candle', async (req, res) => {
    const symbol = req.query.symbol?.toUpperCase() || 'BTCUSDT';
   const interval = req.query.interval || '5m';

    try {
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
            params: { symbol, interval, limit: 1 }
        });

        const [time, open, high, low, close] = response.data[0];

        res.json({
            time,
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close)
        });
    } catch (err) {
        console.error('❌ Error fetching candlestick:', err.message);
        res.status(500).json({ error: 'Failed to fetch candlestick data' });
    }
});

// ✅ Execute a market trade
app.post('/api/trade', async (req, res) => {
    const { action, symbol, quantity } = req.body;

    if (!action || !symbol || !quantity) {
        return res.status(400).json({ error: 'Missing required fields: action, symbol, or quantity' });
    }

    const API_KEY = process.env.API_KEY;
    const API_SECRET = process.env.API_SECRET;

    if (!API_KEY || !API_SECRET) {
        return res.status(500).json({ error: 'Missing Binance API credentials' });
    }

    try {
        const side = action.toUpperCase();
        const timestamp = Date.now();

        const params = new URLSearchParams({
            symbol,
            side,
            type: 'MARKET',
            quantity: quantity.toString(),
            timestamp: timestamp.toString()
        });

        const signature = crypto
            .createHmac('sha256', API_SECRET)
            .update(params.toString())
            .digest('hex');

        const url = `https://api.binance.com/api/v3/order?${params.toString()}&signature=${signature}`;

        const response = await axios.post(url, {}, {
            headers: { 'X-MBX-APIKEY': API_KEY }
        });

        res.json({
            success: true,
            orderId: response.data.orderId,
            side: response.data.side,
            executedQty: response.data.executedQty,
            price: response.data.fills?.[0]?.price || 'Market Price'
        });

    } catch (err) {
        console.error('❌ Trade error:', err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data || err.message });
    }
});

// ===== START SERVER =====
app.listen(port, () => {
    console.log(`✅ Server running at: http://localhost:${port}`);
});