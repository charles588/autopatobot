const express = require('express');
const app = express();

// Use dynamic port for Render or default to 3000 locally
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public')); // Serve frontend files from 'public' folder
app.use(express.json()); // Parse JSON requests

// Root route - optional health check
app.get('/', (req, res) => {
  res.send('✅ Server is live!');
});

// Simulated candlestick endpoint
app.get('/api/candle', (req, res) => {
  const base = 29500 + Math.random() * 100;
  const open = base;
  const close = base + (Math.random() - 0.5) * 50;
  const high = Math.max(open, close) + Math.random() * 20;
  const low = Math.min(open, close) - Math.random() * 20;

  res.json({ open, high, low, close });
});

// Simulated trade endpoint
app.post('/api/trade', (req, res) => {
  console.log('📩 Trade received:', req.body);
  res.json({ status: '✅ Trade executed', action: req.body.action });
});

// (Optional) Endpoint to return server host
app.get('/api/host', (req, res) => {
  res.json({ host: req.headers.host });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌐 Visit: https://autopatobot.onrender.com`);
});