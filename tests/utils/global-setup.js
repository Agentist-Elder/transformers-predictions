const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function globalSetup(config) {
  console.log('🚀 Setting up Playwright tests for Transformers Predictions...');

  // Ensure test data directories exist
  const testDataDir = path.join(__dirname, '../fixtures');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Create test reports directory
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Verify server is responding
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('⏳ Waiting for server to be ready...');
    await page.goto(config.webServer.url, { waitUntil: 'networkidle' });
    console.log('✅ Server is ready for testing');

    // Basic health check
    const title = await page.title();
    if (!title.includes('Transformers Predictions')) {
      throw new Error(`Expected page title to contain 'Transformers Predictions', got: ${title}`);
    }

    console.log('✅ Basic health check passed');
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('🎯 Global setup completed successfully');
}

module.exports = globalSetup;