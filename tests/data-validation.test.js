const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Data Validation Test Suite for Transformers Predictions
 * Tests all JSON prediction files for data integrity, structure, and consistency
 */

describe('Data Validation Tests', () => {
  const dataDir = path.join(__dirname, '../data');
  let predictionFiles = [];
  let sampleData = null;

  beforeAll(() => {
    // Get all prediction JSON files
    predictionFiles = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('_ohlcv_prediction.json'))
      .map(file => path.join(dataDir, file));

    // Load a sample file for structure analysis
    if (predictionFiles.length > 0) {
      const sampleFile = predictionFiles.find(f => f.includes('AAPL')) || predictionFiles[0];
      sampleData = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
    }
  });

  describe('File Discovery and Basic Structure', () => {
    test('should find prediction files', () => {
      expect(predictionFiles.length).toBeGreaterThan(0);
      expect(predictionFiles.length).toBeGreaterThan(5000);
    });

    test('sample data should be loaded', () => {
      expect(sampleData).not.toBeNull();
      expect(typeof sampleData).toBe('object');
    });
  });

  describe('Required Top-Level Fields', () => {
    test('all files should have required root fields', () => {
      const requiredFields = ['ticker_info', 'data', 'summary_stats'];

      predictionFiles.slice(0, 100).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        requiredFields.forEach(field => {
          expect(data).toHaveProperty(field, `${fileName} missing ${field}`);
        });
      });
    });

    test('ticker_info should have required fields', () => {
      const requiredFields = [
        'symbol', 'last_update', 'model_type',
        'lookback_days', 'prediction_days', 'monte_carlo_runs'
      ];

      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        requiredFields.forEach(field => {
          expect(data.ticker_info).toHaveProperty(field, `${fileName} ticker_info missing ${field}`);
        });
      });
    });

    test('data section should have required fields', () => {
      const requiredFields = [
        'historical_candlesticks', 'predictions',
        'monte_carlo_paths', 'confidence_bands'
      ];

      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        requiredFields.forEach(field => {
          expect(data.data).toHaveProperty(field, `${fileName} data missing ${field}`);
        });
      });
    });

    test('summary_stats should have required fields', () => {
      const requiredFields = [
        'last_close', 'predicted_close', 'price_change',
        'price_change_percent', 'direction', 'confidence',
        'volatility', 'avg_volume', 'data_quality'
      ];

      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        requiredFields.forEach(field => {
          expect(data.summary_stats).toHaveProperty(field, `${fileName} summary_stats missing ${field}`);
        });
      });
    });
  });

  describe('Data Type Validation', () => {
    test('ticker symbols should be valid strings', () => {
      predictionFiles.slice(0, 100).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        expect(typeof data.ticker_info.symbol).toBe('string');
        expect(data.ticker_info.symbol.length).toBeGreaterThan(0);
        expect(data.ticker_info.symbol.length).toBeLessThanOrEqual(10);
        // Should match filename
        expect(fileName).toContain(data.ticker_info.symbol);
      });
    });

    test('dates should be in correct ISO format', () => {
      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        // Check last_update format
        expect(data.ticker_info.last_update).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

        // Check historical dates
        if (data.data.historical_candlesticks.length > 0) {
          const firstCandle = data.data.historical_candlesticks[0];
          expect(firstCandle.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }

        // Check prediction dates
        if (data.data.predictions.length > 0) {
          const firstPrediction = data.data.predictions[0];
          expect(firstPrediction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      });
    });

    test('numeric fields should be valid numbers', () => {
      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        // Ticker info numerics
        expect(typeof data.ticker_info.lookback_days).toBe('number');
        expect(typeof data.ticker_info.prediction_days).toBe('number');
        expect(typeof data.ticker_info.monte_carlo_runs).toBe('number');

        // Summary stats numerics
        expect(typeof data.summary_stats.last_close).toBe('number');
        expect(typeof data.summary_stats.predicted_close).toBe('number');
        expect(typeof data.summary_stats.price_change).toBe('number');
        expect(typeof data.summary_stats.price_change_percent).toBe('number');
        expect(typeof data.summary_stats.confidence).toBe('number');
        expect(typeof data.summary_stats.volatility).toBe('number');
        expect(typeof data.summary_stats.avg_volume).toBe('number');
      });
    });
  });

  describe('Price and Volume Range Validation', () => {
    test('prices should be positive numbers', () => {
      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        // Historical prices
        data.data.historical_candlesticks.forEach((candle, index) => {
          expect(candle.open).toBeGreaterThan(0);
          expect(candle.high).toBeGreaterThan(0);
          expect(candle.low).toBeGreaterThan(0);
          expect(candle.close).toBeGreaterThan(0);

          // High should be >= open, close, low
          expect(candle.high).toBeGreaterThanOrEqual(candle.open);
          expect(candle.high).toBeGreaterThanOrEqual(candle.close);
          expect(candle.high).toBeGreaterThanOrEqual(candle.low);

          // Low should be <= open, close, high
          expect(candle.low).toBeLessThanOrEqual(candle.open);
          expect(candle.low).toBeLessThanOrEqual(candle.close);
          expect(candle.low).toBeLessThanOrEqual(candle.high);
        });

        // Prediction prices
        data.data.predictions.forEach(pred => {
          expect(pred.open).toBeGreaterThan(0);
          expect(pred.high).toBeGreaterThan(0);
          expect(pred.low).toBeGreaterThan(0);
          expect(pred.close).toBeGreaterThan(0);

          expect(pred.high).toBeGreaterThanOrEqual(pred.open);
          expect(pred.high).toBeGreaterThanOrEqual(pred.close);
          expect(pred.high).toBeGreaterThanOrEqual(pred.low);
          expect(pred.low).toBeLessThanOrEqual(pred.open);
          expect(pred.low).toBeLessThanOrEqual(pred.close);
          expect(pred.low).toBeLessThanOrEqual(pred.high);
        });

        // Summary prices
        expect(data.summary_stats.last_close).toBeGreaterThan(0);
        expect(data.summary_stats.predicted_close).toBeGreaterThan(0);
      });
    });

    test('volumes should be positive integers', () => {
      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Historical volumes
        data.data.historical_candlesticks.forEach(candle => {
          expect(candle.volume).toBeGreaterThan(0);
          expect(Number.isInteger(candle.volume)).toBe(true);
        });

        // Prediction volumes
        data.data.predictions.forEach(pred => {
          expect(pred.volume).toBeGreaterThan(0);
          // Note: volumes in predictions might be floats due to averaging
        });

        // Average volume
        expect(data.summary_stats.avg_volume).toBeGreaterThan(0);
      });
    });

    test('confidence levels should be between 0-100', () => {
      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        expect(data.summary_stats.confidence).toBeGreaterThanOrEqual(0);
        expect(data.summary_stats.confidence).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Monte Carlo Paths Validation', () => {
    test('should have correct number of Monte Carlo paths', () => {
      predictionFiles.slice(0, 30).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        const expectedPaths = data.ticker_info.monte_carlo_runs;
        const actualPaths = data.data.monte_carlo_paths.length;

        expect(actualPaths).toBe(expectedPaths);
      });
    });

    test('each Monte Carlo path should have consistent structure', () => {
      predictionFiles.slice(0, 20).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);
        const expectedDays = data.ticker_info.prediction_days;

        data.data.monte_carlo_paths.forEach((path, pathIndex) => {
          expect(Array.isArray(path)).toBe(true);
          expect(path.length).toBe(expectedDays);

          path.forEach((point, dayIndex) => {
            expect(point).toHaveProperty('date');
            expect(point).toHaveProperty('open');
            expect(point).toHaveProperty('high');
            expect(point).toHaveProperty('low');
            expect(point).toHaveProperty('close');
            expect(point).toHaveProperty('volume');

            // Validate OHLC relationships
            expect(point.high).toBeGreaterThanOrEqual(point.open);
            expect(point.high).toBeGreaterThanOrEqual(point.close);
            expect(point.high).toBeGreaterThanOrEqual(point.low);
            expect(point.low).toBeLessThanOrEqual(point.open);
            expect(point.low).toBeLessThanOrEqual(point.close);
            expect(point.low).toBeLessThanOrEqual(point.high);

            // Validate positive values
            expect(point.open).toBeGreaterThan(0);
            expect(point.high).toBeGreaterThan(0);
            expect(point.low).toBeGreaterThan(0);
            expect(point.close).toBeGreaterThan(0);
            expect(point.volume).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  describe('Confidence Bands Validation', () => {
    test('should have all required percentiles', () => {
      const requiredPercentiles = ['p90', 'p75', 'p50', 'p25', 'p10'];

      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);

        requiredPercentiles.forEach(percentile => {
          expect(data.data.confidence_bands).toHaveProperty(percentile);
          expect(Array.isArray(data.data.confidence_bands[percentile])).toBe(true);
        });
      });
    });

    test('confidence bands should have correct structure and ordering', () => {
      predictionFiles.slice(0, 30).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileName = path.basename(filePath);
        const expectedDays = data.ticker_info.prediction_days;

        const percentiles = ['p10', 'p25', 'p50', 'p75', 'p90'];

        // Check each percentile has correct length
        percentiles.forEach(p => {
          expect(data.data.confidence_bands[p].length).toBe(expectedDays);
        });

        // Check values are properly ordered (p90 >= p75 >= p50 >= p25 >= p10)
        for (let dayIndex = 0; dayIndex < expectedDays; dayIndex++) {
          const p10 = data.data.confidence_bands.p10[dayIndex].value;
          const p25 = data.data.confidence_bands.p25[dayIndex].value;
          const p50 = data.data.confidence_bands.p50[dayIndex].value;
          const p75 = data.data.confidence_bands.p75[dayIndex].value;
          const p90 = data.data.confidence_bands.p90[dayIndex].value;

          expect(p90).toBeGreaterThanOrEqual(p75);
          expect(p75).toBeGreaterThanOrEqual(p50);
          expect(p50).toBeGreaterThanOrEqual(p25);
          expect(p25).toBeGreaterThanOrEqual(p10);

          // All should be positive
          expect(p10).toBeGreaterThan(0);
          expect(p25).toBeGreaterThan(0);
          expect(p50).toBeGreaterThan(0);
          expect(p75).toBeGreaterThan(0);
          expect(p90).toBeGreaterThan(0);

          // Check date consistency
          percentiles.forEach(percentile => {
            const point = data.data.confidence_bands[percentile][dayIndex];
            expect(point).toHaveProperty('date');
            expect(point).toHaveProperty('value');
            expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          });
        });
      });
    });
  });

  describe('Data Quality Checks', () => {
    test('data_quality should have required fields and valid values', () => {
      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        expect(data.summary_stats.data_quality).toHaveProperty('completeness');
        expect(data.summary_stats.data_quality).toHaveProperty('historical_days');
        expect(data.summary_stats.data_quality).toHaveProperty('chart_ready');

        expect(data.summary_stats.data_quality.completeness).toBeGreaterThanOrEqual(0);
        expect(data.summary_stats.data_quality.completeness).toBeLessThanOrEqual(100);
        expect(typeof data.summary_stats.data_quality.historical_days).toBe('number');
        expect(typeof data.summary_stats.data_quality.chart_ready).toBe('boolean');
      });
    });

    test('direction should be valid bullish/bearish', () => {
      predictionFiles.slice(0, 50).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        expect(['Bullish', 'Bearish']).toContain(data.summary_stats.direction);

        // Direction should match price change
        if (data.summary_stats.price_change > 0) {
          expect(data.summary_stats.direction).toBe('Bullish');
        } else if (data.summary_stats.price_change < 0) {
          expect(data.summary_stats.direction).toBe('Bearish');
        }
      });
    });
  });

  describe('Date Sequence Validation', () => {
    test('dates should be in chronological order', () => {
      predictionFiles.slice(0, 30).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Historical dates should be chronological
        for (let i = 1; i < data.data.historical_candlesticks.length; i++) {
          const prevDate = new Date(data.data.historical_candlesticks[i-1].date);
          const currDate = new Date(data.data.historical_candlesticks[i].date);
          expect(currDate).toBeInstanceOf(Date);
          expect(prevDate).toBeInstanceOf(Date);
          expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
        }

        // Prediction dates should be chronological
        for (let i = 1; i < data.data.predictions.length; i++) {
          const prevDate = new Date(data.data.predictions[i-1].date);
          const currDate = new Date(data.data.predictions[i].date);
          expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
        }
      });
    });

    test('prediction dates should follow historical dates', () => {
      predictionFiles.slice(0, 30).forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (data.data.historical_candlesticks.length > 0 && data.data.predictions.length > 0) {
          const lastHistorical = new Date(data.data.historical_candlesticks[data.data.historical_candlesticks.length - 1].date);
          const firstPrediction = new Date(data.data.predictions[0].date);

          expect(firstPrediction.getTime()).toBeGreaterThan(lastHistorical.getTime());
        }
      });
    });
  });
});