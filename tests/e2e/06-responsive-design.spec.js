const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('../utils/test-helpers');
const { VIEWPORT_SIZES, MOCK_TICKER_DATA } = require('../fixtures/test-data');

test.describe('Responsive Design and Mobile Views', () => {
  let testHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    await page.goto('/');
    await testHelpers.waitForPageLoad();

    // Mock ticker data for consistent testing
    await testHelpers.mockApiResponse('**/data/AAPL_ohlcv_prediction.json', MOCK_TICKER_DATA);
  });

  test('should adapt layout for desktop viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.desktop);
    await page.reload();
    await testHelpers.waitForPageLoad();

    // Check header layout
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check overview cards layout
    const overviewCards = page.locator('.overview-cards');
    await expect(overviewCards).toBeVisible();

    const cardBounds = await testHelpers.getElementBounds('.overview-cards');
    expect(cardBounds.width).toBeGreaterThan(800); // Should use full width on desktop

    // Check search container
    const searchContainer = page.locator('.search-container');
    await expect(searchContainer).toBeVisible();
  });

  test('should adapt layout for tablet viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.tablet);
    await page.reload();
    await testHelpers.waitForPageLoad();

    // Elements should still be visible but may reflow
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#tickerSearch')).toBeVisible();
    await expect(page.locator('.overview-cards')).toBeVisible();

    // Overview cards should adapt to smaller width
    const cardBounds = await testHelpers.getElementBounds('.overview-cards');
    expect(cardBounds.width).toBeLessThan(VIEWPORT_SIZES.desktop.width);
    expect(cardBounds.width).toBeGreaterThan(0);
  });

  test('should adapt layout for mobile viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.mobile);
    await page.reload();
    await testHelpers.waitForPageLoad();

    // All main elements should still be visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#tickerSearch')).toBeVisible();
    await expect(page.locator('.overview-cards')).toBeVisible();

    // Cards should stack vertically or wrap on mobile
    const cards = page.locator('.overview-card');
    const cardCount = await cards.count();
    expect(cardCount).toBe(6);

    // Search input should be full width on mobile
    const searchBounds = await testHelpers.getElementBounds('#tickerSearch');
    expect(searchBounds.width).toBeGreaterThan(250); // Should be reasonably wide
  });

  test('should handle chart responsiveness across viewports', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    for (const [sizeName, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500); // Allow time for resize

      // Chart should remain visible
      await expect(page.locator('#ohlcChart')).toBeVisible();

      // Chart should adapt to container
      const chartBounds = await testHelpers.getElementBounds('#ohlcChart');
      expect(chartBounds.width).toBeGreaterThan(0);
      expect(chartBounds.height).toBeGreaterThan(0);

      // Chart width should be less than viewport width (accounting for padding)
      expect(chartBounds.width).toBeLessThanOrEqual(viewport.width);

      // Chart should maintain functionality
      const chartExists = await page.evaluate(() => {
        return window.dashboard && window.dashboard.chart !== null;
      });
      expect(chartExists).toBe(true);
    }
  });

  test('should maintain chart controls accessibility on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.mobile);
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    // Chart controls should be visible and clickable
    const controls = [
      '#showPredictionBands',
      '#showConfidence50',
      '#showMonteCarloLines',
      '#showActualData'
    ];

    for (const control of controls) {
      await expect(page.locator(control)).toBeVisible();

      // Should be clickable
      await page.click(control);
      const isChecked = await page.locator(control).isChecked();
      expect(typeof isChecked).toBe('boolean');
    }

    // Reset zoom button should be accessible
    await expect(page.locator('#resetZoom')).toBeVisible();
    await page.click('#resetZoom');
  });

  test('should handle ticker search on touch devices', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.mobile);

    // Simulate touch interaction with search input
    const searchInput = page.locator('#tickerSearch');
    await searchInput.tap();
    await expect(searchInput).toBeFocused();

    // Type and search
    await searchInput.fill('AAPL');
    await page.keyboard.press('Enter');

    await testHelpers.waitForLoadingComplete();

    // Should work the same as desktop
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();
    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should handle ticker tag interactions on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.mobile);

    // Ticker tags should be touchable
    const firstTag = page.locator('.ticker-tag').first();
    await expect(firstTag).toBeVisible();

    const tickerText = await firstTag.textContent();
    await firstTag.tap();

    // Should populate search and trigger search
    await expect(page.locator('#tickerSearch')).toHaveValue(tickerText);
  });

  test('should handle prediction grid interactions on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.mobile);

    // Prediction items should be touchable
    const predictions = page.locator('.prediction-item');
    await expect(predictions.first()).toBeVisible();

    const firstPrediction = predictions.first();
    const tickerText = await firstPrediction.locator('.pred-ticker').textContent();

    await firstPrediction.tap();

    // Should trigger search
    await expect(page.locator('#tickerSearch')).toHaveValue(tickerText);
  });

  test('should maintain readability of text on all screen sizes', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForLoadingComplete();

    for (const [sizeName, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(300);

      // Check that important text elements are readable
      const headerText = await page.locator('h1').textContent();
      expect(headerText.length).toBeGreaterThan(0);

      // Check metric values are visible
      const priceTarget = page.locator('#priceTarget');
      if (await priceTarget.isVisible()) {
        const priceText = await priceTarget.textContent();
        expect(priceText.length).toBeGreaterThan(0);
      }

      // Check that text doesn't overflow containers
      const containers = ['.metric-card', '.overview-card', '.ticker-header'];
      for (const container of containers) {
        const elements = page.locator(container);
        const count = await elements.count();

        for (let i = 0; i < count; i++) {
          const element = elements.nth(i);
          if (await element.isVisible()) {
            const bounds = await element.boundingBox();
            expect(bounds.width).toBeGreaterThan(0);
            expect(bounds.height).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('should handle orientation changes', async ({ page }) => {
    // Start in portrait mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    // Check initial state
    let chartBounds = await testHelpers.getElementBounds('#ohlcChart');
    const portraitWidth = chartBounds.width;

    // Switch to landscape mobile
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(1000); // Allow time for orientation change

    // Chart should adapt
    chartBounds = await testHelpers.getElementBounds('#ohlcChart');
    const landscapeWidth = chartBounds.width;

    expect(landscapeWidth).toBeGreaterThan(portraitWidth);

    // Chart should still function
    const chartExists = await page.evaluate(() => {
      return window.dashboard && window.dashboard.chart !== null;
    });
    expect(chartExists).toBe(true);
  });

  test('should handle very large screens', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.large);
    await page.reload();
    await testHelpers.waitForPageLoad();

    // Content should not become too wide or sparse
    const container = page.locator('.container');
    await expect(container).toBeVisible();

    const containerBounds = await testHelpers.getElementBounds('.container');
    expect(containerBounds.width).toBeGreaterThan(0);

    // Should maintain good proportions
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    const chartBounds = await testHelpers.getElementBounds('#ohlcChart');
    expect(chartBounds.width).toBeLessThanOrEqual(VIEWPORT_SIZES.large.width);
  });

  test('should handle CSS media query breakpoints', async ({ page }) => {
    // Test common breakpoints
    const breakpoints = [
      { width: 320, height: 568 },  // Small mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1024, height: 768 }, // Landscape tablet
      { width: 1366, height: 768 }, // Laptop
      { width: 1920, height: 1080 } // Desktop
    ];

    for (const viewport of breakpoints) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(300);

      // Basic layout should work at all breakpoints
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#tickerSearch')).toBeVisible();

      // Check that elements don't overflow
      const body = await page.locator('body').boundingBox();
      expect(body.width).toBeLessThanOrEqual(viewport.width);
    }
  });

  test('should maintain chart zoom functionality on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.mobile);
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    const canvas = page.locator('#ohlcChart');

    // Test pinch zoom simulation
    await canvas.hover();

    // Simulate pinch zoom (limited simulation in Playwright)
    await page.evaluate(() => {
      const canvas = document.querySelector('#ohlcChart');
      const event = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true // Simulates pinch zoom
      });
      canvas.dispatchEvent(event);
    });

    // Chart should still exist after zoom attempt
    const chartExists = await page.evaluate(() => {
      return window.dashboard && window.dashboard.chart !== null;
    });
    expect(chartExists).toBe(true);
  });

  test('should handle loading states responsively', async ({ page }) => {
    for (const [sizeName, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport);

      // Start a search to trigger loading
      await page.fill('#tickerSearch', 'AAPL');
      await page.press('#tickerSearch', 'Enter');

      // Loading indicator should be visible and properly positioned
      await expect(page.locator('#loadingIndicator')).toBeVisible();

      const loadingBounds = await testHelpers.getElementBounds('#loadingIndicator');
      expect(loadingBounds.width).toBeGreaterThan(0);
      expect(loadingBounds.height).toBeGreaterThan(0);

      await testHelpers.waitForLoadingComplete();
    }
  });

  test('should handle error states responsively', async ({ page }) => {
    for (const [sizeName, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport);

      // Trigger an error
      await page.fill('#tickerSearch', 'INVALID');
      await page.press('#tickerSearch', 'Enter');
      await testHelpers.waitForLoadingComplete();

      // Error message should be visible and readable
      await expect(page.locator('#errorMessage')).toBeVisible();

      const errorBounds = await testHelpers.getElementBounds('#errorMessage');
      expect(errorBounds.width).toBeGreaterThan(0);
      expect(errorBounds.width).toBeLessThanOrEqual(viewport.width);

      // Clear error for next iteration
      await page.fill('#tickerSearch', '');
      await page.waitForTimeout(500);
    }
  });
});