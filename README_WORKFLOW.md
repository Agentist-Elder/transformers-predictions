# Kronos Predictions Workflow

## Overview

This is a comprehensive Test-Driven Development (TDD) implementation of the transformers-predictions workflow that automatically generates stock price predictions using the Kronos GPU model.

## 🚀 Quick Start with Cloudflare Pages

### Step 1: Install Wrangler (if not installed)
```bash
npm install -g wrangler
```

### Step 2: Authenticate with Cloudflare
```bash
# Option 1: Use the workflow's built-in login
python3 kronos_workflow.py --wrangler-login

# Option 2: Login directly
wrangler login
```

### Step 3: Run the Workflow
```bash
# Deploy to default project (kronos-hoad)
python3 kronos_workflow.py

# Deploy to custom project
python3 kronos_workflow.py --project my-predictions-site
```

## Features

- **Automated Friday Data Detection**: Checks for new Friday market data
- **GPU-Optimized Batch Processing**: Dynamic batch sizing to maximize GPU utilization
- **120-Bar Lookback Windows**: Uses 120 trading days of historical data
- **Monte Carlo Predictions**: Generates multiple prediction paths for confidence intervals
- **JSON Web Integration**: Updates prediction files for web dashboard
- **CSV Export**: Creates summary CSV with all prediction metrics
- **Statistics Generation**: Calculates market analytics and homepage metrics
- **Cloudflare Deployment**: Automatic deployment to Kronos HOAD pages

## Workflow Steps

1. **Data Validation**: Checks finnhub-data for new Friday data
2. **Ticker Loading**: Loads 5,793+ ticker symbols from unique_underlying_symbols.txt
3. **Batch Preparation**: Prepares 120-day lookback windows ending on Friday
4. **GPU Prediction**: Runs predictions projecting to next Friday
5. **JSON Updates**: Updates individual prediction files
6. **Statistics Calculation**: Generates homepage analytics
7. **CSV Export**: Creates summary with predicted moves
8. **Deployment**: Pushes to Cloudflare Pages

## Installation

```bash
# Install required dependencies
pip install pandas numpy torch parquet pyarrow

# Clone the repository
git clone <repository>
cd transformers-predictions
```

## Configuration

Edit `workflow_config.json` to customize settings:

```json
{
  "finnhub_data_dir": "/path/to/finnhub-data",
  "predictions_dir": "/path/to/predictions",
  "ticker_file": "/path/to/unique_underlying_symbols.txt",
  "cloudflare_project": "kronos-hoad",  // Your Cloudflare Pages project name
  "use_wrangler": true,                  // Use Wrangler CLI (recommended)
  "lookback_days": 120,
  "prediction_days": 5,
  "monte_carlo_runs": 10,
  "use_gpu": true
}
```

## Usage

### Run Full Workflow
```bash
python3 kronos_workflow.py
```

### Run with Custom Config
```bash
python3 kronos_workflow.py --config custom_config.json
```

### Dry Run (Check Only)
```bash
python3 kronos_workflow.py --dry-run
```

### Process Specific Tickers
```bash
python3 kronos_workflow.py --tickers AAPL MSFT GOOGL
```

### Skip Deployment
```bash
python3 kronos_workflow.py --no-deploy
```

### Deploy to Custom Cloudflare Project
```bash
# Specify project name
python3 kronos_workflow.py --project my-custom-project

# Login and deploy in one command
python3 kronos_workflow.py --wrangler-login --project my-project
```

## Testing

Run the comprehensive test suite:

```bash
# Run integration tests
python3 test_workflow.py

# Run unit tests (from project root)
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html
```

## CSV Output Format

The workflow generates a CSV with the following columns:

| Column | Description |
|--------|-------------|
| ticker | Stock symbol |
| input_start_date | Start of 120-bar lookback |
| input_end_date | End date (Friday) |
| input_length | Number of input bars (120) |
| prediction_start_date | Next Monday |
| prediction_end_date | Next Friday |
| prediction_length | Days predicted (5) |
| input_end_date_close | Friday closing price |
| predicted_end_close_price | Predicted Friday close |
| predicted_move | Percentage change |

## GPU Optimization

The system automatically optimizes GPU batch sizes:

1. Starts with full batch (all tickers)
2. On OOM error, reduces to 1/2, then 1/3, 1/4, etc.
3. Remembers optimal batch size for future runs
4. Monitors GPU memory usage in real-time
5. Clears cache between batches

## Architecture

### Core Modules

- **DataComparator**: Validates new Friday data availability
- **BatchProcessor**: GPU-optimized batch prediction engine
- **KronosModelWrapper**: Interface to Kronos transformer model
- **JSONUpdater**: Atomic updates to prediction files
- **StatisticsCalculator**: Analytics and metrics generation
- **HomepageGenerator**: Web dashboard data formatting
- **CSVExporter**: Summary report generation
- **DeploymentManager**: Cloudflare Pages deployment

### Data Flow

```
finnhub-data/ → Data Validation → Batch Processing → GPU Predictions
                                                          ↓
Web Dashboard ← JSON Files ← Statistics ← Monte Carlo Aggregation
      ↓
Cloudflare Pages ← Deployment ← CSV Export
```

## Performance

- Processes 5,700+ tickers in batches
- 120-day lookback windows
- 10 Monte Carlo simulation runs per ticker
- GPU acceleration with CUDA
- Parallel data loading with 4 workers
- Atomic file updates for consistency

## Error Handling

- Automatic retry with batch size reduction on GPU OOM
- Graceful degradation to CPU if GPU unavailable
- Data validation with integrity checks
- Rollback capability on deployment failures
- Comprehensive logging for debugging

## Monitoring

Check logs in:
- `kronos_workflow.log` - Main workflow execution
- `batch_processor.log` - GPU batch processing
- `deployment.log` - Cloudflare deployment

## Cloudflare Deployment

### Using Wrangler CLI (Recommended)

The workflow uses Wrangler CLI by default for deployment, which supports OAuth authentication:

```bash
# First-time setup
wrangler login                                    # Authenticate with Cloudflare
python3 kronos_workflow.py                        # Run workflow with deployment

# Custom project deployment
python3 kronos_workflow.py --project my-project   # Deploy to custom project
```

### Using API Tokens (Legacy)

If you prefer API tokens over OAuth, set these environment variables:

```bash
export CLOUDFLARE_API_TOKEN=your_token
export CLOUDFLARE_ACCOUNT_ID=your_account

# Then disable Wrangler in config
# Set "use_wrangler": false in workflow_config.json
```

### Wrangler Authentication

If not authenticated, the workflow will display:

```
╔════════════════════════════════════════════════════════════════╗
║                  Cloudflare Authentication Required              ║
╠════════════════════════════════════════════════════════════════╣
║ You need to authenticate with Cloudflare to deploy.             ║
║                                                                  ║
║ Run this command to login:                                      ║
║   $ wrangler login                                               ║
║                                                                  ║
║ This will:                                                       ║
║ 1. Open your browser for OAuth authentication                   ║
║ 2. Save credentials locally for future use                      ║
║ 3. Allow deployment to Cloudflare Pages                         ║
║                                                                  ║
║ After logging in, run the workflow again.                       ║
║                                                                  ║
║ Project to deploy: kronos-hoad                                  ║
╚════════════════════════════════════════════════════════════════╝
```

## Troubleshooting

### No New Data Found
- Verify finnhub-data contains recent Friday data
- Check data file format (should be {TICKER}_1D.parquet)

### GPU Out of Memory
- Reduce `monte_carlo_runs` in config
- Lower `max_batch_size` setting
- System will auto-adjust batch sizes

### Deployment Failures
- Verify Cloudflare credentials
- Check network connectivity
- Review deployment.log for errors

## Development

The workflow was built using Test-Driven Development with:
- 9 concurrent development agents
- Comprehensive unit and integration tests
- Mock GPU and model testing
- Performance benchmarking
- Memory leak detection

## License

See LICENSE file in repository root.

## Support

For issues or questions, please check:
- Integration test results: `python3 test_workflow.py`
- Workflow logs: `kronos_workflow.log`
- GPU memory usage during execution