# OHLCV Prediction JSON Format Documentation

## File Naming Convention
`[TICKER]_ohlcv_prediction.json` where `[TICKER]` is the stock symbol (e.g., AAPL, TSLA)

## JSON Structure

### Root Level
```json
{
  "ticker_info": {...},
  "data": {...},
  "chart_data": {...},
  "summary_stats": {...}
}
```

### 1. ticker_info
Contains metadata about the prediction model and data generation.

| Field | Type | Description |
|-------|------|-------------|
| symbol | string | Stock ticker symbol (e.g., "AAPL") |
| generated_at | string (ISO 8601) | Timestamp when prediction was generated |
| model_type | string | Model identifier (e.g., "kronos-120d-5d") |
| data_completeness | string | Data quality indicator (e.g., "full_120_day_history") |
| chart_compatibility | string | Charting compatibility flag (e.g., "candlestick_ready") |

### 2. data
Contains ticker and metadata information.

#### data.ticker
- Type: string
- Description: Stock ticker symbol (duplicated from ticker_info.symbol)

#### data.metadata
| Field | Type | Description |
|-------|------|-------------|
| lookback_start | string (YYYY-MM-DD) | Start date of historical data |
| lookback_end | string (YYYY-MM-DD) | End date of historical data |
| lookback_days | integer | Number of historical days used |
| prediction_start | string (YYYY-MM-DD) | Start date of predictions |
| prediction_end | string (YYYY-MM-DD) | End date of predictions |
| prediction_days | integer | Number of predicted days |
| data_completeness | string | OHLCV data completeness indicator |

### 3. chart_data
Contains the main candlestick data for charting.

#### chart_data.historical_candlesticks
Array of historical OHLCV data points.

Each candlestick object contains:
| Field | Type | Description |
|-------|------|-------------|
| date | string (YYYY-MM-DD) | Trading date |
| open | float | Opening price |
| high | float | Highest price |
| low | float | Lowest price |
| close | float | Closing price |
| volume | float | Trading volume |

#### chart_data.predicted_candlesticks
Array of predicted OHLC data points (without volume).

Each predicted candlestick contains:
| Field | Type | Description |
|-------|------|-------------|
| date | string (YYYY-MM-DD) | Predicted trading date |
| open | float | Predicted opening price |
| high | float | Predicted highest price |
| low | float | Predicted lowest price |
| close | float | Predicted closing price |

Note: Volume is not predicted.

#### chart_data.actual_candlesticks
Array for storing actual OHLCV data when available for comparison.
- Initially empty array `[]`
- Same structure as historical_candlesticks when populated

### 4. summary_stats
Contains prediction quality metrics.

| Field | Type | Description |
|-------|------|-------------|
| overall_score | float | Prediction quality score (0-100) |
| prediction_quality | string | Quality assessment (e.g., "EXCELLENT", "GOOD", "FAIR") |
| volatility | float | Volatility measure of the prediction |

## Example Usage

### Reading the JSON
```python
import json

with open('AAPL_ohlcv_prediction.json', 'r') as f:
    data = json.load(f)

# Access historical data
historical = data['chart_data']['historical_candlesticks']
print(f"Historical data: {len(historical)} days")
print(f"From {historical[0]['date']} to {historical[-1]['date']}")

# Access predictions
predictions = data['chart_data']['predicted_candlesticks']
print(f"Predictions: {len(predictions)} days")
print(f"From {predictions[0]['date']} to {predictions[-1]['date']}")

# Check quality
quality = data['summary_stats']['prediction_quality']
score = data['summary_stats']['overall_score']
print(f"Quality: {quality}, Score: {score}")
```

### Data Validation
- Historical candlesticks should have 120 entries (for 120-day lookback)
- Predicted candlesticks should have 5 entries (for 5-day prediction)
- All price values (open, high, low, close) should be positive floats
- High >= Low for all candlesticks
- High >= Open and High >= Close
- Low <= Open and Low <= Close
- Dates should be in chronological order
- Volume should be positive (only in historical data)

## Model Information
The `model_type` field indicates the prediction model used:
- `kronos-120d-5d`: Uses 120 days of historical data to predict 5 days ahead

## Data Completeness Indicators
- `full_ohlcv`: Complete OHLCV data available
- `full_120_day_history`: Full 120-day historical period available
- `candlestick_ready`: Data formatted for candlestick charting