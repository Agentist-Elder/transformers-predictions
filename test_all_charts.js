/**
 * Comprehensive Test Suite for Ticker Charts
 * Using Test-Driven Development (TDD) approach
 *
 * This suite validates:
 * 1. All 120 historical candlesticks display correctly
 * 2. Prediction dates are Sep 30 - Oct 3, 2025
 * 3. Chart renders without errors
 * 4. Data structure matches PREDICTION_JSON_FORMAT.md spec
 *
 * Major tickers tested: AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, SPY, QQQ
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  majorTickers: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'SPY', 'QQQ'],
  expectedHistoricalDays: 120,
  expectedPredictionStart: '2025-09-30',
  expectedPredictionEnd: '2025-10-03',
  expectedPredictionDays: 4,
  dataDirectory: '/home/jarden/transformers-predictions/data',
  memoryKey: 'swarm/tests/results'
};

// Memory storage for test results
const TestMemory = {
  store: {},

  set(key, value) {
    const keys = key.split('/');
    let current = this.store;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  },

  get(key) {
    const keys = key.split('/');
    let current = this.store;

    for (const k of keys) {
      if (!current[k]) return null;
      current = current[k];
    }

    return current;
  }
};

// Test result collector
class TestResults {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      testSuites: {},
      errors: [],
      performance: {},
      coverage: {
        tickersTested: 0,
        tickersAvailable: 0,
        coveragePercent: 0
      }
    };
  }

  addTest(suiteName, testName, status, details = {}) {
    if (!this.results.testSuites[suiteName]) {
      this.results.testSuites[suiteName] = {
        passed: 0,
        failed: 0,
        tests: []
      };
    }

    this.results.testSuites[suiteName].tests.push({
      name: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    });

    this.results.testSuites[suiteName][status]++;
    this.results[status]++;
    this.results.totalTests++;
  }

  addError(error) {
    this.results.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  getSuccessRate() {
    return this.results.totalTests > 0
      ? ((this.results.passed / this.results.totalTests) * 100).toFixed(2)
      : 0;
  }

  generateReport() {
    return {
      ...this.results,
      successRate: this.getSuccessRate(),
      summary: {
        totalTests: this.results.totalTests,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: this.getSuccessRate() + '%'
      }
    };
  }
}

// Main test class
class TickerChartTester {
  constructor() {
    this.testResults = new TestResults();
    this.chartInstance = null;
  }

  /**
   * Test Suite 1: Data Structure Validation
   * Validates JSON structure matches expected format
   */
  async testDataStructure(tickerData, ticker) {
    const suiteName = 'Data Structure Validation';

    try {
      // Test 1.1: Required top-level properties
      const requiredProps = ['ticker_info', 'data', 'chart_data'];
      const hasAllProps = requiredProps.every(prop => tickerData.hasOwnProperty(prop));

      this.testResults.addTest(suiteName, `${ticker}: Has required top-level properties`,
        hasAllProps ? 'passed' : 'failed',
        { requiredProps, actualProps: Object.keys(tickerData) }
      );

      // Test 1.2: Ticker info structure
      const tickerInfo = tickerData.ticker_info;
      const tickerInfoValid = tickerInfo &&
        tickerInfo.symbol === ticker &&
        tickerInfo.model_type &&
        tickerInfo.generated_at &&
        tickerInfo.data_completeness &&
        tickerInfo.chart_compatibility;

      this.testResults.addTest(suiteName, `${ticker}: Valid ticker info structure`,
        tickerInfoValid ? 'passed' : 'failed',
        { tickerInfo }
      );

      // Test 1.3: Data metadata structure
      const metadata = tickerData.data?.metadata;
      const metadataValid = metadata &&
        metadata.lookback_days &&
        metadata.prediction_days &&
        metadata.lookback_start &&
        metadata.lookback_end &&
        metadata.prediction_start &&
        metadata.prediction_end;

      this.testResults.addTest(suiteName, `${ticker}: Valid metadata structure`,
        metadataValid ? 'passed' : 'failed',
        { metadata }
      );

      // Test 1.4: Chart data structure
      const chartData = tickerData.chart_data;
      const chartDataValid = chartData &&
        Array.isArray(chartData.historical_candlesticks) &&
        chartData.predicted_ohlcv_summary &&
        Array.isArray(chartData.monte_carlo_simulations);

      this.testResults.addTest(suiteName, `${ticker}: Valid chart data structure`,
        chartDataValid ? 'passed' : 'failed',
        { chartDataKeys: chartData ? Object.keys(chartData) : null }
      );

    } catch (error) {
      this.testResults.addError(error);
      this.testResults.addTest(suiteName, `${ticker}: Data structure validation`, 'failed',
        { error: error.message }
      );
    }
  }

  /**
   * Test Suite 2: Historical Candlesticks Validation
   * Validates 120 historical candlesticks are present and properly formatted
   */
  async testHistoricalCandlesticks(tickerData, ticker) {
    const suiteName = 'Historical Candlesticks';

    try {
      const historicalData = tickerData.chart_data?.historical_candlesticks;

      // Test 2.1: Correct number of historical candlesticks
      const hasCorrectCount = historicalData && historicalData.length === TEST_CONFIG.expectedHistoricalDays;

      this.testResults.addTest(suiteName, `${ticker}: Has ${TEST_CONFIG.expectedHistoricalDays} historical candlesticks`,
        hasCorrectCount ? 'passed' : 'failed',
        {
          expected: TEST_CONFIG.expectedHistoricalDays,
          actual: historicalData ? historicalData.length : 0
        }
      );

      if (historicalData && historicalData.length > 0) {
        // Test 2.2: OHLCV data completeness
        const firstCandle = historicalData[0];
        const lastCandle = historicalData[historicalData.length - 1];

        const ohlcvComplete = ['date', 'open', 'high', 'low', 'close', 'volume']
          .every(field => firstCandle.hasOwnProperty(field) && lastCandle.hasOwnProperty(field));

        this.testResults.addTest(suiteName, `${ticker}: OHLCV data complete`,
          ohlcvComplete ? 'passed' : 'failed',
          { firstCandle, lastCandle }
        );

        // Test 2.3: Data type validation
        const dataTypesValid = historicalData.every(candle =>
          typeof candle.date === 'string' &&
          typeof candle.open === 'number' &&
          typeof candle.high === 'number' &&
          typeof candle.low === 'number' &&
          typeof candle.close === 'number' &&
          typeof candle.volume === 'number'
        );

        this.testResults.addTest(suiteName, `${ticker}: Data types valid`,
          dataTypesValid ? 'passed' : 'failed'
        );

        // Test 2.4: OHLC logic validation (High >= Low, etc.)
        const ohlcLogicValid = historicalData.every(candle =>
          candle.high >= candle.low &&
          candle.high >= candle.open &&
          candle.high >= candle.close &&
          candle.low <= candle.open &&
          candle.low <= candle.close &&
          candle.volume >= 0
        );

        this.testResults.addTest(suiteName, `${ticker}: OHLC logic valid`,
          ohlcLogicValid ? 'passed' : 'failed'
        );

        // Test 2.5: Date sequence validation
        const dates = historicalData.map(candle => new Date(candle.date));
        const datesInOrder = dates.every((date, index) =>
          index === 0 || date >= dates[index - 1]
        );

        this.testResults.addTest(suiteName, `${ticker}: Dates in chronological order`,
          datesInOrder ? 'passed' : 'failed',
          { firstDate: dates[0], lastDate: dates[dates.length - 1] }
        );
      }

    } catch (error) {
      this.testResults.addError(error);
      this.testResults.addTest(suiteName, `${ticker}: Historical candlesticks validation`, 'failed',
        { error: error.message }
      );
    }
  }

  /**
   * Test Suite 3: Prediction Date Validation
   * Validates prediction dates are Sep 30 - Oct 3, 2025
   */
  async testPredictionDates(tickerData, ticker) {
    const suiteName = 'Prediction Dates';

    try {
      const metadata = tickerData.data?.metadata;

      // Test 3.1: Prediction start date
      const startDateCorrect = metadata?.prediction_start === TEST_CONFIG.expectedPredictionStart;

      this.testResults.addTest(suiteName, `${ticker}: Prediction start date correct`,
        startDateCorrect ? 'passed' : 'failed',
        {
          expected: TEST_CONFIG.expectedPredictionStart,
          actual: metadata?.prediction_start
        }
      );

      // Test 3.2: Prediction end date
      const endDateCorrect = metadata?.prediction_end === TEST_CONFIG.expectedPredictionEnd;

      this.testResults.addTest(suiteName, `${ticker}: Prediction end date correct`,
        endDateCorrect ? 'passed' : 'failed',
        {
          expected: TEST_CONFIG.expectedPredictionEnd,
          actual: metadata?.prediction_end
        }
      );

      // Test 3.3: Prediction period length
      const predictionDaysCorrect = metadata?.prediction_days === TEST_CONFIG.expectedPredictionDays;

      this.testResults.addTest(suiteName, `${ticker}: Prediction period length correct`,
        predictionDaysCorrect ? 'passed' : 'failed',
        {
          expected: TEST_CONFIG.expectedPredictionDays,
          actual: metadata?.prediction_days
        }
      );

      // Test 3.4: Lookback period
      const lookbackDaysCorrect = metadata?.lookback_days === TEST_CONFIG.expectedHistoricalDays;

      this.testResults.addTest(suiteName, `${ticker}: Lookback period correct`,
        lookbackDaysCorrect ? 'passed' : 'failed',
        {
          expected: TEST_CONFIG.expectedHistoricalDays,
          actual: metadata?.lookback_days
        }
      );

    } catch (error) {
      this.testResults.addError(error);
      this.testResults.addTest(suiteName, `${ticker}: Prediction dates validation`, 'failed',
        { error: error.message }
      );
    }
  }

  /**
   * Test Suite 4: Chart Rendering Simulation
   * Simulates chart rendering to detect potential errors
   */
  async testChartRendering(tickerData, ticker) {
    const suiteName = 'Chart Rendering';

    try {
      // Test 4.1: Chart data availability
      const chartData = tickerData.chart_data;
      const hasChartData = chartData &&
        chartData.historical_candlesticks &&
        chartData.predicted_ohlcv_summary;

      this.testResults.addTest(suiteName, `${ticker}: Chart data available`,
        hasChartData ? 'passed' : 'failed'
      );

      // Test 4.2: Historical data preparedness
      const historicalData = chartData?.historical_candlesticks;
      const historicalReady = historicalData &&
        historicalData.length > 0 &&
        historicalData.every(candle =>
          !isNaN(candle.open) && !isNaN(candle.high) &&
          !isNaN(candle.low) && !isNaN(candle.close)
        );

      this.testResults.addTest(suiteName, `${ticker}: Historical data chart-ready`,
        historicalReady ? 'passed' : 'failed'
      );

      // Test 4.3: Prediction data preparedness
      const predictionSummary = chartData?.predicted_ohlcv_summary;
      const predictionReady = predictionSummary &&
        predictionSummary.close &&
        Array.isArray(predictionSummary.close) &&
        predictionSummary.close.every(item =>
          item.mean !== undefined &&
          item.p25 !== undefined &&
          item.p75 !== undefined
        );

      this.testResults.addTest(suiteName, `${ticker}: Prediction data chart-ready`,
        predictionReady ? 'passed' : 'failed'
      );

      // Test 4.4: Monte Carlo simulations preparedness
      const monteCarloSims = chartData?.monte_carlo_simulations;
      const monteCarloReady = Array.isArray(monteCarloSims) &&
        monteCarloSims.length > 0 &&
        monteCarloSims.every(sim =>
          Array.isArray(sim) &&
          sim.every(point => point.date && !isNaN(point.close))
        );

      this.testResults.addTest(suiteName, `${ticker}: Monte Carlo data chart-ready`,
        monteCarloReady ? 'passed' : 'failed',
        { simulationCount: monteCarloSims?.length || 0 }
      );

      // Test 4.5: Chart compatibility flag
      const chartCompatible = tickerData.ticker_info?.chart_compatibility === 'candlestick_ready';

      this.testResults.addTest(suiteName, `${ticker}: Chart compatibility flag set`,
        chartCompatible ? 'passed' : 'failed',
        { flag: tickerData.ticker_info?.chart_compatibility }
      );

    } catch (error) {
      this.testResults.addError(error);
      this.testResults.addTest(suiteName, `${ticker}: Chart rendering validation`, 'failed',
        { error: error.message }
      );
    }
  }

  /**
   * Test Suite 5: Performance and Quality Metrics
   * Validates prediction accuracy and quality metrics
   */
  async testQualityMetrics(tickerData, ticker) {
    const suiteName = 'Quality Metrics';

    try {
      // Test 5.1: Overall prediction score
      const summaryStats = tickerData.summary_stats;
      const hasQualityScore = summaryStats &&
        typeof summaryStats.overall_score === 'number' &&
        summaryStats.overall_score >= 0 &&
        summaryStats.overall_score <= 100;

      this.testResults.addTest(suiteName, `${ticker}: Has valid quality score`,
        hasQualityScore ? 'passed' : 'failed',
        { score: summaryStats?.overall_score }
      );

      // Test 5.2: Prediction quality classification
      const qualityClassification = summaryStats?.prediction_quality;
      const validQuality = ['excellent', 'good', 'fair', 'poor'].includes(qualityClassification);

      this.testResults.addTest(suiteName, `${ticker}: Valid quality classification`,
        validQuality ? 'passed' : 'failed',
        { quality: qualityClassification }
      );

      // Test 5.3: Prediction metrics availability
      const predictionMetrics = tickerData.data?.prediction_metrics;
      const hasMetrics = predictionMetrics &&
        predictionMetrics.open_metrics &&
        predictionMetrics.high_metrics &&
        predictionMetrics.low_metrics &&
        predictionMetrics.close_metrics;

      this.testResults.addTest(suiteName, `${ticker}: Prediction metrics available`,
        hasMetrics ? 'passed' : 'failed'
      );

      // Test 5.4: MAPE values reasonable
      if (predictionMetrics) {
        const mapeReasonable = ['open_metrics', 'high_metrics', 'low_metrics', 'close_metrics']
          .every(metricType => {
            const mape = predictionMetrics[metricType]?.mape;
            return typeof mape === 'number' && mape >= 0 && mape <= 100;
          });

        this.testResults.addTest(suiteName, `${ticker}: MAPE values reasonable`,
          mapeReasonable ? 'passed' : 'failed'
        );
      }

    } catch (error) {
      this.testResults.addError(error);
      this.testResults.addTest(suiteName, `${ticker}: Quality metrics validation`, 'failed',
        { error: error.message }
      );
    }
  }

  /**
   * Load ticker data from file
   */
  async loadTickerData(ticker) {
    const filePath = path.join(TEST_CONFIG.dataDirectory, `${ticker}_ohlcv_prediction.json`);

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Data file not found: ${filePath}`);
      }

      const rawData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(rawData);

      return data;
    } catch (error) {
      throw new Error(`Failed to load ${ticker} data: ${error.message}`);
    }
  }

  /**
   * Run comprehensive tests for a single ticker
   */
  async testTicker(ticker) {
    console.log(`\n🧪 Testing ${ticker}...`);

    try {
      const tickerData = await this.loadTickerData(ticker);

      // Run all test suites
      await this.testDataStructure(tickerData, ticker);
      await this.testHistoricalCandlesticks(tickerData, ticker);
      await this.testPredictionDates(tickerData, ticker);
      await this.testChartRendering(tickerData, ticker);
      await this.testQualityMetrics(tickerData, ticker);

      console.log(`✅ ${ticker} testing completed`);
      return true;

    } catch (error) {
      console.log(`❌ ${ticker} testing failed: ${error.message}`);
      this.testResults.addError(error);
      this.testResults.addTest('File Loading', `${ticker}: File load`, 'failed',
        { error: error.message }
      );
      return false;
    }
  }

  /**
   * Run tests for all major tickers
   */
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Ticker Chart Tests');
    console.log('=' .repeat(50));

    const startTime = Date.now();
    let successfulTickers = 0;

    // Test each major ticker
    for (const ticker of TEST_CONFIG.majorTickers) {
      const success = await this.testTicker(ticker);
      if (success) successfulTickers++;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Update coverage metrics
    this.testResults.results.coverage.tickersTested = successfulTickers;
    this.testResults.results.coverage.tickersAvailable = TEST_CONFIG.majorTickers.length;
    this.testResults.results.coverage.coveragePercent =
      (successfulTickers / TEST_CONFIG.majorTickers.length * 100).toFixed(2);

    // Update performance metrics
    this.testResults.results.performance = {
      totalDuration: duration,
      averageTimePerTicker: duration / TEST_CONFIG.majorTickers.length,
      testsPerSecond: (this.testResults.results.totalTests / (duration / 1000)).toFixed(2)
    };

    return this.generateFinalReport();
  }

  /**
   * Generate and display final test report
   */
  generateFinalReport() {
    const report = this.testResults.generateReport();

    console.log('\n📋 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(50));
    console.log(`📊 Test Summary:`);
    console.log(`   Total Tests: ${report.totalTests}`);
    console.log(`   Passed: ${report.passed} ✅`);
    console.log(`   Failed: ${report.failed} ❌`);
    console.log(`   Success Rate: ${report.successRate}%`);

    console.log(`\n📈 Coverage:`);
    console.log(`   Tickers Tested: ${report.coverage.tickersTested}/${report.coverage.tickersAvailable}`);
    console.log(`   Coverage: ${report.coverage.coveragePercent}%`);

    console.log(`\n⚡ Performance:`);
    console.log(`   Total Duration: ${report.performance.totalDuration}ms`);
    console.log(`   Avg Time/Ticker: ${report.performance.averageTimePerTicker.toFixed(2)}ms`);
    console.log(`   Tests/Second: ${report.performance.testsPerSecond}`);

    console.log(`\n🧪 Test Suites:`);
    Object.entries(report.testSuites).forEach(([suiteName, suite]) => {
      console.log(`   ${suiteName}: ${suite.passed}✅ ${suite.failed}❌`);
    });

    if (report.errors.length > 0) {
      console.log(`\n❌ Errors (${report.errors.length}):`);
      report.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message}`);
      });
    }

    // Store results in memory
    TestMemory.set(TEST_CONFIG.memoryKey, {
      timestamp: report.timestamp,
      results: report,
      testConfiguration: TEST_CONFIG,
      summary: {
        overallSuccess: report.failed === 0,
        majorIssues: report.errors.length,
        tickersCovered: TEST_CONFIG.majorTickers,
        testsPerformed: [
          '120 Historical Candlesticks Validation',
          'Prediction Dates (Sep 30 - Oct 3, 2025)',
          'Chart Rendering Capability',
          'JSON Data Structure Compliance',
          'OHLCV Data Quality',
          'Monte Carlo Simulations',
          'Performance Metrics'
        ]
      }
    });

    console.log(`\n💾 Results stored in memory at: ${TEST_CONFIG.memoryKey}`);

    return report;
  }

  /**
   * Get test results from memory
   */
  static getStoredResults() {
    return TestMemory.get(TEST_CONFIG.memoryKey);
  }
}

// Export for use as module or run directly
if (require.main === module) {
  const tester = new TickerChartTester();
  tester.runAllTests()
    .then(report => {
      console.log('\n🎉 All tests completed!');
      process.exit(report.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { TickerChartTester, TestMemory, TEST_CONFIG };