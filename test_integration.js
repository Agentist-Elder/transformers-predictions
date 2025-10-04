const puppeteer = require('puppeteer');

async function testApplication() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Set up console logging
        page.on('console', msg => {
            console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
        });

        // Set up error logging
        page.on('pageerror', error => {
            console.log(`[PAGE ERROR] ${error.message}`);
        });

        // Navigate to the application
        console.log('Loading application...');
        await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });

        // Wait for the page to load
        await page.waitForSelector('#tickerSearch', { timeout: 5000 });

        // Test 1: Check if summary content loads
        console.log('\n=== TEST 1: Summary Content ===');
        const summaryVisible = await page.isVisible('#summaryContent');
        console.log(`Summary content visible: ${summaryVisible}`);

        // Test 2: Test ticker search with AAPL
        console.log('\n=== TEST 2: Search AAPL ===');
        await page.fill('#tickerSearch', 'AAPL');
        await page.press('#tickerSearch', 'Enter');

        // Wait for either dashboard or error
        try {
            await page.waitForSelector('#dashboardContent:not(.hidden), #errorMessage:not(.hidden)', { timeout: 10000 });

            const dashboardVisible = await page.isVisible('#dashboardContent');
            const errorVisible = await page.isVisible('#errorMessage');

            console.log(`Dashboard visible: ${dashboardVisible}`);
            console.log(`Error visible: ${errorVisible}`);

            if (errorVisible) {
                const errorText = await page.textContent('#errorMessage');
                console.log(`Error message: ${errorText}`);
            }

            if (dashboardVisible) {
                // Test chart rendering
                const chartCanvas = await page.$('#ohlcChart');
                console.log(`Chart canvas found: ${!!chartCanvas}`);

                // Test metric cards
                const priceTarget = await page.textContent('#priceTarget');
                const marketDirection = await page.textContent('#directionText');
                const riskLevel = await page.textContent('#riskLevel');

                console.log(`Price target: ${priceTarget}`);
                console.log(`Market direction: ${marketDirection}`);
                console.log(`Risk level: ${riskLevel}`);
            }
        } catch (error) {
            console.log(`Timeout waiting for response: ${error.message}`);
        }

        // Test 3: Test invalid ticker
        console.log('\n=== TEST 3: Invalid Ticker ===');
        await page.fill('#tickerSearch', 'INVALIDTICKER');
        await page.press('#tickerSearch', 'Enter');

        try {
            await page.waitForSelector('#errorMessage:not(.hidden)', { timeout: 5000 });
            const errorText = await page.textContent('#errorMessage');
            console.log(`Error message for invalid ticker: ${errorText}`);
        } catch (error) {
            console.log('No error shown for invalid ticker');
        }

        // Test 4: Test edge case tickers
        const edgeCaseTickers = ['A', 'AA', 'BRZU'];
        for (const ticker of edgeCaseTickers) {
            console.log(`\n=== TEST 4: Edge Case Ticker ${ticker} ===`);
            await page.fill('#tickerSearch', ticker);
            await page.press('#tickerSearch', 'Enter');

            try {
                await page.waitForSelector('#dashboardContent:not(.hidden), #errorMessage:not(.hidden)', { timeout: 5000 });
                const dashboardVisible = await page.isVisible('#dashboardContent');
                const errorVisible = await page.isVisible('#errorMessage');
                console.log(`${ticker} - Dashboard: ${dashboardVisible}, Error: ${errorVisible}`);
            } catch (error) {
                console.log(`${ticker} - Timeout`);
            }
        }

        // Test 5: Test network requests
        console.log('\n=== TEST 5: Network Monitoring ===');
        const networkRequests = [];
        page.on('request', request => {
            if (request.url().includes('/data/')) {
                networkRequests.push({
                    url: request.url(),
                    method: request.method()
                });
            }
        });

        page.on('response', response => {
            if (response.url().includes('/data/')) {
                console.log(`Network: ${response.status()} ${response.url()}`);
            }
        });

        await page.fill('#tickerSearch', 'TSLA');
        await page.press('#tickerSearch', 'Enter');
        await page.waitForTimeout(3000);

        console.log(`Network requests made: ${networkRequests.length}`);
        networkRequests.forEach(req => console.log(`  ${req.method} ${req.url}`));

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testApplication().catch(console.error);