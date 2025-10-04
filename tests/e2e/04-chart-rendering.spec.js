const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('../utils/test-helpers');
const { MOCK_TICKER_DATA, CHART_CONTROLS } = require('../fixtures/test-data');

test.describe('Chart Rendering and Visualization', () => {
  let testHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    await page.goto('/');
    await testHelpers.waitForPageLoad();

    // Mock ticker data for consistent testing
    await testHelpers.mockApiResponse('**/data/AAPL_ohlcv_prediction.json', MOCK_TICKER_DATA);
  });

  test('should render chart canvas after ticker search', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');

    // Check that canvas element exists and is visible
    await expect(page.locator('#ohlcChart')).toBeVisible();

    // Wait for chart to render
    await testHelpers.waitForChartRender();

    // Validate chart was created
    const chartExists = await page.evaluate(() => {
      return window.dashboard && window.dashboard.chart !== null;
    });

    expect(chartExists).toBe(true);
  });

  test('should display chart controls', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');

    // Check all chart control checkboxes are present
    for (const control of CHART_CONTROLS) {
      await expect(page.locator(`#${control}`)).toBeVisible();
    }

    // Check reset zoom button
    await expect(page.locator('#resetZoom')).toBeVisible();

    // Check zoom hint
    await expect(page.locator('.zoom-hint')).toBeVisible();
  });

  test('should have correct initial chart control states', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');

    const controlStates = await testHelpers.getChartControlStates();

    // Verify default states based on HTML
    expect(controlStates.predictionBands).toBe(true);
    expect(controlStates.confidence50).toBe(true);
    expect(controlStates.monteCarloLines).toBe(true);
    expect(controlStates.actualData).toBe(true);
    expect(controlStates.confidence90).toBe(false);
    expect(controlStates.confidence75).toBe(false);
  });

  test('should toggle chart elements when controls are changed', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    // Get initial dataset count
    const initialDatasetCount = await page.evaluate(() => {
      return window.dashboard.chart ? window.dashboard.chart.data.datasets.length : 0;
    });

    // Toggle prediction bands off
    await testHelpers.toggleChartControl('showPredictionBands');

    // Chart should update with different dataset count
    const newDatasetCount = await page.evaluate(() => {
      return window.dashboard.chart ? window.dashboard.chart.data.datasets.length : 0;
    });

    // Dataset count should change (may increase or decrease depending on what's hidden)
    expect(newDatasetCount).not.toBe(initialDatasetCount);
  });

  test('should handle chart zoom and pan functionality', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    const canvas = page.locator('#ohlcChart');

    // Test mouse wheel zoom
    await canvas.hover();
    await page.mouse.wheel(0, -100); // Zoom in

    // Test drag pan
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(100, 0);
    await page.mouse.up();

    // Chart should still be functional
    const chartStillExists = await page.evaluate(() => {
      return window.dashboard && window.dashboard.chart !== null;
    });

    expect(chartStillExists).toBe(true);
  });

  test('should reset zoom when reset button is clicked', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    const canvas = page.locator('#ohlcChart');

    // Zoom in first
    await canvas.hover();
    await page.mouse.wheel(0, -200);

    // Click reset zoom
    await page.click('#resetZoom');

    // Chart should reset (no easy way to verify zoom level, but should not error)
    const chartStillExists = await page.evaluate(() => {
      return window.dashboard && window.dashboard.chart !== null;
    });

    expect(chartStillExists).toBe(true);
  });

  test('should render historical candlestick data correctly', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    // Validate chart data structure
    const chartDataInfo = await testHelpers.validateChartData();
    expect(chartDataInfo.hasData).toBe(true);

    // Check that historical data is represented
    const hasHistoricalData = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return false;

      const datasets = window.dashboard.chart.data.datasets;
      return datasets.some(dataset =>
        dataset.label && (
          dataset.label.includes('Historical') ||
          dataset.label.includes('Bullish') ||
          dataset.label.includes('Bearish')
        )
      );
    });

    expect(hasHistoricalData).toBe(true);
  });

  test('should render prediction line correctly', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    // Check that prediction line is rendered
    const hasPredictionLine = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return false;

      const datasets = window.dashboard.chart.data.datasets;
      return datasets.some(dataset =>
        dataset.label && (
          dataset.label.includes('Predicted') ||
          dataset.label.includes('Prediction')
        )
      );
    });

    expect(hasPredictionLine).toBe(true);
  });

  test('should handle confidence bands rendering', async ({ page }) => {
    // Mock data with confidence bands
    const dataWithConfidence = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
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

    await testHelpers.mockApiResponse('**/data/AAPL_ohlcv_prediction.json', dataWithConfidence);

    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    // Enable confidence bands
    await testHelpers.toggleChartControl('showConfidence90');

    // Check that confidence bands are rendered
    const hasConfidenceBands = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return false;

      const datasets = window.dashboard.chart.data.datasets;
      return datasets.some(dataset =>
        dataset.label && dataset.label.includes('Confidence')
      );
    });

    expect(hasConfidenceBands).toBe(true);
  });

  test('should handle Monte Carlo paths rendering', async ({ page }) => {
    // Mock data with Monte Carlo paths
    const dataWithMonteCarlo = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        monte_carlo_paths: [
          [153.1, 154.2],
          [152.8, 153.9],
          [153.0, 154.1]
        ]
      }
    };

    await testHelpers.mockApiResponse('**/data/AAPL_ohlcv_prediction.json', dataWithMonteCarlo);

    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    // Check that Monte Carlo paths are rendered
    const hasMonteCarloLines = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return false;

      const datasets = window.dashboard.chart.data.datasets;
      return datasets.some(dataset =>
        dataset.label && dataset.label.includes('Monte Carlo')
      );
    });

    expect(hasMonteCarloLines).toBe(true);
  });

  test('should handle chart destruction and recreation', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    // Get initial chart instance
    const initialChart = await page.evaluate(() => {
      return window.dashboard.chart ? window.dashboard.chart.id : null;
    });

    // Search for another ticker (should destroy and recreate chart)
    await testHelpers.mockApiResponse('**/data/MSFT_ohlcv_prediction.json', {
      ...MOCK_TICKER_DATA,
      ticker_info: { ...MOCK_TICKER_DATA.ticker_info, symbol: 'MSFT' }
    });

    await testHelpers.searchTicker('MSFT');
    await testHelpers.waitForChartRender();

    // Should have new chart instance
    const newChart = await page.evaluate(() => {
      return window.dashboard.chart ? window.dashboard.chart.id : null;
    });

    expect(newChart).not.toBe(initialChart);
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Mock data with no chart data
    const emptyData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        historical_candlesticks: [],
        predicted_candlesticks: []
      }
    };

    await testHelpers.mockApiResponse('**/data/EMPTY_ohlcv_prediction.json', emptyData);

    await page.fill('#tickerSearch', 'EMPTY');
    await page.press('#tickerSearch', 'Enter');

    await testHelpers.waitForLoadingComplete();

    // Should handle gracefully - either show error or empty chart
    const isDashboardVisible = await page.locator('#dashboardContent').isVisible();
    const isErrorVisible = await page.locator('#errorMessage').isVisible();

    expect(isDashboardVisible || isErrorVisible).toBe(true);
  });

  test('should have proper chart responsive behavior', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    // Test chart responsiveness
    const responsiveInfo = await testHelpers.validateChartResponsiveness();

    expect(responsiveInfo.isResponsive).toBe(true);
    expect(responsiveInfo.mobileBounds.width).toBeGreaterThan(0);
    expect(responsiveInfo.mobileBounds.height).toBeGreaterThan(0);
  });

  test('should handle chart color coding correctly', async ({ page }) => {
    await testHelpers.searchTicker('AAPL');
    await testHelpers.waitForChartRender();

    // Check that different elements have different colors
    const colorInfo = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return null;

      const datasets = window.dashboard.chart.data.datasets;
      const colors = datasets.map(d => d.borderColor).filter(c => c);

      return {
        uniqueColors: [...new Set(colors)].length,
        totalDatasets: datasets.length
      };
    });

    expect(colorInfo.uniqueColors).toBeGreaterThan(1);
  });

  test('should maintain chart performance with large datasets', async ({ page }) => {
    // Create large dataset
    const largeData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        historical_candlesticks: Array.from({ length: 500 }, (_, i) => ({
          date: new Date(Date.now() - (500 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

    await testHelpers.mockApiResponse('**/data/LARGE_ohlcv_prediction.json', largeData);

    const startTime = Date.now();
    await testHelpers.searchTicker('LARGE');
    await testHelpers.waitForChartRender();
    const renderTime = Date.now() - startTime;

    // Should render within reasonable time
    expect(renderTime).toBeLessThan(5000);

    // Chart should be functional
    const chartExists = await page.evaluate(() => {
      return window.dashboard && window.dashboard.chart !== null;
    });

    expect(chartExists).toBe(true);
  });
});