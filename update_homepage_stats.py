#!/usr/bin/env python3
"""
Update homepage statistics based on actual prediction files
"""

import json
from pathlib import Path

def count_predictions():
    """Count predictions and calculate statistics"""
    data_dir = Path('/home/jarden/transformers-predictions/data')

    total_files = 0
    with_predictions = 0
    bullish_count = 0
    bearish_count = 0
    neutral_count = 0
    total_movement = 0

    for f in data_dir.glob('*_ohlcv_prediction.json'):
        if f.name == 'kronos_adaptive_summary.json' or f.name == 'kronos_gpu_prediction_summary.json':
            continue

        total_files += 1
        try:
            with open(f, 'r') as file:
                data = json.load(file)

                # Check if has predictions
                has_preds = False
                if 'data' in data and 'predicted_candlesticks' in data['data'] and data['data']['predicted_candlesticks']:
                    has_preds = True
                elif 'chart_data' in data and 'predicted' in data['chart_data'] and data['chart_data']['predicted']:
                    has_preds = True

                if has_preds:
                    with_predictions += 1

                    # Get direction and movement
                    if 'summary_stats' in data:
                        direction = data['summary_stats'].get('direction', 'Neutral')
                        if direction == 'Bullish':
                            bullish_count += 1
                        elif direction == 'Bearish':
                            bearish_count += 1
                        else:
                            neutral_count += 1

                        # Add absolute movement
                        pct_change = abs(data['summary_stats'].get('price_change_percent', 0))
                        total_movement += pct_change
        except:
            pass

    # Calculate average movement
    avg_movement = total_movement / with_predictions if with_predictions > 0 else 0

    return {
        'total_files': total_files,
        'with_predictions': with_predictions,
        'bullish': bullish_count,
        'bearish': bearish_count,
        'neutral': neutral_count,
        'avg_movement': round(avg_movement, 1)
    }

def update_homepage():
    """Update the homepage HTML with actual statistics"""
    stats = count_predictions()

    # Read current HTML
    html_file = Path('/home/jarden/transformers-predictions/dist/index.html')
    with open(html_file, 'r') as f:
        html = f.read()

    # Update the statistics
    replacements = [
        ('id="totalPredictions">5,453', f'id="totalPredictions">{stats["with_predictions"]:,}'),
        ('id="avgMovement">3.7%', f'id="avgMovement">{stats["avg_movement"]}%'),
        ('id="bullishCount">3,982', f'id="bullishCount">{stats["bullish"]:,}'),
        ('id="bearishCount">2,619', f'id="bearishCount">{stats["bearish"]:,}'),
    ]

    for old, new in replacements:
        html = html.replace(old, new)

    # Write updated HTML
    with open(html_file, 'w') as f:
        f.write(html)

    print(f"Homepage updated with statistics:")
    print(f"  Total predictions: {stats['with_predictions']:,}")
    print(f"  Bullish: {stats['bullish']:,}")
    print(f"  Bearish: {stats['bearish']:,}")
    print(f"  Neutral: {stats['neutral']:,}")
    print(f"  Average movement: {stats['avg_movement']}%")

    return stats

if __name__ == "__main__":
    update_homepage()