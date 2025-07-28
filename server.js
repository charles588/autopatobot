require('dotenv').config(); // Load .env

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Load port from env or default
const port = process.env.PORT || 3000;

// ✅ Load trading controller (adjust path if needed)
const tradeController = require('./controller'); 

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend

// ✅ Root Health Check
app.get('/', (req, res) => {
  res.send('✅ AutoPatobot server is running!');
});

// ✅ Candle endpoint (Binance-backed)
app.get('/api/candle', tradeController.getCandles);

// ✅ Trade endpoint (executes real trade)
app.post('/api/trade', tradeController.executeTrade);

// ✅ Optional: return client host info
app.get('/api/host', (req, res) => {
  res.json({ host: req.headers.host });
});

// ✅ Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌐 Visit your app at http://localhost:${port}`);
});