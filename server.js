const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Path to the OHLCV data directory
const OHLCV_DATA_PATH = '/workspaces/sjc-gpu-kronos/results/complete_ohlcv_tickers';

// API endpoint to get ticker data
app.get('/api/ticker/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const filePath = path.join(OHLCV_DATA_PATH, `${symbol}_ohlcv_prediction.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Ticker not found',
        message: `${symbol} not found in the dataset`
      });
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(data);

    res.json(jsonData);
  } catch (error) {
    console.error('Error reading ticker data:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to read ticker data'
    });
  }
});

// API endpoint to list all available tickers
app.get('/api/tickers', (req, res) => {
  try {
    const files = fs.readdirSync(OHLCV_DATA_PATH);
    const tickers = files
      .filter(file => file.endsWith('_ohlcv_prediction.json'))
      .map(file => file.replace('_ohlcv_prediction.json', ''))
      .sort();

    res.json({ tickers, count: tickers.length });
  } catch (error) {
    console.error('Error listing tickers:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to list tickers'
    });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Transformers Predictions server running on port ${PORT}`);
  console.log(`Data directory: ${OHLCV_DATA_PATH}`);
});