#!/usr/bin/env node

/**
 * Test Runner for Chart Loading Tests
 * Provides comprehensive test execution and reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      framework: 'Jest',
      environment: 'Node.js + jsdom',
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      coverage: {},
      performance: {},
      errors: []
    };
  }

  async runTests() {
    console.log('🚀 Starting Chart Loading Tests...\n');

    try {
      // Check if dependencies are installed
      if (!this.checkDependencies()) {
        console.log('📦 Installing test dependencies...');
        execSync('npm install', { stdio: 'inherit' });
      }

      // Run the tests
      console.log('🧪 Executing test suite...');
      const testOutput = execSync('npm test', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      this.parseTestResults(testOutput);
      this.generateReport();

    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      this.testResults.errors.push(error.message);
      this.generateErrorReport();
    }
  }

  checkDependencies() {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const devDeps = packageJson.devDependencies || {};

    return fs.existsSync('node_modules') &&
           fs.existsSync('node_modules/jest') &&
           'jest' in devDeps;
  }

  parseTestResults(output) {
    // Parse Jest output for test statistics
    const lines = output.split('\n');

    lines.forEach(line => {
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed, (\d+) total/);
        if (match) {
          this.testResults.passed = parseInt(match[1]);
          this.testResults.totalTests = parseInt(match[2]);
          this.testResults.failed = this.testResults.totalTests - this.testResults.passed;
        }
      }

      if (line.includes('Statements')) {
        const coverage = line.match(/(\d+\.?\d*)%/);
        if (coverage) {
          this.testResults.coverage.statements = parseFloat(coverage[1]);
        }
      }
    });
  }

  generateReport() {
    const report = {
      summary: `✅ Tests Completed Successfully`,
      details: {
        total: this.testResults.totalTests,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: `${((this.testResults.passed / this.testResults.totalTests) * 100).toFixed(1)}%`
      },
      categories: [
        '📊 Individual Ticker Chart Loading',
        '🕯️  Candlestick Data Validation',
        '🔮 Prediction Overlay Functionality',
        '👁️  Visual Element Validation',
        '🛠️  Error Handling and Edge Cases',
        '⚡ Performance and Load Testing',
        '♿ Accessibility and Usability'
      ],
      coverage: this.testResults.coverage,
      timestamp: this.testResults.timestamp
    };

    console.log('\n📋 TEST EXECUTION REPORT');
    console.log('========================');
    console.log(`${report.summary}`);
    console.log(`Total Tests: ${report.details.total}`);
    console.log(`Passed: ${report.details.passed}`);
    console.log(`Failed: ${report.details.failed}`);
    console.log(`Success Rate: ${report.details.successRate}`);
    console.log('\n📂 Test Categories:');
    report.categories.forEach(category => console.log(`  ${category}`));

    if (Object.keys(report.coverage).length > 0) {
      console.log('\n📈 Coverage Summary:');
      Object.entries(report.coverage).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}%`);
      });
    }

    // Save report to file
    fs.writeFileSync('tests/test-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Report saved to tests/test-report.json');
  }

  generateErrorReport() {
    console.log('\n❌ TEST EXECUTION FAILED');
    console.log('========================');
    console.log('Errors encountered:');
    this.testResults.errors.forEach(error => {
      console.log(`  • ${error}`);
    });

    console.log('\n💡 Troubleshooting:');
    console.log('  1. Ensure all dependencies are installed: npm install');
    console.log('  2. Check Jest configuration in jest.config.js');
    console.log('  3. Verify test files exist in tests/ directory');
    console.log('  4. Check for syntax errors in test files');
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runTests().catch(console.error);
}

module.exports = TestRunner;