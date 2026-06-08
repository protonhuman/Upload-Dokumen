require('dotenv').config({ path: '.env.local' });
const express = require('express');
const path = require('path');
const handshake = require('./api/handshake');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON body
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount API endpoint
app.post('/api/handshake', async (req, res) => {
  try {
    await handshake(req, res);
  } catch (err) {
    console.error('Express handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Express Handler Error', message: err.message });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  Local Dev Server is running successfully!`);
  console.log(`  Access the web page: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
