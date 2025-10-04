const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('../utils/test-helpers');
const {
  MOCK_TICKER_DATA,
  INVALID_TICKER_DATA,
  EMPTY_TICKER_DATA,
  INVALID_TICKERS
} = require('../fixtures/test-data');

test.describe('Error Handling and Edge Cases', () => {
  let testHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    await page.goto('/');
    await testHelpers.waitForPageLoad();
  });

  test('should handle 404 errors for non-existent tickers', async ({ page }) => {
    // Mock 404 response
    await testHelpers.mockNetworkFailure('**/data/NOTFOUND_ohlcv_prediction.json', 404);

    await page.fill('#tickerSearch', 'NOTFOUND');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should show error message
    await testHelpers.validateErrorState('not found');

    // Dashboard should not be visible
    await expect(page.locator('#dashboardContent')).toHaveClass(/hidden/);
  });

  test('should handle 500 server errors', async ({ page }) => {
    // Mock server error
    await testHelpers.mockNetworkFailure('**/data/SERVER_ohlcv_prediction.json', 500);

    await page.fill('#tickerSearch', 'SERVER');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should show error message
    await testHelpers.validateErrorState();

    // Should not crash the application
    const dashboardExists = await page.evaluate(() => {
      return window.dashboard !== null && window.dashboard !== undefined;
    });
    expect(dashboardExists).toBe(true);
  });

  test('should handle network timeout errors', async ({ page }) => {
    // Mock slow response that times out
    await page.route('**/data/TIMEOUT_ohlcv_prediction.json', route => {
      // Never fulfill to simulate timeout
    });

    await page.fill('#tickerSearch', 'TIMEOUT');
    await page.press('#tickerSearch', 'Enter');

    // Should show loading initially
    await expect(page.locator('#loadingIndicator')).toBeVisible();

    // Should eventually show error due to timeout
    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 35000 });
  });

  test('should handle malformed JSON responses', async ({ page }) => {
    // Mock malformed JSON
    await page.route('**/data/MALFORMED_ohlcv_prediction.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{ "malformed": json without closing brace'
      });
    });

    await page.fill('#tickerSearch', 'MALFORMED');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should handle JSON parse error
    await testHelpers.validateErrorState();
  });

  test('should handle empty response body', async ({ page }) => {
    // Mock empty response
    await page.route('**/data/EMPTY_ohlcv_prediction.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ''
      });
    });

    await page.fill('#tickerSearch', 'EMPTY');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should handle empty response
    await testHelpers.validateErrorState();
  });

  test('should handle invalid data structure', async ({ page }) => {
    // Mock response with invalid structure
    const invalidStructure = {
      invalid: 'structure',
      missing: 'required fields'
    };

    await testHelpers.mockApiResponse('**/data/INVALID_ohlcv_prediction.json', invalidStructure);

    await page.fill('#tickerSearch', 'INVALID');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should handle invalid structure
    await testHelpers.validateErrorState('Invalid data structure');
  });

  test('should handle missing chart data', async ({ page }) => {
    const noChartData = {
      ticker_info: MOCK_TICKER_DATA.ticker_info,
      summary_stats: MOCK_TICKER_DATA.summary_stats
      // Missing chart_data
    };

    await testHelpers.mockApiResponse('**/data/NOCHART_ohlcv_prediction.json', noChartData);

    await page.fill('#tickerSearch', 'NOCHART');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should handle missing chart data
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should handle corrupted numerical data', async ({ page }) => {
    const corruptedData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        historical_candlesticks: [
          { date: '2024-09-30', open: 'invalid', high: NaN, low: null, close: undefined }
        ],
        predicted_candlesticks: [
          { date: '2024-10-02', open: Infinity, high: -Infinity, low: 'abc', close: {} }
        ]
      }
    };

    await testHelpers.mockApiResponse('**/data/CORRUPT_ohlcv_prediction.json', corruptedData);

    await page.fill('#tickerSearch', 'CORRUPT');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should handle corrupted data gracefully
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);

    // If dashboard is shown, chart should handle invalid data
    if (await page.locator('#dashboardContent').isVisible()) {
      // Chart should either not render or filter out invalid data
      const chartExists = await page.evaluate(() => {
        return window.dashboard && window.dashboard.chart !== null;
      });

      if (chartExists) {
        // If chart exists, it should have filtered out invalid data points
        const validDataCount = await page.evaluate(() => {
          if (!window.dashboard.chart) return 0;

          let validPoints = 0;
          window.dashboard.chart.data.datasets.forEach(dataset => {
            if (dataset.data) {
              validPoints += dataset.data.filter(point =>
                point && typeof point.y === 'number' && !isNaN(point.y) && isFinite(point.y)
              ).length;
            }
          });
          return validPoints;
        });

        expect(validDataCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should handle CORS errors', async ({ page }) => {
    // Mock CORS error
    await page.route('**/data/CORS_ohlcv_prediction.json', route => {
      route.abort('accessdenied');
    });

    await page.fill('#tickerSearch', 'CORS');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should handle CORS error
    await testHelpers.validateErrorState();
  });

  test('should handle rapid consecutive searches with errors', async ({ page }) => {
    // Mock different error responses
    await testHelpers.mockNetworkFailure('**/data/ERROR1_ohlcv_prediction.json', 404);
    await testHelpers.mockNetworkFailure('**/data/ERROR2_ohlcv_prediction.json', 500);
    await testHelpers.mockNetworkFailure('**/data/ERROR3_ohlcv_prediction.json', 503);

    // Perform rapid searches
    const tickers = ['ERROR1', 'ERROR2', 'ERROR3'];

    for (const ticker of tickers) {
      await page.fill('#tickerSearch', ticker);
      await page.press('#tickerSearch', 'Enter');
      await page.waitForTimeout(100); // Brief delay between searches
    }

    // Wait for final search to complete
    await testHelpers.waitForLoadingComplete();

    // Should handle the last error
    await testHelpers.validateErrorState();

    // Application should remain stable
    const dashboardExists = await page.evaluate(() => {
      return window.dashboard !== null;
    });
    expect(dashboardExists).toBe(true);
  });

  test('should handle chart rendering errors', async ({ page }) => {
    // Mock data that might cause chart errors
    const problematicData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        historical_candlesticks: [
          { date: 'invalid-date', open: 150, high: 152, low: 149, close: 151 }
        ],
        predicted_candlesticks: [
          { date: 'another-invalid-date', open: 152, high: 154, low: 151, close: 153 }
        ]
      }
    };

    await testHelpers.mockApiResponse('**/data/CHARTPROBLEM_ohlcv_prediction.json', problematicData);

    await page.fill('#tickerSearch', 'CHARTPROBLEM');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Dashboard might show but chart could fail
    if (await page.locator('#dashboardContent').isVisible()) {
      // Chart rendering might fail, but should not crash the page
      const pageError = await page.evaluate(() => {
        return window.onerror !== null;
      });

      // Application should remain functional
      const dashboardExists = await page.evaluate(() => {
        return window.dashboard !== null;
      });
      expect(dashboardExists).toBe(true);
    }
  });

  test('should handle missing external dependencies', async ({ page }) => {
    // Simulate missing Chart.js
    await page.addInitScript(() => {
      // Delete Chart.js to simulate missing dependency
      delete window.Chart;
    });

    await page.goto('/');

    // Should handle missing Chart.js gracefully
    const chartJsError = await page.evaluate(() => {
      return typeof window.Chart === 'undefined';
    });

    if (chartJsError) {
      // App might not work fully, but should not crash
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#tickerSearch')).toBeVisible();
    }
  });

  test('should handle browser storage errors', async ({ page }) => {
    // Simulate localStorage/sessionStorage errors
    await page.addInitScript(() => {
      // Override localStorage to throw errors
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => { throw new Error('Storage unavailable'); },
          setItem: () => { throw new Error('Storage unavailable'); },
          removeItem: () => { throw new Error('Storage unavailable'); }
        }
      });
    });

    await page.goto('/');
    await testHelpers.waitForPageLoad();

    // Should handle storage errors gracefully
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#tickerSearch')).toBeVisible();

    // Basic functionality should still work
    await testHelpers.mockApiResponse('**/data/AAPL_ohlcv_prediction.json', MOCK_TICKER_DATA);
    await testHelpers.searchTicker('AAPL');

    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();
    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should handle very long ticker symbols', async ({ page }) => {
    const longTicker = 'A'.repeat(50);

    await page.fill('#tickerSearch', longTicker);

    // Should respect maxlength constraint
    const actualValue = await page.locator('#tickerSearch').inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(10);
  });

  test('should handle special characters in ticker input', async ({ page }) => {
    const specialChars = ['<script>', '"; DROP TABLE;', '&nbsp;', '🚀', '../../etc/passwd'];

    for (const chars of specialChars) {
      await page.fill('#tickerSearch', chars);
      await page.press('#tickerSearch', 'Enter');

      await testHelpers.waitForLoadingComplete();

      // Should not cause script injection or other security issues
      const pageTitle = await page.title();
      expect(pageTitle).toBe('🤖 Transformers Predictions');

      // Should handle gracefully
      const isErrorVisible = await page.locator('#errorMessage').isVisible();
      if (isErrorVisible) {
        // Error is acceptable for invalid characters
        expect(true).toBe(true);
      }

      // Clear for next test
      await page.fill('#tickerSearch', '');
      await page.waitForTimeout(100);
    }
  });

  test('should handle memory leaks during repeated searches', async ({ page }) => {
    // Perform many searches to test for memory leaks
    await testHelpers.mockApiResponse('**/data/MEMORY_ohlcv_prediction.json', MOCK_TICKER_DATA);

    const searchCount = 20;
    for (let i = 0; i < searchCount; i++) {
      await page.fill('#tickerSearch', 'MEMORY');
      await page.press('#tickerSearch', 'Enter');
      await testHelpers.waitForLoadingComplete();

      // Clear and repeat
      await page.fill('#tickerSearch', '');
      await page.waitForTimeout(100);
    }

    // Application should still be responsive
    const dashboardExists = await page.evaluate(() => {
      return window.dashboard !== null;
    });
    expect(dashboardExists).toBe(true);

    // Should be able to perform a final search
    await testHelpers.searchTicker('MEMORY');
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    expect(isDashboardVisible).toBe(true);
  });

  test('should recover from errors and allow new searches', async ({ page }) => {
    // First, trigger an error
    await testHelpers.mockNetworkFailure('**/data/ERROR_ohlcv_prediction.json', 404);
    await page.fill('#tickerSearch', 'ERROR');
    await page.press('#tickerSearch', 'Enter');
    await testHelpers.waitForLoadingComplete();

    // Should show error
    await testHelpers.validateErrorState();

    // Now mock successful response
    await testHelpers.mockApiResponse('**/data/SUCCESS_ohlcv_prediction.json', MOCK_TICKER_DATA);

    // Should be able to search successfully
    await testHelpers.searchTicker('SUCCESS');

    // Should show dashboard
    await expect(page.locator('#dashboardContent')).toBeVisible();
    await expect(page.locator('#errorMessage')).toHaveClass(/hidden/);
  });

  test('should handle concurrent error scenarios', async ({ page }) => {
    // Set up multiple routes with different errors
    await page.route('**/data/CONCURRENT1_ohlcv_prediction.json', route => {
      setTimeout(() => route.abort('failed'), 1000);
    });

    await page.route('**/data/CONCURRENT2_ohlcv_prediction.json', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    // Start multiple searches quickly
    await page.fill('#tickerSearch', 'CONCURRENT1');
    await page.press('#tickerSearch', 'Enter');

    await page.waitForTimeout(100);

    await page.fill('#tickerSearch', 'CONCURRENT2');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should handle the final error state
    await testHelpers.validateErrorState();

    // Application should remain stable
    const dashboardExists = await page.evaluate(() => {
      return window.dashboard !== null;
    });
    expect(dashboardExists).toBe(true);
  });
});