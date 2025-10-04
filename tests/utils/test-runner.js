#!/usr/bin/env node

/**
 * Custom Test Runner with TDD Utilities
 * Provides additional testing capabilities beyond basic Playwright
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor(options = {}) {
    this.options = {
      browsers: ['chromium', 'firefox', 'webkit'],
      workers: 1,
      retries: 2,
      timeout: 30000,
      headed: false,
      ...options
    };

    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null,
      failures: []
    };
  }

  async runTests(pattern = null) {
    console.log('🚀 Starting Transformers Predictions E2E Test Suite');
    console.log('=' .repeat(60));

    this.results.startTime = Date.now();

    try {
      await this.validateEnvironment();
      await this.startServer();
      await this.runPlaywrightTests(pattern);
      await this.generateReport();
    } catch (error) {
      console.error('❌ Test run failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }

    this.results.endTime = Date.now();
    this.printSummary();

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }

  async validateEnvironment() {
    console.log('🔍 Validating test environment...');

    // Check if server files exist
    const requiredFiles = [
      path.join(process.cwd(), 'server.js'),
      path.join(process.cwd(), 'index.html'),
      path.join(process.cwd(), 'app.js'),
      path.join(process.cwd(), 'package.json')
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file not found: ${file}`);
      }
    }

    // Check if data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      console.log('⚠️ Data directory not found, tests will use mocked data');
    } else {
      const jsonFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      console.log(`📊 Found ${jsonFiles.length} data files`);
    }

    // Check if Playwright is installed
    try {
      const { execSync } = require('child_process');
      execSync('npx playwright --version', { stdio: 'pipe' });
      console.log('✅ Playwright is installed');
    } catch (error) {
      throw new Error('Playwright not found. Run: npm run test:install');
    }

    console.log('✅ Environment validation complete');
  }

  async startServer() {
    console.log('🌐 Starting test server...');

    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['server.js'], {
        env: { ...process.env, NODE_ENV: 'test', PORT: '3000' },
        stdio: 'pipe'
      });

      let serverReady = false;
      const timeout = setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server start timeout'));
        }
      }, 10000);

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running') || output.includes('listening')) {
          serverReady = true;
          clearTimeout(timeout);
          console.log('✅ Test server started on port 3000');
          setTimeout(resolve, 1000); // Give server time to fully initialize
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      this.serverProcess.on('exit', (code) => {
        if (!serverReady && code !== 0) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });
  }

  async runPlaywrightTests(pattern) {
    console.log('🎭 Running Playwright tests...');

    const args = [
      'playwright', 'test',
      '--config=playwright.config.js',
      '--workers=' + this.options.workers,
      '--retries=' + this.options.retries
    ];

    if (this.options.headed) {
      args.push('--headed');
    }

    if (pattern) {
      args.push(pattern);
    }

    // Run tests for each browser
    for (const browser of this.options.browsers) {
      console.log(`\n🌐 Testing with ${browser}...`);

      const browserArgs = [...args, '--project=' + browser];

      try {
        await this.runCommand('npx', browserArgs);
        console.log(`✅ ${browser} tests completed`);
      } catch (error) {
        console.error(`❌ ${browser} tests failed:`, error.message);
        this.results.failures.push({
          browser,
          error: error.message
        });
      }
    }
  }

  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'inherit' });

      process.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
    });
  }

  async generateReport() {
    console.log('\n📊 Generating test report...');

    const reportsDir = path.join(process.cwd(), 'tests', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Check if Playwright generated reports
    const htmlReportPath = path.join(reportsDir, 'html', 'index.html');
    if (fs.existsSync(htmlReportPath)) {
      console.log(`📋 HTML report: file://${htmlReportPath}`);
    }

    const jsonReportPath = path.join(reportsDir, 'results.json');
    if (fs.existsSync(jsonReportPath)) {
      try {
        const results = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
        this.parsePlaywrightResults(results);
      } catch (error) {
        console.log('⚠️ Could not parse test results');
      }
    }
  }

  parsePlaywrightResults(results) {
    if (results.suites) {
      results.suites.forEach(suite => {
        this.parseSuite(suite);
      });
    }
  }

  parseSuite(suite) {
    if (suite.specs) {
      suite.specs.forEach(spec => {
        this.results.total++;

        if (spec.ok) {
          this.results.passed++;
        } else {
          this.results.failed++;
        }
      });
    }

    if (suite.suites) {
      suite.suites.forEach(subSuite => {
        this.parseSuite(subSuite);
      });
    }
  }

  printSummary() {
    const duration = this.results.endTime - this.results.startTime;
    const durationStr = `${(duration / 1000).toFixed(2)}s`;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${durationStr}`);
    console.log(`📝 Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);

    if (this.results.failures.length > 0) {
      console.log('\n❌ FAILURES:');
      this.results.failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.browser}: ${failure.error}`);
      });
    }

    const passRate = this.results.total > 0
      ? ((this.results.passed / this.results.total) * 100).toFixed(1)
      : 0;

    console.log(`\n📈 Pass Rate: ${passRate}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n💥 ${this.results.failed} test(s) failed`);
    }

    console.log('='.repeat(60));
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');

    if (this.serverProcess) {
      this.serverProcess.kill();
      console.log('✅ Test server stopped');
    }
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  let pattern = null;

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--headed') {
      options.headed = true;
    } else if (arg === '--workers' && args[i + 1]) {
      options.workers = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--retries' && args[i + 1]) {
      options.retries = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--browser' && args[i + 1]) {
      options.browsers = [args[i + 1]];
      i++;
    } else if (arg === '--pattern' && args[i + 1]) {
      pattern = args[i + 1];
      i++;
    } else if (arg === '--help') {
      console.log(`
Transformers Predictions Test Runner

Usage: node test-runner.js [options] [pattern]

Options:
  --headed              Run tests in headed mode
  --workers <n>         Number of parallel workers (default: 1)
  --retries <n>         Number of retries (default: 2)
  --browser <name>      Run specific browser (chromium, firefox, webkit)
  --pattern <pattern>   Run tests matching pattern
  --help               Show this help

Examples:
  node test-runner.js                           # Run all tests
  node test-runner.js --headed                  # Run with visible browser
  node test-runner.js --browser chromium        # Run only Chrome tests
  node test-runner.js --pattern "01-page"       # Run page loading tests
      `);
      process.exit(0);
    }
  }

  const runner = new TestRunner(options);
  runner.runTests(pattern).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;