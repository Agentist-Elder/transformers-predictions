# Transformers Predictions E2E Testing Suite

This comprehensive test suite validates all aspects of the Transformers Predictions ticker view functionality using Playwright and follows Test-Driven Development (TDD) principles.

## 🎯 Test Coverage

### Core Test Files

1. **00-setup-validation.spec.js** - Environment and setup validation
2. **01-page-loading.spec.js** - Page loading and basic functionality
3. **02-ticker-search.spec.js** - Ticker search and selection functionality
4. **03-data-loading.spec.js** - Data loading and JSON file validation
5. **04-chart-rendering.spec.js** - Chart rendering and visualization components
6. **05-monte-carlo-confidence.spec.js** - Monte Carlo paths and confidence bands
7. **06-responsive-design.spec.js** - Responsive design and mobile views
8. **07-error-handling.spec.js** - Error handling and edge cases

### Test Categories

#### 🔧 **Page Loading Tests**
- Page loads with correct title and header
- Summary content displays by default
- Overview cards load with statistics
- Search input is properly configured
- Popular ticker tags are functional
- External dependencies load correctly

#### 🔍 **Ticker Search Tests**
- Real-time search as user types
- Search via Enter key
- Popular ticker tag interactions
- Prediction grid item clicks
- Input validation and sanitization
- Debouncing behavior
- Error handling for invalid tickers

#### 📊 **Data Loading Tests**
- JSON data structure validation
- Historical and prediction data completeness
- Monte Carlo data structure validation
- Confidence band data validation
- Error handling for malformed data
- Network timeout handling
- Large dataset performance

#### 📈 **Chart Rendering Tests**
- Canvas element creation and visibility
- Chart controls functionality
- Historical candlestick rendering
- Prediction line display
- Chart zoom and pan functionality
- Chart destruction and recreation
- Performance with large datasets

#### 🎲 **Monte Carlo & Confidence Tests**
- Monte Carlo path rendering
- Path color coding by performance
- 50%, 75%, and 90% confidence bands
- Toggle visibility controls
- Legacy and new data format support
- Percentile ordering validation
- Performance with many paths

#### 📱 **Responsive Design Tests**
- Desktop, tablet, and mobile layouts
- Chart responsiveness across viewports
- Touch interactions on mobile devices
- Orientation change handling
- Text readability on all screen sizes
- Control accessibility on mobile

#### ⚠️ **Error Handling Tests**
- 404 errors for non-existent tickers
- 500 server errors
- Network timeout errors
- Malformed JSON responses
- Invalid data structures
- CORS errors
- Memory leak prevention

## 🛠️ Setup and Installation

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run test:install
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run tests with debugging
npm run test:e2e:debug

# Run tests with UI mode
npm run test:e2e:ui

# Run custom test runner
npm run test:e2e:custom
```

### Custom Test Runner Options

```bash
# Run with specific browser
node tests/utils/test-runner.js --browser chromium

# Run in headed mode
node tests/utils/test-runner.js --headed

# Run specific test pattern
node tests/utils/test-runner.js --pattern "01-page"

# Run with custom workers
node tests/utils/test-runner.js --workers 4

# Show help
node tests/utils/test-runner.js --help
```

## 🧪 Test Architecture

### Test Helpers (`tests/utils/test-helpers.js`)

Common utilities for all tests:
- `waitForPageLoad()` - Wait for complete page loading
- `waitForChartRender()` - Wait for Chart.js rendering
- `searchTicker(ticker)` - Perform ticker search with validation
- `validateChartData()` - Validate chart data structure
- `validateMonteCarloData()` - Validate Monte Carlo paths
- `mockApiResponse()` - Mock API responses for testing
- `takeScreenshot()` - Capture test screenshots

### Test Data (`tests/fixtures/`)

- **test-data.js** - Mock data constants and test fixtures
- **data-validation.js** - Data validation utilities and generators

### Configuration

- **playwright.config.js** - Main Playwright configuration
- **global-setup.js** - Global test setup and server validation
- **global-teardown.js** - Global cleanup

## 📊 Test Reports

Tests generate comprehensive reports:

- **HTML Report**: `tests/reports/html/index.html`
- **JSON Results**: `tests/reports/results.json`
- **JUnit XML**: `tests/reports/junit.xml`

## 🔄 TDD Workflow

### 1. Write Failing Tests First

Each test is designed to fail initially, ensuring proper validation:

```javascript
test('should validate chart rendering', async ({ page }) => {
  // This test will fail if chart doesn't render
  await testHelpers.searchTicker('AAPL');
  await testHelpers.waitForChartRender();

  const chartData = await testHelpers.validateChartData();
  expect(chartData.hasData).toBe(true);
});
```

### 2. Implement Functionality

Tests guide implementation by defining expected behavior.

### 3. Refactor and Optimize

Tests provide safety net for refactoring.

## 🎛️ Browser Support

Tests run across multiple browsers:
- **Chromium** (Chrome/Edge)
- **Firefox**
- **WebKit** (Safari)
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)

## 📝 Test Data Mocking

### API Response Mocking

```javascript
// Mock successful response
await testHelpers.mockApiResponse('**/data/AAPL_ohlcv_prediction.json', mockData);

// Mock error response
await testHelpers.mockNetworkFailure('**/data/INVALID_ohlcv_prediction.json', 404);
```

### Data Generation

```javascript
const { generateTestData } = require('./fixtures/data-validation');

const testData = generateTestData({
  ticker: 'TEST',
  historicalDays: 30,
  predictionDays: 5,
  includeMonteCarlos: true,
  monteCarloCount: 10
});
```

## 🚨 Continuous Integration

Tests are configured for CI environments:
- Retry failed tests automatically
- Generate artifacts for debugging
- Support for GitHub Actions
- Screenshot capture on failures

## 🔍 Debugging Tests

### Local Debugging

```bash
# Run in debug mode with breakpoints
npm run test:e2e:debug

# Run with visible browser
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/01-page-loading.spec.js --headed
```

### Screenshots and Videos

Tests automatically capture:
- Screenshots on failure
- Videos for failed tests
- Trace files for debugging

## 📚 Best Practices

### Test Organization
- One concern per test
- Descriptive test names
- Proper setup/teardown
- Independent tests

### Performance
- Mock external dependencies
- Use efficient selectors
- Parallel execution where safe
- Cleanup resources

### Maintainability
- Shared utilities in helpers
- Consistent data fixtures
- Clear error messages
- Regular test review

## 🤝 Contributing

When adding new tests:

1. Follow existing naming conventions
2. Use appropriate test helpers
3. Include both positive and negative cases
4. Update this README if needed
5. Ensure tests pass in all browsers

## 📋 Test Checklist

- [ ] Page loads correctly
- [ ] Search functionality works
- [ ] Data loads and validates
- [ ] Charts render properly
- [ ] Monte Carlo visualization works
- [ ] Responsive on all devices
- [ ] Error handling is robust
- [ ] Performance is acceptable
- [ ] Tests pass in all browsers
- [ ] Documentation is updated