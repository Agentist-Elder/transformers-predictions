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
            'model_path': '/home/jarden/kronos-pipeline/kronos-base',
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

        # Kronos model wrapper
        from batch_processing.kronos_integration import KronosModelConfig
        model_config = KronosModelConfig(
            model_path=self.config.get('model_path', '/home/jarden/kronos-pipeline/kronos-base'),
            sequence_length=self.config.get('lookback_days', 120),
            prediction_horizon=self.config.get('prediction_days', 5)
        )
        self.model = KronosModelWrapper(model_config)

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
        results = self.batch_processor.run_batch(
            tickers=list(batch_data.keys()),
            lookback_data=batch_data,
            batch_fraction=1.0  # Start with full batch
        )

        # Process results
        predictions = {}
        for ticker, result in results.successful.items():
            predictions[ticker] = self._format_prediction(
                ticker,
                batch_data[ticker],
                result
            )

        logger.info(f"Generated predictions for {len(predictions)} tickers")

        if results.failed:
            logger.warning(f"Failed predictions: {list(results.failed.keys())}")

        return predictions

    def _format_prediction(self, ticker: str,
                          input_data: pd.DataFrame,
                          raw_prediction: Dict) -> Dict:
        """Format prediction for JSON and CSV export"""
        input_start = input_data.index[0]
        input_end = input_data.index[-1]

        # Calculate prediction dates (next week)
        prediction_start = input_end + timedelta(days=3)  # Next Monday
        prediction_end = prediction_start + timedelta(days=4)  # Next Friday

        # Get median prediction from Monte Carlo runs
        predictions = raw_prediction.get('predictions', [])
        if predictions:
            median_close = float(np.median([p[-1] for p in predictions]))
        else:
            median_close = float(input_data['close'].iloc[-1])

        return {
            'ticker_info': {
                'symbol': ticker,
                'model_type': 'Kronos GPU Model (Transformer)',
                'lookback_days': self.config['lookback_days'],
                'prediction_days': self.config['prediction_days'],
                'monte_carlo_runs': self.config['monte_carlo_runs']
            },
            'data': {
                'historical_candlesticks': self._format_candlesticks(input_data),
                'predicted_candlesticks': raw_prediction.get('candlesticks', [])
            },
            'summary': {
                'input_start_date': input_start.strftime('%Y-%m-%d'),
                'input_end_date': input_end.strftime('%Y-%m-%d'),
                'input_length': len(input_data),
                'prediction_start_date': prediction_start.strftime('%Y-%m-%d'),
                'prediction_end_date': prediction_end.strftime('%Y-%m-%d'),
                'prediction_length': self.config['prediction_days'],
                'input_end_date_close': float(input_data['close'].iloc[-1]),
                'predicted_end_close_price': median_close,
                'predicted_move': (median_close / float(input_data['close'].iloc[-1]) - 1) * 100
            }
        }

    def _format_candlesticks(self, data: pd.DataFrame) -> List[Dict]:
        """Format OHLCV data as candlesticks"""
        candlesticks = []
        for idx, row in data.iterrows():
            candlesticks.append({
                'date': idx.strftime('%Y-%m-%d'),
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': int(row.get('volume', 0))
            })
        return candlesticks

    def update_predictions(self, predictions: Dict[str, Any]) -> Tuple[int, int]:
        """Update prediction JSON files"""
        logger.info("Updating prediction JSON files...")

        successful, failed, errors = self.json_updater.batch_update_predictions(
            predictions
        )

        logger.info(f"Updated {len(successful)} prediction files")

        if failed:
            logger.warning(f"Failed to update {len(failed)} files: {failed}")

        # Cleanup old predictions
        cleanup_count = self.json_updater.cleanup_old_predictions(
            max_age_days=self.config['cleanup_days']
        )

        if cleanup_count > 0:
            logger.info(f"Cleaned up {cleanup_count} old prediction files")

        return len(successful), len(failed)

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

    def run_workflow(self) -> Dict[str, Any]:
        """Execute the complete workflow"""
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
            # Step 1: Check for new data
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

    # Run the workflow
    results = workflow.run_workflow()

    # Exit with appropriate code
    return 0 if results['success'] else 1


if __name__ == "__main__":
    sys.exit(main())