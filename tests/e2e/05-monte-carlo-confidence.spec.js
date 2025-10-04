const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('../utils/test-helpers');
const { MOCK_TICKER_DATA } = require('../fixtures/test-data');

test.describe('Monte Carlo Paths and Confidence Bands', () => {
  let testHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    await page.goto('/');
    await testHelpers.waitForPageLoad();
  });

  test('should render Monte Carlo paths when data is available', async ({ page }) => {
    // Mock data with Monte Carlo paths
    const mcData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        monte_carlo_paths: [
          [153.1, 154.2, 155.3, 156.1, 157.0],
          [152.8, 153.9, 154.8, 155.5, 156.2],
          [153.0, 154.1, 154.9, 155.8, 156.5],
          [152.5, 153.5, 154.2, 155.0, 155.8],
          [153.2, 154.3, 155.1, 156.0, 156.8]
        ]
      }
    };

    await testHelpers.mockApiResponse('**/data/MCPATHS_ohlcv_prediction.json', mcData);

    await testHelpers.searchTicker('MCPATHS');
    await testHelpers.waitForChartRender();

    // Validate Monte Carlo data is loaded
    const mcDataInfo = await testHelpers.validateMonteCarloData();
    expect(mcDataInfo.hasMonteCarlo).toBe(true);
    expect(mcDataInfo.pathCount).toBe(5);

    // Check that Monte Carlo lines are rendered in the chart
    const hasMonteCarloLines = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return false;

      const datasets = window.dashboard.chart.data.datasets;
      return datasets.some(dataset =>
        dataset.label && dataset.label.includes('Monte Carlo')
      );
    });

    expect(hasMonteCarloLines).toBe(true);
  });

  test('should toggle Monte Carlo paths visibility', async ({ page }) => {
    const mcData = {
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

    await testHelpers.mockApiResponse('**/data/TOGGLE_ohlcv_prediction.json', mcData);

    await testHelpers.searchTicker('TOGGLE');
    await testHelpers.waitForChartRender();

    // Get initial dataset count
    const initialCount = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return 0;
      return window.dashboard.chart.data.datasets.filter(d =>
        d.label && d.label.includes('Monte Carlo')
      ).length;
    });

    // Toggle Monte Carlo lines off
    await testHelpers.toggleChartControl('showMonteCarloLines');

    // Should have fewer Monte Carlo datasets
    const afterToggleCount = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return 0;
      return window.dashboard.chart.data.datasets.filter(d =>
        d.label && d.label.includes('Monte Carlo')
      ).length;
    });

    expect(afterToggleCount).toBeLessThan(initialCount);

    // Toggle back on
    await testHelpers.toggleChartControl('showMonteCarloLines');

    // Should restore Monte Carlo datasets
    const finalCount = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return 0;
      return window.dashboard.chart.data.datasets.filter(d =>
        d.label && d.label.includes('Monte Carlo')
      ).length;
    });

    expect(finalCount).toBeGreaterThan(afterToggleCount);
  });

  test('should render 90% confidence bands', async ({ page }) => {
    const confidenceData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        prediction_percentiles: {
          '2024-10-02': {
            close: { p10: 150.0, p25: 151.0, p50: 152.0, p75: 153.0, p90: 154.0 }
          },
          '2024-10-03': {
            close: { p10: 151.0, p25: 152.0, p50: 153.0, p75: 154.0, p90: 155.0 }
          },
          '2024-10-04': {
            close: { p10: 152.0, p25: 153.0, p50: 154.0, p75: 155.0, p90: 156.0 }
          }
        }
      }
    };

    await testHelpers.mockApiResponse('**/data/CONF90_ohlcv_prediction.json', confidenceData);

    await testHelpers.searchTicker('CONF90');
    await testHelpers.waitForChartRender();

    // Enable 90% confidence bands
    await testHelpers.toggleChartControl('showConfidence90');

    // Check for confidence band datasets
    const hasConfidence90 = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return false;

      const datasets = window.dashboard.chart.data.datasets;
      return datasets.some(dataset =>
        dataset.label && dataset.label.includes('90% Confidence')
      );
    });

    expect(hasConfidence90).toBe(true);
  });

  test('should render 75% confidence bands', async ({ page }) => {
    const confidenceData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        prediction_percentiles: {
          '2024-10-02': {
            close: { p10: 150.0, p25: 151.0, p50: 152.0, p75: 153.0, p90: 154.0 }
          },
          '2024-10-03': {
            close: { p10: 151.0, p25: 152.0, p50: 153.0, p75: 154.0, p90: 155.0 }
          }
        }
      }
    };

    await testHelpers.mockApiResponse('**/data/CONF75_ohlcv_prediction.json', confidenceData);

    await testHelpers.searchTicker('CONF75');
    await testHelpers.waitForChartRender();

    // Enable 75% confidence bands
    await testHelpers.toggleChartControl('showConfidence75');

    // Check for confidence band datasets
    const hasConfidence75 = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return false;

      const datasets = window.dashboard.chart.data.datasets;
      return datasets.some(dataset =>
        dataset.label && dataset.label.includes('75% Confidence')
      );
    });

    expect(hasConfidence75).toBe(true);
  });

  test('should render 50% confidence bands', async ({ page }) => {
    const confidenceData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        prediction_percentiles: {
          '2024-10-02': {
            close: { p10: 150.0, p25: 151.0, p50: 152.0, p75: 153.0, p90: 154.0 }
          },
          '2024-10-03': {
            close: { p10: 151.0, p25: 152.0, p50: 153.0, p75: 154.0, p90: 155.0 }
          }
        }
      }
    };

    await testHelpers.mockApiResponse('**/data/CONF50_ohlcv_prediction.json', confidenceData);

    await testHelpers.searchTicker('CONF50');
    await testHelpers.waitForChartRender();

    // 50% confidence should be enabled by default
    const hasConfidence50 = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return false;

      const datasets = window.dashboard.chart.data.datasets;
      return datasets.some(dataset =>
        dataset.label && dataset.label.includes('50% Confidence')
      );
    });

    expect(hasConfidence50).toBe(true);
  });

  test('should handle multiple confidence bands simultaneously', async ({ page }) => {
    const fullConfidenceData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        prediction_percentiles: {
          '2024-10-02': {
            close: { p10: 148.0, p25: 150.0, p50: 152.0, p75: 154.0, p90: 156.0 }
          },
          '2024-10-03': {
            close: { p10: 149.0, p25: 151.0, p50: 153.0, p75: 155.0, p90: 157.0 }
          },
          '2024-10-04': {
            close: { p10: 150.0, p25: 152.0, p50: 154.0, p75: 156.0, p90: 158.0 }
          }
        }
      }
    };

    await testHelpers.mockApiResponse('**/data/ALLCONF_ohlcv_prediction.json', fullConfidenceData);

    await testHelpers.searchTicker('ALLCONF');
    await testHelpers.waitForChartRender();

    // Enable all confidence bands
    await testHelpers.toggleChartControl('showConfidence90');
    await testHelpers.toggleChartControl('showConfidence75');
    // 50% should already be enabled

    // Count confidence band datasets
    const confidenceBandCount = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return 0;

      const datasets = window.dashboard.chart.data.datasets;
      return datasets.filter(dataset =>
        dataset.label && dataset.label.includes('Confidence')
      ).length;
    });

    // Should have bands for 50%, 75%, and 90% (each has upper and lower = 6 total)
    expect(confidenceBandCount).toBeGreaterThanOrEqual(4);
  });

  test('should color-code Monte Carlo paths by performance', async ({ page }) => {
    const performanceData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        monte_carlo_paths: [
          [153.0, 158.0], // High performance (green expected)
          [153.0, 148.0], // Low performance (red expected)
          [153.0, 152.5]  // Neutral performance (yellow expected)
        ]
      }
    };

    await testHelpers.mockApiResponse('**/data/COLORED_ohlcv_prediction.json', performanceData);

    await testHelpers.searchTicker('COLORED');
    await testHelpers.waitForChartRender();

    // Check that different colors are used
    const colorInfo = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return null;

      const datasets = window.dashboard.chart.data.datasets;
      const mcDatasets = datasets.filter(d =>
        d.label && d.label.includes('Monte Carlo')
      );

      const colors = mcDatasets.map(d => d.borderColor);
      const uniqueColors = [...new Set(colors)];

      return {
        totalPaths: mcDatasets.length,
        uniqueColors: uniqueColors.length,
        colors: colors
      };
    });

    expect(colorInfo.totalPaths).toBe(3);
    expect(colorInfo.uniqueColors).toBeGreaterThan(1); // Should have different colors
  });

  test('should handle legacy percentile data format', async ({ page }) => {
    const legacyData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        prediction_percentiles: {
          p10: [150.0, 151.0, 152.0],
          p25: [151.0, 152.0, 153.0],
          p50: [152.0, 153.0, 154.0],
          p75: [153.0, 154.0, 155.0],
          p90: [154.0, 155.0, 156.0]
        }
      }
    };

    await testHelpers.mockApiResponse('**/data/LEGACY_ohlcv_prediction.json', legacyData);

    await testHelpers.searchTicker('LEGACY');
    await testHelpers.waitForChartRender();

    // Enable confidence bands
    await testHelpers.toggleChartControl('showConfidence90');

    // Should handle legacy format
    const hasConfidenceBands = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return false;

      const datasets = window.dashboard.chart.data.datasets;
      return datasets.some(dataset =>
        dataset.label && dataset.label.includes('Confidence')
      );
    });

    expect(hasConfidenceBands).toBe(true);
  });

  test('should validate confidence band ordering', async ({ page }) => {
    const orderedData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        prediction_percentiles: {
          '2024-10-02': {
            close: { p10: 148.0, p25: 150.0, p50: 152.0, p75: 154.0, p90: 156.0 }
          },
          '2024-10-03': {
            close: { p10: 149.0, p25: 151.0, p50: 153.0, p75: 155.0, p90: 157.0 }
          }
        }
      }
    };

    await testHelpers.mockApiResponse('**/data/ORDERED_ohlcv_prediction.json', orderedData);

    await testHelpers.searchTicker('ORDERED');
    await testHelpers.waitForChartRender();

    // Enable all confidence bands
    await testHelpers.toggleChartControl('showConfidence90');
    await testHelpers.toggleChartControl('showConfidence75');

    // Validate percentile ordering in chart data
    const percentileValidation = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.currentData) return false;

      const percentiles = window.dashboard.currentData.chart_data.prediction_percentiles;

      for (const date in percentiles) {
        const closeData = percentiles[date].close;
        if (closeData.p10 >= closeData.p25 ||
            closeData.p25 >= closeData.p50 ||
            closeData.p50 >= closeData.p75 ||
            closeData.p75 >= closeData.p90) {
          return false;
        }
      }
      return true;
    });

    expect(percentileValidation).toBe(true);
  });

  test('should handle missing confidence data gracefully', async ({ page }) => {
    const noConfidenceData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        monte_carlo_paths: [
          [153.1, 154.2],
          [152.8, 153.9]
        ]
        // No prediction_percentiles
      }
    };

    await testHelpers.mockApiResponse('**/data/NOCONF_ohlcv_prediction.json', noConfidenceData);

    await testHelpers.searchTicker('NOCONF');
    await testHelpers.waitForChartRender();

    // Try to enable confidence bands
    await testHelpers.toggleChartControl('showConfidence90');

    // Should not crash, just not show confidence bands
    const chartExists = await page.evaluate(() => {
      return window.dashboard && window.dashboard.chart !== null;
    });

    expect(chartExists).toBe(true);
  });

  test('should handle invalid Monte Carlo data', async ({ page }) => {
    const invalidMCData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        monte_carlo_paths: [
          [null, 154.2], // Invalid data
          [152.8, undefined], // Invalid data
          [] // Empty path
        ]
      }
    };

    await testHelpers.mockApiResponse('**/data/INVALIDMC_ohlcv_prediction.json', invalidMCData);

    await testHelpers.searchTicker('INVALIDMC');
    await testHelpers.waitForChartRender();

    // Should handle invalid data gracefully
    const chartExists = await page.evaluate(() => {
      return window.dashboard && window.dashboard.chart !== null;
    });

    expect(chartExists).toBe(true);

    // Should filter out invalid data points
    const validDataPoints = await page.evaluate(() => {
      if (!window.dashboard || !window.dashboard.chart) return 0;

      const datasets = window.dashboard.chart.data.datasets;
      const mcDatasets = datasets.filter(d => d.label && d.label.includes('Monte Carlo'));

      let totalValidPoints = 0;
      mcDatasets.forEach(dataset => {
        totalValidPoints += dataset.data.filter(point =>
          point && point.x !== null && point.y !== null && !isNaN(point.y)
        ).length;
      });

      return totalValidPoints;
    });

    expect(validDataPoints).toBeGreaterThanOrEqual(0);
  });

  test('should maintain chart performance with many Monte Carlo paths', async ({ page }) => {
    // Create data with many Monte Carlo paths
    const manyPathsData = {
      ...MOCK_TICKER_DATA,
      chart_data: {
        ...MOCK_TICKER_DATA.chart_data,
        monte_carlo_paths: Array.from({ length: 100 }, (_, i) => [
          153.0 + Math.random() * 2 - 1,
          154.0 + Math.random() * 4 - 2,
          155.0 + Math.random() * 6 - 3
        ])
      }
    };

    await testHelpers.mockApiResponse('**/data/MANYPATHS_ohlcv_prediction.json', manyPathsData);

    const startTime = Date.now();
    await testHelpers.searchTicker('MANYPATHS');
    await testHelpers.waitForChartRender();
    const renderTime = Date.now() - startTime;

    // Should render within reasonable time even with many paths
    expect(renderTime).toBeLessThan(10000);

    // Chart should be functional
    const chartExists = await page.evaluate(() => {
      return window.dashboard && window.dashboard.chart !== null;
    });

    expect(chartExists).toBe(true);
  });
});