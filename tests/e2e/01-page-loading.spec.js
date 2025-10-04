const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('../utils/test-helpers');
const { VIEWPORT_SIZES } = require('../fixtures/test-data');

test.describe('Page Loading and Basic Functionality', () => {
  let testHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    await page.goto('/');
  });

  test('page should load with correct title and header', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Transformers Predictions/);

    // Check main header
    await expect(page.locator('h1')).toContainText('🤖 Transformers Predictions');

    // Check subtitle
    await expect(page.locator('p')).toContainText('Future Price Guesstimates');
  });

  test('should display summary content by default', async ({ page }) => {
    await testHelpers.waitForPageLoad();

    // Summary content should be visible
    await expect(page.locator('#summaryContent')).toBeVisible();

    // Dashboard content should be hidden
    await expect(page.locator('#dashboardContent')).toHaveClass(/hidden/);

    // Loading indicator should be hidden
    await expect(page.locator('#loadingIndicator')).toHaveClass(/hidden/);
  });

  test('should load overview cards with statistics', async ({ page }) => {
    await testHelpers.waitForPageLoad();

    // Check all overview cards are present
    const cards = page.locator('.overview-card');
    await expect(cards).toHaveCount(6);

    // Check specific cards
    await expect(page.locator('#totalPredictions')).toBeVisible();
    await expect(page.locator('#avgMovement')).toBeVisible();
    await expect(page.locator('#bullishCount')).toBeVisible();
    await expect(page.locator('#bearishCount')).toBeVisible();

    // Check that values are populated (not empty)
    const totalPredictions = await page.locator('#totalPredictions').textContent();
    expect(totalPredictions).not.toBe('');
    expect(totalPredictions).toMatch(/\d/); // Contains digits
  });

  test('should display search input with placeholder', async ({ page }) => {
    const searchInput = page.locator('#tickerSearch');

    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Enter any ticker symbol/);
    await expect(searchInput).toHaveAttribute('maxlength', '10');
  });

  test('should show popular ticker tags', async ({ page }) => {
    await testHelpers.waitForPageLoad();

    // Check popular ticker tags are present
    const tickerTags = page.locator('.ticker-tag');
    await expect(tickerTags).toHaveCount(6);

    // Check specific popular tickers
    await expect(page.locator('text=AAPL')).toBeVisible();
    await expect(page.locator('text=TSLA')).toBeVisible();
    await expect(page.locator('text=MSFT')).toBeVisible();
  });

  test('should display sample predictions grid', async ({ page }) => {
    await testHelpers.waitForPageLoad();

    // Check predictions grid exists
    await expect(page.locator('#predictionsGrid')).toBeVisible();

    // Check prediction items
    const predictionItems = page.locator('.prediction-item');
    await expect(predictionItems).toHaveCount(6);

    // Check structure of first prediction item
    const firstPrediction = predictionItems.first();
    await expect(firstPrediction.locator('.pred-ticker')).toBeVisible();
    await expect(firstPrediction.locator('.pred-direction')).toBeVisible();
    await expect(firstPrediction.locator('.pred-confidence')).toBeVisible();
  });

  test('should load external dependencies', async ({ page }) => {
    // Check Chart.js is loaded
    const chartJsLoaded = await page.evaluate(() => {
      return typeof window.Chart !== 'undefined';
    });
    expect(chartJsLoaded).toBe(true);

    // Check date-fns is loaded
    const dateFnsLoaded = await page.evaluate(() => {
      return typeof window.dateFns !== 'undefined';
    });
    expect(dateFnsLoaded).toBe(true);

    // Check dashboard class is initialized
    const dashboardLoaded = await page.evaluate(() => {
      return window.dashboard && typeof window.dashboard.searchTicker === 'function';
    });
    expect(dashboardLoaded).toBe(true);
  });

  test('should handle page load on different viewport sizes', async ({ page }) => {
    for (const [size, viewport] of Object.entries(VIEWPORT_SIZES)) {
      await page.setViewportSize(viewport);
      await page.reload();
      await testHelpers.waitForPageLoad();

      // Check that main elements are still visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#tickerSearch')).toBeVisible();
      await expect(page.locator('#summaryContent')).toBeVisible();

      // Check responsive behavior
      if (size === 'mobile') {
        // On mobile, cards might stack differently
        const firstCard = page.locator('.overview-card').first();
        const cardBounds = await testHelpers.getElementBounds('.overview-card');
        expect(cardBounds.width).toBeGreaterThan(0);
      }
    }
  });

  test('should not show any error messages on initial load', async ({ page }) => {
    await testHelpers.waitForPageLoad();

    // Error message should be hidden
    await expect(page.locator('#errorMessage')).toHaveClass(/hidden/);

    // Check for console errors (should be minimal)
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    // Wait a bit for any delayed errors
    await page.waitForTimeout(2000);

    // Filter out expected/harmless errors
    const criticalErrors = logs.filter(log =>
      !log.includes('favicon') &&
      !log.includes('404') &&
      !log.includes('net::ERR_')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('should have accessible navigation and interaction elements', async ({ page }) => {
    // Check search input is focusable
    await page.locator('#tickerSearch').focus();
    await expect(page.locator('#tickerSearch')).toBeFocused();

    // Check ticker tags are clickable
    const firstTag = page.locator('.ticker-tag').first();
    await expect(firstTag).toBeVisible();

    // Check prediction items are clickable
    const firstPrediction = page.locator('.prediction-item').first();
    await expect(firstPrediction).toBeVisible();
  });
});