/**
 * Jest Test Setup File
 * Configures the testing environment for chart loading tests
 */

// Mock Chart.js globally
global.Chart = jest.fn().mockImplementation((ctx, config) => ({
  destroy: jest.fn(),
  data: config.data,
  options: config.options,
  update: jest.fn(),
  render: jest.fn(),
  canvas: {
    getContext: jest.fn(() => ({}))
  }
}));

// Mock DOM APIs
Object.defineProperty(global, 'fetch', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(global, 'document', {
  value: {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    createElement: jest.fn(),
    addEventListener: jest.fn()
  },
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    location: { origin: 'http://localhost:3000' },
    addEventListener: jest.fn()
  },
  writable: true
});

// Console methods for cleaner test output
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};

// Performance API mock
global.performance = {
  now: jest.fn(() => Date.now())
};