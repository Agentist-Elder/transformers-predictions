class OHLCVDashboard {
    constructor() {
        this.currentData = null;
        this.chart = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const searchInput = document.getElementById('tickerSearch');
        const searchBtn = document.getElementById('searchBtn');

        // Search on button click
        searchBtn.addEventListener('click', () => {
            this.searchTicker();
        });

        // Search on Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchTicker();
            }
        });

        // Chart control listeners
        document.getElementById('showPredictionBands').addEventListener('change', () => {
            this.updateChart();
        });

        document.getElementById('showMonteCarloSims').addEventListener('change', () => {
            this.updateChart();
        });

        document.getElementById('showActualData').addEventListener('change', () => {
            this.updateChart();
        });
    }

    async searchTicker() {
        const ticker = document.getElementById('tickerSearch').value.trim().toUpperCase();

        if (!ticker) {
            this.showError('Please enter a ticker symbol');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/ticker/${ticker}`);

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
            this.showError('Failed to fetch ticker data. Please try again.');
        }
    }

    showLoading() {
        document.getElementById('loadingIndicator').classList.remove('hidden');
        document.getElementById('dashboardContent').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorMessage').classList.remove('hidden');
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('dashboardContent').classList.add('hidden');
    }

    displayDashboard(data) {
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
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

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new OHLCVDashboard();
});