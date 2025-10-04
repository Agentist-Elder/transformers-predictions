const { expect } = require('@playwright/test');

/**
 * Test Utilities for Transformers Predictions E2E Tests
 */
class TestHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Wait for network to be idle and page to load completely
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for charts to finish rendering
   */
  async waitForChartRender() {
    // Wait for Chart.js to initialize
    await this.page.waitForFunction(() => {
      return window.Chart && window.dashboard;
    });

    // Wait for canvas to have content
    await this.page.waitForFunction(() => {
      const canvas = document.querySelector('#ohlcChart');
      return canvas && canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3] > 0;
    }, { timeout: 10000 });
  }

  /**
   * Wait for loading indicator to disappear
   */
  async waitForLoadingComplete() {
    await this.page.waitForSelector('#loadingIndicator.hidden', { timeout: 15000 });
  }

  /**
   * Search for a ticker and wait for results
   */
  async searchTicker(ticker) {
    await this.page.fill('#tickerSearch', ticker);
    await this.page.press('#tickerSearch', 'Enter');
    await this.waitForLoadingComplete();

    // Wait for dashboard content to be visible
    await this.page.waitForSelector('#dashboardContent:not(.hidden)', { timeout: 15000 });
  }

  /**
   * Validate chart data structure
   */
  async validateChartData() {
    const chartData = await this.page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) {
        return null;
      }
      return {
        datasets: window.dashboard.chart.data.datasets.length,
        hasData: window.dashboard.chart.data.datasets.some(d => d.data && d.data.length > 0)
      };
    });

    expect(chartData).toBeTruthy();
    expect(chartData.datasets).toBeGreaterThan(0);
    expect(chartData.hasData).toBe(true);

    return chartData;
  }

  /**
   * Validate Monte Carlo paths are present
   */
  async validateMonteCarloData() {
    const mcData = await this.page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.currentData) {
        return null;
      }

      const data = window.dashboard.currentData;
      return {
        hasMonteCarlo: data.monte_carlo_simulations && data.monte_carlo_simulations.length > 0,
        pathCount: data.monte_carlo_simulations ? data.monte_carlo_simulations.length : 0,
        hasConfidenceBands: data.confidence_bands && Object.keys(data.confidence_bands).length > 0
      };
    });

    expect(mcData).toBeTruthy();
    expect(mcData.hasMonteCarlo).toBe(true);
    expect(mcData.pathCount).toBeGreaterThan(0);

    return mcData;
  }

  /**
   * Check if element is visible in viewport
   */
  async isElementInViewport(selector) {
    return await this.page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return false;

      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    }, selector);
  }

  /**
   * Get element bounds for responsive testing
   */
  async getElementBounds(selector) {
    return await this.page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;

      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y
      };
    }, selector);
  }

  /**
   * Validate data completeness
   */
  async validateDataCompleteness() {
    const dataInfo = await this.page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.currentData) {
        return null;
      }

      const data = window.dashboard.currentData;
      return {
        hasHistorical: data.historical_data && data.historical_data.length > 0,
        hasPredictions: data.predictions && data.predictions.length > 0,
        hasMetrics: data.metrics && Object.keys(data.metrics).length > 0,
        ticker: data.ticker
      };
    });

    expect(dataInfo).toBeTruthy();
    expect(dataInfo.hasHistorical).toBe(true);
    expect(dataInfo.hasPredictions).toBe(true);
    expect(dataInfo.hasMetrics).toBe(true);
    expect(dataInfo.ticker).toBeTruthy();

    return dataInfo;
  }

  /**
   * Validate error state
   */
  async validateErrorState(expectedMessage = null) {
    const errorElement = await this.page.locator('#errorMessage');
    await expect(errorElement).toBeVisible();

    if (expectedMessage) {
      await expect(errorElement).toContainText(expectedMessage);
    }
  }

  /**
   * Take screenshot with custom name
   */
  async takeScreenshot(name) {
    await this.page.screenshot({
      path: `./tests/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Mock network response for testing
   */
  async mockApiResponse(url, response) {
    await this.page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Mock network failure for error testing
   */
  async mockNetworkFailure(url, status = 404) {
    await this.page.route(url, route => {
      route.fulfill({
        status: status,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' })
      });
    });
  }

  /**
   * Get chart control states
   */
  async getChartControlStates() {
    return await this.page.evaluate(() => {
      return {
        predictionBands: document.getElementById('showPredictionBands')?.checked,
        confidence90: document.getElementById('showConfidence90')?.checked,
        confidence75: document.getElementById('showConfidence75')?.checked,
        confidence50: document.getElementById('showConfidence50')?.checked,
        monteCarloLines: document.getElementById('showMonteCarloLines')?.checked,
        actualData: document.getElementById('showActualData')?.checked
      };
    });
  }

  /**
   * Test chart control interactions
   */
  async toggleChartControl(controlId) {
    await this.page.click(`#${controlId}`);
    // Wait a bit for chart to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Validate chart responsiveness
   */
  async validateChartResponsiveness() {
    const canvas = this.page.locator('#ohlcChart');
    const initialBounds = await this.getElementBounds('#ohlcChart');

    // Change viewport size
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(1000);

    const mobileBounds = await this.getElementBounds('#ohlcChart');

    // Restore viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });

    return {
      initialBounds,
      mobileBounds,
      isResponsive: mobileBounds.width !== initialBounds.width
    };
  }
}

module.exports = { TestHelpers };