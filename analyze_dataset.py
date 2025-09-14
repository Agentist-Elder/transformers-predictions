#!/usr/bin/env python3
import json
import os
import numpy as np
from collections import defaultdict

def analyze_complete_dataset():
    """Analyze all ticker files and generate summary statistics"""

    data_dir = "/workspaces/sjc-gpu-kronos/results/complete_ohlcv_tickers"

    # Metrics to collect
    all_scores = []
    quality_counts = defaultdict(int)

    # OHLCV accuracy metrics
    open_mapes = []
    high_mapes = []
    low_mapes = []
    close_mapes = []

    open_accuracy_5pct = []
    high_accuracy_5pct = []
    low_accuracy_5pct = []
    close_accuracy_5pct = []

    open_accuracy_10pct = []
    high_accuracy_10pct = []
    low_accuracy_10pct = []
    close_accuracy_10pct = []

    # Model characteristics
    model_types = defaultdict(int)
    prediction_days = []
    lookback_days = []
    mc_simulations = []

    print(f"Analyzing {len(os.listdir(data_dir))} ticker files...")

    for filename in os.listdir(data_dir):
        if not filename.endswith('.json'):
            continue

        try:
            with open(os.path.join(data_dir, filename), 'r') as f:
                data = json.load(f)

            # Summary stats
            summary_stats = data.get('summary_stats', {})
            score = summary_stats.get('overall_score')
            if score is not None:
                all_scores.append(score)
            quality_counts[summary_stats.get('prediction_quality', 'unknown')] += 1

            # OHLCV metrics
            pred_metrics = data.get('data', {}).get('prediction_metrics', {})

            # MAPE values (filter out None values)
            if 'open_metrics' in pred_metrics:
                mape = pred_metrics['open_metrics'].get('mape')
                acc5 = pred_metrics['open_metrics'].get('accuracy_5pct')
                acc10 = pred_metrics['open_metrics'].get('accuracy_10pct')
                if mape is not None: open_mapes.append(mape)
                if acc5 is not None: open_accuracy_5pct.append(acc5)
                if acc10 is not None: open_accuracy_10pct.append(acc10)

            if 'high_metrics' in pred_metrics:
                mape = pred_metrics['high_metrics'].get('mape')
                acc5 = pred_metrics['high_metrics'].get('accuracy_5pct')
                acc10 = pred_metrics['high_metrics'].get('accuracy_10pct')
                if mape is not None: high_mapes.append(mape)
                if acc5 is not None: high_accuracy_5pct.append(acc5)
                if acc10 is not None: high_accuracy_10pct.append(acc10)

            if 'low_metrics' in pred_metrics:
                mape = pred_metrics['low_metrics'].get('mape')
                acc5 = pred_metrics['low_metrics'].get('accuracy_5pct')
                acc10 = pred_metrics['low_metrics'].get('accuracy_10pct')
                if mape is not None: low_mapes.append(mape)
                if acc5 is not None: low_accuracy_5pct.append(acc5)
                if acc10 is not None: low_accuracy_10pct.append(acc10)

            if 'close_metrics' in pred_metrics:
                mape = pred_metrics['close_metrics'].get('mape')
                acc5 = pred_metrics['close_metrics'].get('accuracy_5pct')
                acc10 = pred_metrics['close_metrics'].get('accuracy_10pct')
                if mape is not None: close_mapes.append(mape)
                if acc5 is not None: close_accuracy_5pct.append(acc5)
                if acc10 is not None: close_accuracy_10pct.append(acc10)

            # Model characteristics
            model_info = data.get('data', {}).get('model_info', {})
            model_types[model_info.get('model_type', 'unknown')] += 1
            mc_simulations.append(model_info.get('monte_carlo_simulations', 0))

            # Metadata
            metadata = data.get('data', {}).get('metadata', {})
            prediction_days.append(metadata.get('prediction_days', 0))
            lookback_days.append(metadata.get('lookback_days', 0))

        except Exception as e:
            print(f"Error processing {filename}: {e}")
            continue

    # Calculate summary statistics
    summary = {
        "dataset_overview": {
            "total_tickers": len(all_scores),
            "model_type": "complete-ohlcv-monte-carlo",
            "avg_lookback_days": int(np.mean(lookback_days)) if lookback_days else 0,
            "avg_prediction_days": int(np.mean(prediction_days)) if prediction_days else 0,
            "avg_mc_simulations": int(np.mean(mc_simulations)) if mc_simulations else 0
        },
        "overall_performance": {
            "mean_score": round(np.mean(all_scores), 2) if all_scores else 0,
            "median_score": round(np.median(all_scores), 2) if all_scores else 0,
            "std_score": round(np.std(all_scores), 2) if all_scores else 0,
            "min_score": round(np.min(all_scores), 2) if all_scores else 0,
            "max_score": round(np.max(all_scores), 2) if all_scores else 0
        },
        "quality_distribution": dict(quality_counts),
        "accuracy_metrics": {
            "open_price": {
                "mean_mape": round(np.mean(open_mapes), 2) if open_mapes else 0,
                "median_mape": round(np.median(open_mapes), 2) if open_mapes else 0,
                "mean_accuracy_5pct": round(np.mean(open_accuracy_5pct), 1) if open_accuracy_5pct else 0,
                "mean_accuracy_10pct": round(np.mean(open_accuracy_10pct), 1) if open_accuracy_10pct else 0
            },
            "high_price": {
                "mean_mape": round(np.mean(high_mapes), 2) if high_mapes else 0,
                "median_mape": round(np.median(high_mapes), 2) if high_mapes else 0,
                "mean_accuracy_5pct": round(np.mean(high_accuracy_5pct), 1) if high_accuracy_5pct else 0,
                "mean_accuracy_10pct": round(np.mean(high_accuracy_10pct), 1) if high_accuracy_10pct else 0
            },
            "low_price": {
                "mean_mape": round(np.mean(low_mapes), 2) if low_mapes else 0,
                "median_mape": round(np.median(low_mapes), 2) if low_mapes else 0,
                "mean_accuracy_5pct": round(np.mean(low_accuracy_5pct), 1) if low_accuracy_5pct else 0,
                "mean_accuracy_10pct": round(np.mean(low_accuracy_10pct), 1) if low_accuracy_10pct else 0
            },
            "close_price": {
                "mean_mape": round(np.mean(close_mapes), 2) if close_mapes else 0,
                "median_mape": round(np.median(close_mapes), 2) if close_mapes else 0,
                "mean_accuracy_5pct": round(np.mean(close_accuracy_5pct), 1) if close_accuracy_5pct else 0,
                "mean_accuracy_10pct": round(np.mean(close_accuracy_10pct), 1) if close_accuracy_10pct else 0
            }
        },
        "score_percentiles": {
            "p10": round(np.percentile(all_scores, 10), 2) if all_scores else 0,
            "p25": round(np.percentile(all_scores, 25), 2) if all_scores else 0,
            "p50": round(np.percentile(all_scores, 50), 2) if all_scores else 0,
            "p75": round(np.percentile(all_scores, 75), 2) if all_scores else 0,
            "p90": round(np.percentile(all_scores, 90), 2) if all_scores else 0
        }
    }

    return summary

if __name__ == "__main__":
    summary = analyze_complete_dataset()

    # Output JSON for use in JavaScript
    output_file = "/workspaces/sjc-gpu-kronos/ohlcv-dashboard/data/dataset_summary.json"
    with open(output_file, 'w') as f:
        json.dump(summary, f, indent=2)

    print(f"Summary statistics saved to: {output_file}")
    print(f"Total tickers analyzed: {summary['dataset_overview']['total_tickers']}")
    print(f"Mean overall score: {summary['overall_performance']['mean_score']}")
    print(f"Quality distribution: {summary['quality_distribution']}")