const fs = require('fs');
const path = require('path');

/**
 * Sample Data Validation Test - Testing with smaller dataset
 */

describe('Sample Data Validation Tests', () => {
  const dataDir = path.join(__dirname, '../data');
  let sampleFiles = [];

  beforeAll(() => {
    // Get just first 10 prediction JSON files for testing
    const allFiles = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('_ohlcv_prediction.json'))
      .slice(0, 10);

    sampleFiles = allFiles.map(file => path.join(dataDir, file));
  });

  describe('Basic Structure Validation', () => {
    test('sample files should have required structure', () => {
      expect(sampleFiles.length).toBeGreaterThan(0);

      sampleFiles.forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        expect(data).toHaveProperty('ticker_info');
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('summary_stats');

        // Test specific fields
        expect(data.ticker_info).toHaveProperty('symbol');
        expect(data.ticker_info).toHaveProperty('last_update');
        expect(data.data).toHaveProperty('historical_candlesticks');
        expect(data.data).toHaveProperty('predictions');
        expect(data.data).toHaveProperty('monte_carlo_paths');
        expect(data.data).toHaveProperty('confidence_bands');
      });
    });

    test('confidence bands should have all percentiles in sample', () => {
      const requiredPercentiles = ['p10', 'p25', 'p50', 'p75', 'p90'];

      sampleFiles.forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        requiredPercentiles.forEach(percentile => {
          expect(data.data.confidence_bands).toHaveProperty(percentile);
          expect(Array.isArray(data.data.confidence_bands[percentile])).toBe(true);
        });
      });
    });

    test('prices should be positive in sample', () => {
      sampleFiles.forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Check summary prices
        expect(data.summary_stats.last_close).toBeGreaterThan(0);
        expect(data.summary_stats.predicted_close).toBeGreaterThan(0);

        // Check first historical candlestick
        if (data.data.historical_candlesticks.length > 0) {
          const firstCandle = data.data.historical_candlesticks[0];
          expect(firstCandle.open).toBeGreaterThan(0);
          expect(firstCandle.high).toBeGreaterThan(0);
          expect(firstCandle.low).toBeGreaterThan(0);
          expect(firstCandle.close).toBeGreaterThan(0);
        }
      });
    });

    test('confidence levels should be valid in sample', () => {
      sampleFiles.forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        expect(data.summary_stats.confidence).toBeGreaterThanOrEqual(0);
        expect(data.summary_stats.confidence).toBeLessThanOrEqual(100);
      });
    });

    test('monte carlo paths should be consistent in sample', () => {
      sampleFiles.forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        const expectedPaths = data.ticker_info.monte_carlo_runs;
        const actualPaths = data.data.monte_carlo_paths.length;

        expect(actualPaths).toBe(expectedPaths);

        // Check first path structure
        if (data.data.monte_carlo_paths.length > 0) {
          const firstPath = data.data.monte_carlo_paths[0];
          expect(Array.isArray(firstPath)).toBe(true);
          expect(firstPath.length).toBe(data.ticker_info.prediction_days);
        }
      });
    });
  });
});