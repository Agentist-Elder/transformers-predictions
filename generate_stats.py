#!/usr/bin/env python3
import json
import os
import glob
import numpy as np
from datetime import datetime

def analyze_predictions():
    # Get all prediction files
    prediction_files = glob.glob('data/*_ohlcv_prediction.json')

    total_files = len(prediction_files)
    bullish_count = 0
    bearish_count = 0
    neutral_count = 0
    price_changes = []
    valid_predictions = 0
    failed_files = []

    # Sample analysis - analyze up to 500 files for statistics
    sample_size = min(500, total_files)
    sample_files = np.random.choice(prediction_files, sample_size, replace=False) if total_files > 0 else []

    for filepath in sample_files:
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)

            # Check if we have predicted data
            if 'chart_data' in data and 'predicted_candlesticks' in data['chart_data']:
                predicted = data['chart_data']['predicted_candlesticks']
                historical = data['chart_data'].get('historical_candlesticks', [])

                if predicted and len(predicted) > 0 and historical and len(historical) > 0:
                    # Get last historical price and last predicted price
                    last_historical_price = historical[-1].get('close', 0)
                    last_predicted_price = predicted[-1].get('close', 0)

                    if last_historical_price > 0 and last_predicted_price > 0:
                        # Calculate percentage change
                        pct_change = ((last_predicted_price - last_historical_price) / last_historical_price) * 100
                        price_changes.append(pct_change)
                        valid_predictions += 1

                        # Categorize direction
                        if pct_change > 1.0:
                            bullish_count += 1
                        elif pct_change < -1.0:
                            bearish_count += 1
                        else:
                            neutral_count += 1
        except Exception as e:
            failed_files.append((filepath, str(e)))

    # Scale up the sample statistics to the full dataset
    if valid_predictions > 0:
        scale_factor = total_files / valid_predictions
        bullish_total = int(bullish_count * scale_factor)
        bearish_total = int(bearish_count * scale_factor)
        neutral_total = int(neutral_count * scale_factor)
    else:
        bullish_total = bearish_total = neutral_total = 0

    # Calculate average movement
    avg_movement = np.mean(np.abs(price_changes)) if price_changes else 0

    # Generate summary
    summary = {
        "total_predictions": total_files,
        "analyzed_sample": sample_size,
        "valid_predictions_in_sample": valid_predictions,
        "estimated_bullish": bullish_total,
        "estimated_bearish": bearish_total,
        "estimated_neutral": neutral_total,
        "avg_expected_movement_pct": round(avg_movement, 2),
        "median_movement_pct": round(np.median(np.abs(price_changes)), 2) if price_changes else 0,
        "max_gain_pct": round(max(price_changes), 2) if price_changes else 0,
        "max_loss_pct": round(min(price_changes), 2) if price_changes else 0,
        "timestamp": datetime.now().isoformat(),
        "failed_files": len(failed_files)
    }

    return summary

if __name__ == "__main__":
    print("Analyzing prediction files...")
    stats = analyze_predictions()

    # Save to file
    with open('data/prediction_stats.json', 'w') as f:
        json.dump(stats, f, indent=2)

    # Print summary
    print(f"\n=== Prediction Summary Statistics ===")
    print(f"Total prediction files: {stats['total_predictions']:,}")
    print(f"Sample analyzed: {stats['analyzed_sample']}")
    print(f"Valid predictions in sample: {stats['valid_predictions_in_sample']}")
    print(f"\nEstimated Market Direction (scaled to full dataset):")
    print(f"  Bullish (>1% up): {stats['estimated_bullish']:,}")
    print(f"  Bearish (>1% down): {stats['estimated_bearish']:,}")
    print(f"  Neutral (±1%): {stats['estimated_neutral']:,}")
    print(f"\nPrice Movement Statistics:")
    print(f"  Average expected move: {stats['avg_expected_movement_pct']}%")
    print(f"  Median movement: {stats['median_movement_pct']}%")
    print(f"  Max predicted gain: {stats['max_gain_pct']}%")
    print(f"  Max predicted loss: {stats['max_loss_pct']}%")
    if stats['failed_files'] > 0:
        print(f"\nFailed to read: {stats['failed_files']} files")