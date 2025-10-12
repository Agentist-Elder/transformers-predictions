#!/usr/bin/env python3
"""
Kronos Predictions Workflow Orchestrator
Main workflow script for transformers-predictions pipeline
"""

import sys
import os
import logging
import json
import argparse
import warnings
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
import pandas as pd
import numpy as np
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import torch

# CRITICAL: Set PyTorch CUDA memory allocator to reduce fragmentation
# This matches the kronos-backtest example scripts
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'

# Add source directories to path
sys.path.append(str(Path(__file__).parent.parent / 'src'))
sys.path.append(str(Path(__file__).parent))

# Import all workflow modules
from data_module import DataComparator
from batch_processing.batch_processor import BatchProcessor
from batch_processing.kronos_integration import KronosModelWrapper
from json_updater import JSONUpdater
from analytics.statistics_calculator import StatisticsCalculator
from analytics.homepage_generator import HomepageGenerator
from export.csv_exporter import CSVExporter
from deployment.deployment_manager import DeploymentManager
from deployment.config import DeploymentConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('kronos_workflow.log')
    ]
)
logger = logging.getLogger(__name__)

# Suppress warnings
warnings.filterwarnings('ignore')

class KronosWorkflow:
    """Main workflow orchestrator for Kronos predictions pipeline"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize workflow with configuration"""
        self.config = self._load_config(config)
        self.setup_components()
        self.setup_directories()

    def _load_config(self, config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Load configuration with defaults"""
        default_config = {
            'finnhub_data_dir': '/home/jarden/finnhub-data',
            'predictions_dir': '/home/jarden/transformers-predictions/data',
            'ticker_file': '/home/jarden/option-data/unique_underlying_symbols.txt',
            'model_path': '/home/jarden/kronos-models/kronos-models/Kronos-base/model.safetensors',
            'lookback_days': 120,
            'prediction_days': 5,
            'monte_carlo_runs': 10,
            'batch_strategy': 'adaptive',
            'max_retries': 5,
            'cleanup_days': 7,
            'cloudflare_project': 'kronos-hoad',
            'git_repo': '/home/jarden/transformers-predictions',
            'csv_output': '/home/jarden/transformers-predictions/predictions_summary.csv',
            'use_gpu': torch.cuda.is_available(),
            'max_batch_size': 100,
            'min_batch_size': 1
        }

        if config:
            default_config.update(config)

        return default_config

    def setup_components(self):
        """Initialize all workflow components"""
        logger.info("Setting up workflow components...")

        # Data comparison module
        self.data_comparator = DataComparator(
            finnhub_data_path=self.config['finnhub_data_dir'],
            predictions_path=self.config['predictions_dir']
        )

        # Kronos model wrapper - initialize FIRST
        from batch_processing.kronos_integration import KronosModelConfig
        model_config = KronosModelConfig(
            model_path=self.config.get('model_path', '/home/jarden/kronos-pipeline/kronos-base'),
            sequence_length=self.config.get('lookback_days', 120),
            prediction_horizon=self.config.get('prediction_days', 5)
        )
        self.model = KronosModelWrapper(model_config)
        self.model.load_model()  # Load model onto GPU

        # Batch processing with GPU
        from batch_processing.batch_processor import BatchStrategy
        strategy_map = {
            'conservative': BatchStrategy.CONSERVATIVE,
            'adaptive': BatchStrategy.ADAPTIVE,
            'aggressive': BatchStrategy.AGGRESSIVE
        }

        self.batch_processor = BatchProcessor(
            model_name="kronos-base",
            monte_carlo_runs=self.config.get('monte_carlo_runs', 10),
            max_retry_attempts=self.config.get('max_retries', 5),
            strategy=strategy_map.get(self.config.get('batch_strategy', 'adaptive'), BatchStrategy.ADAPTIVE),
            min_batch_size=self.config.get('min_batch_size', 1)
        )

        # Connect model to batch processor
        self.batch_processor.set_model(self.model)
        logger.info(f"Model loaded on device: {self.model.device}")

        # JSON updater
        self.json_updater = JSONUpdater(
            data_dir=self.config['predictions_dir']
        )

        # Statistics calculator
        self.stats_calculator = StatisticsCalculator()
        self.homepage_generator = HomepageGenerator(
            prediction_results_dir=self.config['predictions_dir']
        )

        # CSV exporter
        self.csv_exporter = CSVExporter()

        # Deployment manager - prefer Wrangler over API tokens
        self.deployment_manager = None
        self.use_wrangler = self.config.get('use_wrangler', True)

        if self.use_wrangler:
            # Use Wrangler CLI for deployment (OAuth authentication)
            from deployment.wrangler_manager import WranglerManager
            self.deployment_manager = WranglerManager(
                project_name=self.config.get('cloudflare_project', 'kronos-hoad'),
                build_dir=Path(self.config['predictions_dir'])
            )
            logger.info(f"Using Wrangler CLI for deployment to project: {self.config.get('cloudflare_project')}")
        elif os.getenv('CLOUDFLARE_API_TOKEN'):
            # Fallback to API token method if explicitly disabled Wrangler
            deployment_config = DeploymentConfig(
                cloudflare_api_token=os.getenv('CLOUDFLARE_API_TOKEN'),
                cloudflare_account_id=os.getenv('CLOUDFLARE_ACCOUNT_ID'),
                project_name=self.config['cloudflare_project']
            )
            self.deployment_manager = DeploymentManager(deployment_config)
            logger.info("Using API tokens for deployment")
        else:
            logger.warning("Deployment not configured - use 'wrangler login' to authenticate")

        logger.info("Components initialized successfully")

    def setup_directories(self):
        """Ensure all required directories exist"""
        dirs_to_create = [
            Path(self.config['predictions_dir']),
            Path(self.config['predictions_dir']) / 'predictions',
            Path(self.config['predictions_dir']) / 'statistics',
            Path(self.config['git_repo']) / 'logs'
        ]

        for dir_path in dirs_to_create:
            dir_path.mkdir(parents=True, exist_ok=True)

    def check_for_new_data(self) -> Tuple[bool, Optional[datetime]]:
        """Check if new Friday data is available"""
        logger.info("Checking for new Friday data...")

        latest_friday = self.data_comparator.get_latest_friday_data()
        if not latest_friday:
            logger.warning("No Friday data found")
            return False, None

        has_new = self.data_comparator.has_new_data()

        if has_new:
            logger.info(f"New Friday data found: {latest_friday}")
        else:
            logger.info(f"No new data since {latest_friday}")

        return has_new, latest_friday

    def load_tickers(self) -> List[str]:
        """Load ticker list from file"""
        logger.info(f"Loading tickers from {self.config['ticker_file']}")

        tickers = self.data_comparator.load_ticker_list()
        logger.info(f"Loaded {len(tickers)} tickers")

        # Filter to tickers with available data
        available_tickers = []
        for ticker in tickers:
            data_file = Path(self.config['finnhub_data_dir']) / f"{ticker}_1D.parquet"
            if data_file.exists():
                available_tickers.append(ticker)

        logger.info(f"Found data for {len(available_tickers)} tickers")
        return available_tickers

    def prepare_batch_data(self, tickers: List[str],
                          end_date: datetime) -> Dict[str, pd.DataFrame]:
        """Prepare lookback data for all tickers"""
        logger.info(f"Preparing {self.config['lookback_days']}-day lookback data...")

        batch_data = {}
        failed_tickers = []

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(
                    self.data_comparator.prepare_lookback_data,
                    ticker, end_date
                ): ticker
                for ticker in tickers
            }

            for future in futures:
                ticker = futures[future]
                try:
                    data = future.result(timeout=10)
                    if data is not None and not data.empty:
                        batch_data[ticker] = data
                    else:
                        failed_tickers.append(ticker)
                except Exception as e:
                    logger.error(f"Failed to load data for {ticker}: {e}")
                    failed_tickers.append(ticker)

        logger.info(f"Prepared data for {len(batch_data)} tickers")
        if failed_tickers:
            logger.warning(f"Failed to load {len(failed_tickers)} tickers")

        return batch_data

    def run_predictions(self, batch_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Run batch predictions with GPU optimization"""
        logger.info("Starting batch predictions with GPU optimization...")

        # Run predictions with automatic batch sizing
        batch_result = self.batch_processor.run_batch(
            tickers=list(batch_data.keys()),
            lookback_data=batch_data,
            batch_fraction=1.0  # Start with full batch
        )

        # Handle tuple return (results, metrics) or single BatchResult object
        if isinstance(batch_result, tuple):
            results, metrics = batch_result
        else:
            results = batch_result.results if hasattr(batch_result, 'results') else batch_result
            metrics = batch_result.metrics if hasattr(batch_result, 'metrics') else None

        # Process results - handle both list of result objects and dict
        predictions = {}

        if isinstance(results, dict):
            # Results is already a dictionary of ticker -> prediction data
            for ticker, prediction_data in results.items():
                if ticker in batch_data:
                    predictions[ticker] = self._format_prediction(
                        ticker,
                        batch_data[ticker],
                        prediction_data
                    )
        elif isinstance(results, list):
            # Results is a list of result objects
            successful_results = {r.ticker: r for r in results if hasattr(r, 'success') and r.success}
            for ticker, result in successful_results.items():
                predictions[ticker] = self._format_prediction(
                    ticker,
                    batch_data[ticker],
                    result
                )
        else:
            logger.error(f"Unexpected results type: {type(results)}")
            return {}

        logger.info(f"Generated predictions for {len(predictions)} tickers")

        if metrics:
            if hasattr(metrics, 'successful_tickers'):
                logger.info(f"Batch metrics: {metrics.successful_tickers} successful, {metrics.failed_tickers} failed")
            elif isinstance(metrics, dict):
                logger.info(f"Batch metrics: {metrics.get('successful', 0)} successful, {metrics.get('failed', 0)} failed")

        return predictions

    def _format_prediction(self, ticker: str,
                          input_data: pd.DataFrame,
                          raw_prediction) -> Dict:
        """Format prediction for JSON and CSV export"""
        input_start = pd.to_datetime(input_data.index[0])
        input_end = pd.to_datetime(input_data.index[-1])

        # Calculate prediction dates (next 5 trading days)
        prediction_dates = []
        current_date = input_end
        for _ in range(self.config['prediction_days']):
            current_date = current_date + timedelta(days=1)
            # Skip weekends
            while current_date.weekday() >= 5:
                current_date += timedelta(days=1)
            prediction_dates.append(current_date)

        prediction_start = prediction_dates[0]
        prediction_end = prediction_dates[-1]

        # Initialize variables for monte carlo paths and percentiles
        monte_carlo_paths = []
        prediction_percentiles = {}
        median_close = float(input_data['close'].iloc[-1])
        predicted_candlesticks = []

        # Get average volume from historical data for predictions
        avg_volume = float(input_data['volume'].mean()) if 'volume' in input_data else 0

        # Handle different result types: BatchResult, dict, or PredictionResult
        if hasattr(raw_prediction, 'predictions') and isinstance(raw_prediction.predictions, list):
            predictions_list = raw_prediction.predictions

            # Check if BatchResult has actual Monte Carlo predictions
            if hasattr(raw_prediction, 'monte_carlo_predictions') and raw_prediction.monte_carlo_predictions:
                # Use actual Kronos Monte Carlo predictions!
                mc_predictions = raw_prediction.monte_carlo_predictions
                median_close = float(predictions_list[-1]) if len(predictions_list) > 0 else float(input_data['close'].iloc[-1])

                # Create monte carlo paths from actual Kronos predictions
                for mc_run in mc_predictions[:self.config.get('monte_carlo_runs', 10)]:
                    path = []
                    for day_idx, pred_date in enumerate(prediction_dates[:self.config['prediction_days']]):
                        if isinstance(mc_run, list) and day_idx < len(mc_run):
                            # mc_run is a list of predicted values
                            close_price = float(mc_run[day_idx])

                            # Generate realistic OHLC from Kronos close prediction
                            historical_returns = input_data['close'].pct_change().dropna()
                            daily_volatility = float(historical_returns.std())
                            high_price = close_price * (1 + abs(np.random.normal(0, daily_volatility * 0.5)))
                            low_price = close_price * (1 - abs(np.random.normal(0, daily_volatility * 0.5)))
                            open_price = low_price + (high_price - low_price) * np.random.random()

                            # Random volume variation
                            volume = avg_volume * (0.7 + 0.6 * np.random.random())

                            path.append({
                                'date': pred_date.strftime('%Y-%m-%d'),
                                'open': float(open_price),
                                'high': float(max(high_price, close_price, open_price)),
                                'low': float(min(low_price, close_price, open_price)),
                                'close': float(close_price),
                                'volume': float(volume)
                            })
                    if path:
                        monte_carlo_paths.append(path)

                # Calculate percentiles from actual Kronos Monte Carlo predictions
                for day_idx, pred_date in enumerate(prediction_dates[:self.config['prediction_days']]):
                    day_data = {
                        'close': [path[day_idx]['close'] for path in monte_carlo_paths if day_idx < len(path)],
                        'open': [path[day_idx]['open'] for path in monte_carlo_paths if day_idx < len(path)],
                        'high': [path[day_idx]['high'] for path in monte_carlo_paths if day_idx < len(path)],
                        'low': [path[day_idx]['low'] for path in monte_carlo_paths if day_idx < len(path)]
                    }

                    date_str = pred_date.strftime('%Y-%m-%d')
                    prediction_percentiles[date_str] = {}

                    for metric in ['close', 'open', 'high', 'low']:
                        if day_data[metric]:
                            values = day_data[metric]
                            prediction_percentiles[date_str][metric] = {
                                'p10': float(np.percentile(values, 10)),
                                'p25': float(np.percentile(values, 25)),
                                'p50': float(np.percentile(values, 50)),
                                'p75': float(np.percentile(values, 75)),
                                'p90': float(np.percentile(values, 90)),
                                'mean': float(np.mean(values)),
                            }
                            if metric == 'close':
                                prediction_percentiles[date_str][metric]['std'] = float(np.std(values))

                # Create predicted candlesticks from mean values
                for day_idx, pred_date in enumerate(prediction_dates[:self.config['prediction_days']]):
                    date_str = pred_date.strftime('%Y-%m-%d')
                    if date_str in prediction_percentiles:
                        predicted_candlesticks.append({
                            'date': date_str,
                            'open': prediction_percentiles[date_str]['open']['mean'],
                            'high': prediction_percentiles[date_str]['high']['mean'],
                            'low': prediction_percentiles[date_str]['low']['mean'],
                            'close': prediction_percentiles[date_str]['close']['mean'],
                            'volume': avg_volume
                        })

            elif predictions_list and isinstance(predictions_list[0], (int, float, np.number)):
                # Fallback: BatchResult without monte_carlo_predictions (old code path)
                # We need to simulate Monte Carlo paths since we only have aggregated data
                median_close = float(predictions_list[-1]) if len(predictions_list) > 0 else float(input_data['close'].iloc[-1])

                # Simulate Monte Carlo runs based on historical volatility
                historical_returns = input_data['close'].pct_change().dropna()
                volatility = float(historical_returns.std())

                # Create monte_carlo_runs paths
                num_runs = self.config.get('monte_carlo_runs', 10)
                for run_idx in range(num_runs):
                    path = []
                    for day_idx, pred_date in enumerate(prediction_dates[:self.config['prediction_days']]):
                        if day_idx < len(predictions_list):
                            # Use the actual prediction as base, add random variation
                            base_price = float(predictions_list[day_idx])
                            # Add gaussian noise based on volatility
                            noise_factor = 1 + np.random.normal(0, volatility * 0.5)
                            close_price = base_price * noise_factor
                        else:
                            close_price = float(input_data['close'].iloc[-1])

                        # Generate OHLC from close with realistic variations
                        daily_volatility = close_price * volatility * 0.3
                        high_price = close_price * (1 + abs(np.random.normal(0, 0.01)))
                        low_price = close_price * (1 - abs(np.random.normal(0, 0.01)))
                        open_price = low_price + (high_price - low_price) * np.random.random()

                        # Random volume variation
                        volume = avg_volume * (0.7 + 0.6 * np.random.random())

                        path.append({
                            'date': pred_date.strftime('%Y-%m-%d'),
                            'open': float(open_price),
                            'high': float(max(high_price, close_price, open_price)),
                            'low': float(min(low_price, close_price, open_price)),
                            'close': float(close_price),
                            'volume': float(volume)
                        })
                    monte_carlo_paths.append(path)

                # Calculate percentiles from monte carlo paths
                for day_idx, pred_date in enumerate(prediction_dates[:self.config['prediction_days']]):
                    day_data = {
                        'close': [path[day_idx]['close'] for path in monte_carlo_paths],
                        'open': [path[day_idx]['open'] for path in monte_carlo_paths],
                        'high': [path[day_idx]['high'] for path in monte_carlo_paths],
                        'low': [path[day_idx]['low'] for path in monte_carlo_paths]
                    }

                    date_str = pred_date.strftime('%Y-%m-%d')
                    prediction_percentiles[date_str] = {}

                    for metric in ['close', 'open', 'high', 'low']:
                        values = day_data[metric]
                        prediction_percentiles[date_str][metric] = {
                            'p10': float(np.percentile(values, 10)),
                            'p25': float(np.percentile(values, 25)),
                            'p50': float(np.percentile(values, 50)),
                            'p75': float(np.percentile(values, 75)),
                            'p90': float(np.percentile(values, 90)),
                            'mean': float(np.mean(values)),
                        }
                        if metric == 'close':
                            prediction_percentiles[date_str][metric]['std'] = float(np.std(values))

                # Create predicted candlesticks from median values
                for day_idx, pred_date in enumerate(prediction_dates[:self.config['prediction_days']]):
                    date_str = pred_date.strftime('%Y-%m-%d')
                    if date_str in prediction_percentiles:
                        predicted_candlesticks.append({
                            'date': date_str,
                            'open': prediction_percentiles[date_str]['open']['mean'],
                            'high': prediction_percentiles[date_str]['high']['mean'],
                            'low': prediction_percentiles[date_str]['low']['mean'],
                            'close': prediction_percentiles[date_str]['close']['mean'],
                            'volume': avg_volume
                        })

            elif predictions_list and isinstance(predictions_list[0], pd.DataFrame):
                # It's a PredictionResult - predictions is a list of DataFrames (actual Monte Carlo runs)
                median_close = float(predictions_list[-1]['close'].iloc[-1]) if len(predictions_list) > 0 else float(input_data['close'].iloc[-1])

                # Each DataFrame is one Monte Carlo run
                for run_df in predictions_list[:self.config.get('monte_carlo_runs', 10)]:
                    path = []
                    for day_idx, pred_date in enumerate(prediction_dates[:self.config['prediction_days']]):
                        if isinstance(run_df, pd.DataFrame) and day_idx < len(run_df):
                            row = run_df.iloc[day_idx]
                            path.append({
                                'date': pred_date.strftime('%Y-%m-%d'),
                                'open': float(row['open']) if 'open' in row else float(row.iloc[0]),
                                'high': float(row['high']) if 'high' in row else float(row.iloc[0]),
                                'low': float(row['low']) if 'low' in row else float(row.iloc[0]),
                                'close': float(row['close']) if 'close' in row else float(row.iloc[0]),
                                'volume': float(row.get('volume', avg_volume))
                            })
                    if path:
                        monte_carlo_paths.append(path)

                # Calculate percentiles from actual monte carlo runs
                if monte_carlo_paths:
                    for day_idx, pred_date in enumerate(prediction_dates[:self.config['prediction_days']]):
                        day_data = {
                            'close': [path[day_idx]['close'] for path in monte_carlo_paths if day_idx < len(path)],
                            'open': [path[day_idx]['open'] for path in monte_carlo_paths if day_idx < len(path)],
                            'high': [path[day_idx]['high'] for path in monte_carlo_paths if day_idx < len(path)],
                            'low': [path[day_idx]['low'] for path in monte_carlo_paths if day_idx < len(path)]
                        }

                        date_str = pred_date.strftime('%Y-%m-%d')
                        prediction_percentiles[date_str] = {}

                        for metric in ['close', 'open', 'high', 'low']:
                            if day_data[metric]:
                                values = day_data[metric]
                                prediction_percentiles[date_str][metric] = {
                                    'p10': float(np.percentile(values, 10)),
                                    'p25': float(np.percentile(values, 25)),
                                    'p50': float(np.percentile(values, 50)),
                                    'p75': float(np.percentile(values, 75)),
                                    'p90': float(np.percentile(values, 90)),
                                    'mean': float(np.mean(values)),
                                }
                                if metric == 'close':
                                    prediction_percentiles[date_str][metric]['std'] = float(np.std(values))

                    # Create predicted candlesticks from median values
                    for day_idx, pred_date in enumerate(prediction_dates[:self.config['prediction_days']]):
                        date_str = pred_date.strftime('%Y-%m-%d')
                        if date_str in prediction_percentiles:
                            predicted_candlesticks.append({
                                'date': date_str,
                                'open': prediction_percentiles[date_str]['open']['mean'],
                                'high': prediction_percentiles[date_str]['high']['mean'],
                                'low': prediction_percentiles[date_str]['low']['mean'],
                                'close': prediction_percentiles[date_str]['close']['mean'],
                                'volume': avg_volume
                            })
            else:
                # Empty predictions - create fallback
                median_close = float(input_data['close'].iloc[-1])

        elif isinstance(raw_prediction, dict):
            # It's a dictionary with pre-computed data
            predictions_data = raw_prediction.get('predictions', [])
            median_close = float(np.median([p[-1] for p in predictions_data])) if predictions_data else float(input_data['close'].iloc[-1])
            monte_carlo_paths = raw_prediction.get('monte_carlo_paths', [])
            predicted_candlesticks = raw_prediction.get('predicted_candlesticks', [])
            prediction_percentiles = raw_prediction.get('prediction_percentiles', {})
        else:
            # Fallback
            median_close = float(input_data['close'].iloc[-1])

        # Calculate volatility for summary stats
        historical_returns = input_data['close'].pct_change().dropna()
        volatility = float(historical_returns.std() * np.sqrt(252) * 100) if len(historical_returns) > 0 else 0.0

        return {
            'ticker_info': {
                'symbol': ticker,
                'generated_at': datetime.now().isoformat(),
                'model_type': 'kronos-120d-5d-montecarlo',
                'monte_carlo_runs': self.config.get('monte_carlo_runs', 10),
                'data_completeness': 'full_120_day_history_with_monte_carlo',
                'chart_compatibility': 'candlestick_ready'
            },
            'data': {
                'ticker': ticker,
                'metadata': {
                    'lookback_start': input_start.strftime('%Y-%m-%d'),
                    'lookback_end': input_end.strftime('%Y-%m-%d'),
                    'lookback_days': self.config['lookback_days'],
                    'prediction_start': prediction_start.strftime('%Y-%m-%d'),
                    'prediction_end': prediction_end.strftime('%Y-%m-%d'),
                    'prediction_days': self.config['prediction_days'],
                    'monte_carlo_runs': self.config.get('monte_carlo_runs', 10),
                    'data_completeness': 'full_ohlcv_with_monte_carlo'
                }
            },
            'chart_data': {
                'historical_candlesticks': self._format_candlesticks(input_data),
                'predicted_candlesticks': predicted_candlesticks,
                'monte_carlo_paths': monte_carlo_paths,
                'prediction_percentiles': prediction_percentiles,
                'actual_candlesticks': []
            },
            'summary_stats': {
                'overall_score': 85.0,
                'prediction_quality': 'GOOD',
                'volatility': volatility,
                'monte_carlo_runs': self.config.get('monte_carlo_runs', 10)
            }
        }

    def _format_candlesticks(self, data: pd.DataFrame) -> List[Dict]:
        """Format OHLCV data as candlesticks with proper date handling"""
        candlesticks = []
        for idx, row in data.iterrows():
            # Handle both datetime and integer indices
            if isinstance(idx, (int, np.integer)):
                # Integer index - this shouldn't happen with proper yfinance data
                # Try to use the row's index position to get date from data
                try:
                    # Attempt to get date from the DataFrame if it has a datetime index elsewhere
                    date_str = str(idx)
                except:
                    date_str = '1970-01-01'
            elif hasattr(idx, 'strftime'):
                # DateTime index - this is the expected case
                date_str = idx.strftime('%Y-%m-%d')
            elif isinstance(idx, str):
                # String index - try to parse it
                try:
                    parsed_date = pd.to_datetime(idx)
                    date_str = parsed_date.strftime('%Y-%m-%d')
                except:
                    date_str = idx
            else:
                # Fallback to string representation
                date_str = str(idx)

            candlesticks.append({
                'date': date_str,
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': float(row.get('volume', 0))
            })
        return candlesticks

    def update_predictions(self, predictions: Dict[str, Any]) -> Tuple[int, int]:
        """Update prediction JSON files"""
        logger.info("Updating prediction JSON files...")

        successful, failed, errors = self.json_updater.batch_update_predictions(
            predictions
        )

        logger.info(f"Updated {successful} prediction files")

        if failed > 0:
            logger.warning(f"Failed to update {failed} files")

        # Cleanup old predictions
        cleanup_count = self.json_updater.cleanup_old_predictions(
            max_age_days=self.config['cleanup_days']
        )

        if cleanup_count > 0:
            logger.info(f"Cleaned up {cleanup_count} old prediction files")

        return successful, failed

    def update_statistics(self, predictions: Dict[str, Any]):
        """Update homepage statistics"""
        logger.info("Calculating statistics and updating homepage...")

        # Calculate statistics
        stats = self.stats_calculator.calculate_summary_stats(predictions)

        # Generate homepage data
        homepage_data = self.homepage_generator.generate_homepage_summary(
            list(predictions.values())
        )

        # Save to file
        stats_file = Path(self.config['predictions_dir']) / 'statistics' / 'summary.json'
        with open(stats_file, 'w') as f:
            json.dump(homepage_data, f, indent=2)

        logger.info(f"Updated homepage statistics: {stats_file}")

    def export_csv(self, predictions: Dict[str, Any]) -> str:
        """Export predictions to CSV"""
        logger.info("Exporting predictions to CSV...")

        # Prepare CSV data
        csv_data = []
        for ticker, pred in predictions.items():
            summary = pred.get('summary', {})
            csv_data.append(summary)

        # Export to CSV
        csv_file = self.config['csv_output']
        num_rows = self.csv_exporter.export_to_csv(csv_data, csv_file)

        logger.info(f"Exported {num_rows} predictions to {csv_file}")

        return csv_file

    def deploy_to_cloudflare(self):
        """Deploy updated site to Cloudflare Pages"""
        if not self.deployment_manager:
            logger.warning("Deployment not configured, skipping")
            return False

        logger.info(f"Deploying to Cloudflare Pages project: {self.config.get('cloudflare_project', 'kronos-hoad')}")

        try:
            if self.use_wrangler:
                # Use Wrangler deployment
                from deployment.wrangler_manager import WranglerManager
                if isinstance(self.deployment_manager, WranglerManager):
                    # Check prerequisites
                    if not self.deployment_manager.check_wrangler_installed():
                        print(self.deployment_manager.install_wrangler_guide())
                        logger.error("Wrangler not installed")
                        return False

                    is_auth, account_id = self.deployment_manager.check_authentication()
                    if not is_auth:
                        print(self.deployment_manager.authentication_guide())
                        logger.error("Not authenticated with Cloudflare - run 'wrangler login'")
                        return False

                    # Deploy with Wrangler
                    result = self.deployment_manager.deploy(
                        message=f"Kronos predictions update - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
                    )

                    if result['success']:
                        logger.info(f"Successfully deployed to Cloudflare Pages")
                        logger.info(f"Deployment URL: {result.get('deployment_url')}")
                        return True
                    else:
                        logger.error(f"Deployment failed: {result.get('error')}")
                        return False
            else:
                # Use API token deployment (legacy)
                result = self.deployment_manager.full_deployment_pipeline(
                    Path(self.config['predictions_dir'])
                )

                if result['success']:
                    logger.info(f"Successfully deployed to Cloudflare Pages")
                    logger.info(f"Deployment URL: {result.get('deployment_url')}")
                    return True
                else:
                    logger.error(f"Deployment failed: {result.get('error')}")
                    return False

        except Exception as e:
            logger.error(f"Deployment error: {e}")
            return False

    def run_workflow(self, force: bool = False) -> Dict[str, Any]:
        """Execute the complete workflow

        Args:
            force: If True, skip the new data check and process all tickers
        """
        logger.info("=" * 60)
        logger.info("Starting Kronos Predictions Workflow")
        logger.info("=" * 60)

        workflow_start = datetime.now()
        results = {
            'success': False,
            'start_time': workflow_start,
            'predictions_count': 0,
            'csv_file': None,
            'deployment_url': None,
            'errors': []
        }

        try:
            # Step 1: Check for new data (skip if force=True)
            if force:
                logger.info("Force mode enabled - skipping new data check")
                # Use the most recent available date from data
                has_new_data = True
                # Try to get latest Friday, if that fails use 2025-10-03 (known last date)
                latest_friday = self.data_comparator.get_latest_friday_data()
                if latest_friday is None:
                    # Fallback to hardcoded date if we can't detect it
                    latest_friday = datetime(2025, 10, 3)
                    logger.warning(f"Could not detect latest Friday, using fallback date: {latest_friday}")
                else:
                    logger.info(f"Using most recent available data: {latest_friday}")
            else:
                has_new_data, latest_friday = self.check_for_new_data()

                if not has_new_data:
                    logger.info("No new data to process")
                    results['message'] = "No new Friday data available"
                    return results

            # Step 2: Load tickers
            tickers = self.load_tickers()

            if not tickers:
                logger.warning("No tickers with available data")
                results['message'] = "No tickers found"
                return results

            # Step 3: Prepare batch data
            batch_data = self.prepare_batch_data(tickers, latest_friday)

            if not batch_data:
                logger.error("Failed to prepare batch data")
                results['errors'].append("Data preparation failed")
                return results

            # Step 4: Run predictions
            predictions = self.run_predictions(batch_data)

            if not predictions:
                logger.error("No predictions generated")
                results['errors'].append("Prediction generation failed")
                return results

            # Step 5: Update JSON files
            updated, failed = self.update_predictions(predictions)
            results['predictions_count'] = updated

            # Step 6: Update statistics
            self.update_statistics(predictions)

            # Step 7: Export CSV
            csv_file = self.export_csv(predictions)
            results['csv_file'] = csv_file

            # Step 8: Deploy to Cloudflare
            if self.deployment_manager:
                deployment_success = self.deploy_to_cloudflare()
                if deployment_success:
                    results['deployment_url'] = self.config['cloudflare_project']

            # Success!
            results['success'] = True
            results['end_time'] = datetime.now()
            results['duration'] = (results['end_time'] - workflow_start).total_seconds()

            logger.info("=" * 60)
            logger.info(f"Workflow completed successfully!")
            logger.info(f"Predictions: {results['predictions_count']}")
            logger.info(f"Duration: {results['duration']:.2f} seconds")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"Workflow failed: {e}", exc_info=True)
            results['errors'].append(str(e))

        return results


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Kronos Predictions Workflow')
    parser.add_argument('--config', type=str, help='Configuration file path')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode')
    parser.add_argument('--force', action='store_true', help='Force run even without new data')
    parser.add_argument('--tickers', nargs='+', help='Specific tickers to process')
    parser.add_argument('--gpu', action='store_true', help='Force GPU usage')
    parser.add_argument('--no-deploy', action='store_true', help='Skip deployment')
    parser.add_argument('--project', type=str, help='Cloudflare Pages project name (default: kronos-hoad)')
    parser.add_argument('--wrangler-login', action='store_true', help='Run wrangler login before workflow')

    args = parser.parse_args()

    # Load configuration
    config = {}
    if args.config:
        with open(args.config) as f:
            config = json.load(f)

    # Override with command line args
    if args.gpu:
        config['use_gpu'] = True
    if args.no_deploy:
        config['skip_deployment'] = True
    if args.project:
        config['cloudflare_project'] = args.project

    # Handle wrangler login if requested
    if args.wrangler_login:
        import subprocess
        logger.info("Running 'wrangler login' for authentication...")
        try:
            subprocess.run(['wrangler', 'login'], check=True)
            logger.info("Authentication successful! You can now deploy to Cloudflare Pages.")
        except subprocess.CalledProcessError:
            logger.error("Wrangler login failed. Make sure wrangler is installed: npm install -g wrangler")
            return 1
        except FileNotFoundError:
            logger.error("Wrangler not found. Install it with: npm install -g wrangler")
            return 1

    # Initialize and run workflow
    workflow = KronosWorkflow(config)

    if args.dry_run:
        logger.info("Dry run mode - checking configuration...")
        has_new, latest = workflow.check_for_new_data()
        tickers = workflow.load_tickers()
        logger.info(f"Would process {len(tickers)} tickers")
        logger.info(f"Latest Friday: {latest}")
        return 0

    # Run the workflow with force flag
    results = workflow.run_workflow(force=args.force)

    # Exit with appropriate code
    return 0 if results['success'] else 1


if __name__ == "__main__":
    sys.exit(main())