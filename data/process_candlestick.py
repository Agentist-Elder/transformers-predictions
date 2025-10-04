#!/usr/bin/env python3
"""
Data Processing Agent - Candlestick Data Processor
Monitors prediction files and processes OHLCV data for Chart.js visualization
"""

import json
import os
import glob
import time
from datetime import datetime, timedelta
from collections import defaultdict
import statistics
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CandlestickDataProcessor:
    def __init__(self, data_folder="/home/jarden/transformers-predictions/data/"):
        self.data_folder = data_folder
        self.processed_files = set()
        self.market_overview = {
            "total_tickers": 0,
            "bullish_count": 0,
            "bearish_count": 0,
            "neutral_count": 0,
            "top_gainers": [],
            "top_losers": [],
            "highest_volume": [],
            "most_volatile": [],
            "last_updated": None
        }
        self.candlestick_data = {}

    def monitor_and_process(self, watch_mode=False):
        """Monitor for new files and process them"""
        logger.info("Starting candlestick data processing...")

        if watch_mode:
            logger.info("Watching for new files...")
            while True:
                self.process_new_files()
                time.sleep(10)  # Check every 10 seconds
        else:
            # Single run processing
            self.process_all_files()

    def process_new_files(self):
        """Process any new prediction files"""
        prediction_files = self.find_prediction_files()
        new_files = [f for f in prediction_files if f not in self.processed_files]

        if new_files:
            logger.info(f"Found {len(new_files)} new files to process")
            for file_path in new_files:
                self.process_prediction_file(file_path)
                self.processed_files.add(file_path)

            self.update_market_overview()
            self.save_processed_data()

    def process_all_files(self):
        """Process all available prediction files"""
        prediction_files = self.find_prediction_files()
        logger.info(f"Processing {len(prediction_files)} prediction files...")

        for file_path in prediction_files:
            self.process_prediction_file(file_path)
            self.processed_files.add(file_path)

        self.update_market_overview()
        self.save_processed_data()

    def find_prediction_files(self):
        """Find all prediction JSON files in the data folder"""
        # Look for both OHLCV and timestamped prediction files
        ohlcv_files = glob.glob(os.path.join(self.data_folder, "*_ohlcv_prediction.json"))
        timestamped_files = glob.glob(os.path.join(self.data_folder, "*_prediction_*.json"))

        return ohlcv_files + timestamped_files

    def process_prediction_file(self, file_path):
        """Process a single prediction file"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)

            filename = os.path.basename(file_path)

            # Determine file type and extract ticker
            if "_ohlcv_prediction.json" in filename:
                ticker = filename.replace("_ohlcv_prediction.json", "")
                processed_data = self.process_ohlcv_file(data, ticker)
            elif "_prediction_" in filename:
                # Extract ticker from timestamped file
                ticker = filename.split("_prediction_")[0]
                processed_data = self.process_timestamped_file(data, ticker)
            else:
                logger.warning(f"Unknown file format: {filename}")
                return

            if processed_data:
                self.candlestick_data[ticker] = processed_data
                logger.info(f"Processed {ticker} from {filename}")

        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")

    def process_ohlcv_file(self, data, ticker):
        """Process OHLCV prediction file format"""
        try:
            if "chart_data" not in data:
                return None

            chart_data = data["chart_data"]

            # Extract historical candlesticks
            historical = chart_data.get("historical_candlesticks", [])
            actual = chart_data.get("actual_candlesticks", [])

            # Get latest price for trend analysis
            latest_price = None
            if actual:
                latest_price = actual[-1]["close"]
            elif historical:
                latest_price = historical[-1]["close"]

            # Calculate price change from historical to actual
            price_change = 0
            price_change_percent = 0
            if historical and actual:
                start_price = historical[-1]["close"]
                end_price = actual[-1]["close"]
                price_change = end_price - start_price
                price_change_percent = (price_change / start_price) * 100

            # Get volume data
            volume_data = []
            if actual:
                volume_data = [candle["volume"] for candle in actual[-5:]]  # Last 5 days
            elif historical:
                volume_data = [candle["volume"] for candle in historical[-5:]]

            avg_volume = statistics.mean(volume_data) if volume_data else 0

            # Calculate volatility (price range)
            volatility = 0
            if actual:
                prices = [candle["close"] for candle in actual[-10:]]  # Last 10 days
                if len(prices) > 1:
                    volatility = statistics.stdev(prices) / statistics.mean(prices) * 100

            return {
                "ticker": ticker,
                "historical_candlesticks": historical,
                "actual_candlesticks": actual,
                "monte_carlo_simulations": chart_data.get("monte_carlo_simulations", []),
                "latest_price": latest_price,
                "price_change": price_change,
                "price_change_percent": price_change_percent,
                "average_volume": avg_volume,
                "volatility": volatility,
                "data_type": "ohlcv_complete",
                "prediction_quality": data.get("summary_stats", {}).get("prediction_quality", "unknown"),
                "overall_score": data.get("summary_stats", {}).get("overall_score", 0)
            }

        except Exception as e:
            logger.error(f"Error processing OHLCV file for {ticker}: {e}")
            return None

    def process_timestamped_file(self, data, ticker):
        """Process timestamped prediction file format"""
        try:
            if "ohlcv_data" not in data:
                return None

            ohlcv_data = data["ohlcv_data"]
            market_data = data.get("market_data", {})

            # Format as candlestick data
            candlesticks = []
            for item in ohlcv_data:
                candlesticks.append({
                    "date": item["date"],
                    "open": item["open"],
                    "high": item["high"],
                    "low": item["low"],
                    "close": item["close"],
                    "volume": item["volume"]
                })

            latest_price = market_data.get("latest_close", 0)
            volatility = market_data.get("volatility_percent", 0)
            avg_volume = market_data.get("average_volume", 0)

            # Calculate price change (last 5 days if available)
            price_change = 0
            price_change_percent = 0
            if len(candlesticks) >= 5:
                start_price = candlesticks[-5]["close"]
                end_price = candlesticks[-1]["close"]
                price_change = end_price - start_price
                price_change_percent = (price_change / start_price) * 100

            return {
                "ticker": ticker,
                "historical_candlesticks": candlesticks,
                "actual_candlesticks": [],
                "monte_carlo_simulations": [],
                "latest_price": latest_price,
                "price_change": price_change,
                "price_change_percent": price_change_percent,
                "average_volume": avg_volume,
                "volatility": volatility,
                "data_type": "timestamped",
                "prediction_quality": "unknown",
                "overall_score": 0
            }

        except Exception as e:
            logger.error(f"Error processing timestamped file for {ticker}: {e}")
            return None

    def update_market_overview(self):
        """Update market overview statistics"""
        if not self.candlestick_data:
            return

        total_tickers = len(self.candlestick_data)
        bullish = []
        bearish = []
        neutral = []

        gainers = []
        losers = []
        volume_leaders = []
        volatile_stocks = []

        for ticker, data in self.candlestick_data.items():
            price_change_pct = data.get("price_change_percent", 0)

            # Categorize trend
            if price_change_pct > 1:
                bullish.append(ticker)
            elif price_change_pct < -1:
                bearish.append(ticker)
            else:
                neutral.append(ticker)

            # Collect for rankings
            gainers.append({
                "ticker": ticker,
                "change_percent": price_change_pct,
                "price": data.get("latest_price", 0)
            })

            volume_leaders.append({
                "ticker": ticker,
                "volume": data.get("average_volume", 0),
                "price": data.get("latest_price", 0)
            })

            volatile_stocks.append({
                "ticker": ticker,
                "volatility": data.get("volatility", 0),
                "price": data.get("latest_price", 0)
            })

        # Sort and get top performers
        gainers.sort(key=lambda x: x["change_percent"], reverse=True)
        losers = sorted(gainers, key=lambda x: x["change_percent"])[:10]
        gainers = gainers[:10]

        volume_leaders.sort(key=lambda x: x["volume"], reverse=True)
        volume_leaders = volume_leaders[:10]

        volatile_stocks.sort(key=lambda x: x["volatility"], reverse=True)
        volatile_stocks = volatile_stocks[:10]

        self.market_overview = {
            "total_tickers": total_tickers,
            "bullish_count": len(bullish),
            "bearish_count": len(bearish),
            "neutral_count": len(neutral),
            "top_gainers": gainers,
            "top_losers": losers,
            "highest_volume": volume_leaders,
            "most_volatile": volatile_stocks,
            "last_updated": datetime.now().isoformat()
        }

        logger.info(f"Market overview updated: {total_tickers} tickers, {len(bullish)} bullish, {len(bearish)} bearish")

    def save_processed_data(self):
        """Save processed data to files for the web app"""
        try:
            # Save candlestick data
            candlestick_file = os.path.join(self.data_folder, "processed_candlestick_data.json")
            with open(candlestick_file, 'w') as f:
                json.dump(self.candlestick_data, f, indent=2)

            # Save market overview
            overview_file = os.path.join(self.data_folder, "market_overview.json")
            with open(overview_file, 'w') as f:
                json.dump(self.market_overview, f, indent=2)

            logger.info(f"Saved processed data: {len(self.candlestick_data)} tickers")

            # Store in memory for swarm coordination
            self.store_in_memory()

        except Exception as e:
            logger.error(f"Error saving processed data: {e}")

    def store_in_memory(self):
        """Store processed data in swarm memory"""
        try:
            import subprocess

            # Store candlestick data
            candlestick_summary = {
                "total_tickers": len(self.candlestick_data),
                "data_types": {},
                "sample_tickers": list(self.candlestick_data.keys())[:10],
                "processing_timestamp": datetime.now().isoformat()
            }

            # Count data types
            for ticker, data in self.candlestick_data.items():
                data_type = data.get("data_type", "unknown")
                candlestick_summary["data_types"][data_type] = candlestick_summary["data_types"].get(data_type, 0) + 1

            # Store in memory using hooks
            subprocess.run([
                "npx", "claude-flow@alpha", "hooks", "post-edit",
                "--memory-key", "swarm/data/candlestick",
                "--file", "processed_candlestick_data.json"
            ], cwd="/home/jarden/transformers-predictions", capture_output=True)

            subprocess.run([
                "npx", "claude-flow@alpha", "hooks", "post-edit",
                "--memory-key", "swarm/data/market_overview",
                "--file", "market_overview.json"
            ], cwd="/home/jarden/transformers-predictions", capture_output=True)

            logger.info("Data stored in swarm memory successfully")

        except Exception as e:
            logger.warning(f"Could not store in swarm memory: {e}")

    def get_summary_stats(self):
        """Get summary statistics for monitoring"""
        return {
            "processed_files": len(self.processed_files),
            "processed_tickers": len(self.candlestick_data),
            "market_overview": self.market_overview
        }

def main():
    """Main execution function"""
    print("Data Processing Agent - Starting candlestick data processing")

    processor = CandlestickDataProcessor()

    # Check for watch mode argument
    watch_mode = "--watch" in sys.argv

    if watch_mode:
        print("Running in watch mode - monitoring for new files...")
        try:
            processor.monitor_and_process(watch_mode=True)
        except KeyboardInterrupt:
            print("Stopping file monitor...")
    else:
        print("Running single processing cycle...")
        processor.monitor_and_process(watch_mode=False)

        # Print summary
        stats = processor.get_summary_stats()
        print(f"\\nProcessing complete!")
        print(f"- Processed files: {stats['processed_files']}")
        print(f"- Processed tickers: {stats['processed_tickers']}")
        print(f"- Bullish tickers: {stats['market_overview']['bullish_count']}")
        print(f"- Bearish tickers: {stats['market_overview']['bearish_count']}")
        print(f"- Neutral tickers: {stats['market_overview']['neutral_count']}")

        if stats['market_overview']['top_gainers']:
            top_gainer = stats['market_overview']['top_gainers'][0]
            print(f"- Top gainer: {top_gainer['ticker']} (+{top_gainer['change_percent']:.2f}%)")

        if stats['market_overview']['top_losers']:
            top_loser = stats['market_overview']['top_losers'][0]
            print(f"- Top loser: {top_loser['ticker']} ({top_loser['change_percent']:.2f}%)")

if __name__ == "__main__":
    main()