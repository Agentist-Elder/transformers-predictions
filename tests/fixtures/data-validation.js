/**
 * Data Validation Utilities for Testing
 */

/**
 * Validate OHLCV data structure
 */
function validateOHLCVData(candlestick) {
  if (!candlestick || typeof candlestick !== 'object') {
    return { valid: false, error: 'Invalid candlestick object' };
  }

  const requiredFields = ['date', 'open', 'high', 'low', 'close'];
  for (const field of requiredFields) {
    if (!(field in candlestick)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  const { open, high, low, close } = candlestick;

  // Check data types
  if (typeof open !== 'number' || typeof high !== 'number' ||
      typeof low !== 'number' || typeof close !== 'number') {
    return { valid: false, error: 'OHLC values must be numbers' };
  }

  // Check for valid numbers
  if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) ||
      !isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) {
    return { valid: false, error: 'OHLC values must be finite numbers' };
  }

  // Check OHLC relationships
  if (high < Math.max(open, close)) {
    return { valid: false, error: 'High must be >= max(open, close)' };
  }

  if (low > Math.min(open, close)) {
    return { valid: false, error: 'Low must be <= min(open, close)' };
  }

  if (high < low) {
    return { valid: false, error: 'High must be >= low' };
  }

  // Check for reasonable price values (> 0)
  if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
    return { valid: false, error: 'OHLC values must be positive' };
  }

  return { valid: true };
}

/**
 * Validate ticker data structure
 */
function validateTickerData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data must be an object' };
  }

  // Check required top-level fields
  const requiredFields = ['ticker_info', 'chart_data', 'summary_stats'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate ticker_info
  const tickerInfo = data.ticker_info;
  if (!tickerInfo.symbol || typeof tickerInfo.symbol !== 'string') {
    return { valid: false, error: 'ticker_info.symbol must be a non-empty string' };
  }

  // Validate chart_data
  const chartData = data.chart_data;
  if (!chartData.historical_candlesticks && !chartData.historical) {
    return { valid: false, error: 'chart_data must have historical data' };
  }

  if (!chartData.predicted_candlesticks && !chartData.predicted) {
    return { valid: false, error: 'chart_data must have prediction data' };
  }

  // Validate historical data
  const historical = chartData.historical_candlesticks || chartData.historical;
  if (!Array.isArray(historical)) {
    return { valid: false, error: 'Historical data must be an array' };
  }

  for (let i = 0; i < historical.length; i++) {
    const validation = validateOHLCVData(historical[i]);
    if (!validation.valid) {
      return { valid: false, error: `Historical data[${i}]: ${validation.error}` };
    }
  }

  // Validate prediction data
  const predicted = chartData.predicted_candlesticks || chartData.predicted;
  if (!Array.isArray(predicted)) {
    return { valid: false, error: 'Prediction data must be an array' };
  }

  for (let i = 0; i < predicted.length; i++) {
    const validation = validateOHLCVData(predicted[i]);
    if (!validation.valid) {
      return { valid: false, error: `Prediction data[${i}]: ${validation.error}` };
    }
  }

  return { valid: true };
}

/**
 * Validate Monte Carlo paths
 */
function validateMonteCarloData(data) {
  if (!data || !data.chart_data) {
    return { valid: false, error: 'No chart data provided' };
  }

  const mcPaths = data.chart_data.monte_carlo_paths;
  if (!mcPaths) {
    return { valid: true, note: 'No Monte Carlo paths present' };
  }

  if (!Array.isArray(mcPaths)) {
    return { valid: false, error: 'Monte Carlo paths must be an array' };
  }

  for (let i = 0; i < mcPaths.length; i++) {
    const path = mcPaths[i];
    if (!Array.isArray(path)) {
      return { valid: false, error: `Monte Carlo path[${i}] must be an array` };
    }

    for (let j = 0; j < path.length; j++) {
      const value = path[j];
      if (typeof value === 'object' && value !== null) {
        // OHLCV object format
        const validation = validateOHLCVData(value);
        if (!validation.valid) {
          return { valid: false, error: `Monte Carlo path[${i}][${j}]: ${validation.error}` };
        }
      } else if (typeof value === 'number') {
        // Simple number format
        if (isNaN(value) || !isFinite(value) || value <= 0) {
          return { valid: false, error: `Monte Carlo path[${i}][${j}] must be a positive finite number` };
        }
      } else {
        return { valid: false, error: `Monte Carlo path[${i}][${j}] must be a number or OHLCV object` };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate confidence bands/percentiles
 */
function validateConfidenceBands(data) {
  if (!data || !data.chart_data) {
    return { valid: false, error: 'No chart data provided' };
  }

  const percentiles = data.chart_data.prediction_percentiles;
  if (!percentiles) {
    return { valid: true, note: 'No confidence bands present' };
  }

  // Check for old format (arrays)
  if (percentiles.p10 && Array.isArray(percentiles.p10)) {
    const requiredPercentiles = ['p10', 'p25', 'p50', 'p75', 'p90'];
    for (const p of requiredPercentiles) {
      if (!percentiles[p] || !Array.isArray(percentiles[p])) {
        return { valid: false, error: `Missing or invalid percentile: ${p}` };
      }

      for (let i = 0; i < percentiles[p].length; i++) {
        const value = percentiles[p][i];
        if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
          return { valid: false, error: `Invalid value in ${p}[${i}]` };
        }
      }
    }

    // Check ordering
    for (let i = 0; i < percentiles.p10.length; i++) {
      if (percentiles.p10[i] > percentiles.p25[i] ||
          percentiles.p25[i] > percentiles.p50[i] ||
          percentiles.p50[i] > percentiles.p75[i] ||
          percentiles.p75[i] > percentiles.p90[i]) {
        return { valid: false, error: `Percentile ordering violation at index ${i}` };
      }
    }
  } else {
    // Check for new format (date-based)
    for (const date in percentiles) {
      const dateData = percentiles[date];
      if (!dateData.close) {
        return { valid: false, error: `Missing close data for date ${date}` };
      }

      const close = dateData.close;
      const requiredPercentiles = ['p10', 'p25', 'p50', 'p75', 'p90'];
      for (const p of requiredPercentiles) {
        if (typeof close[p] !== 'number' || isNaN(close[p]) || !isFinite(close[p])) {
          return { valid: false, error: `Invalid ${p} value for date ${date}` };
        }
      }

      // Check ordering
      if (close.p10 > close.p25 || close.p25 > close.p50 ||
          close.p50 > close.p75 || close.p75 > close.p90) {
        return { valid: false, error: `Percentile ordering violation for date ${date}` };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate summary statistics
 */
function validateSummaryStats(data) {
  if (!data || !data.summary_stats) {
    return { valid: false, error: 'No summary stats provided' };
  }

  const stats = data.summary_stats;

  // Check for required fields
  if (typeof stats.overall_score !== 'number' || isNaN(stats.overall_score)) {
    return { valid: false, error: 'overall_score must be a valid number' };
  }

  if (stats.overall_score < 0 || stats.overall_score > 100) {
    return { valid: false, error: 'overall_score must be between 0 and 100' };
  }

  return { valid: true };
}

/**
 * Generate test data with specific characteristics
 */
function generateTestData(options = {}) {
  const {
    ticker = 'TEST',
    historicalDays = 30,
    predictionDays = 5,
    basePrice = 100,
    volatility = 0.02,
    trend = 0,
    includeMonteCarlos = true,
    monteCarloCount = 10,
    includeConfidence = true
  } = options;

  const data = {
    ticker_info: {
      symbol: ticker,
      model_type: 'Complete OHLCV Monte Carlo',
      generated_at: new Date().toISOString(),
      data_completeness: '100%',
      chart_compatibility: 'candlestick_ready'
    },
    summary_stats: {
      overall_score: 85.0 + Math.random() * 10,
      prediction_quality: 'excellent',
      volatility: volatility * 100
    },
    chart_data: {
      historical_candlesticks: [],
      predicted_candlesticks: []
    }
  };

  // Generate historical data
  let currentPrice = basePrice;
  for (let i = historicalDays; i > 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dailyChange = (Math.random() - 0.5) * volatility * 2 + trend;
    const open = currentPrice;
    const close = open * (1 + dailyChange);
    const high = Math.max(open, close) * (1 + Math.random() * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * volatility);

    data.chart_data.historical_candlesticks.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.floor(Math.random() * 1000000) + 500000
    });

    currentPrice = close;
  }

  // Generate prediction data
  for (let i = 1; i <= predictionDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const dailyChange = (Math.random() - 0.5) * volatility * 2 + trend;
    const open = currentPrice;
    const close = open * (1 + dailyChange);
    const high = Math.max(open, close) * (1 + Math.random() * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * volatility);

    data.chart_data.predicted_candlesticks.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.floor(Math.random() * 1000000) + 500000
    });

    currentPrice = close;
  }

  // Add Monte Carlo paths if requested
  if (includeMonteCarlos) {
    data.chart_data.monte_carlo_paths = [];
    const baseCloses = data.chart_data.predicted_candlesticks.map(c => c.close);

    for (let i = 0; i < monteCarloCount; i++) {
      const path = baseCloses.map(baseClose => {
        const variation = (Math.random() - 0.5) * volatility * 4;
        return Math.round(baseClose * (1 + variation) * 100) / 100;
      });
      data.chart_data.monte_carlo_paths.push(path);
    }
  }

  // Add confidence bands if requested
  if (includeConfidence) {
    data.chart_data.prediction_percentiles = {};

    data.chart_data.predicted_candlesticks.forEach(candle => {
      const baseClose = candle.close;
      data.chart_data.prediction_percentiles[candle.date] = {
        close: {
          p10: Math.round(baseClose * 0.95 * 100) / 100,
          p25: Math.round(baseClose * 0.975 * 100) / 100,
          p50: Math.round(baseClose * 100) / 100,
          p75: Math.round(baseClose * 1.025 * 100) / 100,
          p90: Math.round(baseClose * 1.05 * 100) / 100
        }
      };
    });
  }

  return data;
}

module.exports = {
  validateOHLCVData,
  validateTickerData,
  validateMonteCarloData,
  validateConfidenceBands,
  validateSummaryStats,
  generateTestData
};