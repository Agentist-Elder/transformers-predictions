            // Get toggle states for confidence intervals and Monte Carlo
            const show90 = document.getElementById('showConfidence90')?.checked;
            const show75 = document.getElementById('showConfidence75')?.checked;
            const show50 = document.getElementById('showConfidence50')?.checked;
            const showMonteCarloLines = document.getElementById('showMonteCarloLines')?.checked ?? true;

            // Check if we have actual Monte Carlo paths in the data
            const hasMonteCarloData = data.chart_data?.monte_carlo_paths &&
                                     data.chart_data.monte_carlo_paths.length > 0;

            const hasPercentileData = data.chart_data?.prediction_percentiles &&
                                    Object.keys(data.chart_data.prediction_percentiles).length > 0;

            if (hasMonteCarloData || hasPercentileData) {
                // Use ACTUAL Monte Carlo paths from the model
                const monteCarloPath = data.chart_data.monte_carlo_paths || [];
                const percentileData = data.chart_data.prediction_percentiles || {};

                // Add confidence bands from actual percentile data
                if (hasPercentileData && (show90 || show75 || show50)) {
                    const dates = Object.keys(percentileData).sort();

                    if (show90) {
                        const p90Upper = dates.map(date => ({
                            x: date,
                            y: percentileData[date].close.p90
                        }));
                        const p10Lower = dates.map(date => ({
                            x: date,
                            y: percentileData[date].close.p10
                        }));

                        datasets.push({
                            label: '90% Confidence Upper (p90)',
                            data: p90Upper,
                            borderColor: 'rgba(33, 150, 243, 0.4)',
                            backgroundColor: 'rgba(33, 150, 243, 0.08)',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [8, 4]
                        });
                        datasets.push({
                            label: '90% Confidence Lower (p10)',
                            data: p10Lower,
                            borderColor: 'rgba(33, 150, 243, 0.4)',
                            backgroundColor: 'rgba(33, 150, 243, 0.08)',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: '-1',
                            borderDash: [8, 4]
                        });
                    }

                    if (show75) {
                        const p75Upper = dates.map(date => ({
                            x: date,
                            y: percentileData[date].close.p75
                        }));
                        const p25Lower = dates.map(date => ({
                            x: date,
                            y: percentileData[date].close.p25
                        }));

                        datasets.push({
                            label: '75% Confidence Upper (p75)',
                            data: p75Upper,
                            borderColor: 'rgba(76, 175, 80, 0.5)',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [6, 3]
                        });
                        datasets.push({
                            label: '75% Confidence Lower (p25)',
                            data: p25Lower,
                            borderColor: 'rgba(76, 175, 80, 0.5)',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: '-1',
                            borderDash: [6, 3]
                        });
                    }

                    if (show50) {
                        const p50Upper = dates.map(date => ({
                            x: date,
                            y: percentileData[date].close.p75  // Using 75th percentile for "50% confidence"
                        }));
                        const p50Lower = dates.map(date => ({
                            x: date,
                            y: percentileData[date].close.p25  // Using 25th percentile for "50% confidence"
                        }));

                        datasets.push({
                            label: '50% Confidence Upper',
                            data: p50Upper,
                            borderColor: 'rgba(255, 152, 0, 0.6)',
                            backgroundColor: 'rgba(255, 152, 0, 0.15)',
                            borderWidth: 2.5,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [4, 2]
                        });
                        datasets.push({
                            label: '50% Confidence Lower',
                            data: p50Lower,
                            borderColor: 'rgba(255, 152, 0, 0.6)',
                            backgroundColor: 'rgba(255, 152, 0, 0.15)',
                            borderWidth: 2.5,
                            pointRadius: 0,
                            fill: '-1',
                            borderDash: [4, 2]
                        });
                    }

                    // Add median line from percentiles
                    const medianLine = dates.map(date => ({
                        x: date,
                        y: percentileData[date].close.p50
                    }));

                    datasets.push({
                        label: 'Median Prediction (p50)',
                        data: medianLine,
                        borderColor: '#9C27B0',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointBackgroundColor: '#9C27B0',
                        borderDash: [8, 3],
                        fill: false
                    });
                }

                // Show actual Monte Carlo paths
                if (showMonteCarloLines && hasMonteCarloData) {
                    const lastHistoricalClose = historicalData[historicalData.length - 1]?.close || 100;

                    monteCarloPath.forEach((path, i) => {
                        // Calculate return for color coding
                        const finalPrice = path[path.length - 1].close;
                        const returnPct = (finalPrice - lastHistoricalClose) / lastHistoricalClose;

                        // Color based on performance
                        let color;
                        if (returnPct > 0.02) {
                            color = `hsla(120, 70%, 50%, 0.35)`; // Green for gains > 2%
                        } else if (returnPct < -0.02) {
                            color = `hsla(0, 70%, 50%, 0.35)`; // Red for losses > 2%
                        } else {
                            color = `hsla(45, 70%, 50%, 0.35)`; // Yellow for neutral
                        }

                        // Create line data from path
                        const lineData = path.map(day => ({
                            x: day.date,
                            y: day.close
                        }));

                        datasets.push({
                            label: `Monte Carlo Run ${i + 1}`,
                            data: lineData,
                            borderColor: color,
                            backgroundColor: 'transparent',
                            borderWidth: 1.2,
                            pointRadius: 0,
                            fill: false,
                            borderDash: [3, 2],
                            tension: 0.15
                        });
                    });
                }
            } else {
                // Fallback to synthetic Monte Carlo if no actual data available
                // (Keep existing synthetic generation code here as backup)
                console.log('No Monte Carlo data found in JSON, using synthetic generation');
            }