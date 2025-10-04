const fs = require('fs');
const path = require('path');

/**
 * Data Validation Utilities
 * Helper functions for validating prediction data structures
 */

class ValidationUtils {
  static validateDateFormat(dateString) {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!iso8601Regex.test(dateString)) {
      return { valid: false, error: 'Invalid date format, expected YYYY-MM-DD' };
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date value' };
    }

    return { valid: true };
  }

  static validateTimestamp(timestamp) {
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (!timestampRegex.test(timestamp)) {
      return { valid: false, error: 'Invalid timestamp format' };
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid timestamp value' };
    }

    return { valid: true };
  }

  static validateOHLCData(ohlc) {
    const errors = [];

    // Check all required fields exist
    const requiredFields = ['open', 'high', 'low', 'close'];
    requiredFields.forEach(field => {
      if (typeof ohlc[field] !== 'number') {
        errors.push(`${field} must be a number`);
      } else if (ohlc[field] <= 0) {
        errors.push(`${field} must be positive`);
      }
    });

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Check OHLC relationships
    if (ohlc.high < ohlc.open) {
      errors.push('High must be >= open');
    }
    if (ohlc.high < ohlc.close) {
      errors.push('High must be >= close');
    }
    if (ohlc.high < ohlc.low) {
      errors.push('High must be >= low');
    }
    if (ohlc.low > ohlc.open) {
      errors.push('Low must be <= open');
    }
    if (ohlc.low > ohlc.close) {
      errors.push('Low must be <= close');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  static validateCandlestick(candlestick) {
    const errors = [];

    // Validate date
    if (!candlestick.date) {
      errors.push('Missing date field');
    } else {
      const dateValidation = this.validateDateFormat(candlestick.date);
      if (!dateValidation.valid) {
        errors.push(dateValidation.error);
      }
    }

    // Validate OHLC
    const ohlcValidation = this.validateOHLCData(candlestick);
    if (!ohlcValidation.valid) {
      errors.push(...ohlcValidation.errors);
    }

    // Validate volume
    if (typeof candlestick.volume !== 'number') {
      errors.push('Volume must be a number');
    } else if (candlestick.volume <= 0) {
      errors.push('Volume must be positive');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  static validateTickerInfo(tickerInfo) {
    const errors = [];
    const requiredFields = [
      'symbol', 'last_update', 'model_type',
      'lookback_days', 'prediction_days', 'monte_carlo_runs'
    ];

    requiredFields.forEach(field => {
      if (!tickerInfo.hasOwnProperty(field)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate specific fields
    if (tickerInfo.symbol && typeof tickerInfo.symbol !== 'string') {
      errors.push('Symbol must be a string');
    }

    if (tickerInfo.last_update) {
      const timestampValidation = this.validateTimestamp(tickerInfo.last_update);
      if (!timestampValidation.valid) {
        errors.push(`Invalid last_update: ${timestampValidation.error}`);
      }
    }

    ['lookback_days', 'prediction_days', 'monte_carlo_runs'].forEach(field => {
      if (tickerInfo[field] && typeof tickerInfo[field] !== 'number') {
        errors.push(`${field} must be a number`);
      } else if (tickerInfo[field] && tickerInfo[field] <= 0) {
        errors.push(`${field} must be positive`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  static validateConfidenceBands(confidenceBands, expectedDays) {
    const errors = [];
    const requiredPercentiles = ['p10', 'p25', 'p50', 'p75', 'p90'];

    // Check all percentiles exist
    requiredPercentiles.forEach(percentile => {
      if (!confidenceBands[percentile]) {
        errors.push(`Missing percentile: ${percentile}`);
      } else if (!Array.isArray(confidenceBands[percentile])) {
        errors.push(`${percentile} must be an array`);
      } else if (confidenceBands[percentile].length !== expectedDays) {
        errors.push(`${percentile} should have ${expectedDays} entries, got ${confidenceBands[percentile].length}`);
      }
    });

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Validate ordering and structure
    for (let i = 0; i < expectedDays; i++) {
      const values = {
        p10: confidenceBands.p10[i]?.value,
        p25: confidenceBands.p25[i]?.value,
        p50: confidenceBands.p50[i]?.value,
        p75: confidenceBands.p75[i]?.value,
        p90: confidenceBands.p90[i]?.value
      };

      // Check structure
      requiredPercentiles.forEach(percentile => {
        const entry = confidenceBands[percentile][i];
        if (!entry || !entry.date || typeof entry.value !== 'number') {
          errors.push(`Invalid entry at ${percentile}[${i}]`);
        }
      });

      // Check ordering (p90 >= p75 >= p50 >= p25 >= p10)
      if (values.p90 < values.p75) {
        errors.push(`Day ${i}: p90 (${values.p90}) should be >= p75 (${values.p75})`);
      }
      if (values.p75 < values.p50) {
        errors.push(`Day ${i}: p75 (${values.p75}) should be >= p50 (${values.p50})`);
      }
      if (values.p50 < values.p25) {
        errors.push(`Day ${i}: p50 (${values.p50}) should be >= p25 (${values.p25})`);
      }
      if (values.p25 < values.p10) {
        errors.push(`Day ${i}: p25 (${values.p25}) should be >= p10 (${values.p10})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  static validateMonteCarloPath(path, expectedDays) {
    const errors = [];

    if (!Array.isArray(path)) {
      return { valid: false, errors: ['Monte Carlo path must be an array'] };
    }

    if (path.length !== expectedDays) {
      errors.push(`Path should have ${expectedDays} entries, got ${path.length}`);
    }

    path.forEach((point, index) => {
      const candlestickValidation = this.validateCandlestick(point);
      if (!candlestickValidation.valid) {
        errors.push(`Path point ${index}: ${candlestickValidation.errors.join(', ')}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  static validateSummaryStats(summaryStats) {
    const errors = [];
    const requiredFields = [
      'last_close', 'predicted_close', 'price_change',
      'price_change_percent', 'direction', 'confidence',
      'volatility', 'avg_volume', 'data_quality'
    ];

    requiredFields.forEach(field => {
      if (!summaryStats.hasOwnProperty(field)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate numeric fields
    ['last_close', 'predicted_close', 'price_change', 'price_change_percent',
     'confidence', 'volatility', 'avg_volume'].forEach(field => {
      if (summaryStats[field] && typeof summaryStats[field] !== 'number') {
        errors.push(`${field} must be a number`);
      }
    });

    // Validate ranges
    if (summaryStats.last_close && summaryStats.last_close <= 0) {
      errors.push('last_close must be positive');
    }
    if (summaryStats.predicted_close && summaryStats.predicted_close <= 0) {
      errors.push('predicted_close must be positive');
    }
    if (summaryStats.confidence && (summaryStats.confidence < 0 || summaryStats.confidence > 100)) {
      errors.push('confidence must be between 0 and 100');
    }
    if (summaryStats.avg_volume && summaryStats.avg_volume <= 0) {
      errors.push('avg_volume must be positive');
    }

    // Validate direction
    if (summaryStats.direction && !['Bullish', 'Bearish'].includes(summaryStats.direction)) {
      errors.push('direction must be "Bullish" or "Bearish"');
    }

    // Validate data quality
    if (summaryStats.data_quality) {
      const dq = summaryStats.data_quality;
      if (typeof dq.completeness !== 'number' || dq.completeness < 0 || dq.completeness > 100) {
        errors.push('data_quality.completeness must be a number between 0 and 100');
      }
      if (typeof dq.historical_days !== 'number' || dq.historical_days < 0) {
        errors.push('data_quality.historical_days must be a positive number');
      }
      if (typeof dq.chart_ready !== 'boolean') {
        errors.push('data_quality.chart_ready must be a boolean');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  static validateCompletePredictionFile(filePath) {
    const fileName = path.basename(filePath);
    const results = {
      file: fileName,
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      // Validate top-level structure
      const requiredSections = ['ticker_info', 'data', 'summary_stats'];
      requiredSections.forEach(section => {
        if (!data[section]) {
          results.errors.push(`Missing section: ${section}`);
          results.valid = false;
        }
      });

      if (!results.valid) {
        return results;
      }

      // Validate ticker info
      const tickerValidation = this.validateTickerInfo(data.ticker_info);
      if (!tickerValidation.valid) {
        results.errors.push(...tickerValidation.errors);
        results.valid = false;
      }

      // Validate historical data
      if (data.data.historical_candlesticks) {
        data.data.historical_candlesticks.forEach((candle, index) => {
          const candleValidation = this.validateCandlestick(candle);
          if (!candleValidation.valid) {
            results.errors.push(`Historical candle ${index}: ${candleValidation.errors.join(', ')}`);
            results.valid = false;
          }
        });
      }

      // Validate predictions
      if (data.data.predictions) {
        data.data.predictions.forEach((pred, index) => {
          const predValidation = this.validateCandlestick(pred);
          if (!predValidation.valid) {
            results.errors.push(`Prediction ${index}: ${predValidation.errors.join(', ')}`);
            results.valid = false;
          }
        });
      }

      // Validate Monte Carlo paths
      if (data.data.monte_carlo_paths && data.ticker_info.monte_carlo_runs) {
        if (data.data.monte_carlo_paths.length !== data.ticker_info.monte_carlo_runs) {
          results.errors.push(`Expected ${data.ticker_info.monte_carlo_runs} Monte Carlo paths, got ${data.data.monte_carlo_paths.length}`);
          results.valid = false;
        }

        data.data.monte_carlo_paths.forEach((path, index) => {
          const pathValidation = this.validateMonteCarloPath(path, data.ticker_info.prediction_days);
          if (!pathValidation.valid) {
            results.errors.push(`Monte Carlo path ${index}: ${pathValidation.errors.join(', ')}`);
            results.valid = false;
          }
        });
      }

      // Validate confidence bands
      if (data.data.confidence_bands && data.ticker_info.prediction_days) {
        const bandsValidation = this.validateConfidenceBands(data.data.confidence_bands, data.ticker_info.prediction_days);
        if (!bandsValidation.valid) {
          results.errors.push(...bandsValidation.errors);
          results.valid = false;
        }
      }

      // Validate summary stats
      const summaryValidation = this.validateSummaryStats(data.summary_stats);
      if (!summaryValidation.valid) {
        results.errors.push(...summaryValidation.errors);
        results.valid = false;
      }

    } catch (error) {
      results.valid = false;
      results.errors.push(`File processing error: ${error.message}`);
    }

    return results;
  }
}

module.exports = ValidationUtils;