class OHLCVDashboard {
    constructor() {
        this.currentData = null;
        this.chart = null;
        this.searchTimeout = null;
        this.summaryData = null;
        this.initializeEventListeners();
        this.loadSummaryStats();
    }

    initializeEventListeners() {
        const searchInput = document.getElementById('tickerSearch');

        // Real-time search as user types
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const ticker = e.target.value.trim().toUpperCase();

            if (ticker.length >= 1) {
                this.searchTimeout = setTimeout(() => {
                    this.searchTicker(ticker);
                }, 300); // 300ms debounce
            } else {
                this.showSummaryStats();
            }
        });

        // Search on Enter key (immediate)
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(this.searchTimeout);
                const ticker = e.target.value.trim().toUpperCase();
                if (ticker) {
                    this.searchTicker(ticker);
                }
            }
        });

        // Chart control listeners
        document.getElementById('showPredictionBands')?.addEventListener('change', () => {
            this.updateChart();
        });

        document.getElementById('showMonteCarloSims')?.addEventListener('change', () => {
            this.updateChart();
        });

        document.getElementById('showActualData')?.addEventListener('change', () => {
            this.updateChart();
        });

        // Modal listeners
        this.initializeModalListeners();
    }

    initializeModalListeners() {
        // Click/tap only for both desktop and mobile
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('info-icon')) {
                e.stopPropagation();
                const metric = e.target.getAttribute('data-metric');
                this.showModal(metric);
            }
        });

        // Close modal listeners
        document.getElementById('infoModal').addEventListener('click', (e) => {
            if (e.target.id === 'infoModal') {
                this.closeModal();
            }
        });

        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    showModal(metric) {
        const modal = document.getElementById('infoModal');
        const title = document.getElementById('modalTitle');
        const description = document.getElementById('modalDescription');
        const goodExample = document.getElementById('goodExample');
        const badExample = document.getElementById('badExample');

        const metricInfo = this.getMetricInfo(metric);

        title.textContent = metricInfo.title;
        description.innerHTML = metricInfo.description;
        goodExample.innerHTML = metricInfo.goodExample;
        badExample.innerHTML = metricInfo.badExample;

        modal.classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('infoModal').classList.add('hidden');
    }

    getMetricInfo(metric) {
        const info = {
            'total-tickers': {
                title: 'Total Stock Tickers',
                description: 'The complete universe of stocks analyzed by our transformer prediction model. This represents comprehensive market coverage including large-cap, mid-cap, small-cap, and various sector stocks.',
                goodExample: '<strong>Comprehensive Coverage:</strong> 5,541 tickers ensures the model has been tested across diverse market conditions, sectors, and volatility levels, providing robust validation of prediction accuracy.',
                badExample: '<strong>Limited Coverage:</strong> If we only analyzed 100-500 tickers, the results might be biased toward specific sectors or market caps, reducing confidence in model generalization.'
            },
            'mean-score': {
                title: 'Mean Accuracy Score',
                description: 'The average overall prediction performance score across all tickers, calculated from OHLCV accuracy metrics. Scores range from 0-100, where higher scores indicate better prediction accuracy.',
                goodExample: '<strong>Excellent (86.8):</strong> Our transformer model achieves 86.8/100 mean score, indicating consistently high prediction accuracy across the entire stock universe with low variance.',
                badExample: '<strong>Poor (30-50):</strong> Traditional models often score 30-50, showing inconsistent predictions with high error rates and limited reliability for trading decisions.'
            },
            'excellent-quality': {
                title: 'Excellent Quality Predictions',
                description: 'Percentage of tickers classified as "excellent" quality (typically scores >80). This metric shows how many stocks have highly reliable predictions suitable for trading strategies.',
                goodExample: '<strong>High Success (76%):</strong> 4,208 out of 5,541 tickers achieve excellent quality, meaning most stocks have reliable predictions with low error rates.',
                badExample: '<strong>Low Success (20-30%):</strong> Traditional models often have only 20-30% excellent predictions, limiting their practical application to a small subset of stocks.'
            },
            'lookback-period': {
                title: 'Historical Lookback Period',
                description: 'Number of historical trading days used to train the prediction model. This provides the context window for understanding price patterns and market behavior.',
                goodExample: '<strong>Optimal (50 days):</strong> 50 days captures ~2.5 months of trading patterns, including earnings cycles, monthly trends, and sufficient data for robust predictions.',
                badExample: '<strong>Too Short (5-10 days):</strong> Short lookbacks miss important patterns and trends, while too long (200+ days) may include outdated market conditions affecting accuracy.'
            },
            'open-price': {
                title: 'Opening Price Accuracy',
                description: 'Measures how accurately our model predicts the opening price of stocks. MAPE (Mean Absolute Percentage Error) shows average prediction error, while ±5%/±10% accuracy shows percentage of predictions within those tolerance bands.',
                goodExample: '<strong>Excellent (2.51% MAPE):</strong> If a stock opens at $100, our prediction is typically within $102.51, with 87.2% of predictions within ±5% ($95-$105).',
                badExample: '<strong>Poor (10%+ MAPE):</strong> Traditional models with 10%+ MAPE mean a $100 stock prediction could be off by $110+ regularly, making them unreliable for trading.'
            },
            'high-price': {
                title: 'Daily High Price Accuracy',
                description: 'Accuracy of predicting the highest price reached during each trading day. This is crucial for setting profit targets and understanding intraday volatility patterns.',
                goodExample: '<strong>Strong (3.44% MAPE):</strong> For a $100 stock, daily high predictions are typically within $103.44, with 79.8% within ±5% range.',
                badExample: '<strong>Weak (8%+ MAPE):</strong> Poor models miss significant price movements, leading to inadequate profit targets and risk management failures.'
            },
            'low-price': {
                title: 'Daily Low Price Accuracy',
                description: 'Accuracy of predicting the lowest price reached during each trading day. Essential for stop-loss placement and risk management in trading strategies.',
                goodExample: '<strong>Reliable (3.42% MAPE):</strong> Low price predictions help traders set appropriate stop-losses and identify support levels with 80.5% accuracy within ±5%.',
                badExample: '<strong>Unreliable (8%+ MAPE):</strong> Inaccurate low predictions lead to premature stop-outs or insufficient protection against large losses.'
            },
            'close-price': {
                title: 'Closing Price Accuracy',
                description: 'Accuracy of predicting the final closing price of each trading day. This is the most important metric for end-of-day trading strategies and portfolio valuation.',
                goodExample: '<strong>Exceptional (3.04% MAPE):</strong> Close price predictions are highly accurate with 83.4% within ±5%, enabling reliable end-of-day trading strategies.',
                badExample: '<strong>Poor (7%+ MAPE):</strong> Inaccurate close predictions make it difficult to assess portfolio performance and plan next-day trading strategies.'
            },
            'ticker-open-accuracy': {
                title: 'Individual Open Price Performance',
                description: 'This ticker\'s specific accuracy for predicting opening prices over the 5-day forecast period. Lower MAPE values and higher accuracy percentages indicate better performance for this stock.',
                goodExample: '<strong>Excellent Performance:</strong> MAPE < 3% with 80%+ accuracy within ±5% means this ticker\'s opening prices are highly predictable, suitable for gap trading strategies.',
                badExample: '<strong>Poor Performance:</strong> MAPE > 8% with <50% accuracy within ±5% suggests this ticker has unpredictable opening behavior, requiring wider stop-losses.'
            },
            'ticker-high-accuracy': {
                title: 'Individual High Price Performance',
                description: 'This ticker\'s accuracy for predicting daily high prices. Important for setting profit targets and understanding this stock\'s intraday momentum patterns.',
                goodExample: '<strong>Strong Predictability:</strong> Accurate high predictions (MAPE < 4%) help identify optimal exit points and resistance levels for this specific stock.',
                badExample: '<strong>Weak Predictability:</strong> Poor high predictions (MAPE > 8%) make it difficult to set appropriate profit targets and may lead to early exits or missed opportunities.'
            },
            'ticker-low-accuracy': {
                title: 'Individual Low Price Performance',
                description: 'This ticker\'s accuracy for predicting daily low prices. Critical for stop-loss placement and risk management specific to this stock\'s volatility patterns.',
                goodExample: '<strong>Reliable Support Prediction:</strong> Accurate low predictions (MAPE < 4%) enable precise stop-loss placement and support level identification for this ticker.',
                badExample: '<strong>Unreliable Support:</strong> Poor low predictions (MAPE > 8%) increase risk of premature stop-outs or inadequate protection against this stock\'s downside moves.'
            },
            'ticker-close-accuracy': {
                title: 'Individual Close Price Performance',
                description: 'This ticker\'s accuracy for predicting closing prices. The most critical metric for this stock\'s end-of-day valuation and next-day gap predictions.',
                goodExample: '<strong>Highly Reliable:</strong> Excellent close predictions (MAPE < 3%) make this ticker suitable for swing trading and portfolio strategies with predictable end-of-day values.',
                badExample: '<strong>Unpredictable:</strong> Poor close predictions (MAPE > 7%) suggest this ticker has erratic closing behavior, requiring more conservative position sizing.'
            },
            'prediction-parameters': {
                title: 'Model Configuration',
                description: 'The specific parameters used to generate predictions for this ticker, including the historical context window and forecast horizon with uncertainty quantification.',
                goodExample: '<strong>Optimal Setup:</strong> 50-day lookback provides sufficient pattern recognition while 5-day predictions with 10 Monte Carlo simulations offer practical trading horizons with uncertainty bounds.',
                badExample: '<strong>Poor Setup:</strong> Too short lookback (5 days) misses patterns, while too long predictions (20+ days) become unreliable due to market volatility and news events.'
            },
            'price-analysis': {
                title: 'Technical Price Levels',
                description: 'Key technical analysis levels for this specific ticker including support/resistance levels derived from historical price action and current trading range context.',
                goodExample: '<strong>Strong Levels:</strong> Clear support/resistance levels with multiple tests provide reliable entry/exit points and risk management anchors for trading this ticker.',
                badExample: '<strong>Weak Levels:</strong> Poorly defined support/resistance levels indicate ranging markets or insufficient historical data, making technical analysis less reliable.'
            }
        };

        return info[metric] || {
            title: 'Unknown Metric',
            description: 'Information not available for this metric.',
            goodExample: 'No example available.',
            badExample: 'No example available.'
        };
    }

    async searchTicker(ticker = null) {
        if (!ticker) {
            ticker = document.getElementById('tickerSearch').value.trim().toUpperCase();
        }

        if (!ticker) {
            this.showError('Please enter a ticker symbol');
            return;
        }

        this.showLoading();

        try {
            // For GitHub Pages, we'll need to load JSON files directly
            const jsonUrl = `data/${ticker}_ohlcv_prediction.json`;
            const response = await fetch(jsonUrl);

            if (response.ok) {
                const data = await response.json();
                this.currentData = data;
                this.displayDashboard(data);
            } else if (response.status === 404) {
                this.showError(`${ticker} not found in the dataset`);
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            console.error('Error fetching ticker data:', error);
            this.showError(`${ticker} not found in the dataset`);
        }
    }

    clearDashboard() {
        document.getElementById('dashboardContent').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('summaryContent').classList.add('hidden');
    }

    showSummaryStats() {
        document.getElementById('dashboardContent').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('summaryContent').classList.remove('hidden');
    }

    async loadSummaryStats() {
        try {
            const response = await fetch('data/dataset_summary.json');
            if (response.ok) {
                this.summaryData = await response.json();
                this.populateSummaryStats();
            }
        } catch (error) {
            console.error('Error loading summary stats:', error);
        }
    }

    populateSummaryStats() {
        if (!this.summaryData) return;

        const summary = this.summaryData;

        // Update overview cards with actual data
        const totalTickers = summary.dataset_overview.total_tickers;
        const excellentCount = summary.quality_distribution.excellent || 0;
        const excellentPct = Math.round((excellentCount / totalTickers) * 100);

        document.getElementById('totalTickers').textContent = totalTickers.toLocaleString();
        document.getElementById('meanScore').textContent = summary.overall_performance.mean_score;
        document.getElementById('excellentPct').textContent = excellentPct + '%';

        // Update accuracy metrics
        const acc = summary.accuracy_metrics;
        document.getElementById('openMAPE').textContent = acc.open_price.mean_mape + '%';
        document.getElementById('openAcc5').textContent = acc.open_price.mean_accuracy_5pct + '%';
        document.getElementById('openAcc10').textContent = acc.open_price.mean_accuracy_10pct + '%';

        document.getElementById('highMAPE').textContent = acc.high_price.mean_mape + '%';
        document.getElementById('highAcc5').textContent = acc.high_price.mean_accuracy_5pct + '%';
        document.getElementById('highAcc10').textContent = acc.high_price.mean_accuracy_10pct + '%';

        document.getElementById('lowMAPE').textContent = acc.low_price.mean_mape + '%';
        document.getElementById('lowAcc5').textContent = acc.low_price.mean_accuracy_5pct + '%';
        document.getElementById('lowAcc10').textContent = acc.low_price.mean_accuracy_10pct + '%';

        document.getElementById('closeMAPE').textContent = acc.close_price.mean_mape + '%';
        document.getElementById('closeAcc5').textContent = acc.close_price.mean_accuracy_5pct + '%';
        document.getElementById('closeAcc10').textContent = acc.close_price.mean_accuracy_10pct + '%';
    }

    showLoading() {
        document.getElementById('loadingIndicator').classList.remove('hidden');
        document.getElementById('dashboardContent').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
        document.getElementById('summaryContent').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorMessage').classList.remove('hidden');
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('dashboardContent').classList.add('hidden');
        document.getElementById('summaryContent').classList.add('hidden');
    }

    displayDashboard(data) {
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
        document.getElementById('summaryContent').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');

        // Populate ticker info
        this.populateTickerInfo(data);

        // Populate performance metrics
        this.populateMetrics(data);

        // Populate details
        this.populateDetails(data);

        // Create chart
        this.createChart(data);
    }

    populateTickerInfo(data) {
        document.getElementById('tickerSymbol').textContent = data.ticker_info.symbol;
        document.getElementById('modelType').textContent = data.ticker_info.model_type;
        document.getElementById('generatedAt').textContent = new Date(data.ticker_info.generated_at).toLocaleString();
        document.getElementById('dataCompleteness').textContent = data.ticker_info.data_completeness;
        document.getElementById('chartCompatibility').textContent = data.ticker_info.chart_compatibility === 'candlestick_ready' ? '✅ Ready' : '❌ Not Ready';

        // Overall score and quality
        const score = Math.round(data.summary_stats.overall_score);
        document.getElementById('overallScore').textContent = score;

        const qualityBadge = document.getElementById('qualityBadge');
        const quality = data.summary_stats.prediction_quality;
        qualityBadge.textContent = quality;
        qualityBadge.className = 'quality-badge quality-' + quality;
    }

    populateMetrics(data) {
        const metrics = data.data.prediction_metrics;

        // Open metrics
        document.getElementById('openMape').textContent = metrics.open_metrics.mape.toFixed(2) + '%';
        document.getElementById('openAccuracy5').textContent = metrics.open_metrics.accuracy_5pct + '%';
        document.getElementById('openAccuracy10').textContent = metrics.open_metrics.accuracy_10pct + '%';

        // High metrics
        document.getElementById('highMape').textContent = metrics.high_metrics.mape.toFixed(2) + '%';
        document.getElementById('highAccuracy5').textContent = metrics.high_metrics.accuracy_5pct + '%';
        document.getElementById('highAccuracy10').textContent = metrics.high_metrics.accuracy_10pct + '%';

        // Low metrics
        document.getElementById('lowMape').textContent = metrics.low_metrics.mape.toFixed(2) + '%';
        document.getElementById('lowAccuracy5').textContent = metrics.low_metrics.accuracy_5pct + '%';
        document.getElementById('lowAccuracy10').textContent = metrics.low_metrics.accuracy_10pct + '%';

        // Close metrics
        document.getElementById('closeMape').textContent = metrics.close_metrics.mape.toFixed(2) + '%';
        document.getElementById('closeAccuracy5').textContent = metrics.close_metrics.accuracy_5pct + '%';
        document.getElementById('closeAccuracy10').textContent = metrics.close_metrics.accuracy_10pct + '%';
    }

    populateDetails(data) {
        const metadata = data.data.metadata;
        const analysis = data.data.ohlcv_analysis;

        // Prediction parameters
        document.getElementById('lookbackDays').textContent = metadata.lookback_days;
        document.getElementById('predictionDays').textContent = metadata.prediction_days;
        document.getElementById('mcSimulations').textContent = data.data.predicted_ohlcv.monte_carlo_simulations.length;
        document.getElementById('predictionStart').textContent = metadata.prediction_start;

        // Price analysis
        const priceRange = data.data.historical_ohlcv.summary.price_range;
        document.getElementById('lastClose').textContent = priceRange.last_close.toFixed(2);
        document.getElementById('priceMin').textContent = priceRange.min.toFixed(2);
        document.getElementById('priceMax').textContent = priceRange.max.toFixed(2);
        document.getElementById('supportLevel').textContent = analysis.price_levels.support_level.toFixed(2);
        document.getElementById('resistanceLevel').textContent = analysis.price_levels.resistance_level.toFixed(2);
    }

    createChart(data) {
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = document.getElementById('ohlcChart').getContext('2d');
        const datasets = [];

        // Create proper candlestick visualization
        const historicalData = data.chart_data.historical_candlesticks;

        // Separate bullish and bearish candles for different colors
        const bullishCandles = [];
        const bearishCandles = [];
        const bullishWicks = [];
        const bearishWicks = [];

        historicalData.forEach(item => {
            const isBullish = item.close >= item.open;

            // Add to appropriate arrays
            if (isBullish) {
                bullishCandles.push([
                    { x: item.date, y: item.open },
                    { x: item.date, y: item.close },
                    { x: item.date, y: null }
                ]);
                bullishWicks.push([
                    { x: item.date, y: item.low },
                    { x: item.date, y: item.high },
                    { x: item.date, y: null }
                ]);
            } else {
                bearishCandles.push([
                    { x: item.date, y: item.open },
                    { x: item.date, y: item.close },
                    { x: item.date, y: null }
                ]);
                bearishWicks.push([
                    { x: item.date, y: item.low },
                    { x: item.date, y: item.high },
                    { x: item.date, y: null }
                ]);
            }
        });

        // Historical bullish candlesticks (green)
        if (bullishCandles.length > 0) {
            datasets.push({
                label: 'Historical Bullish',
                data: bullishCandles.flat(),
                borderColor: '#26A69A',
                backgroundColor: 'transparent',
                type: 'line',
                pointRadius: 0,
                borderWidth: 4,
                spanGaps: false,
                order: 1
            });

            datasets.push({
                label: '',
                data: bullishWicks.flat(),
                borderColor: '#26A69A',
                backgroundColor: 'transparent',
                type: 'line',
                pointRadius: 0,
                borderWidth: 1,
                spanGaps: false,
                order: 2
            });
        }

        // Historical bearish candlesticks (red)
        if (bearishCandles.length > 0) {
            datasets.push({
                label: 'Historical Bearish',
                data: bearishCandles.flat(),
                borderColor: '#EF5350',
                backgroundColor: 'transparent',
                type: 'line',
                pointRadius: 0,
                borderWidth: 4,
                spanGaps: false,
                order: 1
            });

            datasets.push({
                label: '',
                data: bearishWicks.flat(),
                borderColor: '#EF5350',
                backgroundColor: 'transparent',
                type: 'line',
                pointRadius: 0,
                borderWidth: 1,
                spanGaps: false,
                order: 2
            });
        }

        // Actual candlesticks (if available and enabled)
        if (document.getElementById('showActualData').checked && data.chart_data.actual_candlesticks.length > 0) {
            const actualData = data.chart_data.actual_candlesticks;

            const actualBullishCandles = [];
            const actualBearishCandles = [];
            const actualBullishWicks = [];
            const actualBearishWicks = [];

            actualData.forEach(item => {
                const isBullish = item.close >= item.open;

                if (isBullish) {
                    actualBullishCandles.push([
                        { x: item.date, y: item.open },
                        { x: item.date, y: item.close },
                        { x: item.date, y: null }
                    ]);
                    actualBullishWicks.push([
                        { x: item.date, y: item.low },
                        { x: item.date, y: item.high },
                        { x: item.date, y: null }
                    ]);
                } else {
                    actualBearishCandles.push([
                        { x: item.date, y: item.open },
                        { x: item.date, y: item.close },
                        { x: item.date, y: null }
                    ]);
                    actualBearishWicks.push([
                        { x: item.date, y: item.low },
                        { x: item.date, y: item.high },
                        { x: item.date, y: null }
                    ]);
                }
            });

            // Actual bullish candlesticks
            if (actualBullishCandles.length > 0) {
                datasets.push({
                    label: 'Actual Bullish',
                    data: actualBullishCandles.flat(),
                    borderColor: '#4CAF50',
                    backgroundColor: 'transparent',
                    type: 'line',
                    pointRadius: 0,
                    borderWidth: 5,
                    spanGaps: false,
                    order: 3
                });

                datasets.push({
                    label: '',
                    data: actualBullishWicks.flat(),
                    borderColor: '#4CAF50',
                    backgroundColor: 'transparent',
                    type: 'line',
                    pointRadius: 0,
                    borderWidth: 1,
                    spanGaps: false,
                    order: 4
                });
            }

            // Actual bearish candlesticks
            if (actualBearishCandles.length > 0) {
                datasets.push({
                    label: 'Actual Bearish',
                    data: actualBearishCandles.flat(),
                    borderColor: '#F44336',
                    backgroundColor: 'transparent',
                    type: 'line',
                    pointRadius: 0,
                    borderWidth: 5,
                    spanGaps: false,
                    order: 3
                });

                datasets.push({
                    label: '',
                    data: actualBearishWicks.flat(),
                    borderColor: '#F44336',
                    backgroundColor: 'transparent',
                    type: 'line',
                    pointRadius: 0,
                    borderWidth: 1,
                    spanGaps: false,
                    order: 4
                });
            }
        }

        // Prediction bands (if enabled)
        if (document.getElementById('showPredictionBands').checked) {
            const predictionSummary = data.chart_data.predicted_ohlcv_summary;
            const predictionDates = data.data.predicted_ohlcv.dates;

            // Mean prediction line
            const meanData = predictionDates.map((date, i) => ({
                x: date,
                y: predictionSummary.close[i].mean
            }));

            datasets.push({
                label: 'Prediction Mean',
                data: meanData,
                borderColor: '#FF9800',
                backgroundColor: 'transparent',
                borderWidth: 3,
                type: 'line',
                pointRadius: 6,
                pointBackgroundColor: '#FF9800',
                borderDash: [5, 5],
                order: 6
            });

            // 25th-75th percentile band
            const p25Data = predictionDates.map((date, i) => ({
                x: date,
                y: predictionSummary.close[i].p25
            }));

            const p75Data = predictionDates.map((date, i) => ({
                x: date,
                y: predictionSummary.close[i].p75
            }));

            datasets.push({
                label: '25th-75th Percentile',
                data: p25Data,
                borderColor: 'rgba(255, 193, 7, 0.8)',
                backgroundColor: 'rgba(255, 193, 7, 0.3)',
                fill: '+1',
                type: 'line',
                pointRadius: 0,
                order: 8
            });

            datasets.push({
                label: '',
                data: p75Data,
                borderColor: 'rgba(255, 193, 7, 0.8)',
                backgroundColor: 'rgba(255, 193, 7, 0.3)',
                type: 'line',
                pointRadius: 0,
                order: 8
            });

            // 10th-90th percentile band
            const p10Data = predictionDates.map((date, i) => ({
                x: date,
                y: predictionSummary.close[i].p10
            }));

            const p90Data = predictionDates.map((date, i) => ({
                x: date,
                y: predictionSummary.close[i].p90
            }));

            datasets.push({
                label: '10th-90th Percentile',
                data: p10Data,
                borderColor: 'rgba(255, 152, 0, 0.6)',
                backgroundColor: 'rgba(255, 152, 0, 0.15)',
                fill: '+1',
                type: 'line',
                pointRadius: 0,
                order: 9
            });

            datasets.push({
                label: '',
                data: p90Data,
                borderColor: 'rgba(255, 152, 0, 0.6)',
                backgroundColor: 'rgba(255, 152, 0, 0.15)',
                type: 'line',
                pointRadius: 0,
                order: 9
            });
        }

        // Monte Carlo simulations (if enabled)
        if (document.getElementById('showMonteCarloSims').checked) {
            data.chart_data.monte_carlo_simulations.forEach((simulation, index) => {
                const simData = simulation.map(item => ({
                    x: item.date,
                    y: item.close
                }));

                datasets.push({
                    label: index === 0 ? 'Monte Carlo Simulations' : '',
                    data: simData,
                    borderColor: `rgba(156, 39, 176, ${0.4 + (index * 0.03)})`,
                    backgroundColor: 'transparent',
                    type: 'line',
                    pointRadius: 0,
                    borderWidth: 1,
                    order: 10
                });
            });
        }

        this.chart = new Chart(ctx, {
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM dd'
                            },
                            tooltipFormat: 'MMM dd, yyyy'
                        },
                        title: {
                            display: true,
                            text: 'Date',
                            color: '#666',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price ($)',
                            color: '#666',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            },
                            filter: function(item) {
                                return item.text !== '';
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#666',
                        borderWidth: 1,
                        callbacks: {
                            title: function(context) {
                                if (context[0]) {
                                    return new Date(context[0].parsed.x).toLocaleDateString();
                                }
                                return '';
                            },
                            label: function(context) {
                                const dataset = context.dataset;
                                const value = context.parsed.y;

                                if (value !== null) {
                                    return `${dataset.label}: $${value.toFixed(2)}`;
                                }
                                return '';
                            },
                            afterBody: function(context) {
                                // Add OHLCV data for historical dates
                                const date = context[0]?.parsed?.x;
                                if (!date) return [];

                                const dateStr = new Date(date).toISOString().split('T')[0];

                                // Find historical data for this date
                                const historical = data.chart_data.historical_candlesticks.find(item => item.date === dateStr);
                                if (historical) {
                                    return [
                                        '',
                                        `📊 OHLCV Data:`,
                                        `Open: $${historical.open.toFixed(2)}`,
                                        `High: $${historical.high.toFixed(2)}`,
                                        `Low: $${historical.low.toFixed(2)}`,
                                        `Close: $${historical.close.toFixed(2)}`,
                                        `Volume: ${historical.volume.toLocaleString()}`
                                    ];
                                }

                                // Find actual data for this date
                                const actual = data.chart_data.actual_candlesticks.find(item => item.date === dateStr);
                                if (actual) {
                                    return [
                                        '',
                                        `📈 Actual OHLCV:`,
                                        `Open: $${actual.open.toFixed(2)}`,
                                        `High: $${actual.high.toFixed(2)}`,
                                        `Low: $${actual.low.toFixed(2)}`,
                                        `Close: $${actual.close.toFixed(2)}`,
                                        `Volume: ${actual.volume.toLocaleString()}`
                                    ];
                                }

                                return [];
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }

    updateChart() {
        if (this.currentData) {
            this.createChart(this.currentData);
        }
    }
}

// Global function for clickable ticker tags
function searchTicker(ticker) {
    document.getElementById('tickerSearch').value = ticker;
    window.dashboard.searchTicker(ticker);
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new OHLCVDashboard();
});