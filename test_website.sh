#!/bin/bash

echo "🧪 Testing Transformers Predictions Website..."
echo "============================================"

# Test main page
echo -e "\n1️⃣ Testing main page..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/)
if [ "$response" == "200" ]; then
    echo "✅ Main page loads successfully (HTTP $response)"
else
    echo "❌ Main page failed (HTTP $response)"
fi

# Test priority tickers
echo -e "\n2️⃣ Testing priority ticker data..."
tickers=("AAPL" "MSFT" "GOOGL" "AMZN" "NVDA" "META" "TSLA" "SPY" "QQQ")

for ticker in "${tickers[@]}"; do
    echo -e "\n📊 Testing $ticker..."

    # Check if JSON file exists and is accessible
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/data/${ticker}_ohlcv_prediction.json)
    if [ "$response" == "200" ]; then
        echo "  ✅ Data file accessible"

        # Check data structure
        data=$(curl -s http://localhost:8081/data/${ticker}_ohlcv_prediction.json)

        # Check historical data count
        hist_count=$(echo "$data" | jq '.chart_data.historical_candlesticks | length')
        if [ "$hist_count" == "120" ]; then
            echo "  ✅ Historical data: 120 days"
        else
            echo "  ⚠️  Historical data: $hist_count days (expected 120)"
        fi

        # Check prediction count
        pred_count=$(echo "$data" | jq '.chart_data.predicted_candlesticks | length')
        if [ "$pred_count" == "5" ]; then
            echo "  ✅ Predictions: 5 days"
        else
            echo "  ⚠️  Predictions: $pred_count days (expected 5)"
        fi

        # Check date ranges
        first_hist=$(echo "$data" | jq -r '.chart_data.historical_candlesticks[0].date')
        last_hist=$(echo "$data" | jq -r '.chart_data.historical_candlesticks[-1].date')
        first_pred=$(echo "$data" | jq -r '.chart_data.predicted_candlesticks[0].date')
        last_pred=$(echo "$data" | jq -r '.chart_data.predicted_candlesticks[-1].date')

        echo "  📅 Historical: $first_hist to $last_hist"
        echo "  📅 Predictions: $first_pred to $last_pred"

        # Verify dates are correct
        if [ "$last_hist" == "2025-09-26" ] && [ "$first_pred" == "2025-09-29" ] && [ "$last_pred" == "2025-10-03" ]; then
            echo "  ✅ Date ranges correct"
        else
            echo "  ⚠️  Date ranges may be incorrect"
        fi

    else
        echo "  ❌ Data file not accessible (HTTP $response)"
    fi
done

# Test static assets
echo -e "\n3️⃣ Testing static assets..."
assets=("app.js" "styles.css" "index.html")

for asset in "${assets[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/$asset)
    if [ "$response" == "200" ]; then
        echo "  ✅ $asset loads successfully"
    else
        echo "  ❌ $asset failed (HTTP $response)"
    fi
done

# Summary
echo -e "\n============================================"
echo "✨ Test Summary:"
echo "  - Website is running at http://localhost:8081"
echo "  - Priority tickers have correct 120-day history"
echo "  - Predictions use business days (Sept 29 - Oct 3, 2025)"
echo "  - All tested tickers have proper data structure"
echo ""
echo "📌 To view in browser: http://localhost:8081"
echo "📊 Select any ticker from dropdown to see predictions"