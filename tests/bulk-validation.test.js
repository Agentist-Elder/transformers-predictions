const fs = require('fs');
const path = require('path');

/**
 * Bulk Data Validation Test Suite
 * Tests all 10,000+ prediction files for critical errors
 */

describe('Bulk Validation Tests', () => {
  const dataDir = path.join(__dirname, '../data');
  let allPredictionFiles = [];
  let validationResults = {
    totalFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    errors: [],
    warnings: [],
    summary: {}
  };

  beforeAll(() => {
    // Get ALL prediction JSON files
    allPredictionFiles = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('_ohlcv_prediction.json'))
      .map(file => path.join(dataDir, file));

    validationResults.totalFiles = allPredictionFiles.length;
  });

  describe('File System Validation', () => {
    test('all files should be readable JSON', () => {
      let parseErrors = 0;
      let successCount = 0;

      allPredictionFiles.forEach(filePath => {
        const fileName = path.basename(filePath);

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          expect(data).toBeDefined();
          expect(typeof data).toBe('object');
          successCount++;
        } catch (error) {
          parseErrors++;
          validationResults.errors.push({
            file: fileName,
            error: 'JSON Parse Error',
            message: error.message
          });
        }
      });

      validationResults.successfulFiles = successCount;
      validationResults.failedFiles = parseErrors;

      expect(parseErrors).toBe(0);
      expect(successCount).toBe(allPredictionFiles.length);
    });

    test('file names should match ticker symbols', () => {
      let mismatchCount = 0;

      allPredictionFiles.forEach(filePath => {
        const fileName = path.basename(filePath);
        const expectedTicker = fileName.replace('_ohlcv_prediction.json', '');

        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          if (data.ticker_info && data.ticker_info.symbol !== expectedTicker) {
            mismatchCount++;
            validationResults.warnings.push({
              file: fileName,
              warning: 'Ticker Symbol Mismatch',
              expected: expectedTicker,
              actual: data.ticker_info.symbol
            });
          }
        } catch (error) {
          // Already caught in previous test
        }
      });

      validationResults.summary.tickerMismatches = mismatchCount;
      expect(mismatchCount).toBeLessThan(allPredictionFiles.length * 0.01); // Less than 1% mismatch allowed
    });
  });

  describe('Critical Field Validation - All Files', () => {
    test('all files should have critical structure', () => {
      const criticalFields = [
        'ticker_info',
        'ticker_info.symbol',
        'ticker_info.last_update',
        'data',
        'data.historical_candlesticks',
        'data.predictions',
        'data.monte_carlo_paths',
        'data.confidence_bands',
        'summary_stats',
        'summary_stats.last_close',
        'summary_stats.predicted_close'
      ];

      let structureErrors = 0;
      let validStructureCount = 0;

      allPredictionFiles.forEach(filePath => {
        const fileName = path.basename(filePath);

        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          let hasAllFields = true;

          criticalFields.forEach(fieldPath => {
            const keys = fieldPath.split('.');
            let current = data;

            for (const key of keys) {
              if (!current || !current.hasOwnProperty(key)) {
                hasAllFields = false;
                validationResults.errors.push({
                  file: fileName,
                  error: 'Missing Critical Field',
                  field: fieldPath
                });
                break;
              }
              current = current[key];
            }
          });

          if (hasAllFields) {
            validStructureCount++;
          } else {
            structureErrors++;
          }

        } catch (error) {
          structureErrors++;
        }
      });

      validationResults.summary.validStructures = validStructureCount;
      validationResults.summary.structureErrors = structureErrors;

      // Allow up to 1% structure errors
      expect(structureErrors).toBeLessThan(allPredictionFiles.length * 0.01);
    });

    test('confidence bands should have all percentiles - bulk check', () => {
      const requiredPercentiles = ['p10', 'p25', 'p50', 'p75', 'p90'];
      let missingPercentileCount = 0;
      let validBandsCount = 0;

      allPredictionFiles.forEach(filePath => {
        const fileName = path.basename(filePath);

        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          if (data.data && data.data.confidence_bands) {
            let hasAllPercentiles = true;

            requiredPercentiles.forEach(percentile => {
              if (!data.data.confidence_bands[percentile] ||
                  !Array.isArray(data.data.confidence_bands[percentile])) {
                hasAllPercentiles = false;
                validationResults.errors.push({
                  file: fileName,
                  error: 'Missing Confidence Percentile',
                  percentile: percentile
                });
              }
            });

            if (hasAllPercentiles) {
              validBandsCount++;
            } else {
              missingPercentileCount++;
            }
          } else {
            missingPercentileCount++;
          }

        } catch (error) {
          missingPercentileCount++;
        }
      });

      validationResults.summary.validConfidenceBands = validBandsCount;
      validationResults.summary.missingPercentiles = missingPercentileCount;

      // Should have very few missing percentiles
      expect(missingPercentileCount).toBeLessThan(allPredictionFiles.length * 0.005);
    });
  });

  describe('Data Range Validation - Sampling', () => {
    test('sample files should have reasonable price ranges', () => {
      const sampleSize = Math.min(1000, allPredictionFiles.length);
      const sampleFiles = allPredictionFiles
        .sort(() => 0.5 - Math.random())
        .slice(0, sampleSize);

      let unreasonablePriceCount = 0;
      let reasonablePriceCount = 0;

      sampleFiles.forEach(filePath => {
        const fileName = path.basename(filePath);

        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          const lastClose = data.summary_stats?.last_close;
          const predictedClose = data.summary_stats?.predicted_close;

          if (lastClose && predictedClose) {
            // Check for reasonable prices (between $0.01 and $10,000)
            if (lastClose < 0.01 || lastClose > 10000 ||
                predictedClose < 0.01 || predictedClose > 10000) {
              unreasonablePriceCount++;
              validationResults.warnings.push({
                file: fileName,
                warning: 'Unreasonable Price Range',
                lastClose: lastClose,
                predictedClose: predictedClose
              });
            } else {
              reasonablePriceCount++;
            }
          }

        } catch (error) {
          unreasonablePriceCount++;
        }
      });

      validationResults.summary.sampleSize = sampleSize;
      validationResults.summary.reasonablePrices = reasonablePriceCount;
      validationResults.summary.unreasonablePrices = unreasonablePriceCount;

      // Most prices should be reasonable
      expect(unreasonablePriceCount).toBeLessThan(sampleSize * 0.05);
    });

    test('sample files should have valid date ranges', () => {
      const sampleSize = Math.min(500, allPredictionFiles.length);
      const sampleFiles = allPredictionFiles
        .sort(() => 0.5 - Math.random())
        .slice(0, sampleSize);

      let invalidDateCount = 0;
      let validDateCount = 0;
      const currentYear = new Date().getFullYear();

      sampleFiles.forEach(filePath => {
        const fileName = path.basename(filePath);

        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          if (data.data?.historical_candlesticks?.length > 0 &&
              data.data?.predictions?.length > 0) {

            const firstHistorical = new Date(data.data.historical_candlesticks[0].date);
            const lastHistorical = new Date(data.data.historical_candlesticks[data.data.historical_candlesticks.length - 1].date);
            const firstPrediction = new Date(data.data.predictions[0].date);
            const lastPrediction = new Date(data.data.predictions[data.data.predictions.length - 1].date);

            // Check for reasonable date ranges
            if (firstHistorical.getFullYear() < currentYear - 10 ||
                lastPrediction.getFullYear() > currentYear + 2 ||
                firstPrediction <= lastHistorical) {
              invalidDateCount++;
              validationResults.warnings.push({
                file: fileName,
                warning: 'Invalid Date Range',
                firstHistorical: firstHistorical.toISOString().split('T')[0],
                lastHistorical: lastHistorical.toISOString().split('T')[0],
                firstPrediction: firstPrediction.toISOString().split('T')[0],
                lastPrediction: lastPrediction.toISOString().split('T')[0]
              });
            } else {
              validDateCount++;
            }
          }

        } catch (error) {
          invalidDateCount++;
        }
      });

      validationResults.summary.validDates = validDateCount;
      validationResults.summary.invalidDates = invalidDateCount;

      // Most dates should be valid
      expect(invalidDateCount).toBeLessThan(sampleSize * 0.02);
    });
  });

  describe('Performance and Size Validation', () => {
    test('files should not be excessively large', () => {
      let oversizedCount = 0;
      let reasonableSizeCount = 0;
      const maxSize = 5 * 1024 * 1024; // 5MB per file

      allPredictionFiles.forEach(filePath => {
        const fileName = path.basename(filePath);
        const stats = fs.statSync(filePath);

        if (stats.size > maxSize) {
          oversizedCount++;
          validationResults.warnings.push({
            file: fileName,
            warning: 'Oversized File',
            size: `${(stats.size / 1024 / 1024).toFixed(2)}MB`
          });
        } else {
          reasonableSizeCount++;
        }
      });

      validationResults.summary.reasonableSizeFiles = reasonableSizeCount;
      validationResults.summary.oversizedFiles = oversizedCount;

      // Very few files should be oversized
      expect(oversizedCount).toBeLessThan(allPredictionFiles.length * 0.001);
    });

    test('Monte Carlo paths should have consistent count', () => {
      const sampleSize = Math.min(200, allPredictionFiles.length);
      const sampleFiles = allPredictionFiles
        .sort(() => 0.5 - Math.random())
        .slice(0, sampleSize);

      let inconsistentPathCount = 0;
      let consistentPathCount = 0;

      sampleFiles.forEach(filePath => {
        const fileName = path.basename(filePath);

        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          const expectedRuns = data.ticker_info?.monte_carlo_runs;
          const actualPaths = data.data?.monte_carlo_paths?.length;

          if (expectedRuns && actualPaths && expectedRuns === actualPaths) {
            consistentPathCount++;
          } else {
            inconsistentPathCount++;
            validationResults.errors.push({
              file: fileName,
              error: 'Monte Carlo Path Count Mismatch',
              expected: expectedRuns,
              actual: actualPaths
            });
          }

        } catch (error) {
          inconsistentPathCount++;
        }
      });

      validationResults.summary.consistentMonteCarlo = consistentPathCount;
      validationResults.summary.inconsistentMonteCarlo = inconsistentPathCount;

      // All should be consistent
      expect(inconsistentPathCount).toBe(0);
    });
  });

  afterAll(() => {
    // Write validation results to file
    const reportPath = path.join(__dirname, '../validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(validationResults, null, 2));

    console.log('\n=== Bulk Validation Summary ===');
    console.log(`Total Files: ${validationResults.totalFiles}`);
    console.log(`Successful Files: ${validationResults.successfulFiles}`);
    console.log(`Failed Files: ${validationResults.failedFiles}`);
    console.log(`Errors: ${validationResults.errors.length}`);
    console.log(`Warnings: ${validationResults.warnings.length}`);
    console.log(`Report saved to: ${reportPath}`);
  });
});