const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // ✅ Use dynamic port for Render

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ Bot is running on Render!');
});

app.get('/api/candle', (req, res) => {
  const base = 29500 + Math.random() * 100;
  const open = base;
  const close = base + (Math.random() - 0.5) * 50;
  const high = Math.max(open, close) + Math.random() * 20;
  const low = Math.min(open, close) - Math.random() * 20;

  res.json({ open, high, low, close });
});

app.post('/api/trade', (req, res) => {
  console.log('Trade received:', req.body);
  res.json({ status: 'Trade executed', action: req.body.action });
});

// ✅ Only one listen, and use dynamic port for Render
app.listen(port, () => {
  console.log(`✅ Backend running on port ${port}`);
});