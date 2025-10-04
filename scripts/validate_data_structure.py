#!/usr/bin/env python3
"""
Data Structure Validation Script for Transformers Predictions
Validates JSON prediction files for schema compliance and web app readiness
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any, Tuple
import glob

class DataStructureValidator:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.validation_results = {
            'total_files': 0,
            'valid_files': 0,
            'invalid_files': 0,
            'errors': [],
            'warnings': [],
            'schema_compliance': True,
            'web_app_ready': True
        }

    def validate_ticker_info(self, ticker_info: Dict) -> List[str]:
        """Validate ticker_info object structure"""
        errors = []
        required_fields = ['symbol', 'last_update', 'model_type', 'lookback_days', 'prediction_days', 'monte_carlo_runs']

        for field in required_fields:
            if field not in ticker_info:
                errors.append(f"Missing required field in ticker_info: {field}")

        # Validate data types
        if 'symbol' in ticker_info and not isinstance(ticker_info['symbol'], str):
            errors.append("ticker_info.symbol must be string")

        if 'lookback_days' in ticker_info and not isinstance(ticker_info['lookback_days'], int):
            errors.append("ticker_info.lookback_days must be integer")

        if 'prediction_days' in ticker_info and not isinstance(ticker_info['prediction_days'], int):
            errors.append("ticker_info.prediction_days must be integer")

        if 'monte_carlo_runs' in ticker_info and not isinstance(ticker_info['monte_carlo_runs'], int):
            errors.append("ticker_info.monte_carlo_runs must be integer")

        return errors

    def validate_candlestick_data(self, candlesticks: List[Dict], data_type: str) -> List[str]:
        """Validate candlestick data structure"""
        errors = []
        required_fields = ['date', 'open', 'high', 'low', 'close', 'volume']

        for i, candle in enumerate(candlesticks):
            for field in required_fields:
                if field not in candle:
                    errors.append(f"Missing {field} in {data_type}[{i}]")

            # Validate OHLC logic
            if all(k in candle for k in ['open', 'high', 'low', 'close']):
                o, h, l, c = candle['open'], candle['high'], candle['low'], candle['close']
                if not (l <= o <= h and l <= c <= h):
                    errors.append(f"Invalid OHLC values in {data_type}[{i}]: O={o}, H={h}, L={l}, C={c}")

            # Validate date format
            if 'date' in candle:
                try:
                    datetime.strptime(candle['date'], '%Y-%m-%d')
                except ValueError:
                    errors.append(f"Invalid date format in {data_type}[{i}]: {candle['date']}")

        return errors

    def validate_confidence_bands(self, confidence_bands: Dict) -> List[str]:
        """Validate confidence bands structure"""
        errors = []
        required_percentiles = ['p10', 'p25', 'p50', 'p75', 'p90']

        for percentile in required_percentiles:
            if percentile not in confidence_bands:
                errors.append(f"Missing confidence band: {percentile}")
            elif not isinstance(confidence_bands[percentile], list):
                errors.append(f"Confidence band {percentile} must be array")
            else:
                # Validate percentile data structure
                for i, point in enumerate(confidence_bands[percentile]):
                    if not isinstance(point, dict) or 'date' not in point or 'value' not in point:
                        errors.append(f"Invalid confidence band structure in {percentile}[{i}]")

        return errors

    def validate_summary_stats(self, summary_stats: Dict) -> List[str]:
        """Validate summary statistics structure"""
        errors = []
        required_fields = [
            'last_close', 'predicted_close', 'price_change', 'price_change_percent',
            'direction', 'confidence', 'volatility', 'avg_volume', 'data_quality'
        ]

        for field in required_fields:
            if field not in summary_stats:
                errors.append(f"Missing required field in summary_stats: {field}")

        # Validate data_quality sub-object
        if 'data_quality' in summary_stats:
            dq = summary_stats['data_quality']
            dq_required = ['completeness', 'historical_days', 'chart_ready']
            for field in dq_required:
                if field not in dq:
                    errors.append(f"Missing data_quality field: {field}")

        return errors

    def validate_file(self, file_path: str) -> Tuple[bool, List[str], List[str]]:
        """Validate a single prediction file"""
        errors = []
        warnings = []

        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON: {e}")
            return False, errors, warnings
        except Exception as e:
            errors.append(f"File read error: {e}")
            return False, errors, warnings

        # Validate top-level structure
        required_top_level = ['ticker_info', 'data', 'chart_data', 'summary_stats']
        for field in required_top_level:
            if field not in data:
                errors.append(f"Missing top-level field: {field}")

        # Validate ticker_info
        if 'ticker_info' in data:
            errors.extend(self.validate_ticker_info(data['ticker_info']))

        # Validate data section
        if 'data' in data:
            data_section = data['data']
            if 'historical_candlesticks' not in data_section:
                errors.append("Missing data.historical_candlesticks")
            else:
                errors.extend(self.validate_candlestick_data(
                    data_section['historical_candlesticks'], 'historical_candlesticks'
                ))

            if 'predicted_candlesticks' not in data_section:
                errors.append("Missing data.predicted_candlesticks")
            else:
                # Empty predictions are acceptable (model failures)
                if len(data_section['predicted_candlesticks']) == 0:
                    warnings.append("Empty predicted_candlesticks (model prediction failure)")
                else:
                    errors.extend(self.validate_candlestick_data(
                        data_section['predicted_candlesticks'], 'predicted_candlesticks'
                    ))

        # Validate chart_data section
        if 'chart_data' in data:
            chart_data = data['chart_data']
            if 'confidence_bands' in chart_data:
                errors.extend(self.validate_confidence_bands(chart_data['confidence_bands']))

        # Validate summary_stats
        if 'summary_stats' in data:
            errors.extend(self.validate_summary_stats(data['summary_stats']))

        return len(errors) == 0, errors, warnings

    def validate_all_files(self, sample_size: int = None) -> Dict:
        """Validate all prediction files in the data directory"""
        pattern = os.path.join(self.data_dir, "*_ohlcv_prediction.json")
        files = glob.glob(pattern)

        if sample_size:
            files = files[:sample_size]

        self.validation_results['total_files'] = len(files)

        print(f"Validating {len(files)} prediction files...")

        for i, file_path in enumerate(files):
            if i > 0 and i % 100 == 0:
                print(f"Progress: {i}/{len(files)} files validated")

            ticker = os.path.basename(file_path).replace('_ohlcv_prediction.json', '')
            is_valid, errors, warnings = self.validate_file(file_path)

            if is_valid:
                self.validation_results['valid_files'] += 1
            else:
                self.validation_results['invalid_files'] += 1
                self.validation_results['schema_compliance'] = False

            # Store errors and warnings with file context
            for error in errors:
                self.validation_results['errors'].append(f"{ticker}: {error}")

            for warning in warnings:
                self.validation_results['warnings'].append(f"{ticker}: {warning}")

        # Determine web app readiness
        if self.validation_results['invalid_files'] > 0:
            self.validation_results['web_app_ready'] = False

        return self.validation_results

    def generate_report(self) -> str:
        """Generate a validation report"""
        results = self.validation_results

        report = f"""
JSON Data Structure Validation Report
=====================================
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Summary:
- Total files analyzed: {results['total_files']}
- Valid files: {results['valid_files']}
- Invalid files: {results['invalid_files']}
- Schema compliance: {'✅ PASS' if results['schema_compliance'] else '❌ FAIL'}
- Web app ready: {'✅ YES' if results['web_app_ready'] else '❌ NO'}

Validation Rate: {(results['valid_files'] / results['total_files'] * 100):.1f}%

"""

        if results['errors']:
            report += f"\nErrors Found ({len(results['errors'])}):\n"
            for error in results['errors'][:10]:  # Show first 10 errors
                report += f"- {error}\n"
            if len(results['errors']) > 10:
                report += f"... and {len(results['errors']) - 10} more errors\n"

        if results['warnings']:
            report += f"\nWarnings ({len(results['warnings'])}):\n"
            for warning in results['warnings'][:10]:  # Show first 10 warnings
                report += f"- {warning}\n"
            if len(results['warnings']) > 10:
                report += f"... and {len(results['warnings']) - 10} more warnings\n"

        return report

def main():
    """Main validation function"""
    data_dir = "/home/jarden/transformers-predictions/data"
    validator = DataStructureValidator(data_dir)

    # Validate a sample of files for quick analysis
    print("Running JSON data structure validation...")
    results = validator.validate_all_files(sample_size=100)

    # Generate and display report
    report = validator.generate_report()
    print(report)

    # Save detailed results to file
    with open("/home/jarden/transformers-predictions/docs/validation_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print("Detailed results saved to: docs/validation_results.json")

if __name__ == "__main__":
    main()