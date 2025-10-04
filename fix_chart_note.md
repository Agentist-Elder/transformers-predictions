# Monte Carlo Simulation Issue

The current implementation has a data pipeline limitation:

## What Should Happen:
- The Kronos model runs 10 Monte Carlo simulations for each prediction
- These should produce 10 different price paths for each stock
- The confidence intervals (10th, 25th, 50th, 75th, 90th percentiles) should be calculated from these 10 runs
- All this data should be saved to the JSON files

## What Actually Happens:
- The model does run 10 Monte Carlo simulations (confirmed in code)
- The percentiles ARE calculated (ci_10, ci_25, median, ci_75, ci_90)
- BUT only the mean prediction is saved to the JSON files
- The individual Monte Carlo paths and percentile bands are lost

## Current Workaround:
The chart currently generates synthetic Monte Carlo paths based on:
- Historical volatility from the data
- Geometric Brownian Motion (standard financial modeling)
- This approximates what the actual Monte Carlo runs might have looked like

## Proper Solution:
The data pipeline needs to be updated to save:
1. All 10 Monte Carlo prediction paths
2. Or at minimum, the percentile bands (p10, p25, p50, p75, p90)

This would require modifying the prediction generation scripts in /home/jarden/kronos-pipeline/
to preserve and export the full Monte Carlo results instead of just the mean.