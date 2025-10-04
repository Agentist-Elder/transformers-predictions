/**
 * Test Data Fixtures for Transformers Predictions Tests
 */

const MOCK_TICKER_DATA = {
  ticker: "AAPL",
  model_type: "Complete OHLCV Monte Carlo",
  generated_at: "2024-10-04T12:00:00Z",
  data_completeness: "100%",
  chart_compatibility: "Full",
  historical_data: [
    {
      date: "2024-09-30",
      open: 150.0,
      high: 152.0,
      low: 149.0,
      close: 151.0,
      volume: 1000000
    },
    {
      date: "2024-10-01",
      open: 151.0,
      high: 153.0,
      low: 150.0,
      close: 152.0,
      volume: 1100000
    }
  ],
  predictions: [
    {
      date: "2024-10-02",
      open: 152.0,
      high: 154.0,
      low: 151.0,
      close: 153.0,
      volume: 1050000
    },
    {
      date: "2024-10-03",
      open: 153.0,
      high: 155.0,
      low: 152.0,
      close: 154.0,
      volume: 1075000
    }
  ],
  monte_carlo_simulations: [
    {
      path: [
        { date: "2024-10-02", close: 153.1 },
        { date: "2024-10-03", close: 154.2 }
      ]
    },
    {
      path: [
        { date: "2024-10-02", close: 152.8 },
        { date: "2024-10-03", close: 153.9 }
      ]
    }
  ],
  confidence_bands: {
    "50": {
      upper: [153.5, 154.5],
      lower: [152.5, 153.5]
    },
    "75": {
      upper: [154.0, 155.0],
      lower: [152.0, 153.0]
    },
    "90": {
      upper: [154.5, 155.5],
      lower: [151.5, 152.5]
    }
  },
  metrics: {
    price_target: 154.0,
    price_change: 2.0,
    price_change_percent: 1.32,
    direction: "bullish",
    risk_level: "medium",
    volatility: 15.2,
    overall_score: 88.5
  }
};

const MOCK_SUMMARY_DATA = {
  total_predictions: 10823,
  avg_movement: 3.7,
  bullish_count: 3982,
  bearish_count: 2619,
  neutral_count: 4222
};

const MOCK_PREDICTIONS_GRID = [
  {
    ticker: "AAPL",
    direction: "bullish",
    change_percent: 3.5,
    confidence: 88.2
  },
  {
    ticker: "TSLA",
    direction: "bullish",
    change_percent: 3.7,
    confidence: 88.1
  },
  {
    ticker: "MSFT",
    direction: "bullish",
    change_percent: 1.9,
    confidence: 89.1
  }
];

const INVALID_TICKER_DATA = {
  error: "Ticker not found",
  message: "The requested ticker symbol was not found in our database"
};

const EMPTY_TICKER_DATA = {
  ticker: "EMPTY",
  model_type: "Complete OHLCV Monte Carlo",
  generated_at: "2024-10-04T12:00:00Z",
  data_completeness: "0%",
  chart_compatibility: "None",
  historical_data: [],
  predictions: [],
  monte_carlo_simulations: [],
  confidence_bands: {},
  metrics: {}
};

// Valid tickers for testing
const VALID_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'META', 'NVDA', 'AMZN', 'NFLX'
];

// Invalid tickers for error testing
const INVALID_TICKERS = [
  'INVALID', 'NOTFOUND', 'ERROR', '123', 'TOOOLONG'
];

// Test viewport sizes
const VIEWPORT_SIZES = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
  large: { width: 1920, height: 1080 }
};

// Chart control test cases
const CHART_CONTROLS = [
  'showPredictionBands',
  'showConfidence90',
  'showConfidence75',
  'showConfidence50',
  'showMonteCarloLines',
  'showActualData'
];

module.exports = {
  MOCK_TICKER_DATA,
  MOCK_SUMMARY_DATA,
  MOCK_PREDICTIONS_GRID,
  INVALID_TICKER_DATA,
  EMPTY_TICKER_DATA,
  VALID_TICKERS,
  INVALID_TICKERS,
  VIEWPORT_SIZES,
  CHART_CONTROLS
};