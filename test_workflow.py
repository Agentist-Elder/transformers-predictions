#!/usr/bin/env python3
"""
Test script for Kronos workflow integration
Tests all components with real data
"""

import sys
import os
import json
import logging
from pathlib import Path
from datetime import datetime
import pandas as pd

# Add parent directories to path
sys.path.append(str(Path(__file__).parent.parent / 'src'))
sys.path.append(str(Path(__file__).parent))

from kronos_workflow import KronosWorkflow

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_data_availability():
    """Test if data sources are available"""
    logger.info("Testing data availability...")

    # Check finnhub data
    finnhub_dir = Path('/home/jarden/finnhub-data')
    if not finnhub_dir.exists():
        logger.error(f"Finnhub data directory not found: {finnhub_dir}")
        return False

    parquet_files = list(finnhub_dir.glob('*.parquet'))
    logger.info(f"Found {len(parquet_files)} data files")

    # Check ticker list
    ticker_file = Path('/home/jarden/option-data/unique_underlying_symbols.txt')
    if not ticker_file.exists():
        logger.error(f"Ticker file not found: {ticker_file}")
        return False

    with open(ticker_file) as f:
        tickers = [line.strip() for line in f if line.strip()]
    logger.info(f"Found {len(tickers)} tickers")

    # Check for sample data
    sample_tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
    for ticker in sample_tickers:
        data_file = finnhub_dir / f"{ticker}_1D.parquet"
        if data_file.exists():
            df = pd.read_parquet(data_file)
            logger.info(f"{ticker}: {len(df)} days of data")

    return True

def test_workflow_components():
    """Test individual workflow components"""
    logger.info("Testing workflow components...")

    config = {
        'finnhub_data_dir': '/home/jarden/finnhub-data',
        'predictions_dir': '/home/jarden/transformers-predictions/data',
        'ticker_file': '/home/jarden/option-data/unique_underlying_symbols.txt'
    }

    workflow = KronosWorkflow(config)

    # Test 1: Check for new data
    logger.info("Test 1: Checking for new data...")
    has_new, latest_friday = workflow.check_for_new_data()
    logger.info(f"Has new data: {has_new}, Latest Friday: {latest_friday}")

    # Test 2: Load tickers
    logger.info("Test 2: Loading tickers...")
    tickers = workflow.load_tickers()
    logger.info(f"Loaded {len(tickers)} tickers with data")

    # Test 3: Prepare sample batch
    if tickers and latest_friday:
        logger.info("Test 3: Preparing sample batch data...")
        sample_tickers = tickers[:5]  # Test with 5 tickers
        batch_data = workflow.prepare_batch_data(sample_tickers, latest_friday)
        logger.info(f"Prepared data for {len(batch_data)} tickers")

        # Test 4: Test JSON updater
        logger.info("Test 4: Testing JSON updater...")
        test_prediction = {
            'ticker_info': {'symbol': 'TEST'},
            'data': {
                'historical_candlesticks': [],
                'predicted_candlesticks': []
            }
        }
        success = workflow.json_updater.update_prediction_json('TEST', test_prediction)
        logger.info(f"JSON update test: {success}")

        # Test 5: Test CSV exporter
        logger.info("Test 5: Testing CSV exporter...")
        test_data = [{
            'ticker': 'TEST',
            'input_start_date': '2024-01-01',
            'input_end_date': '2024-03-15',
            'input_length': 120,
            'prediction_start_date': '2024-03-18',
            'prediction_end_date': '2024-03-22',
            'prediction_length': 5,
            'input_end_date_close': 100.0,
            'predicted_end_close_price': 102.0,
            'predicted_move': 2.0
        }]
        csv_file = '/tmp/test_predictions.csv'
        rows = workflow.csv_exporter.export_to_csv(test_data, csv_file)
        logger.info(f"CSV export test: {rows} rows written")

    return True

def test_mini_workflow():
    """Run a mini workflow with limited tickers"""
    logger.info("Running mini workflow test...")

    config = {
        'finnhub_data_dir': '/home/jarden/finnhub-data',
        'predictions_dir': '/tmp/test_predictions',
        'ticker_file': '/home/jarden/option-data/unique_underlying_symbols.txt',
        'csv_output': '/tmp/test_predictions_summary.csv',
        'use_gpu': False,  # Use CPU for testing
        'monte_carlo_runs': 3,  # Fewer runs for testing
        'skip_deployment': True
    }

    # Create test directory
    Path(config['predictions_dir']).mkdir(parents=True, exist_ok=True)

    workflow = KronosWorkflow(config)

    # Override to process only a few tickers
    original_load_tickers = workflow.load_tickers

    def load_test_tickers():
        all_tickers = original_load_tickers()
        # Return only first 3 tickers for testing
        return all_tickers[:3] if len(all_tickers) >= 3 else all_tickers

    workflow.load_tickers = load_test_tickers

    # Run the workflow
    results = workflow.run_workflow()

    logger.info(f"Mini workflow results: {json.dumps(results, indent=2, default=str)}")

    return results['success']

def main():
    """Run all tests"""
    logger.info("=" * 60)
    logger.info("Kronos Workflow Integration Tests")
    logger.info("=" * 60)

    tests_passed = 0
    tests_failed = 0

    # Test 1: Data availability
    try:
        if test_data_availability():
            logger.info("✓ Data availability test passed")
            tests_passed += 1
        else:
            logger.error("✗ Data availability test failed")
            tests_failed += 1
    except Exception as e:
        logger.error(f"✗ Data availability test error: {e}")
        tests_failed += 1

    # Test 2: Component tests
    try:
        if test_workflow_components():
            logger.info("✓ Component tests passed")
            tests_passed += 1
        else:
            logger.error("✗ Component tests failed")
            tests_failed += 1
    except Exception as e:
        logger.error(f"✗ Component tests error: {e}")
        tests_failed += 1

    # Test 3: Mini workflow
    try:
        if test_mini_workflow():
            logger.info("✓ Mini workflow test passed")
            tests_passed += 1
        else:
            logger.error("✗ Mini workflow test failed")
            tests_failed += 1
    except Exception as e:
        logger.error(f"✗ Mini workflow test error: {e}")
        tests_failed += 1

    # Summary
    logger.info("=" * 60)
    logger.info(f"Tests Passed: {tests_passed}")
    logger.info(f"Tests Failed: {tests_failed}")
    logger.info("=" * 60)

    return 0 if tests_failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())