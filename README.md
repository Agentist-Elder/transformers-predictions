# 🤖 Transformers Predictions

A comprehensive web dashboard for visualizing OHLCV (Open, High, Low, Close, Volume) stock prediction data with Monte Carlo analysis powered by transformer models.

## 🌐 Live Demo

**GitHub Pages**: https://jedarden.github.io/transformers-predictions

## ✨ Key Features

### 🔍 **Real-Time Search**
- **Instant search**: Type any ticker symbol for immediate results
- **Auto-complete**: Results appear as you type (300ms debounce)
- **Smart validation**: Shows "[Ticker] not found" for invalid symbols
- **No button required**: Search happens automatically

### 📈 **Professional Candlestick Charts**
- 🟢 **Green candlesticks**: Bullish days (close ≥ open)
- 🔴 **Red candlesticks**: Bearish days (close < open)
- **High-Low wicks**: Complete daily trading range visualization
- **Historical context**: 50 days of market data

### 🎯 **Advanced Prediction Visualization**
- **Monte Carlo analysis**: 10 simulation paths with uncertainty ranges
- **Confidence bands**: Statistical prediction intervals (10th-90th, 25th-75th percentiles)
- **Actual vs predicted**: Real market data overlay for validation
- **Interactive controls**: Toggle different chart elements

### 📊 **Comprehensive Analytics**
- **Accuracy metrics**: MAPE, RMSE, MAE for all OHLCV components
- **Performance scores**: Overall model rating (0-100 scale)
- **Quality indicators**: Excellent, Good, Fair, Poor classifications
- **Technical analysis**: Support/resistance levels, volatility patterns

## 🚀 Available Sample Tickers

Try these examples:
- **AAPL** - Apple Inc. (Excellent prediction quality - 85.1 score)
- **TSLA** - Tesla Inc. (High-volatility analysis)
- **MSFT** - Microsoft Corporation (Large-cap stability)
- **GOOGL** - Alphabet Inc. (Tech sector analysis)
- **ZEPP** - Zepp Health Corporation (Fair prediction quality - 41.7 score)

## 🛠️ Technical Implementation

### **Frontend Stack**
- **Pure JavaScript**: No frameworks, fast loading
- **Chart.js**: Professional financial chart rendering
- **CSS3**: Modern responsive design with gradients
- **HTML5**: Semantic structure optimized for accessibility

### **GitHub Pages Compatible**
- **Static hosting**: No server required, pure client-side
- **Direct JSON loading**: Fetches prediction files directly
- **CDN libraries**: Chart.js and date adapters from CDN
- **Responsive design**: Mobile-friendly layout

### **Data Structure**
Each ticker includes:
- **50 days** historical OHLCV data
- **10 Monte Carlo** simulation paths (5 days each)
- **Statistical summaries** with percentiles and confidence intervals
- **Performance metrics** with accuracy scores
- **Technical indicators** (support/resistance, volatility)

## 📱 User Experience Features

### **Real-Time Interaction**
- **Type-to-search**: Results appear as you type ticker symbols
- **Instant feedback**: Immediate validation and error handling
- **Smooth animations**: Loading states and transitions
- **Touch-friendly**: Optimized for mobile and tablet use

### **Chart Interactivity**
- **Zoom & Pan**: Full chart navigation capabilities
- **Rich tooltips**: Complete OHLCV data on hover
- **Toggle controls**: Show/hide prediction bands, simulations, actual data
- **Professional styling**: Financial-grade visualization

### **Responsive Design**
- **Mobile-first**: Designed for all screen sizes
- **Adaptive layout**: Cards and grids adjust to screen width
- **Touch interactions**: Mobile-optimized controls
- **Fast loading**: Optimized assets and minimal dependencies

## 🔧 Development Setup

### **Local Development**
```bash
# Clone the repository
git clone https://github.com/jedarden/transformers-predictions.git
cd transformers-predictions

# Serve locally (optional - can open index.html directly)
python -m http.server 8000
# or
npx serve .

# Open browser
open http://localhost:8000
```

### **Adding More Tickers**
To add additional ticker data:
1. Copy JSON files to the `data/` directory
2. Ensure files follow the naming convention: `{TICKER}_ohlcv_prediction.json`
3. Files will be automatically available for search

## 📊 Data Format

The dashboard expects JSON files with this structure:
```json
{
  "ticker_info": {
    "symbol": "AAPL",
    "model_type": "complete-ohlcv-monte-carlo",
    "chart_compatibility": "candlestick_ready"
  },
  "chart_data": {
    "historical_candlesticks": [...],
    "actual_candlesticks": [...],
    "monte_carlo_simulations": [...],
    "predicted_ohlcv_summary": {...}
  },
  "data": {
    "prediction_metrics": {...},
    "ohlcv_analysis": {...}
  }
}
```

## 🚀 Deployment to GitHub Pages

### **Automatic Deployment**
1. Push changes to the `main` branch
2. GitHub Actions automatically deploys to GitHub Pages
3. Live site updates within 2-3 minutes

### **Manual Setup**
1. Fork or clone this repository
2. Enable GitHub Pages in repository settings
3. Select "GitHub Actions" as the source
4. Push to `main` branch to trigger deployment

## 🎯 Performance Features

- **Fast loading**: Minimal dependencies, optimized assets
- **Instant search**: Real-time ticker lookup with debouncing
- **Smooth interactions**: Hardware-accelerated animations
- **Mobile optimized**: Touch-friendly interface design

## 📈 Financial Analysis Features

- **Candlestick patterns**: Traditional financial chart visualization
- **Volume analysis**: Trading volume patterns and statistics
- **Volatility indicators**: Market volatility and risk metrics
- **Technical levels**: Support and resistance price levels
- **Prediction accuracy**: Model performance validation with actual data

## 🔗 Links

- **Live Dashboard**: https://jedarden.github.io/transformers-predictions
- **Source Code**: https://github.com/jedarden/transformers-predictions
- **Issues**: https://github.com/jedarden/transformers-predictions/issues

---

Built with ❤️ for financial data visualization and stock market prediction analysis.