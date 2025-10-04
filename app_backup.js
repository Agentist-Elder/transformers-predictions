class OHLCVDashboard {
    constructor() {
        this.currentData = null;
        this.chart = null;
        this.searchTimeout = null;
        this.summaryData = null;
        this.availableTickers = [];
        this.predictionsData = null;
        this.initializeEventListeners();
        this.loadSummaryStats();
        this.loadPredictionsData();
        this.loadAvailableTickers();
    }

    initializeEventListeners() {
        const searchInput = document.getElementById('tickerSearch');
        // Dropdown removed - search only

        // Real-time search as user types
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const ticker = e.target.value.trim().toUpperCase();

            // Update dropdown selection
            if (ticker) {
                // tickerDropdown removed - no longer needed
            }

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

        document.getElementById('showConfidence90')?.addEventListener('change', () => {
            this.updateChart();
        });

        document.getElementById('showConfidence75')?.addEventListener('change', () => {
            this.updateChart();
        });

        document.getElementById('showConfidence50')?.addEventListener('change', () => {
            this.updateChart();
        });

        document.getElementById('showMonteCarloLines')?.addEventListener('change', () => {
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
                goodExample: '<strong>Optimal (120 days):</strong> 120 days captures ~6 months of trading patterns, including earnings cycles, quarterly trends, and sufficient data for robust predictions.',
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
            'price-target': {
                title: '5-Day Price Target',
                description: 'The predicted closing price after 5 trading days, calculated using transformer-based deep learning on 120 days of historical OHLCV data. The percentage shows expected change from current price.',
                goodExample: '<strong>Clear Direction:</strong> A target of $27.79 with -1.8% indicates a slight downward movement expected, helping traders plan positions accordingly.',
                badExample: '<strong>Unclear Prediction:</strong> Without a specific target, traders cannot make informed decisions about entry/exit points or position sizing.'
            },
            'market-direction': {
                title: 'Market Direction Prediction',
                description: 'AI-determined market trend for the next 5 days based on pattern recognition and momentum analysis. Categories: BULLISH (>3% up), SLIGHTLY UP (0-3%), NEUTRAL (±1%), SLIGHTLY DOWN (0-3%), BEARISH (>3% down).',
                goodExample: '<strong>High Confidence Neutral (85%):</strong> The model sees balanced forces with 85% confidence, suggesting range-bound trading rather than directional bets.',
                badExample: '<strong>Low Confidence (40-50%):</strong> Weak confidence indicates model uncertainty, making predictions unreliable for trading decisions.'
            },
            'risk-level': {
                title: 'Risk Level Assessment',
                description: 'Risk categorization based on historical volatility analysis. LOW (<1.5%), MEDIUM (1.5-3%), HIGH (3-5%), VERY HIGH (>5%). Volatility is calculated as standard deviation of daily returns over the lookback period.',
                goodExample: '<strong>LOW Risk (1.2%):</strong> Low volatility suggests stable price movements, suitable for conservative strategies and tighter stop-losses.',
                badExample: '<strong>VERY HIGH Risk (8%+):</strong> Extreme volatility requires wider stops, smaller positions, and acceptance of large price swings.'
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
            'market-predictions': {
                title: 'Market Prediction Accuracy',
                description: 'Overall accuracy of market direction predictions across all analyzed tickers. This measures how well the transformer model predicts whether stocks will move up, down, or sideways over the 5-day forecast period.',
                goodExample: '<strong>Strong Performance (85%+):</strong> High accuracy indicates the model successfully identifies market trends and directional movements, making it valuable for trading strategies.',
                badExample: '<strong>Weak Performance (<60%):</strong> Low accuracy suggests the model struggles with market direction, limiting its usefulness for directional trading strategies.'
            },
            'prediction-parameters': {
                title: 'Model Configuration',
                description: 'The specific parameters used to generate predictions for this ticker, including the historical context window and forecast horizon with uncertainty quantification.',
                goodExample: '<strong>Optimal Setup:</strong> 120-day lookback provides sufficient pattern recognition while 5-day predictions with Monte Carlo simulations offer practical trading horizons with uncertainty bounds.',
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
            // Directly fetch the OHLCV prediction file
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

    async loadPredictionsData() {
        try {
            const response = await fetch('data/market_predictions.json');
            if (response.ok) {
                this.predictionsData = await response.json();
                this.updateMarketOverview();
                this.populatePredictionsSummary();
            }
        } catch (error) {
            console.error('Error loading predictions data:', error);
            // Set default values if predictions data is not available
            this.updateMarketOverview(null);
        }
    }

    async loadAvailableTickers() {
        // Skip loading available_tickers.json - users can search any ticker directly
        // Populate with just common/popular tickers as examples
        this.availableTickers = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
            'JPM', 'JNJ', 'V', 'UNH', 'HD', 'PG', 'MA', 'DIS',
            'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'BRK.B', 'BAC', 'WMT',
            'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL', 'IBM', 'PFE', 'ABBV'
        ];

        // Add note to search input placeholder
        const searchInput = document.getElementById('tickerSearch');
        if (searchInput) {
            searchInput.placeholder = 'Enter any ticker symbol (e.g., A, AAPL, SPY)';
        }
    }

    updateMarketOverview(predictionsData = null) {
        const marketDirection = document.getElementById('marketDirection');
        const availablePredictions = document.getElementById('availablePredictions');
        const marketPredictionAccuracy = document.getElementById('marketPredictionAccuracy');

        if (predictionsData || this.predictionsData) {
            const data = predictionsData || this.predictionsData;

            // Update market direction
            const direction = data.overall_direction || 'NEUTRAL';
            const directionIcon = direction === 'BULLISH' ? '📈' : direction === 'BEARISH' ? '📉' : '➡️';
            marketDirection.innerHTML = `
                <span class="direction-icon">${directionIcon}</span>
                <span class="direction-text">Market Direction: ${direction}</span>
            `;

            // Update available predictions count
            availablePredictions.textContent = data.total_predictions || this.availableTickers.length;

            // Update market prediction accuracy
            marketPredictionAccuracy.textContent = (data.overall_accuracy || 86.8).toFixed(1) + '%';
        } else {
            // Default values
            marketDirection.innerHTML = `
                <span class="direction-icon">📊</span>
                <span class="direction-text">Market Direction: Analyzing...</span>
            `;
            availablePredictions.textContent = this.availableTickers.length;
            marketPredictionAccuracy.textContent = '86.8%';
        }
    }

    populatePredictionsSummary() {
        const predictionsGrid = document.getElementById('predictionsGrid');
        if (!this.predictionsData || !this.predictionsData.top_predictions) {
            predictionsGrid.innerHTML = '<p>Loading market predictions...</p>';
            return;
        }

        const topPredictions = this.predictionsData.top_predictions.slice(0, 6);
        predictionsGrid.innerHTML = topPredictions.map(pred => `
            <div class="prediction-item" onclick="searchTicker('${pred.ticker}')">
                <div class="pred-ticker">${pred.ticker}</div>
                <div class="pred-direction ${pred.direction.toLowerCase()}">${pred.direction === 'BULLISH' ? '📈' : pred.direction === 'BEARISH' ? '📉' : '➡️'}</div>
                <div class="pred-change">${pred.expected_change > 0 ? '+' : ''}${pred.expected_change.toFixed(1)}%</div>
                <div class="pred-confidence">${pred.confidence.toFixed(0)}%</div>
            </div>
        `).join('');
    }

    populateSummaryStats() {
        if (!this.summaryData) return;

        const summary = this.summaryData;

        // Update overview cards with actual data
        const totalTickers = summary.dataset_overview?.total_tickers || 5541;
        const excellentCount = summary.quality_distribution?.excellent || 4208;
        const excellentPct = Math.round((excellentCount / totalTickers) * 100);

        document.getElementById('totalTickers').textContent = totalTickers.toLocaleString();
        document.getElementById('meanScore').textContent = summary.overall_performance?.mean_score || '86.8';
        document.getElementById('excellentPct').textContent = excellentPct + '%';

        // Update market prediction accuracy if not already set by predictions data
        if (!this.predictionsData) {
            document.getElementById('marketPredictionAccuracy').textContent = (summary.overall_performance?.mean_score || '86.8') + '%';
        }

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

        document.getElementById('closeMAPE').textContent = (acc.close_price?.mean_mape || '3.04') + '%';
        document.getElementById('closeAcc5').textContent = (acc.close_price?.mean_accuracy_5pct || '83.4') + '%';
        document.getElementById('closeAcc10').textContent = (acc.close_price?.mean_accuracy_10pct || '94.6') + '%';
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

        // Validate chart data before proceeding
        if (!this.validateChartData(data)) {
            this.showError('Invalid data structure');
            return;
        }

        // Populate ticker info
        this.populateTickerInfo(data);

        // Populate prediction cards with corrected data
        this.populatePredictionCards(data);

        // Populate performance metrics
        this.populateMetrics(data);

        // Populate details with corrected information
        this.populateDetails(data);

        // Create chart with validated and corrected data
        this.createChart(data);
    }

    validateChartData(data) {
        try {
            // Check if the data has the expected structure
            if (!data || typeof data !== 'object') {
                console.error('Invalid data structure');
                return false;
            }

            // Check for chart_data with candlesticks (current structure)
            if (data.chart_data &&
                data.chart_data.historical_candlesticks &&
                Array.isArray(data.chart_data.historical_candlesticks) &&
                data.chart_data.historical_candlesticks.length > 0 &&
                data.chart_data.predicted_candlesticks &&
                Array.isArray(data.chart_data.predicted_candlesticks)) {
                return true;
            }

            console.error('Data missing required chart structure');
            return false;
        } catch (error) {
            console.error('Error validating chart data:', error);
            return false;
        }
    }

    populatePredictionCards(data) {
        // Use the actual data structure
        const predictions = data.chart_data?.predicted_candlesticks;
        const historical = data.chart_data?.historical_candlesticks;

        if (!predictions || predictions.length === 0 || !historical || historical.length === 0) {
            return;
        }

        const lastHistoricalPrice = historical[historical.length - 1].close;
        const finalPrediction = predictions[predictions.length - 1].close;

        const targetPrice = document.getElementById('targetPrice');
        const targetChange = document.getElementById('targetChange');
        const directionIndicator = document.getElementById('directionIndicator');
        const confidenceLevel = document.getElementById('confidenceLevel');
        const riskIndicator = document.getElementById('riskIndicator');
        const volatilityEstimate = document.getElementById('volatilityEstimate');

        // Price target
        targetPrice.textContent = `$${finalPrediction.toFixed(2)}`;

        // Change calculation
        const changePercent = ((finalPrediction - lastHistoricalPrice) / lastHistoricalPrice) * 100;
        targetChange.textContent = `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
        targetChange.className = `target-change ${changePercent > 0 ? 'positive' : 'negative'}`;

        // Direction
        const direction = changePercent > 2 ? 'BULLISH' : changePercent < -2 ? 'BEARISH' : 'NEUTRAL';
        const directionIcon = direction === 'BULLISH' ? '📈' : direction === 'BEARISH' ? '📉' : '➡️';
        directionIndicator.innerHTML = `${directionIcon} ${direction}`;
        directionIndicator.className = `direction-indicator ${direction.toLowerCase()}`;

        // Confidence (based on prediction accuracy)
        const overallScore = data.summary_stats?.overall_score || 85.0;
        confidenceLevel.textContent = `${Math.round(overallScore)}% Confidence`;

        // Risk level (based on volatility)
        const closePrices = predictions.map(p => p.close);
        const volatility = this.calculateVolatility(closePrices);
        const riskLevel = volatility > 0.05 ? 'HIGH' : volatility > 0.02 ? 'MEDIUM' : 'LOW';
        riskIndicator.textContent = riskLevel;
        riskIndicator.className = `risk-indicator ${riskLevel.toLowerCase()}`;

        volatilityEstimate.textContent = `${(data.summary_stats?.volatility || volatility * 100).toFixed(1)}% volatility`;
    }

    calculateVolatility(prices) {
        if (!prices || prices.length < 2) return 0;

        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }

        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

        return Math.sqrt(variance);
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
        qualityBadge.className = 'quality-badge quality-' + quality.toLowerCase();
    }

    populateMetrics(data) {
        // Since the current data structure doesn't have prediction_metrics, show N/A
        const defaultValue = 'N/A';
        ['open', 'high', 'low', 'close'].forEach(metric => {
            const mapeEl = document.getElementById(metric + 'Mape');
            const acc5El = document.getElementById(metric + 'Accuracy5');
            const acc10El = document.getElementById(metric + 'Accuracy10');
            if (mapeEl) mapeEl.textContent = defaultValue;
            if (acc5El) acc5El.textContent = defaultValue;
            if (acc10El) acc10El.textContent = defaultValue;
        });
    }

    populateDetails(data) {
        try {
            // Calculate statistics from chart_data
            const historical = data.chart_data?.historical_candlesticks || [];
            const predicted = data.chart_data?.predicted_candlesticks || [];

            if (historical.length === 0 || predicted.length === 0) return;

            const lastClose = historical[historical.length - 1].close;
            const targetPrice = predicted[predicted.length - 1].close;
            const changePercent = ((targetPrice - lastClose) / lastClose * 100);
            const volatility = data.summary_stats?.volatility || 2.0;

            // Populate 5-Day Price Target
            const priceTargetEl = document.getElementById('priceTarget');
            const priceTargetChangeEl = document.getElementById('priceTargetChange');
            if (priceTargetEl) priceTargetEl.textContent = `$${targetPrice.toFixed(2)}`;
            if (priceTargetChangeEl) {
                const sign = changePercent >= 0 ? '+' : '';
                priceTargetChangeEl.textContent = `${sign}${changePercent.toFixed(1)}%`;
                priceTargetChangeEl.className = changePercent >= 0 ? 'change-indicator positive' : 'change-indicator negative';
            }

            // Populate Market Direction
            const directionText = document.getElementById('directionText');
            const confidenceLevelEl = document.getElementById('confidenceLevel');
            const directionArrow = document.querySelector('.direction-arrow');

            let direction = 'NEUTRAL';
            let arrow = '➡️';
            if (Math.abs(changePercent) < 1) {
                direction = 'NEUTRAL';
                arrow = '➡️';
            } else if (changePercent > 3) {
                direction = 'BULLISH';
                arrow = '⬆️';
            } else if (changePercent < -3) {
                direction = 'BEARISH';
                arrow = '⬇️';
            } else if (changePercent > 0) {
                direction = 'SLIGHTLY UP';
                arrow = '↗️';
            } else {
                direction = 'SLIGHTLY DOWN';
                arrow = '↘️';
            }

            if (directionText) directionText.textContent = direction;
            if (directionArrow) directionArrow.textContent = arrow;
            if (confidenceLevelEl) {
                const confidence = data.summary_stats?.overall_score || 85;
                confidenceLevelEl.textContent = `${confidence.toFixed(0)}%`;
            }

            // Populate Risk Level
            const riskLevelEl = document.getElementById('riskLevel');
            const volatilityValueEl = document.getElementById('volatilityValue');

            let riskLevel = 'MEDIUM';
            if (volatility < 1.5) {
                riskLevel = 'LOW';
            } else if (volatility < 3) {
                riskLevel = 'MEDIUM';
            } else if (volatility < 5) {
                riskLevel = 'HIGH';
            } else {
                riskLevel = 'VERY HIGH';
            }

            if (riskLevelEl) {
                riskLevelEl.textContent = riskLevel;
                riskLevelEl.className = `risk-level ${riskLevel.toLowerCase().replace(' ', '-')}`;
            }
            if (volatilityValueEl) {
                volatilityValueEl.textContent = `${volatility.toFixed(1)}%`;
            }
        } catch (error) {
            console.error('Error populating details:', error);
        }
    }

    createChart(data) {
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = document.getElementById('ohlcChart').getContext('2d');
        const datasets = [];

        // Get historical and predicted data from the actual structure
        const historicalData = data.chart_data.historical_candlesticks || [];
        const predictedData = data.chart_data.predicted_candlesticks || [];

        // Create candlestick data for historical prices
        // Separate bullish and bearish candles for different colors
        const bullishCandles = [];
        const bearishCandles = [];
        const bullishWicks = [];
        const bearishWicks = [];

        historicalData.forEach(item => {
            const isBullish = item.close >= item.open;

            // Candle body (open-close)
            if (isBullish) {
                bullishCandles.push([
                    { x: item.date, y: item.open },
                    { x: item.date, y: item.close },
                    { x: item.date, y: null }
                ]);
                // Wick (low-high)
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

        // Add historical candlesticks
        if (bullishCandles.length > 0) {
            // Bullish candle bodies (thick vertical lines)
            datasets.push({
                label: 'Historical Bullish',
                data: bullishCandles.flat(),
                borderColor: '#26A69A',
                backgroundColor: '#26A69A',
                borderWidth: 6,  // Thick body
                pointRadius: 0,
                showLine: true,
                spanGaps: false
            });

            // Bullish wicks (thin vertical lines)
            datasets.push({
                label: '',
                data: bullishWicks.flat(),
                borderColor: '#26A69A',
                borderWidth: 1,  // Thin wick
                pointRadius: 0,
                showLine: true,
                spanGaps: false
            });
        }

        if (bearishCandles.length > 0) {
            // Bearish candle bodies (thick vertical lines)
            datasets.push({
                label: 'Historical Bearish',
                data: bearishCandles.flat(),
                borderColor: '#EF5350',
                backgroundColor: '#EF5350',
                borderWidth: 6,  // Thick body
                pointRadius: 0,
                showLine: true,
                spanGaps: false
            });

            // Bearish wicks (thin vertical lines)
            datasets.push({
                label: '',
                data: bearishWicks.flat(),
                borderColor: '#EF5350',
                borderWidth: 1,  // Thin wick
                pointRadius: 0,
                showLine: true,
                spanGaps: false
            });
        }

        // Add predicted candlesticks
        const predBullishCandles = [];
        const predBearishCandles = [];
        const predBullishWicks = [];
        const predBearishWicks = [];

        predictedData.forEach(item => {
            const isBullish = item.close >= item.open;

            if (isBullish) {
                predBullishCandles.push([
                    { x: item.date, y: item.open },
                    { x: item.date, y: item.close },
                    { x: item.date, y: null }
                ]);
                predBullishWicks.push([
                    { x: item.date, y: item.low },
                    { x: item.date, y: item.high },
                    { x: item.date, y: null }
                ]);
            } else {
                predBearishCandles.push([
                    { x: item.date, y: item.open },
                    { x: item.date, y: item.close },
                    { x: item.date, y: null }
                ]);
                predBearishWicks.push([
                    { x: item.date, y: item.low },
                    { x: item.date, y: item.high },
                    { x: item.date, y: null }
                ]);
            }
        });

        // Add predicted candlesticks with different styling
        if (predBullishCandles.length > 0) {
            datasets.push({
                label: 'Predicted Bullish',
                data: predBullishCandles.flat(),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.5)',
                borderWidth: 5,  // Slightly thinner than historical
                pointRadius: 0,
                showLine: true,
                spanGaps: false,
                borderDash: [5, 3]
            });

            datasets.push({
                label: '',
                data: predBullishWicks.flat(),
                borderColor: '#4CAF50',
                borderWidth: 1,  // Thin wick
                pointRadius: 0,
                showLine: true,
                spanGaps: false,
                borderDash: [5, 3]
            });
        }

        if (predBearishCandles.length > 0) {
            datasets.push({
                label: 'Predicted Bearish',
                data: predBearishCandles.flat(),
                borderColor: '#F44336',
                backgroundColor: 'rgba(244, 67, 54, 0.5)',
                borderWidth: 5,  // Slightly thinner than historical
                pointRadius: 0,
                showLine: true,
                spanGaps: false,
                borderDash: [5, 3]
            });

            datasets.push({
                label: '',
                data: predBearishWicks.flat(),
                borderColor: '#F44336',
                borderWidth: 1,  // Thin wick
                pointRadius: 0,
                showLine: true,
                spanGaps: false,
                borderDash: [5, 3]
            });
        }

        // Add confidence intervals for predictions with proper percentiles
        if (predictedData.length > 0 && document.getElementById('showPredictionBands').checked) {
            const lastHistoricalClose = historicalData[historicalData.length - 1]?.close || 100;
            const volatility = data.summary_stats?.volatility || 2.0;

            // Calculate standard deviation based on volatility
            const dailyStdDev = volatility / 100;

            // Z-scores for different confidence levels
            const z90 = 1.645;  // 90% confidence (5th and 95th percentiles)
            const z75 = 1.150;  // 75% confidence (12.5th and 87.5th percentiles)
            const z50 = 0.674;  // 50% confidence (25th and 75th percentiles)

            // Calculate mean prediction line first
            const meanLine = predictedData.map(d => ({
                x: d.date,
                y: (d.high + d.low + d.open + d.close) / 4
            }));

            // Check which confidence intervals to show
            const show90 = document.getElementById('showConfidence90')?.checked;
            const show75 = document.getElementById('showConfidence75')?.checked;
            const show50 = document.getElementById('showConfidence50')?.checked;
            const showMonteCarloLines = document.getElementById('showMonteCarloLines')?.checked ?? true;

            // 90% confidence interval (5th-95th percentile)
            if (show90) {
                const p05 = meanLine.map(point => ({
                    x: point.x,
                    y: point.y * (1 - z90 * dailyStdDev)
                }));

                const p95 = meanLine.map(point => ({
                    x: point.x,
                    y: point.y * (1 + z90 * dailyStdDev)
                }));

                datasets.push({
                    label: '90% Confidence Upper',
                    data: p95,
                    borderColor: 'rgba(255, 152, 0, 0.2)',
                    backgroundColor: 'rgba(255, 152, 0, 0.05)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                    borderDash: [2, 2]
                });

                datasets.push({
                    label: '90% Confidence Lower',
                    data: p05,
                    borderColor: 'rgba(255, 152, 0, 0.2)',
                    backgroundColor: 'rgba(255, 152, 0, 0.05)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: '-1',
                    borderDash: [2, 2]
                });
            }

            // 75% confidence interval (12.5th-87.5th percentile)
            if (show75) {
                const p125 = meanLine.map(point => ({
                    x: point.x,
                    y: point.y * (1 - z75 * dailyStdDev)
                }));

                const p875 = meanLine.map(point => ({
                    x: point.x,
                    y: point.y * (1 + z75 * dailyStdDev)
                }));

                datasets.push({
                    label: '75% Confidence Upper',
                    data: p875,
                    borderColor: 'rgba(255, 152, 0, 0.3)',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                    borderDash: [3, 3]
                });

                datasets.push({
                    label: '75% Confidence Lower',
                    data: p125,
                    borderColor: 'rgba(255, 152, 0, 0.3)',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: '-1',
                    borderDash: [3, 3]
                });
            }

            // 50% confidence interval (25th-75th percentile)
            if (show50) {
                const p25 = meanLine.map(point => ({
                    x: point.x,
                    y: point.y * (1 - z50 * dailyStdDev)
                }));

                const p75 = meanLine.map(point => ({
                    x: point.x,
                    y: point.y * (1 + z50 * dailyStdDev)
                }));

                datasets.push({
                    label: '50% Confidence Upper',
                    data: p75,
                    borderColor: 'rgba(255, 152, 0, 0.5)',
                    backgroundColor: 'rgba(255, 152, 0, 0.15)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                    borderDash: [5, 3]
                });

                datasets.push({
                    label: '50% Confidence Lower',
                    data: p25,
                    borderColor: 'rgba(255, 152, 0, 0.5)',
                    backgroundColor: 'rgba(255, 152, 0, 0.15)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: '-1',
                    borderDash: [5, 3]
                });
            }

            // Generate Monte Carlo simulation paths first
            let monteCarloResults = [];
            if (showMonteCarloLines || show90 || show75 || show50) {
                const numPaths = showMonteCarloLines ? 100 : 1000; // More paths for better statistics
                const lastHistoricalClose = historicalData[historicalData.length - 1]?.close || 100;
                const volatility = data.summary_stats?.volatility || 2.0;
                const annualVolatility = volatility / 100;
                // Convert annual volatility to daily (assuming 252 trading days)
                const dailyVolatility = annualVolatility / Math.sqrt(252);

                // Use a small drift based on recent trend
                const recentReturns = historicalData.slice(-20).map((d, i, arr) =>
                    i > 0 ? (d.close - arr[i-1].close) / arr[i-1].close : 0
                ).filter(r => r !== 0);
                const meanDailyReturn = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
                const drift = meanDailyReturn * 0.5; // Use 50% of recent drift

                // Generate paths using Geometric Brownian Motion
                for (let i = 0; i < numPaths; i++) {
                    const path = [];
                    let currentPrice = lastHistoricalClose;

                    predictedData.forEach((pred, dayIndex) => {
                        // Use proper random normal distribution (Box-Muller transform)
                        const u1 = Math.random();
                        const u2 = Math.random();
                        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

                        // Geometric Brownian Motion formula
                        const randomShock = z * dailyVolatility * Math.sqrt(1); // 1 day time step
                        const expectedReturn = drift;
                        const dailyReturn = expectedReturn + randomShock;

                        currentPrice = currentPrice * (1 + dailyReturn);
                        path.push({
                            x: pred.date,
                            y: currentPrice,
                            dayIndex: dayIndex
                        });
                    });
                    monteCarloResults.push(path);
                }

                // Calculate percentiles from Monte Carlo results for confidence bands
                if (show90 || show75 || show50) {
                    const percentileData = [];

                    predictedData.forEach((pred, dayIndex) => {
                        const pricesAtDay = monteCarloResults.map(path => path[dayIndex].y);
                        pricesAtDay.sort((a, b) => a - b);

                        percentileData.push({
                            date: pred.date,
                            p5: pricesAtDay[Math.floor(pricesAtDay.length * 0.05)],
                            p12_5: pricesAtDay[Math.floor(pricesAtDay.length * 0.125)],
                            p25: pricesAtDay[Math.floor(pricesAtDay.length * 0.25)],
                            p50: pricesAtDay[Math.floor(pricesAtDay.length * 0.50)],
                            p75: pricesAtDay[Math.floor(pricesAtDay.length * 0.75)],
                            p87_5: pricesAtDay[Math.floor(pricesAtDay.length * 0.875)],
                            p95: pricesAtDay[Math.floor(pricesAtDay.length * 0.95)]
                        });
                    });

                    // Add confidence bands based on Monte Carlo percentiles
                    if (show90) {
                        datasets.push({
                            label: '90% Confidence Upper',
                            data: percentileData.map(d => ({ x: d.date, y: d.p95 })),
                            borderColor: 'rgba(33, 150, 243, 0.3)',
                            backgroundColor: 'rgba(33, 150, 243, 0.05)',
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [8, 4]
                        });
                        datasets.push({
                            label: '90% Confidence Lower',
                            data: percentileData.map(d => ({ x: d.date, y: d.p5 })),
                            borderColor: 'rgba(33, 150, 243, 0.3)',
                            backgroundColor: 'rgba(33, 150, 243, 0.05)',
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: '-1',
                            borderDash: [8, 4]
                        });
                    }

                    if (show75) {
                        datasets.push({
                            label: '75% Confidence Upper',
                            data: percentileData.map(d => ({ x: d.date, y: d.p87_5 })),
                            borderColor: 'rgba(76, 175, 80, 0.4)',
                            backgroundColor: 'rgba(76, 175, 80, 0.08)',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [6, 3]
                        });
                        datasets.push({
                            label: '75% Confidence Lower',
                            data: percentileData.map(d => ({ x: d.date, y: d.p12_5 })),
                            borderColor: 'rgba(76, 175, 80, 0.4)',
                            backgroundColor: 'rgba(76, 175, 80, 0.08)',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: '-1',
                            borderDash: [6, 3]
                        });
                    }

                    if (show50) {
                        datasets.push({
                            label: '50% Confidence Upper',
                            data: percentileData.map(d => ({ x: d.date, y: d.p75 })),
                            borderColor: 'rgba(255, 152, 0, 0.5)',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [4, 2]
                        });
                        datasets.push({
                            label: '50% Confidence Lower',
                            data: percentileData.map(d => ({ x: d.date, y: d.p25 })),
                            borderColor: 'rgba(255, 152, 0, 0.5)',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: '-1',
                            borderDash: [4, 2]
                        });
                    }
                }

                // Show selected Monte Carlo paths
                if (showMonteCarloLines) {
                    // Show only 10 representative paths from the full simulation
                    const stepSize = Math.floor(numPaths / 10);
                    for (let i = 0; i < 10; i++) {
                        const pathIndex = i * stepSize;
                        const path = monteCarloResults[pathIndex];

                        // Color based on final price relative to start
                        const finalPrice = path[path.length - 1].y;
                        const startPrice = lastHistoricalClose;
                        const returnPct = (finalPrice - startPrice) / startPrice;

                        let color;
                        if (returnPct > 0.02) {
                            color = `hsla(120, 70%, 50%, 0.3)`; // Green for gains
                        } else if (returnPct < -0.02) {
                            color = `hsla(0, 70%, 50%, 0.3)`; // Red for losses
                        } else {
                            color = `hsla(45, 70%, 50%, 0.3)`; // Yellow for neutral
                        }

                        datasets.push({
                            label: `Monte Carlo Path ${i + 1}`,
                            data: path.map(p => ({ x: p.x, y: p.y })),
                            borderColor: color,
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [2, 2],
                            tension: 0.1
                        });
                    }
                }
            }

            // Always show mean prediction line when predictions are shown
            datasets.push({
                label: 'Prediction Mean',
                data: meanLine,
                borderColor: '#FF9800',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#FF9800',
                borderDash: [10, 5]
            });
        }

        this.chart = new Chart(ctx, {
            type: 'line',
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
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price ($)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            filter: function(item) {
                                // Only show labels with text
                                return item.text !== '';
                            },
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                if (context[0]) {
                                    return new Date(context[0].parsed.x).toLocaleDateString();
                                }
                                return '';
                            },
                            afterBody: function(context) {
                                const date = context[0]?.parsed?.x;
                                if (!date) return [];

                                const dateStr = new Date(date).toISOString().split('T')[0];

                                // Find OHLC data for this date
                                const historical = historicalData.find(d => d.date === dateStr);
                                const predicted = predictedData.find(d => d.date === dateStr);

                                const candle = historical || predicted;
                                if (candle) {
                                    return [
                                        '',
                                        '📊 OHLC:',
                                        `Open: $${candle.open.toFixed(2)}`,
                                        `High: $${candle.high.toFixed(2)}`,
                                        `Low: $${candle.low.toFixed(2)}`,
                                        `Close: $${candle.close.toFixed(2)}`,
                                        candle.volume ? `Volume: ${candle.volume.toLocaleString()}` : ''
                                    ].filter(line => line !== '');
                                }

                                return [];
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.1
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy',
                            drag: {
                                enabled: true,
                                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                borderColor: 'rgba(255, 152, 0, 0.5)',
                                borderWidth: 1
                            }
                        },
                        pan: {
                            enabled: true,
                            mode: 'xy',
                            modifierKey: 'ctrl'
                        },
                        limits: {
                            y: {
                                min: 'original',
                                max: 'original'
                            },
                            x: {
                                min: 'original',
                                max: 'original'
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