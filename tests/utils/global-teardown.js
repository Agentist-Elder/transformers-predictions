async function globalTeardown(config) {
  console.log('🧹 Cleaning up after Playwright tests...');

  // Any global cleanup can go here
  // For now, just log completion

  console.log('✅ Global teardown completed');
}

module.exports = globalTeardown;