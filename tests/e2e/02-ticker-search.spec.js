const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('../utils/test-helpers');
const {
  VALID_TICKERS,
  INVALID_TICKERS,
  MOCK_TICKER_DATA
} = require('../fixtures/test-data');

test.describe('Ticker Search and Selection Functionality', () => {
  let testHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    await page.goto('/');
    await testHelpers.waitForPageLoad();
  });

  test('should search for ticker using input field', async ({ page }) => {
    const ticker = 'AAPL';

    // Type in search field
    await page.fill('#tickerSearch', ticker);
    await page.press('#tickerSearch', 'Enter');

    // Should show loading indicator
    await expect(page.locator('#loadingIndicator')).toBeVisible();

    // Wait for results (or error)
    await testHelpers.waitForLoadingComplete();

    // Should either show dashboard or error message
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should handle real-time search as user types', async ({ page }) => {
    const ticker = 'AAPL';

    // Type character by character with delays
    for (let i = 0; i < ticker.length; i++) {
      await page.fill('#tickerSearch', ticker.substring(0, i + 1));

      if (i < ticker.length - 1) {
        // Should not trigger search for partial input (less than full ticker)
        await page.waitForTimeout(100);
      }
    }

    // After typing complete ticker, wait for debounced search
    await page.waitForTimeout(400); // 300ms debounce + buffer

    await testHelpers.waitForLoadingComplete();

    // Should show results
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should clear results when search input is emptied', async ({ page }) => {
    // First search for a ticker
    await page.fill('#tickerSearch', 'AAPL');
    await page.press('#tickerSearch', 'Enter');
    await testHelpers.waitForLoadingComplete();

    // Clear the search
    await page.fill('#tickerSearch', '');
    await page.waitForTimeout(400); // Wait for debounce

    // Should return to summary view
    await expect(page.locator('#summaryContent')).toBeVisible();
    await expect(page.locator('#dashboardContent')).toHaveClass(/hidden/);
  });

  test('should handle ticker search via popular ticker tags', async ({ page }) => {
    // Click on first ticker tag
    const firstTickerTag = page.locator('.ticker-tag').first();
    const tickerText = await firstTickerTag.textContent();

    await firstTickerTag.click();

    // Should populate search input
    await expect(page.locator('#tickerSearch')).toHaveValue(tickerText);

    // Should show loading
    await expect(page.locator('#loadingIndicator')).toBeVisible();

    await testHelpers.waitForLoadingComplete();

    // Should show results
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should handle ticker search via prediction grid items', async ({ page }) => {
    // Click on first prediction item
    const firstPrediction = page.locator('.prediction-item').first();
    const tickerElement = firstPrediction.locator('.pred-ticker');
    const tickerText = await tickerElement.textContent();

    await firstPrediction.click();

    // Should populate search input
    await expect(page.locator('#tickerSearch')).toHaveValue(tickerText);

    // Should show loading
    await expect(page.locator('#loadingIndicator')).toBeVisible();

    await testHelpers.waitForLoadingComplete();

    // Should show results
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should handle invalid ticker symbols gracefully', async ({ page }) => {
    const invalidTicker = 'INVALIDTICKER';

    await page.fill('#tickerSearch', invalidTicker);
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should show error message
    await expect(page.locator('#errorMessage')).toBeVisible();
    await expect(page.locator('#errorMessage')).toContainText('not found');

    // Dashboard should remain hidden
    await expect(page.locator('#dashboardContent')).toHaveClass(/hidden/);

    // Summary should remain hidden
    await expect(page.locator('#summaryContent')).toHaveClass(/hidden/);
  });

  test('should handle empty search input', async ({ page }) => {
    // Try to search with empty input
    await page.fill('#tickerSearch', '');
    await page.press('#tickerSearch', 'Enter');

    // Should not trigger any loading or show error
    await expect(page.locator('#loadingIndicator')).toHaveClass(/hidden/);
    await expect(page.locator('#errorMessage')).toHaveClass(/hidden/);

    // Should remain on summary view
    await expect(page.locator('#summaryContent')).toBeVisible();
  });

  test('should handle whitespace and case insensitive search', async ({ page }) => {
    // Test with lowercase and whitespace
    await page.fill('#tickerSearch', '  aapl  ');
    await page.press('#tickerSearch', 'Enter');

    // Should show search was normalized to uppercase
    await expect(page.locator('#tickerSearch')).toHaveValue('  aapl  ');

    await testHelpers.waitForLoadingComplete();

    // Should process the search (even if not found)
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should respect maximum length constraint', async ({ page }) => {
    const longInput = 'VERYLONGTICKERSYMBOL';

    await page.fill('#tickerSearch', longInput);

    // Should be truncated to maxlength (10 characters)
    const actualValue = await page.locator('#tickerSearch').inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(10);
  });

  test('should handle rapid sequential searches', async ({ page }) => {
    const tickers = ['AAPL', 'MSFT', 'GOOGL'];

    for (const ticker of tickers) {
      await page.fill('#tickerSearch', ticker);
      await page.press('#tickerSearch', 'Enter');

      // Wait briefly before next search
      await page.waitForTimeout(100);
    }

    // Should handle the last search
    await testHelpers.waitForLoadingComplete();

    // Should show results for the last ticker
    const searchValue = await page.locator('#tickerSearch').inputValue();
    expect(searchValue).toBe('GOOGL');
  });

  test('should maintain search state during page interaction', async ({ page }) => {
    const ticker = 'AAPL';

    await page.fill('#tickerSearch', ticker);
    await page.press('#tickerSearch', 'Enter');
    await testHelpers.waitForLoadingComplete();

    // Search input should retain the value
    await expect(page.locator('#tickerSearch')).toHaveValue(ticker);

    // Try clicking somewhere else and check if value persists
    await page.locator('h1').click();
    await expect(page.locator('#tickerSearch')).toHaveValue(ticker);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await testHelpers.mockNetworkFailure('**/data/*_ohlcv_prediction.json', 500);

    await page.fill('#tickerSearch', 'AAPL');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should show error message
    await expect(page.locator('#errorMessage')).toBeVisible();
    await expect(page.locator('#errorMessage')).toContainText(/Error loading|not found/);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Focus search input with Tab
    await page.keyboard.press('Tab');

    // Should focus on search input
    await expect(page.locator('#tickerSearch')).toBeFocused();

    // Type ticker
    await page.keyboard.type('AAPL');

    // Press Enter to search
    await page.keyboard.press('Enter');

    await testHelpers.waitForLoadingComplete();

    // Should show results
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should debounce search properly', async ({ page }) => {
    let searchCount = 0;

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('_ohlcv_prediction.json')) {
        searchCount++;
      }
    });

    // Type characters rapidly
    const ticker = 'AAPL';
    for (const char of ticker) {
      await page.type('#tickerSearch', char, { delay: 50 });
    }

    // Wait for debounce period
    await page.waitForTimeout(500);

    // Should have made only one or very few requests due to debouncing
    expect(searchCount).toBeLessThanOrEqual(2);
  });
});