module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'app.js',
    'public/**/*.js',
    '!public/**/*.min.js'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  modulePathIgnorePatterns: ['<rootDir>/data/'],
  globals: {
    'Chart': 'Chart'
  }
};