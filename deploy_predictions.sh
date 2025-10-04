#!/bin/bash

echo "==================================="
echo "Deploying Predictions to Cloudflare and GitHub"
echo "==================================="

# Navigate to the project directory
cd /home/jarden/transformers-predictions

# 1. Generate stats summary
echo "Generating statistics summary..."
python3 generate_stats.py

# 2. Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy . --project-name transformers-predictions

# 3. Commit and push to GitHub
echo "Updating GitHub repository..."
git add data/*.json
git add *.py *.js *.html *.css *.md
git commit -m "Update predictions with 120-day lookback to 2025-10-03

- Updated all ticker predictions with new lookback period
- Predictions now forecast 2025-10-06 to 2025-10-10
- Monte Carlo simulations included (10 paths per ticker)
- Successfully processed 5775 tickers
"

# Push to GitHub
git push origin main

echo "==================================="
echo "Deployment Complete!"
echo "==================================="
echo "Predictions have been updated and deployed to:"
echo "- Cloudflare Pages: https://transformers-predictions.pages.dev"
echo "- GitHub: https://github.com/[your-username]/transformers-predictions"