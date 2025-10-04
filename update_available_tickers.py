#!/usr/bin/env python3
"""
Update available_tickers.json with all tickers that have OHLCV prediction files
"""

import json
import os
from pathlib import Path
from datetime import datetime

def main():
    data_dir = Path("/home/jarden/transformers-predictions/data")

    # Find all OHLCV prediction files
    prediction_files = list(data_dir.glob("*_ohlcv_prediction.json"))

    # Extract ticker names
    tickers = []
    for file in prediction_files:
        ticker = file.stem.replace("_ohlcv_prediction", "")
        tickers.append(ticker)

    # Sort tickers
    tickers.sort()

    # Categorize tickers (basic categorization)
    categories = {
        "technology": 0,
        "finance": 0,
        "healthcare": 0,
        "consumer": 0,
        "energy": 0,
        "industrial": 0,
        "international": 0,
        "etfs": 0,
        "other": 0
    }

    # Simple categorization based on common patterns
    etf_patterns = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'EFA', 'EEM', 'AGG', 'GLD', 'SLV']
    tech_patterns = ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'AMD', 'INTC', 'CRM', 'ORCL', 'IBM']
    finance_patterns = ['JPM', 'BAC', 'GS', 'MS', 'C', 'WFC', 'BLK', 'V', 'MA', 'AXP']

    for ticker in tickers:
        if any(pattern in ticker for pattern in etf_patterns):
            categories["etfs"] += 1
        elif any(pattern in ticker for pattern in tech_patterns):
            categories["technology"] += 1
        elif any(pattern in ticker for pattern in finance_patterns):
            categories["finance"] += 1
        else:
            categories["other"] += 1

    # Create the JSON structure
    output = {
        "tickers": tickers,
        "total_count": len(tickers),
        "last_updated": datetime.now().isoformat() + "Z",
        "categories": categories
    }

    # Save to file
    output_file = data_dir / "available_tickers.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"Updated available_tickers.json with {len(tickers)} tickers")
    print(f"Sample tickers: {tickers[:10]}")

if __name__ == "__main__":
    main()