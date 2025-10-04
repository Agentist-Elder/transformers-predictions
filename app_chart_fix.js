    createChart(data) {
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = document.getElementById('ohlcChart').getContext('2d');
        const datasets = [];

        // Get historical and predicted data from the actual structure
        const historicalData = data.chart_data.historical_candlesticks || [];
        const predictedData = data.chart_data.predicted_candlesticks || [];

        // Show historical candlestick data
        if (historicalData.length > 0 && document.getElementById('showActualData').checked) {
            // Separate bullish and bearish candles
            const bullishCandles = [];
            const bearishCandles = [];

            historicalData.forEach(candle => {
                const isBullish = candle.close >= candle.open;

                // Body (thick line)
                const bodyLine = [
                    { x: candle.date, y: candle.open },
                    { x: candle.date, y: candle.close }
                ];

                // Upper wick (thin line)
                const upperWick = [
                    { x: candle.date, y: Math.max(candle.open, candle.close) },
                    { x: candle.date, y: candle.high }
                ];

                // Lower wick (thin line)
                const lowerWick = [
                    { x: candle.date, y: candle.low },
                    { x: candle.date, y: Math.min(candle.open, candle.close) }
                ];

                if (isBullish) {
                    bullishCandles.push(bodyLine, upperWick, lowerWick, null);
                } else {
                    bearishCandles.push(bodyLine, upperWick, lowerWick, null);
                }
            });

            // Add bullish candles (bodies)
            if (bullishCandles.length > 0) {
                datasets.push({
                    label: 'Historical Bullish',
                    data: bullishCandles.flat(),
                    borderColor: '#26A69A',
                    borderWidth: 6,  // Thick for body
                    backgroundColor: 'rgba(38, 166, 154, 0.1)',
                    showLine: true,
                    pointRadius: 0,
                    fill: false,
                    segment: {
                        borderWidth: (ctx) => {
                            const index = ctx.p0DataIndex;
                            // Every 4th segment starts a new candle
                            // 0: body, 1: upper wick, 2: lower wick, 3: null
                            const segmentType = index % 4;
                            return segmentType === 0 ? 6 : 1;
                        }
                    },
                    spanGaps: false
                });
            }

            // Add bearish candles (bodies)
            if (bearishCandles.length > 0) {
                datasets.push({
                    label: 'Historical Bearish',
                    data: bearishCandles.flat(),
                    borderColor: '#EF5350',
                    borderWidth: 6,  // Thick for body
                    backgroundColor: 'rgba(239, 83, 80, 0.1)',
                    showLine: true,
                    pointRadius: 0,
                    fill: false,
                    segment: {
                        borderWidth: (ctx) => {
                            const index = ctx.p0DataIndex;
                            const segmentType = index % 4;
                            return segmentType === 0 ? 6 : 1;
                        }
                    },
                    spanGaps: false
                });
            }
        }

        // Show predicted candlestick data
        if (predictedData.length > 0 && document.getElementById('showPredictionBands').checked) {
            const predBullishCandles = [];
            const predBearishCandles = [];

            predictedData.forEach(candle => {
                const isBullish = candle.close >= candle.open;

                const bodyLine = [
                    { x: candle.date, y: candle.open },
                    { x: candle.date, y: candle.close }
                ];

                const upperWick = [
                    { x: candle.date, y: Math.max(candle.open, candle.close) },
                    { x: candle.date, y: candle.high }
                ];

                const lowerWick = [
                    { x: candle.date, y: candle.low },
                    { x: candle.date, y: Math.min(candle.open, candle.close) }
                ];

                if (isBullish) {
                    predBullishCandles.push(bodyLine, upperWick, lowerWick, null);
                } else {
                    predBearishCandles.push(bodyLine, upperWick, lowerWick, null);
                }
            });

            // Add predicted bullish candles
            if (predBullishCandles.length > 0) {
                datasets.push({
                    label: 'Predicted Bullish',
                    data: predBullishCandles.flat(),
                    borderColor: 'rgba(38, 166, 154, 0.6)',
                    borderWidth: 5,  // Slightly thinner than historical
                    backgroundColor: 'rgba(38, 166, 154, 0.05)',
                    showLine: true,
                    pointRadius: 0,
                    fill: false,
                    segment: {
                        borderWidth: (ctx) => {
                            const index = ctx.p0DataIndex;
                            const segmentType = index % 4;
                            return segmentType === 0 ? 5 : 1;
                        }
                    },
                    spanGaps: false,
                    borderDash: [5, 3]
                });
            }

            // Add predicted bearish candles
            if (predBearishCandles.length > 0) {
                datasets.push({
                    label: 'Predicted Bearish',
                    data: predBearishCandles.flat(),
                    borderColor: 'rgba(239, 83, 80, 0.6)',
                    borderWidth: 5,  // Slightly thinner than historical
                    backgroundColor: 'rgba(239, 83, 80, 0.05)',
                    showLine: true,
                    pointRadius: 0,
                    fill: false,
                    segment: {
                        borderWidth: (ctx) => {
                            const index = ctx.p0DataIndex;
                            const segmentType = index % 4;
                            return segmentType === 0 ? 5 : 1;
                        }
                    },
                    spanGaps: false,
                    borderDash: [5, 3]
                });
            }

            // Get toggle states for confidence intervals and Monte Carlo
            const show90 = document.getElementById('showConfidence90')?.checked;
            const show75 = document.getElementById('showConfidence75')?.checked;
            const show50 = document.getElementById('showConfidence50')?.checked;
            const showMonteCarloLines = document.getElementById('showMonteCarloLines')?.checked ?? true;

            // Generate Monte Carlo simulation paths
            if (showMonteCarloLines || show90 || show75 || show50) {
                const numPaths = 500; // Generate many paths for better statistics
                const lastHistoricalClose = historicalData[historicalData.length - 1]?.close || 100;
                const volatility = data.summary_stats?.volatility || 2.0;

                // Convert to daily volatility (assuming annual volatility)
                const annualVolatility = volatility / 100;
                const dailyVolatility = annualVolatility / Math.sqrt(252);

                // Calculate drift from recent trend
                const recentPrices = historicalData.slice(-20);
                let drift = 0;
                if (recentPrices.length > 1) {
                    const returns = [];
                    for (let i = 1; i < recentPrices.length; i++) {
                        returns.push((recentPrices[i].close - recentPrices[i-1].close) / recentPrices[i-1].close);
                    }
                    drift = returns.reduce((a, b) => a + b, 0) / returns.length;
                    drift = drift * 0.3; // Use only 30% of historical drift
                }

                // Generate all Monte Carlo paths
                const allPaths = [];
                for (let i = 0; i < numPaths; i++) {
                    const path = [];
                    let currentPrice = lastHistoricalClose;

                    predictedData.forEach((pred, dayIndex) => {
                        // Box-Muller transform for normal distribution
                        const u1 = Math.random();
                        const u2 = Math.random();
                        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

                        // Geometric Brownian Motion
                        const randomShock = z * dailyVolatility;
                        const dailyReturn = drift + randomShock;
                        currentPrice = currentPrice * (1 + dailyReturn);

                        path.push({
                            x: pred.date,
                            y: currentPrice,
                            dayIndex: dayIndex
                        });
                    });
                    allPaths.push(path);
                }

                // Calculate percentiles for confidence bands
                if (show90 || show75 || show50) {
                    const percentiles = [];

                    predictedData.forEach((pred, dayIndex) => {
                        const pricesAtDay = allPaths.map(path => path[dayIndex].y);
                        pricesAtDay.sort((a, b) => a - b);

                        percentiles.push({
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

                    // Add confidence bands
                    if (show90) {
                        datasets.push({
                            label: '90% Confidence Upper',
                            data: percentiles.map(d => ({ x: d.date, y: d.p95 })),
                            borderColor: 'rgba(33, 150, 243, 0.3)',
                            backgroundColor: 'rgba(33, 150, 243, 0.05)',
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [8, 4]
                        });
                        datasets.push({
                            label: '90% Confidence Lower',
                            data: percentiles.map(d => ({ x: d.date, y: d.p5 })),
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
                            data: percentiles.map(d => ({ x: d.date, y: d.p87_5 })),
                            borderColor: 'rgba(76, 175, 80, 0.4)',
                            backgroundColor: 'rgba(76, 175, 80, 0.08)',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [6, 3]
                        });
                        datasets.push({
                            label: '75% Confidence Lower',
                            data: percentiles.map(d => ({ x: d.date, y: d.p12_5 })),
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
                            data: percentiles.map(d => ({ x: d.date, y: d.p75 })),
                            borderColor: 'rgba(255, 152, 0, 0.5)',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [4, 2]
                        });
                        datasets.push({
                            label: '50% Confidence Lower',
                            data: percentiles.map(d => ({ x: d.date, y: d.p25 })),
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
                    // Show 15 representative paths
                    const pathsToShow = 15;
                    const stepSize = Math.floor(numPaths / pathsToShow);

                    for (let i = 0; i < pathsToShow; i++) {
                        const pathIndex = i * stepSize;
                        const path = allPaths[pathIndex];

                        // Color based on final return
                        const finalPrice = path[path.length - 1].y;
                        const returnPct = (finalPrice - lastHistoricalClose) / lastHistoricalClose;

                        let color;
                        if (returnPct > 0.02) {
                            color = `hsla(120, 60%, 50%, 0.25)`; // Green
                        } else if (returnPct < -0.02) {
                            color = `hsla(0, 60%, 50%, 0.25)`; // Red
                        } else {
                            color = `hsla(45, 60%, 50%, 0.25)`; // Yellow
                        }

                        datasets.push({
                            label: `Monte Carlo Path ${i + 1}`,
                            data: path.map(p => ({ x: p.x, y: p.y })),
                            borderColor: color,
                            backgroundColor: 'transparent',
                            borderWidth: 0.8,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [2, 2],
                            tension: 0.2
                        });
                    }
                }
            }

            // Add mean prediction line
            const meanLine = predictedData.map(d => ({
                x: d.date,
                y: d.close
            }));

            datasets.push({
                label: 'Prediction Mean',
                data: meanLine,
                borderColor: '#FF9800',
                borderWidth: 2.5,
                pointRadius: 3,
                pointBackgroundColor: '#FF9800',
                borderDash: [10, 5],
                fill: false
            });
        }

        // Create the chart
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.1
                            },
                            drag: {
                                enabled: true,
                                backgroundColor: 'rgba(102, 126, 234, 0.1)'
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy'
                        },
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM dd'
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }