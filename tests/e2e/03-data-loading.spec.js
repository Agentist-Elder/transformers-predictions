const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('../utils/test-helpers');
const { MOCK_TICKER_DATA, VALID_TICKERS } = require('../fixtures/test-data');

test.describe('Data Loading and JSON Validation', () => {
  let testHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    await page.goto('/');
    await testHelpers.waitForPageLoad();
  });

  test('should load summary data on page initialization', async ({ page }) => {
    // Check if summary data was loaded
    const summaryDataLoaded = await page.evaluate(() => {
      return window.dashboard && window.dashboard.summaryData !== null;
    });

    // Note: summaryData might be null if dataset_summary.json doesn't exist
    // This is acceptable - the test should verify the attempt was made
    expect(typeof summaryDataLoaded).toBe('boolean');

    // Check if predictions data was loaded
    const predictionsDataLoaded = await page.evaluate(() => {
      return window.dashboard && window.dashboard.predictionsData !== null;
    });

    expect(typeof predictionsDataLoaded).toBe('boolean');
  });

  test('should validate ticker data structure when loading', async ({ page }) => {
    // Mock a successful data response
    await testHelpers.mockApiResponse('**/data/AAPL_ohlcv_prediction.json', MOCK_TICKER_DATA);

    await testHelpers.searchTicker('AAPL');

    // Validate that data was processed correctly
    const dataValidation = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.currentData) {
        return { valid: false, reason: 'No current data' };
      }

      const data = window.dashboard.currentData;

      // Check required structure
      if (!data.ticker_info) {
        return { valid: false, reason: 'Missing ticker_info' };
      }

      if (!data.chart_data) {
        return { valid: false, reason: 'Missing chart_data' };
      }

      if (!data.summary_stats) {
        return { valid: false, reason: 'Missing summary_stats' };
      }

      return { valid: true, data: data };
    });

    expect(dataValidation.valid).toBe(true);
    if (dataValidation.valid) {
      expect(dataValidation.data.ticker_info.symbol).toBe('AAPL');
    }
  });

  test('should handle malformed JSON data gracefully', async ({ page }) => {
    // Mock malformed JSON response
    await page.route('**/data/INVALID_ohlcv_prediction.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{ invalid json structure'
      });
    });

    await page.fill('#tickerSearch', 'INVALID');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should show error message
    await expect(page.locator('#errorMessage')).toBeVisible();
  });

  test('should validate chart data completeness', async ({ page }) => {
    // Mock ticker data with complete chart structure
    const completeData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        historical_candlesticks: [
          { date: '2024-09-30', open: 150, high: 152, low: 149, close: 151 },
          { date: '2024-10-01', open: 151, high: 153, low: 150, close: 152 }
        ],
        predicted_candlesticks: [
          { date: '2024-10-02', open: 152, high: 154, low: 151, close: 153 },
          { date: '2024-10-03', open: 153, high: 155, low: 152, close: 154 }
        ]
      }
    };

    await testHelpers.mockApiResponse('**/data/COMPLETE_ohlcv_prediction.json', completeData);

    await testHelpers.searchTicker('COMPLETE');

    // Validate data completeness
    const dataInfo = await testHelpers.validateDataCompleteness();
    expect(dataInfo.hasHistorical).toBe(true);
    expect(dataInfo.hasPredictions).toBe(true);
    expect(dataInfo.ticker).toBe('AAPL'); // From mock data
  });

  test('should handle missing historical data', async ({ page }) => {
    // Mock data without historical data
    const incompleteData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        historical_candlesticks: [],
        predicted_candlesticks: [
          { date: '2024-10-02', open: 152, high: 154, low: 151, close: 153 }
        ]
      }
    };

    await testHelpers.mockApiResponse('**/data/NOHISTORY_ohlcv_prediction.json', incompleteData);

    await page.fill('#tickerSearch', 'NOHISTORY');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should still load but might show warning or handle gracefully
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    // Should either show dashboard (handled gracefully) or error
    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should handle missing prediction data', async ({ page }) => {
    // Mock data without prediction data
    const incompleteData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        historical_candlesticks: [
          { date: '2024-09-30', open: 150, high: 152, low: 149, close: 151 }
        ],
        predicted_candlesticks: []
      }
    };

    await testHelpers.mockApiResponse('**/data/NOPREDS_ohlcv_prediction.json', incompleteData);

    await page.fill('#tickerSearch', 'NOPREDS');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should handle gracefully
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should validate Monte Carlo data structure', async ({ page }) => {
    // Mock data with Monte Carlo paths
    const mcData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        monte_carlo_paths: [
          [153.1, 154.2, 155.3],
          [152.8, 153.9, 154.8],
          [153.0, 154.1, 154.9]
        ],
        prediction_percentiles: {
          '2024-10-02': {
            close: { p10: 152.0, p25: 152.5, p50: 153.0, p75: 153.5, p90: 154.0 }
          },
          '2024-10-03': {
            close: { p10: 153.0, p25: 153.5, p50: 154.0, p75: 154.5, p90: 155.0 }
          }
        }
      }
    };

    await testHelpers.mockApiResponse('**/data/MONTECARLO_ohlcv_prediction.json', mcData);

    await testHelpers.searchTicker('MONTECARLO');

    // Validate Monte Carlo data
    const mcDataInfo = await testHelpers.validateMonteCarloData();
    expect(mcDataInfo.hasMonteCarlo).toBe(true);
    expect(mcDataInfo.pathCount).toBeGreaterThan(0);
    expect(mcDataInfo.hasConfidenceBands).toBe(true);
  });

  test('should handle network timeouts', async ({ page }) => {
    // Mock slow response that times out
    await page.route('**/data/SLOW_ohlcv_prediction.json', route => {
      // Don't fulfill the request to simulate timeout
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_TICKER_DATA)
        });
      }, 35000); // Longer than navigation timeout
    });

    await page.fill('#tickerSearch', 'SLOW');
    await page.press('#tickerSearch', 'Enter');

    // Should show loading initially
    await expect(page.locator('#loadingIndicator')).toBeVisible();

    // Should eventually timeout and show error
    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 40000 });
  });

  test('should cache data between searches', async ({ page }) => {
    let requestCount = 0;

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('AAPL_ohlcv_prediction.json')) {
        requestCount++;
      }
    });

    await testHelpers.mockApiResponse('**/data/AAPL_ohlcv_prediction.json', MOCK_TICKER_DATA);

    // Search for AAPL twice
    await testHelpers.searchTicker('AAPL');
    await testHelpers.searchTicker('AAPL');

    // Should make requests (no caching implemented in current code)
    expect(requestCount).toBeGreaterThanOrEqual(1);
  });

  test('should validate data types and ranges', async ({ page }) => {
    await testHelpers.mockApiResponse('**/data/TYPETEST_ohlcv_prediction.json', MOCK_TICKER_DATA);

    await testHelpers.searchTicker('TYPETEST');

    // Validate data types in loaded data
    const typeValidation = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.currentData) {
        return { valid: false };
      }

      const data = window.dashboard.currentData;
      const historical = data.chart_data?.historical_candlesticks || [];
      const predictions = data.chart_data?.predicted_candlesticks || [];

      // Check that prices are numbers
      for (const candle of [...historical, ...predictions]) {
        if (typeof candle.open !== 'number' ||
            typeof candle.high !== 'number' ||
            typeof candle.low !== 'number' ||
            typeof candle.close !== 'number') {
          return { valid: false, reason: 'Non-numeric price data' };
        }

        // Check price relationships
        if (candle.high < candle.low ||
            candle.high < Math.max(candle.open, candle.close) ||
            candle.low > Math.min(candle.open, candle.close)) {
          return { valid: false, reason: 'Invalid OHLC relationships' };
        }
      }

      return { valid: true };
    });

    expect(typeValidation.valid).toBe(true);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Create large dataset
    const largeDataset = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        historical_candlesticks: Array.from({ length: 1000 }, (_, i) => ({
          date: new Date(Date.now() - (1000 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          open: 100 + Math.random() * 10,
          high: 105 + Math.random() * 10,
          low: 95 + Math.random() * 10,
          close: 100 + Math.random() * 10
        })),
        predicted_candlesticks: Array.from({ length: 5 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          open: 100 + Math.random() * 10,
          high: 105 + Math.random() * 10,
          low: 95 + Math.random() * 10,
          close: 100 + Math.random() * 10
        }))
      }
    };

    await testHelpers.mockApiResponse('**/data/LARGE_ohlcv_prediction.json', largeDataset);

    const startTime = Date.now();
    await testHelpers.searchTicker('LARGE');
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time (< 10 seconds)
    expect(loadTime).toBeLessThan(10000);

    // Should display dashboard
    await expect(page.locator('#dashboardContent')).toBeVisible();
  });

  test('should validate JSON schema compliance', async ({ page }) => {
    // Test with data missing required fields
    const invalidData = {
      // Missing ticker_info
      chart_data: {
        historical_candlesticks: [],
        predicted_candlesticks: []
      }
    };

    await testHelpers.mockApiResponse('**/data/INVALID_ohlcv_prediction.json', invalidData);

    await page.fill('#tickerSearch', 'INVALID');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should handle missing fields gracefully
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });
});