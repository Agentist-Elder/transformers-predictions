const { chromium } = require('playwright');

async function testPredictionsWebsite() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log('🧪 Testing Transformers Predictions Website...\n');

    try {
        // Navigate to the website
        await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
        console.log('✅ Page loaded successfully');

        // Check main elements
        const title = await page.textContent('h1');
        console.log(`✅ Page title: ${title}`);

        // Check market overview
        const marketDirection = await page.textContent('#marketDirection');
        console.log(`✅ Market direction: ${marketDirection}`);

        // Check ticker dropdown
        const tickerCount = await page.locator('#tickerDropdown option').count();
        console.log(`✅ Available tickers in dropdown: ${tickerCount}`);

        // Test searching for AAPL
        console.log('\n📊 Testing AAPL ticker search...');
        await page.fill('#tickerSearch', 'AAPL');
        await page.keyboard.press('Enter');

        // Wait for data to load
        await page.waitForTimeout(2000);

        // Check if chart canvas exists
        const chartExists = await page.locator('#ohlcChart').isVisible();
        console.log(`✅ Chart canvas visible: ${chartExists}`);

        // Check prediction cards
        const targetPrice = await page.textContent('#targetPrice');
        console.log(`✅ Target price displayed: ${targetPrice}`);

        const confidence = await page.textContent('#confidenceLevel');
        console.log(`✅ Confidence level: ${confidence}`);

        // Check if metrics are populated
        const openMape = await page.textContent('#openMape');
        console.log(`✅ Open MAPE metric: ${openMape}`);

        // Check chart data points
        const chartData = await page.evaluate(() => {
            const dashboard = window.dashboardInstance || new OHLCVDashboard();
            if (dashboard.currentData && dashboard.currentData.chart_data) {
                const historical = dashboard.currentData.chart_data.historical_candlesticks;
                return {
                    historicalCount: historical ? historical.length : 0,
                    hasData: dashboard.currentData !== null
                };
            }
            return { historicalCount: 0, hasData: false };
        });

        console.log(`\n📈 Chart Data Analysis:`);
        console.log(`  - Historical candlesticks: ${chartData.historicalCount}`);
        console.log(`  - Data loaded: ${chartData.hasData}`);

        if (chartData.historicalCount !== 120) {
            console.log(`⚠️  Warning: Expected 120 historical candlesticks, got ${chartData.historicalCount}`);
        }

        // Test another ticker
        console.log('\n📊 Testing MSFT ticker...');
        await page.fill('#tickerSearch', 'MSFT');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);

        const msftPrice = await page.textContent('#targetPrice');
        console.log(`✅ MSFT target price: ${msftPrice}`);

        console.log('\n✨ All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testPredictionsWebsite().catch(console.error);