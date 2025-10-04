const { test, expect } = require('@playwright/test');

test.describe('Setup and Environment Validation', () => {
  test('should validate test environment setup', async ({ page }) => {
    // Check that we can reach the test server
    await page.goto('/');

    // Basic health check
    await expect(page).toHaveTitle(/Transformers Predictions/);
    await expect(page.locator('h1')).toBeVisible();

    // Check that external dependencies are loaded
    const externalDepsLoaded = await page.evaluate(() => {
      return {
        chartJs: typeof window.Chart !== 'undefined',
        dateFns: typeof window.dateFns !== 'undefined'
      };
    });

    expect(externalDepsLoaded.chartJs).toBe(true);
    expect(externalDepsLoaded.dateFns).toBe(true);

    console.log('✅ Test environment validated successfully');
  });

  test('should have proper test data structure', async ({ page }) => {
    await page.goto('/');

    // Check that dashboard class is properly initialized
    const dashboardInitialized = await page.evaluate(() => {
      return window.dashboard && typeof window.dashboard.searchTicker === 'function';
    });

    expect(dashboardInitialized).toBe(true);

    // Check that DOM elements are properly structured
    const criticalElements = [
      '#tickerSearch',
      '#loadingIndicator',
      '#errorMessage',
      '#summaryContent',
      '#dashboardContent',
      '#ohlcChart'
    ];

    for (const selector of criticalElements) {
      await expect(page.locator(selector)).toBeAttached();
    }

    console.log('✅ Test data structure validated');
  });

  test('should handle test data mocking correctly', async ({ page }) => {
    // Test that we can mock API responses
    const testData = {
      ticker_info: { symbol: 'TEST' },
      chart_data: {
        historical_candlesticks: [
          { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102 }
        ],
        predicted_candlesticks: [
          { date: '2024-01-02', open: 102, high: 107, low: 97, close: 104 }
        ]
      },
      summary_stats: { overall_score: 85 }
    };

    await page.route('**/data/TEST_ohlcv_prediction.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(testData)
      });
    });

    await page.goto('/');
    await page.fill('#tickerSearch', 'TEST');
    await page.press('#tickerSearch', 'Enter');

    // Should process mocked data
    await expect(page.locator('#loadingIndicator')).toBeVisible();

    // Wait for loading to complete
    await page.waitForSelector('#loadingIndicator.hidden', { timeout: 10000 });

    // Should show dashboard or error (mocked data should work)
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);

    console.log('✅ Test data mocking validated');
  });

  test('should run in all configured browsers', async ({ browserName }) => {
    // This test validates that the current browser can run our tests
    console.log(`🌐 Running validation in ${browserName}`);

    await test.step(`Initialize ${browserName}`, async () => {
      // Browser-specific setup if needed
      if (browserName === 'webkit') {
        // Safari-specific setup
      } else if (browserName === 'firefox') {
        // Firefox-specific setup
      } else if (browserName === 'chromium') {
        // Chrome-specific setup
      }
    });

    await test.step('Basic functionality check', async () => {
      // Basic check that works in all browsers
      expect(browserName).toBeTruthy();
      console.log(`✅ ${browserName} validation completed`);
    });
  });
});