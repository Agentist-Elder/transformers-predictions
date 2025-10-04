const fs = require('fs');
const path = require('path');
const ValidationUtils = require('./validation-utils');

/**
 * Validation Report Generator
 * Creates comprehensive validation reports for all prediction files
 */

describe('Validation Report Generator', () => {
  const dataDir = path.join(__dirname, '../data');
  const reportsDir = path.join(__dirname, '../reports');

  let validationReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      warningFiles: 0,
      successRate: 0
    },
    statistics: {
      fileSize: { min: 0, max: 0, avg: 0, total: 0 },
      dateRange: { earliest: null, latest: null },
      priceRange: { min: 0, max: 0, avg: 0 },
      volumeRange: { min: 0, max: 0, avg: 0 },
      confidenceRange: { min: 0, max: 0, avg: 0 }
    },
    errorAnalysis: {
      commonErrors: {},
      errorsByType: {},
      criticalErrors: [],
      warningsByType: {}
    },
    dataQuality: {
      completenessDistribution: {},
      structuralIntegrity: 0,
      monteCarloPaths: { consistent: 0, inconsistent: 0 },
      confidenceBands: { complete: 0, incomplete: 0 }
    },
    detailedResults: [],
    recommendations: []
  };

  beforeAll(() => {
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  });

  describe('Generate Comprehensive Validation Report', () => {
    test('should analyze all prediction files and generate detailed report', () => {
      const allFiles = fs.readdirSync(dataDir)
        .filter(file => file.endsWith('_ohlcv_prediction.json'))
        .map(file => path.join(dataDir, file));

      validationReport.summary.totalFiles = allFiles.length;

      let fileSizes = [];
      let dates = [];
      let prices = [];
      let volumes = [];
      let confidences = [];

      console.log(`\nAnalyzing ${allFiles.length} prediction files...`);

      allFiles.forEach((filePath, index) => {
        const fileName = path.basename(filePath);

        if (index % 1000 === 0) {
          console.log(`Progress: ${index}/${allFiles.length} files processed`);
        }

        try {
          // Get file size
          const stats = fs.statSync(filePath);
          fileSizes.push(stats.size);

          // Validate file structure
          const validation = ValidationUtils.validateCompletePredictionFile(filePath);

          if (validation.valid) {
            validationReport.summary.validFiles++;
          } else {
            validationReport.summary.invalidFiles++;

            // Categorize errors
            validation.errors.forEach(error => {
              const errorType = error.split(':')[0] || 'Unknown';
              validationReport.errorAnalysis.errorsByType[errorType] =
                (validationReport.errorAnalysis.errorsByType[errorType] || 0) + 1;

              // Track common errors
              validationReport.errorAnalysis.commonErrors[error] =
                (validationReport.errorAnalysis.commonErrors[error] || 0) + 1;
            });
          }

          if (validation.warnings && validation.warnings.length > 0) {
            validationReport.summary.warningFiles++;

            validation.warnings.forEach(warning => {
              const warningType = warning.split(':')[0] || 'Unknown';
              validationReport.errorAnalysis.warningsByType[warningType] =
                (validationReport.errorAnalysis.warningsByType[warningType] || 0) + 1;
            });
          }

          // Extract data for statistics
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          // Date analysis
          if (data.ticker_info?.last_update) {
            dates.push(new Date(data.ticker_info.last_update));
          }

          // Price analysis
          if (data.summary_stats?.last_close) {
            prices.push(data.summary_stats.last_close);
          }

          // Volume analysis
          if (data.summary_stats?.avg_volume) {
            volumes.push(data.summary_stats.avg_volume);
          }

          // Confidence analysis
          if (data.summary_stats?.confidence) {
            confidences.push(data.summary_stats.confidence);
          }

          // Data quality analysis
          if (data.summary_stats?.data_quality?.completeness) {
            const completeness = Math.floor(data.summary_stats.data_quality.completeness / 10) * 10;
            const range = `${completeness}-${completeness + 9}%`;
            validationReport.dataQuality.completenessDistribution[range] =
              (validationReport.dataQuality.completenessDistribution[range] || 0) + 1;
          }

          // Monte Carlo consistency
          if (data.ticker_info?.monte_carlo_runs && data.data?.monte_carlo_paths) {
            if (data.ticker_info.monte_carlo_runs === data.data.monte_carlo_paths.length) {
              validationReport.dataQuality.monteCarloPaths.consistent++;
            } else {
              validationReport.dataQuality.monteCarloPaths.inconsistent++;
            }
          }

          // Confidence bands completeness
          const requiredPercentiles = ['p10', 'p25', 'p50', 'p75', 'p90'];
          if (data.data?.confidence_bands) {
            const hasAllPercentiles = requiredPercentiles.every(p =>
              data.data.confidence_bands[p] && Array.isArray(data.data.confidence_bands[p])
            );

            if (hasAllPercentiles) {
              validationReport.dataQuality.confidenceBands.complete++;
            } else {
              validationReport.dataQuality.confidenceBands.incomplete++;
            }
          }

          // Store detailed result for severely problematic files
          if (!validation.valid && validation.errors.length > 5) {
            validationReport.detailedResults.push({
              file: fileName,
              errors: validation.errors,
              warnings: validation.warnings || []
            });
          }

        } catch (error) {
          validationReport.summary.invalidFiles++;
          validationReport.errorAnalysis.criticalErrors.push({
            file: fileName,
            error: error.message
          });
        }
      });

      // Calculate statistics
      validationReport.summary.successRate =
        (validationReport.summary.validFiles / validationReport.summary.totalFiles * 100).toFixed(2);

      validationReport.statistics.fileSize = {
        min: Math.min(...fileSizes),
        max: Math.max(...fileSizes),
        avg: Math.round(fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length),
        total: fileSizes.reduce((a, b) => a + b, 0)
      };

      if (dates.length > 0) {
        validationReport.statistics.dateRange = {
          earliest: new Date(Math.min(...dates)).toISOString().split('T')[0],
          latest: new Date(Math.max(...dates)).toISOString().split('T')[0]
        };
      }

      if (prices.length > 0) {
        validationReport.statistics.priceRange = {
          min: Math.min(...prices).toFixed(2),
          max: Math.max(...prices).toFixed(2),
          avg: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
        };
      }

      if (volumes.length > 0) {
        validationReport.statistics.volumeRange = {
          min: Math.min(...volumes),
          max: Math.max(...volumes),
          avg: Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length)
        };
      }

      if (confidences.length > 0) {
        validationReport.statistics.confidenceRange = {
          min: Math.min(...confidences).toFixed(2),
          max: Math.max(...confidences).toFixed(2),
          avg: (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2)
        };
      }

      validationReport.dataQuality.structuralIntegrity =
        (validationReport.summary.validFiles / validationReport.summary.totalFiles * 100).toFixed(2);

      // Generate recommendations
      validationReport.recommendations = generateRecommendations(validationReport);

      console.log(`\nValidation complete. Processed ${allFiles.length} files.`);
      expect(allFiles.length).toBeGreaterThan(0);

    }, 300000); // 5 minute timeout for processing all files

    test('should save validation report to file', () => {
      const reportPath = path.join(reportsDir, 'validation-report.json');
      const humanReadablePath = path.join(reportsDir, 'validation-summary.txt');

      // Save detailed JSON report
      fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      // Save human-readable summary
      const summary = generateHumanReadableSummary(validationReport);
      fs.writeFileSync(humanReadablePath, summary);

      // Verify files were created
      expect(fs.existsSync(reportPath)).toBe(true);
      expect(fs.existsSync(humanReadablePath)).toBe(true);

      console.log(`\nReports saved:`);
      console.log(`- Detailed: ${reportPath}`);
      console.log(`- Summary: ${humanReadablePath}`);
    });

    test('should have acceptable success rate', () => {
      const successRate = parseFloat(validationReport.summary.successRate);

      // Log current status
      console.log(`\n=== VALIDATION SUMMARY ===`);
      console.log(`Total Files: ${validationReport.summary.totalFiles}`);
      console.log(`Valid Files: ${validationReport.summary.validFiles}`);
      console.log(`Invalid Files: ${validationReport.summary.invalidFiles}`);
      console.log(`Success Rate: ${successRate}%`);

      // We expect at least 95% success rate
      expect(successRate).toBeGreaterThanOrEqual(95);
    });
  });
});

function generateRecommendations(report) {
  const recommendations = [];

  if (report.summary.successRate < 95) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'Low Success Rate',
      description: `Only ${report.summary.successRate}% of files are valid. Investigate common errors.`,
      action: 'Review error analysis and fix data generation pipeline.'
    });
  }

  if (report.dataQuality.monteCarloPaths.inconsistent > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'Monte Carlo Path Inconsistency',
      description: `${report.dataQuality.monteCarloPaths.inconsistent} files have mismatched Monte Carlo path counts.`,
      action: 'Ensure monte_carlo_runs matches actual path count in data generation.'
    });
  }

  if (report.dataQuality.confidenceBands.incomplete > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'Incomplete Confidence Bands',
      description: `${report.dataQuality.confidenceBands.incomplete} files missing confidence band percentiles.`,
      action: 'Verify all percentiles (p10, p25, p50, p75, p90) are generated.'
    });
  }

  const commonErrors = Object.entries(report.errorAnalysis.commonErrors)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  commonErrors.forEach(([error, count]) => {
    if (count > report.summary.totalFiles * 0.01) { // More than 1% of files
      recommendations.push({
        priority: 'HIGH',
        issue: 'Common Error Pattern',
        description: `"${error}" affects ${count} files (${(count/report.summary.totalFiles*100).toFixed(1)}%)`,
        action: 'Investigate and fix this recurring issue in data pipeline.'
      });
    }
  });

  return recommendations;
}

function generateHumanReadableSummary(report) {
  const summary = `
TRANSFORMERS PREDICTIONS - DATA VALIDATION REPORT
Generated: ${report.timestamp}

=== OVERVIEW ===
Total Files Analyzed: ${report.summary.totalFiles.toLocaleString()}
Valid Files: ${report.summary.validFiles.toLocaleString()} (${report.summary.successRate}%)
Invalid Files: ${report.summary.invalidFiles.toLocaleString()}
Files with Warnings: ${report.summary.warningFiles.toLocaleString()}

=== FILE STATISTICS ===
File Size Range: ${(report.statistics.fileSize.min/1024).toFixed(1)}KB - ${(report.statistics.fileSize.max/1024/1024).toFixed(1)}MB
Average File Size: ${(report.statistics.fileSize.avg/1024).toFixed(1)}KB
Total Storage: ${(report.statistics.fileSize.total/1024/1024/1024).toFixed(2)}GB

=== DATA STATISTICS ===
Price Range: $${report.statistics.priceRange.min} - $${report.statistics.priceRange.max}
Average Price: $${report.statistics.priceRange.avg}

Volume Range: ${report.statistics.volumeRange.min.toLocaleString()} - ${report.statistics.volumeRange.max.toLocaleString()}
Average Volume: ${report.statistics.volumeRange.avg.toLocaleString()}

Confidence Range: ${report.statistics.confidenceRange.min}% - ${report.statistics.confidenceRange.max}%
Average Confidence: ${report.statistics.confidenceRange.avg}%

Date Range: ${report.statistics.dateRange.earliest} to ${report.statistics.dateRange.latest}

=== DATA QUALITY ===
Structural Integrity: ${report.dataQuality.structuralIntegrity}%
Monte Carlo Consistency: ${report.dataQuality.monteCarloPaths.consistent}/${report.summary.totalFiles} (${(report.dataQuality.monteCarloPaths.consistent/report.summary.totalFiles*100).toFixed(1)}%)
Complete Confidence Bands: ${report.dataQuality.confidenceBands.complete}/${report.summary.totalFiles} (${(report.dataQuality.confidenceBands.complete/report.summary.totalFiles*100).toFixed(1)}%)

=== TOP ERRORS ===
${Object.entries(report.errorAnalysis.commonErrors)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([error, count]) => `${count}x: ${error}`)
  .join('\n')}

=== RECOMMENDATIONS ===
${report.recommendations.map(rec =>
  `[${rec.priority}] ${rec.issue}: ${rec.description}\n    Action: ${rec.action}`
).join('\n\n')}

=== FRONTEND READINESS ===
${report.summary.successRate >= 95 ? '✅ READY' : '❌ NOT READY'} - Success rate: ${report.summary.successRate}%
${report.dataQuality.confidenceBands.complete/report.summary.totalFiles >= 0.95 ? '✅ CHARTS READY' : '❌ CHART ISSUES'} - Complete confidence bands: ${(report.dataQuality.confidenceBands.complete/report.summary.totalFiles*100).toFixed(1)}%
${report.errorAnalysis.criticalErrors.length === 0 ? '✅ NO CRITICAL ERRORS' : `❌ ${report.errorAnalysis.criticalErrors.length} CRITICAL ERRORS`}
`;

  return summary;
}

module.exports = { generateRecommendations, generateHumanReadableSummary };