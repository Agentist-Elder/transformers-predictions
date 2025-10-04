const ValidationUtils = require('./validation-utils');

/**
 * Unit Tests for Validation Utilities
 * Tests individual validation functions with various input scenarios
 */

describe('ValidationUtils Unit Tests', () => {

  describe('validateDateFormat', () => {
    test('should validate correct date formats', () => {
      const validDates = ['2025-01-01', '2025-12-31', '2000-02-29'];

      validDates.forEach(date => {
        const result = ValidationUtils.validateDateFormat(date);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    test('should reject invalid date formats', () => {
      const invalidDates = [
        '25-01-01',     // Wrong year format
        '2025-1-1',     // Missing zero padding
        '2025/01/01',   // Wrong separator
        '01-01-2025',   // Wrong order
        '2025-13-01',   // Invalid month
        '2025-01-32',   // Invalid day
        'not-a-date',   // Not a date
        '',             // Empty string
        null,           // Null value
        undefined       // Undefined value
      ];

      invalidDates.forEach(date => {
        const result = ValidationUtils.validateDateFormat(date);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateTimestamp', () => {
    test('should validate correct timestamp formats', () => {
      const validTimestamps = [
        '2025-01-01T00:00:00',
        '2025-12-31T23:59:59',
        '2025-06-15T12:30:45.123456',
        '2025-10-04T04:02:11.071919'
      ];

      validTimestamps.forEach(timestamp => {
        const result = ValidationUtils.validateTimestamp(timestamp);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    test('should reject invalid timestamp formats', () => {
      const invalidTimestamps = [
        '2025-01-01',           // Missing time
        '2025-01-01 12:00:00',  // Wrong separator
        '2025-01-01T25:00:00',  // Invalid hour
        '2025-01-01T12:60:00',  // Invalid minute
        '2025-01-01T12:00:60',  // Invalid second
        'not-a-timestamp',      // Not a timestamp
        '',                     // Empty string
        null,                   // Null value
        undefined               // Undefined value
      ];

      invalidTimestamps.forEach(timestamp => {
        const result = ValidationUtils.validateTimestamp(timestamp);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateOHLCData', () => {
    test('should validate correct OHLC data', () => {
      const validOHLC = [
        { open: 100, high: 105, low: 95, close: 103 },
        { open: 50.5, high: 50.5, low: 48.2, close: 49.1 },
        { open: 1000, high: 1020, low: 990, close: 1010 },
        { open: 25, high: 30, low: 25, close: 30 }  // High/Low can equal open/close
      ];

      validOHLC.forEach((ohlc, index) => {
        const result = ValidationUtils.validateOHLCData(ohlc);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      });
    });

    test('should reject OHLC data with wrong relationships', () => {
      const invalidOHLC = [
        { open: 100, high: 95, low: 90, close: 98 },   // High < Open
        { open: 100, high: 105, low: 110, close: 102 }, // Low > High
        { open: 100, high: 105, low: 95, close: 108 },  // Close > High
        { open: 100, high: 105, low: 102, close: 98 },  // Close < Low
      ];

      invalidOHLC.forEach((ohlc, index) => {
        const result = ValidationUtils.validateOHLCData(ohlc);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should reject OHLC data with negative or zero values', () => {
      const invalidOHLC = [
        { open: 0, high: 105, low: 95, close: 100 },     // Zero open
        { open: 100, high: -105, low: 95, close: 100 },  // Negative high
        { open: 100, high: 105, low: 0, close: 100 },    // Zero low
        { open: 100, high: 105, low: 95, close: -100 },  // Negative close
      ];

      invalidOHLC.forEach((ohlc, index) => {
        const result = ValidationUtils.validateOHLCData(ohlc);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should reject OHLC data with missing or non-numeric fields', () => {
      const invalidOHLC = [
        { high: 105, low: 95, close: 100 },              // Missing open
        { open: '100', high: 105, low: 95, close: 100 }, // String open
        { open: 100, high: null, low: 95, close: 100 },  // Null high
        { open: 100, high: 105, low: undefined, close: 100 }, // Undefined low
      ];

      invalidOHLC.forEach((ohlc, index) => {
        const result = ValidationUtils.validateOHLCData(ohlc);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateCandlestick', () => {
    test('should validate complete candlestick data', () => {
      const validCandlesticks = [
        {
          date: '2025-01-01',
          open: 100,
          high: 105,
          low: 95,
          close: 103,
          volume: 1000000
        },
        {
          date: '2025-06-15',
          open: 50.5,
          high: 52.3,
          low: 49.8,
          close: 51.2,
          volume: 500000
        }
      ];

      validCandlesticks.forEach((candle, index) => {
        const result = ValidationUtils.validateCandlestick(candle);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      });
    });

    test('should reject candlesticks with invalid dates', () => {
      const invalidCandlestick = {
        date: '2025/01/01', // Wrong format
        open: 100,
        high: 105,
        low: 95,
        close: 103,
        volume: 1000000
      };

      const result = ValidationUtils.validateCandlestick(invalidCandlestick);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date format, expected YYYY-MM-DD');
    });

    test('should reject candlesticks with invalid volume', () => {
      const invalidCandlesticks = [
        {
          date: '2025-01-01',
          open: 100, high: 105, low: 95, close: 103,
          volume: 0 // Zero volume
        },
        {
          date: '2025-01-01',
          open: 100, high: 105, low: 95, close: 103,
          volume: -1000 // Negative volume
        },
        {
          date: '2025-01-01',
          open: 100, high: 105, low: 95, close: 103,
          volume: 'invalid' // String volume
        }
      ];

      invalidCandlesticks.forEach(candle => {
        const result = ValidationUtils.validateCandlestick(candle);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });
  });

  describe('validateTickerInfo', () => {
    test('should validate complete ticker info', () => {
      const validTickerInfo = {
        symbol: 'AAPL',
        last_update: '2025-10-04T04:02:11.071919',
        model_type: 'Complete OHLCV Monte Carlo',
        lookback_days: 120,
        prediction_days: 5,
        monte_carlo_runs: 10
      };

      const result = ValidationUtils.validateTickerInfo(validTickerInfo);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should reject ticker info with missing fields', () => {
      const incompleteTickerInfo = {
        symbol: 'AAPL',
        last_update: '2025-10-04T04:02:11.071919',
        // Missing required fields
      };

      const result = ValidationUtils.validateTickerInfo(incompleteTickerInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject ticker info with invalid data types', () => {
      const invalidTickerInfo = {
        symbol: 123, // Should be string
        last_update: '2025-10-04T04:02:11.071919',
        model_type: 'Complete OHLCV Monte Carlo',
        lookback_days: '120', // Should be number
        prediction_days: 5,
        monte_carlo_runs: -10 // Should be positive
      };

      const result = ValidationUtils.validateTickerInfo(invalidTickerInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateConfidenceBands', () => {
    test('should validate complete confidence bands', () => {
      const validConfidenceBands = {
        p10: [
          { date: '2025-10-06', value: 255.0 },
          { date: '2025-10-07', value: 256.0 }
        ],
        p25: [
          { date: '2025-10-06', value: 258.0 },
          { date: '2025-10-07', value: 259.0 }
        ],
        p50: [
          { date: '2025-10-06', value: 260.0 },
          { date: '2025-10-07', value: 261.0 }
        ],
        p75: [
          { date: '2025-10-06', value: 262.0 },
          { date: '2025-10-07', value: 263.0 }
        ],
        p90: [
          { date: '2025-10-06', value: 265.0 },
          { date: '2025-10-07', value: 266.0 }
        ]
      };

      const result = ValidationUtils.validateConfidenceBands(validConfidenceBands, 2);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should reject confidence bands with missing percentiles', () => {
      const incompleteConfidenceBands = {
        p10: [{ date: '2025-10-06', value: 255.0 }],
        p25: [{ date: '2025-10-06', value: 258.0 }],
        // Missing p50, p75, p90
      };

      const result = ValidationUtils.validateConfidenceBands(incompleteConfidenceBands, 1);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should reject confidence bands with wrong ordering', () => {
      const wrongOrderBands = {
        p10: [{ date: '2025-10-06', value: 265.0 }], // Should be lowest
        p25: [{ date: '2025-10-06', value: 258.0 }],
        p50: [{ date: '2025-10-06', value: 260.0 }],
        p75: [{ date: '2025-10-06', value: 262.0 }],
        p90: [{ date: '2025-10-06', value: 255.0 }]  // Should be highest
      };

      const result = ValidationUtils.validateConfidenceBands(wrongOrderBands, 1);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should reject confidence bands with wrong length', () => {
      const wrongLengthBands = {
        p10: [{ date: '2025-10-06', value: 255.0 }], // Only 1 entry
        p25: [{ date: '2025-10-06', value: 258.0 }],
        p50: [{ date: '2025-10-06', value: 260.0 }],
        p75: [{ date: '2025-10-06', value: 262.0 }],
        p90: [{ date: '2025-10-06', value: 265.0 }]
      };

      const result = ValidationUtils.validateConfidenceBands(wrongLengthBands, 5); // Expected 5 entries
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateMonteCarloPath', () => {
    test('should validate complete Monte Carlo path', () => {
      const validPath = [
        {
          date: '2025-10-06',
          open: 100,
          high: 105,
          low: 95,
          close: 103,
          volume: 1000000
        },
        {
          date: '2025-10-07',
          open: 103,
          high: 108,
          low: 101,
          close: 106,
          volume: 1100000
        }
      ];

      const result = ValidationUtils.validateMonteCarloPath(validPath, 2);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should reject non-array paths', () => {
      const invalidPath = "not an array";

      const result = ValidationUtils.validateMonteCarloPath(invalidPath, 2);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Monte Carlo path must be an array');
    });

    test('should reject paths with wrong length', () => {
      const shortPath = [
        { date: '2025-10-06', open: 100, high: 105, low: 95, close: 103, volume: 1000000 }
      ];

      const result = ValidationUtils.validateMonteCarloPath(shortPath, 5); // Expected 5 days
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateSummaryStats', () => {
    test('should validate complete summary stats', () => {
      const validSummaryStats = {
        last_close: 258.02,
        predicted_close: 266.37,
        price_change: 8.35,
        price_change_percent: 3.24,
        direction: 'Bullish',
        confidence: 91.24,
        volatility: 1.47,
        avg_volume: 55710501,
        data_quality: {
          completeness: 100.0,
          historical_days: 83,
          chart_ready: true
        }
      };

      const result = ValidationUtils.validateSummaryStats(validSummaryStats);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should reject summary stats with invalid confidence range', () => {
      const invalidSummaryStats = {
        last_close: 258.02,
        predicted_close: 266.37,
        price_change: 8.35,
        price_change_percent: 3.24,
        direction: 'Bullish',
        confidence: 150, // Invalid: > 100
        volatility: 1.47,
        avg_volume: 55710501,
        data_quality: {
          completeness: 100.0,
          historical_days: 83,
          chart_ready: true
        }
      };

      const result = ValidationUtils.validateSummaryStats(invalidSummaryStats);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('confidence must be between 0 and 100');
    });

    test('should reject summary stats with invalid direction', () => {
      const invalidSummaryStats = {
        last_close: 258.02,
        predicted_close: 266.37,
        price_change: 8.35,
        price_change_percent: 3.24,
        direction: 'Sideways', // Invalid: should be Bullish or Bearish
        confidence: 91.24,
        volatility: 1.47,
        avg_volume: 55710501,
        data_quality: {
          completeness: 100.0,
          historical_days: 83,
          chart_ready: true
        }
      };

      const result = ValidationUtils.validateSummaryStats(invalidSummaryStats);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('direction must be "Bullish" or "Bearish"');
    });

    test('should reject summary stats with negative prices', () => {
      const invalidSummaryStats = {
        last_close: -258.02, // Invalid: negative price
        predicted_close: 266.37,
        price_change: 8.35,
        price_change_percent: 3.24,
        direction: 'Bullish',
        confidence: 91.24,
        volatility: 1.47,
        avg_volume: 55710501,
        data_quality: {
          completeness: 100.0,
          historical_days: 83,
          chart_ready: true
        }
      };

      const result = ValidationUtils.validateSummaryStats(invalidSummaryStats);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('last_close must be positive');
    });
  });
});