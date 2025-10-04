# Chart Loading Tests

Comprehensive test suite for the Transformers Predictions chart functionality.

## Overview

This test suite validates the complete chart loading pipeline including:

- ✅ **Individual Ticker Chart Loading** - Tests all 17 tickers from the dataset
- 🕯️ **Candlestick Data Validation** - Validates OHLCV data structure and relationships
- 🔮 **Prediction Overlay Functionality** - Tests prediction bands and Monte Carlo simulations
- 👁️ **Visual Element Validation** - Ensures UI elements display correctly
- 🛠️ **Error Handling** - Tests graceful failure scenarios
- ⚡ **Performance Testing** - Validates load times and memory usage
- ♿ **Accessibility** - Tests keyboard navigation and tooltips

## Test Structure

```
tests/
├── chart-loading.test.js    # Main test suite (25 tests)
├── setup.js                 # Jest configuration and mocks
├── run-tests.js            # Custom test runner with reporting
└── README.md               # This file
```

## Tested Tickers

The test suite validates chart loading for all available tickers:
- AAPL, TROO, IONS, TIME, WMK, SPLG, ITEQ, PEGA
- WSBF, GWW, SOXS, SMLV, DRLL, HIBS, CRAK, ODDS, VDC

## Running Tests

### Quick Start
```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Advanced Testing
```bash
# Run custom test runner with detailed reporting
node tests/run-tests.js

# Run specific test categories
npm test -- --testNamePattern="Candlestick"
```

## Test Categories

### 1. Individual Ticker Chart Loading (5 tests)
- Validates API responses for each ticker
- Tests error handling for invalid tickers
- Verifies ticker-specific data structure

### 2. Candlestick Data Validation (3 tests)
- OHLCV data structure validation
- Bullish/bearish candle separation
- Price relationship validation (high >= open/close, low <= open/close)

### 3. Prediction Overlay Functionality (3 tests)
- Chart.js initialization with datasets
- Monte Carlo simulation rendering
- Prediction summary percentile validation

### 4. Visual Element Validation (3 tests)
- Ticker information display
- Performance metrics population
- Chart control interactions

### 5. Error Handling and Edge Cases (4 tests)
- Empty data handling
- Network timeout resilience
- Chart configuration validation
- Invalid input handling

### 6. Performance and Load Testing (4 tests)
- Rapid ticker search efficiency
- Chart cleanup and memory management
- Large dataset handling
- Load time validation

### 7. Accessibility and Usability (3 tests)
- Tooltip information accessibility
- Legend configuration
- Keyboard interaction support

## Coverage Targets

- **Statements**: 85%
- **Branches**: 80%
- **Functions**: 90%
- **Lines**: 85%

## Mock Data Structure

Tests use comprehensive mock data including:

```javascript
{
  ticker_info: {
    symbol: "AAPL",
    model_type: "complete-ohlcv-monte-carlo",
    chart_compatibility: "candlestick_ready"
  },
  data: {
    historical_ohlcv: { /* OHLCV arrays */ },
    predicted_ohlcv: { /* Prediction data */ },
    prediction_metrics: { /* Accuracy metrics */ }
  },
  chart_data: {
    historical_candlesticks: [/* Candlestick objects */],
    predicted_ohlcv_summary: { /* Statistical summaries */ },
    monte_carlo_simulations: [/* Simulation arrays */]
  }
}
```

## Framework Configuration

### Jest Configuration (jest.config.js)
- **Environment**: jsdom for DOM testing
- **Setup**: Automatic mocking of Chart.js and DOM APIs
- **Coverage**: HTML and LCOV reporting
- **Thresholds**: Enforced coverage minimums

### Mocking Strategy
- **Chart.js**: Complete mock with dataset validation
- **DOM APIs**: document.getElementById, fetch, etc.
- **Browser APIs**: Performance, console methods

## Continuous Integration

Tests are designed for CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Run Chart Tests
  run: |
    npm install
    npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

1. **Missing Dependencies**
   ```bash
   npm install jest puppeteer
   ```

2. **Chart.js Errors**
   - Tests run in Node.js with mocked Chart.js
   - Verify mock setup in tests/setup.js

3. **DOM Access Errors**
   - Use jsdom test environment
   - Check document mocking in setup

4. **Timeout Issues**
   - Increase Jest timeout for performance tests
   - Check network mock responses

### Debug Mode
```bash
# Run tests with verbose output
npm test -- --verbose

# Debug specific test
npm test -- --testNamePattern="should load chart for ticker"
```

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Use descriptive test names
3. Include both positive and negative test cases
4. Update coverage expectations if needed
5. Document any new mock requirements

## Performance Benchmarks

Expected test execution times:
- **Full Suite**: < 30 seconds
- **Individual Category**: < 5 seconds
- **Single Test**: < 1 second

Memory usage should remain stable across test runs.