/**
 * Jest Setup File
 * Global configuration for all tests
 */

// Extend Jest timeouts for large data processing
jest.setTimeout(300000); // 5 minutes

// Mock console methods during bulk operations to reduce noise
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Silence console during bulk operations unless explicitly needed
  if (process.env.NODE_ENV !== 'test-verbose') {
    console.log = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.expectValidPredictionStructure = (data) => {
  expect(data).toHaveProperty('ticker_info');
  expect(data).toHaveProperty('data');
  expect(data).toHaveProperty('summary_stats');

  expect(data.ticker_info).toHaveProperty('symbol');
  expect(data.ticker_info).toHaveProperty('last_update');
  expect(data.ticker_info).toHaveProperty('model_type');
  expect(data.ticker_info).toHaveProperty('lookback_days');
  expect(data.ticker_info).toHaveProperty('prediction_days');
  expect(data.ticker_info).toHaveProperty('monte_carlo_runs');

  expect(data.data).toHaveProperty('historical_candlesticks');
  expect(data.data).toHaveProperty('predictions');
  expect(data.data).toHaveProperty('monte_carlo_paths');
  expect(data.data).toHaveProperty('confidence_bands');

  expect(data.summary_stats).toHaveProperty('last_close');
  expect(data.summary_stats).toHaveProperty('predicted_close');
  expect(data.summary_stats).toHaveProperty('price_change');
  expect(data.summary_stats).toHaveProperty('price_change_percent');
  expect(data.summary_stats).toHaveProperty('direction');
  expect(data.summary_stats).toHaveProperty('confidence');
  expect(data.summary_stats).toHaveProperty('volatility');
  expect(data.summary_stats).toHaveProperty('avg_volume');
  expect(data.summary_stats).toHaveProperty('data_quality');
};

global.expectValidOHLCData = (ohlc) => {
  expect(typeof ohlc.open).toBe('number');
  expect(typeof ohlc.high).toBe('number');
  expect(typeof ohlc.low).toBe('number');
  expect(typeof ohlc.close).toBe('number');

  expect(ohlc.open).toBeGreaterThan(0);
  expect(ohlc.high).toBeGreaterThan(0);
  expect(ohlc.low).toBeGreaterThan(0);
  expect(ohlc.close).toBeGreaterThan(0);

  expect(ohlc.high).toBeGreaterThanOrEqual(ohlc.open);
  expect(ohlc.high).toBeGreaterThanOrEqual(ohlc.close);
  expect(ohlc.high).toBeGreaterThanOrEqual(ohlc.low);
  expect(ohlc.low).toBeLessThanOrEqual(ohlc.open);
  expect(ohlc.low).toBeLessThanOrEqual(ohlc.close);
};