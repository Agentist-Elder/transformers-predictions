const fs = require('fs');
const path = require('path');
const ValidationUtils = require('./validation-utils');

/**
 * Final Data Validation Test Suite
 * Handles both old and new data formats and generates comprehensive report
 */

describe('Final Data Validation Tests', () => {
  const dataDir = path.join(__dirname, '../data');
  const reportsDir = path.join(__dirname, '../reports');

  let validationReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      oldFormatFiles: 0,
      newFormatFiles: 0,
      successRate: 0
    },
    fileFormats: {
      oldFormat: {
        count: 0,
        description: "Legacy format with chart_data structure",
        requiredFields: ["ticker_info", "chart_data", "summary_stats"]
      },
      newFormat: {
        count: 0,
        description: "New format with predictions and monte_carlo_paths",
        requiredFields: ["ticker_info", "data", "summary_stats"]
      }
    },
    dataQuality: {
      structuralIntegrity: 0,
      priceValidation: { valid: 0, invalid: 0 },
      dateValidation: { valid: 0, invalid: 0 },
      volumeValidation: { valid: 0, invalid: 0 }
    },
    errors: [],
    warnings: [],
    recommendations: []
  };

  beforeAll(() => {
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  });

  describe('Comprehensive Data Validation', () => {
    test('should analyze all prediction files and detect formats', () => {
      const allFiles = fs.readdirSync(dataDir)
        .filter(file => file.endsWith('_ohlcv_prediction.json'))
        .map(file => path.join(dataDir, file));

      validationReport.summary.totalFiles = allFiles.length;
      expect(allFiles.length).toBeGreaterThan(5000);

      console.log(`\nAnalyzing ${allFiles.length} prediction files...`);

      allFiles.forEach((filePath, index) => {
        const fileName = path.basename(filePath);

        if (index % 1000 === 0 && index > 0) {
          console.log(`Progress: ${index}/${allFiles.length} files processed`);
        }

        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          // Detect file format
          const isOldFormat = data.hasOwnProperty('chart_data');
          const isNewFormat = data.hasOwnProperty('data') &&
                               data.data.hasOwnProperty('predictions');

          if (isOldFormat) {
            validationReport.summary.oldFormatFiles++;
            validationReport.fileFormats.oldFormat.count++;

            // Validate old format
            if (validateOldFormat(data, fileName)) {
              validationReport.summary.validFiles++;
            } else {
              validationReport.summary.invalidFiles++;
            }
          } else if (isNewFormat) {
            validationReport.summary.newFormatFiles++;
            validationReport.fileFormats.newFormat.count++;

            // Validate new format
            if (validateNewFormat(data, fileName)) {
              validationReport.summary.validFiles++;
            } else {
              validationReport.summary.invalidFiles++;
            }
          } else {
            // Mixed or unknown format - try to validate what we can
            if (validateGenericFormat(data, fileName)) {
              validationReport.summary.validFiles++;
            } else {
              validationReport.summary.invalidFiles++;
            }
          }

        } catch (error) {
          validationReport.summary.invalidFiles++;
          validationReport.errors.push({
            file: fileName,
            error: 'Parse Error',
            message: error.message
          });
        }
      });

      // Calculate final statistics
      validationReport.summary.successRate =
        (validationReport.summary.validFiles / validationReport.summary.totalFiles * 100).toFixed(2);

      validationReport.dataQuality.structuralIntegrity =
        (validationReport.summary.validFiles / validationReport.summary.totalFiles * 100).toFixed(2);

      // Generate recommendations
      validationReport.recommendations = generateRecommendations();

      console.log(`\nValidation Summary:`);
      console.log(`Total Files: ${validationReport.summary.totalFiles}`);
      console.log(`Valid Files: ${validationReport.summary.validFiles}`);
      console.log(`Invalid Files: ${validationReport.summary.invalidFiles}`);
      console.log(`Success Rate: ${validationReport.summary.successRate}%`);
      console.log(`Old Format: ${validationReport.summary.oldFormatFiles}`);
      console.log(`New Format: ${validationReport.summary.newFormatFiles}`);

      expect(parseFloat(validationReport.summary.successRate)).toBeGreaterThan(80);

    }, 300000); // 5 minute timeout

    test('should save comprehensive validation report', () => {
      const reportPath = path.join(reportsDir, 'final-validation-report.json');
      const summaryPath = path.join(reportsDir, 'validation-summary.txt');

      // Save detailed JSON report
      fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      // Save human-readable summary
      const summary = generateSummaryReport();
      fs.writeFileSync(summaryPath, summary);

      // Verify files were created
      expect(fs.existsSync(reportPath)).toBe(true);
      expect(fs.existsSync(summaryPath)).toBe(true);

      console.log(`\nReports saved:`);
      console.log(`- Detailed: ${reportPath}`);
      console.log(`- Summary: ${summaryPath}`);
    });
  });

  // Helper function to validate old format files
  function validateOldFormat(data, fileName) {
    let isValid = true;

    // Check required top-level fields
    const requiredFields = ['ticker_info', 'chart_data', 'summary_stats'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        validationReport.errors.push({
          file: fileName,
          error: 'Missing Required Field',
          field: field
        });
        isValid = false;
      }
    });

    // Validate historical candlesticks exist
    if (data.chart_data && data.chart_data.historical_candlesticks) {
      const candles = data.chart_data.historical_candlesticks;
      if (Array.isArray(candles) && candles.length > 0) {
        // Check first few candlesticks for proper structure
        candles.slice(0, 3).forEach((candle, index) => {
          if (!validateCandlestickStructure(candle)) {
            validationReport.warnings.push({
              file: fileName,
              warning: `Invalid candlestick structure at index ${index}`
            });
          } else {
            validationReport.dataQuality.priceValidation.valid++;
          }
        });
      }
    }

    // Validate ticker info
    if (data.ticker_info && data.ticker_info.symbol) {
      if (typeof data.ticker_info.symbol === 'string') {
        validationReport.dataQuality.dateValidation.valid++;
      } else {
        validationReport.dataQuality.dateValidation.invalid++;
        isValid = false;
      }
    }

    return isValid;
  }

  // Helper function to validate new format files
  function validateNewFormat(data, fileName) {
    let isValid = true;

    // Check required top-level fields
    const requiredFields = ['ticker_info', 'data', 'summary_stats'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        validationReport.errors.push({
          file: fileName,
          error: 'Missing Required Field',
          field: field
        });
        isValid = false;
      }
    });

    // Validate data section
    if (data.data) {
      const dataRequiredFields = ['historical_candlesticks', 'predictions'];
      dataRequiredFields.forEach(field => {
        if (!data.data[field]) {
          validationReport.warnings.push({
            file: fileName,
            warning: `Missing data field: ${field}`
          });
        }
      });

      // Validate historical candlesticks
      if (data.data.historical_candlesticks && Array.isArray(data.data.historical_candlesticks)) {
        data.data.historical_candlesticks.slice(0, 3).forEach((candle, index) => {
          if (validateCandlestickStructure(candle)) {
            validationReport.dataQuality.priceValidation.valid++;
          } else {
            validationReport.dataQuality.priceValidation.invalid++;
            validationReport.warnings.push({
              file: fileName,
              warning: `Invalid historical candlestick at index ${index}`
            });
          }
        });
      }

      // Validate predictions
      if (data.data.predictions && Array.isArray(data.data.predictions)) {
        data.data.predictions.slice(0, 3).forEach((pred, index) => {
          if (validateCandlestickStructure(pred)) {
            validationReport.dataQuality.priceValidation.valid++;
          } else {
            validationReport.dataQuality.priceValidation.invalid++;
            validationReport.warnings.push({
              file: fileName,
              warning: `Invalid prediction candlestick at index ${index}`
            });
          }
        });
      }

      // Validate Monte Carlo paths if present
      if (data.data.monte_carlo_paths && Array.isArray(data.data.monte_carlo_paths)) {
        const expectedRuns = data.ticker_info?.monte_carlo_runs || 10;
        if (data.data.monte_carlo_paths.length !== expectedRuns) {
          validationReport.warnings.push({
            file: fileName,
            warning: `Monte Carlo path count mismatch: expected ${expectedRuns}, got ${data.data.monte_carlo_paths.length}`
          });
        }
      }
    }

    // Validate ticker info
    if (data.ticker_info) {
      if (data.ticker_info.symbol && typeof data.ticker_info.symbol === 'string') {
        validationReport.dataQuality.dateValidation.valid++;
      } else {
        validationReport.dataQuality.dateValidation.invalid++;
        isValid = false;
      }

      if (data.ticker_info.last_update) {
        if (ValidationUtils.validateTimestamp(data.ticker_info.last_update).valid) {
          validationReport.dataQuality.dateValidation.valid++;
        } else {
          validationReport.dataQuality.dateValidation.invalid++;
          validationReport.warnings.push({
            file: fileName,
            warning: 'Invalid timestamp format in last_update'
          });
        }
      }
    }

    return isValid;
  }

  // Helper function to validate generic format
  function validateGenericFormat(data, fileName) {
    let isValid = true;

    // Basic structure check
    if (!data || typeof data !== 'object') {
      validationReport.errors.push({
        file: fileName,
        error: 'Invalid JSON structure'
      });
      return false;
    }

    // Should have at least ticker_info
    if (!data.ticker_info) {
      validationReport.errors.push({
        file: fileName,
        error: 'Missing ticker_info section'
      });
      isValid = false;
    }

    return isValid;
  }

  // Helper function to validate candlestick structure
  function validateCandlestickStructure(candle) {
    if (!candle || typeof candle !== 'object') return false;

    const requiredFields = ['date', 'open', 'high', 'low', 'close', 'volume'];
    const hasAllFields = requiredFields.every(field => candle.hasOwnProperty(field));

    if (!hasAllFields) return false;

    // Validate date format
    if (!ValidationUtils.validateDateFormat(candle.date).valid) return false;

    // Validate OHLC data
    return ValidationUtils.validateOHLCData(candle).valid;
  }

  // Generate recommendations based on validation results
  function generateRecommendations() {
    const recommendations = [];

    const successRate = parseFloat(validationReport.summary.successRate);
    if (successRate < 90) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Low Success Rate',
        description: `Success rate is ${successRate}%. Consider investigating common errors.`,
        action: 'Review error log and fix data generation pipeline.'
      });
    }

    if (validationReport.summary.oldFormatFiles > 0 && validationReport.summary.newFormatFiles > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Mixed Data Formats',
        description: `Found ${validationReport.summary.oldFormatFiles} old format and ${validationReport.summary.newFormatFiles} new format files.`,
        action: 'Consider migrating all files to the new format for consistency.'
      });
    }

    if (validationReport.errors.length > validationReport.summary.totalFiles * 0.01) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'High Error Count',
        description: `${validationReport.errors.length} errors found across files.`,
        action: 'Address structural issues in data generation.'
      });
    }

    return recommendations;
  }

  // Generate human-readable summary report
  function generateSummaryReport() {
    return `
TRANSFORMERS PREDICTIONS - FINAL VALIDATION REPORT
==================================================
Generated: ${validationReport.timestamp}

SUMMARY
-------
Total Files: ${validationReport.summary.totalFiles.toLocaleString()}
Valid Files: ${validationReport.summary.validFiles.toLocaleString()} (${validationReport.summary.successRate}%)
Invalid Files: ${validationReport.summary.invalidFiles.toLocaleString()}

FILE FORMATS
------------
Old Format: ${validationReport.summary.oldFormatFiles.toLocaleString()} files
New Format: ${validationReport.summary.newFormatFiles.toLocaleString()} files

DATA QUALITY
------------
Structural Integrity: ${validationReport.dataQuality.structuralIntegrity}%
Price Validation: ${validationReport.dataQuality.priceValidation.valid} valid, ${validationReport.dataQuality.priceValidation.invalid} invalid
Date Validation: ${validationReport.dataQuality.dateValidation.valid} valid, ${validationReport.dataQuality.dateValidation.invalid} invalid

ISSUES FOUND
------------
Errors: ${validationReport.errors.length}
Warnings: ${validationReport.warnings.length}

FRONTEND READINESS
------------------
${validationReport.summary.successRate >= 85 ? '✅ READY FOR FRONTEND' : '❌ NEEDS ATTENTION'} - ${validationReport.summary.successRate}% success rate
${validationReport.errors.length === 0 ? '✅ NO CRITICAL ERRORS' : `❌ ${validationReport.errors.length} ERRORS FOUND`}

RECOMMENDATIONS
---------------
${validationReport.recommendations.map(rec =>
  `[${rec.priority}] ${rec.issue}: ${rec.description}\n    Action: ${rec.action}`
).join('\n\n')}

This validation report confirms that your transformers predictions data is ${validationReport.summary.successRate >= 85 ? 'ready' : 'not ready'} for frontend consumption.
`;
  }
});