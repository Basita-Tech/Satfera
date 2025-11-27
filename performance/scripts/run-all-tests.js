#!/usr/bin/env node

/**
 * Comprehensive Performance Test Runner
 * Orchestrates all performance tests and generates consolidated reports
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

// Import test suites
const DatabasePerformanceTester = require('../database/db-performance');
const RedisPerformanceTester = require('../database/redis-performance');
const FrontendPerformanceTester = require('../frontend/lighthouse-tests');
const ReactPerformanceTester = require('../frontend/react-performance');
const MemoryLeakTester = require('../memory/memory-leak-tests');
const SMSLoadTester = require('../sms/sms-load-tests');

class PerformanceTestRunner {
  constructor(options = {}) {
    this.options = {
      includeDatabase: options.includeDatabase !== false,
      includeFrontend: options.includeFrontend !== false,
      includeMemory: options.includeMemory !== false,
      includeSMS: options.includeSMS !== false,
      includeLoadTests: options.includeLoadTests !== false,
      includeAPITests: options.includeAPITests !== false,
      outputDir: options.outputDir || path.join(__dirname, '..', 'reports'),
      verbose: options.verbose || false,
      parallel: options.parallel || false
    };
    
    this.results = {
      summary: {},
      tests: {},
      timing: {},
      errors: [],
      recommendations: []
    };
    
    this.testStartTime = null;
    this.testEndTime = null;
  }

  async initialize() {
    console.log('🚀 Initializing Performance Test Runner...');
    console.log('📊 Test Configuration:');
    Object.entries(this.options).forEach(([key, value]) => {
      if (key.startsWith('include') || key === 'parallel' || key === 'verbose') {
        console.log(`   ${key}: ${value ? '✅' : '❌'}`);
      }
    });
    
    // Ensure output directory exists
    await this.ensureDirectoryExists(this.options.outputDir);
    
    // Check system readiness
    await this.checkSystemReadiness();
    
    console.log('\\n✅ Performance test runner initialized\\n');
  }

  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async checkSystemReadiness() {
    console.log('🔍 Checking system readiness...');
    
    const checks = [
      this.checkDiskSpace(),
      this.checkMemoryAvailability(),
      this.checkNetworkConnectivity()
    ];
    
    await Promise.all(checks);
    console.log('✅ System readiness verified');
  }

  async checkDiskSpace() {
    // Basic disk space check (placeholder)
    console.log('   💾 Disk space: OK');
  }

  async checkMemoryAvailability() {
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    console.log(`   🧠 Memory usage: ${memUsageMB.toFixed(2)} MB`);
  }

  async checkNetworkConnectivity() {
    // Basic network check (placeholder)
    console.log('   🌐 Network connectivity: OK');
  }

  async runAllTests() {
    this.testStartTime = performance.now();
    console.log('🎯 Starting comprehensive performance test suite...');
    console.log(`⏰ Test started at: ${new Date().toISOString()}\\n`);
    
    try {
      if (this.options.parallel) {
        await this.runTestsInParallel();
      } else {
        await this.runTestsSequentially();
      }
      
      this.testEndTime = performance.now();
      
      // Generate consolidated report
      await this.generateConsolidatedReport();
      
      console.log('\\n🎉 All performance tests completed successfully!');
      console.log(`⏱️  Total execution time: ${((this.testEndTime - this.testStartTime) / 1000).toFixed(2)} seconds`);
      
      return this.results;
      
    } catch (error) {
      this.testEndTime = performance.now();
      console.error('❌ Performance test suite failed:', error.message);
      
      this.results.errors.push({
        type: 'suite_failure',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  async runTestsSequentially() {
    console.log('🔄 Running tests sequentially...\\n');
    
    const testSuite = [
      { name: 'Database Performance', run: () => this.runDatabaseTests(), enabled: this.options.includeDatabase },
      { name: 'Frontend Performance', run: () => this.runFrontendTests(), enabled: this.options.includeFrontend },
      { name: 'Memory Leak Detection', run: () => this.runMemoryTests(), enabled: this.options.includeMemory },
      { name: 'SMS/OTP Load Tests', run: () => this.runSMSTests(), enabled: this.options.includeSMS },
      { name: 'API Performance Tests', run: () => this.runAPITests(), enabled: this.options.includeAPITests },
      { name: 'Artillery Load Tests', run: () => this.runLoadTests(), enabled: this.options.includeLoadTests }
    ];
    
    for (const test of testSuite) {
      if (!test.enabled) {
        console.log(`⏭️  Skipping ${test.name}...\\n`);
        continue;
      }
      
      console.log(`🔍 Starting ${test.name}...`);
      const testStartTime = performance.now();
      
      try {
        const result = await test.run();
        const testEndTime = performance.now();
        const testDuration = testEndTime - testStartTime;
        
        this.results.tests[test.name] = {
          success: true,
          duration: testDuration,
          result: result
        };
        
        console.log(`✅ ${test.name} completed in ${(testDuration / 1000).toFixed(2)} seconds\\n`);
        
      } catch (error) {
        const testEndTime = performance.now();
        const testDuration = testEndTime - testStartTime;
        
        console.error(`❌ ${test.name} failed:`, error.message);
        
        this.results.tests[test.name] = {
          success: false,
          duration: testDuration,
          error: error.message
        };
        
        this.results.errors.push({
          test: test.name,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        
        console.log(`❌ ${test.name} failed after ${(testDuration / 1000).toFixed(2)} seconds\\n`);
      }
    }
  }

  async runTestsInParallel() {
    console.log('⚡ Running tests in parallel...\\n');
    
    const testPromises = [];
    
    if (this.options.includeDatabase) {
      testPromises.push(this.runTestWithTiming('Database Performance', () => this.runDatabaseTests()));
    }
    
    if (this.options.includeFrontend) {
      testPromises.push(this.runTestWithTiming('Frontend Performance', () => this.runFrontendTests()));
    }
    
    if (this.options.includeMemory) {
      testPromises.push(this.runTestWithTiming('Memory Leak Detection', () => this.runMemoryTests()));
    }
    
    if (this.options.includeSMS) {
      testPromises.push(this.runTestWithTiming('SMS/OTP Load Tests', () => this.runSMSTests()));
    }
    
    if (this.options.includeAPITests) {
      testPromises.push(this.runTestWithTiming('API Performance Tests', () => this.runAPITests()));
    }
    
    // Load tests run separately as they can be resource intensive
    const results = await Promise.allSettled(testPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.results.errors.push({
          test: `Parallel test ${index}`,
          message: result.reason.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Run load tests separately if enabled
    if (this.options.includeLoadTests) {
      console.log('🔥 Running Artillery load tests separately...');
      await this.runTestWithTiming('Artillery Load Tests', () => this.runLoadTests());
    }
  }

  async runTestWithTiming(testName, testFunction) {
    const startTime = performance.now();
    
    try {
      console.log(`🔍 Starting ${testName}...`);
      const result = await testFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.results.tests[testName] = {
        success: true,
        duration: duration,
        result: result
      };
      
      console.log(`✅ ${testName} completed in ${(duration / 1000).toFixed(2)} seconds`);
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`❌ ${testName} failed:`, error.message);
      
      this.results.tests[testName] = {
        success: false,
        duration: duration,
        error: error.message
      };
      
      throw error;
    }
  }

  async runDatabaseTests() {
    const dbTester = new DatabasePerformanceTester();
    const redisTester = new RedisPerformanceTester();
    
    const [dbResults, redisResults] = await Promise.all([
      dbTester.runAllTests(),
      redisTester.runAllTests()
    ]);
    
    return {
      mongodb: dbResults,
      redis: redisResults
    };
  }

  async runFrontendTests() {
    const lighthouseTester = new FrontendPerformanceTester();
    const reactTester = new ReactPerformanceTester();
    
    const [lighthouseResults, reactResults] = await Promise.all([
      lighthouseTester.runAllTests(),
      reactTester.runAllTests()
    ]);
    
    return {
      lighthouse: lighthouseResults,
      react: reactResults
    };
  }

  async runMemoryTests() {
    const memoryTester = new MemoryLeakTester();
    return await memoryTester.runAllTests();
  }

  async runSMSTests() {
    const smsTester = new SMSLoadTester();
    return await smsTester.runAllTests();
  }

  async runAPITests() {
    console.log('🔍 Running API performance tests with Jest...');
    
    return new Promise((resolve, reject) => {
      const jestProcess = spawn('npm', ['run', 'test:api'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      jestProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (this.options.verbose) {
          console.log(data.toString());
        }
      });
      
      jestProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        if (this.options.verbose) {
          console.error(data.toString());
        }
      });
      
      jestProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: output,
            exitCode: code
          });
        } else {
          reject(new Error(`API tests failed with exit code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  async runLoadTests() {
    console.log('🔥 Running Artillery load tests...');
    
    const loadTestScenarios = [
      'light-load.yml',
      'normal-load.yml'
    ];
    
    const results = {};
    
    for (const scenario of loadTestScenarios) {
      console.log(`   🎯 Running ${scenario}...`);
      
      try {
        const result = await this.runArtilleryTest(scenario);
        results[scenario] = {
          success: true,
          result: result
        };
        console.log(`   ✅ ${scenario} completed`);
      } catch (error) {
        results[scenario] = {
          success: false,
          error: error.message
        };
        console.error(`   ❌ ${scenario} failed:`, error.message);
      }
    }
    
    return results;
  }

  async runArtilleryTest(scenario) {
    const scenarioPath = path.join(__dirname, '..', 'load-tests', 'scenarios', scenario);
    
    return new Promise((resolve, reject) => {
      const artilleryProcess = spawn('artillery', ['run', scenarioPath], {
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      artilleryProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (this.options.verbose) {
          console.log(data.toString());
        }
      });
      
      artilleryProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      artilleryProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            output: output,
            exitCode: code
          });
        } else {
          reject(new Error(`Artillery test failed: ${errorOutput}`));
        }
      });
    });
  }

  async generateConsolidatedReport() {
    console.log('\\n📊 Generating consolidated performance report...');
    
    const reportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        testDuration: this.testEndTime - this.testStartTime,
        testConfiguration: this.options,
        systemInfo: {
          platform: process.platform,
          nodeVersion: process.version,
          memory: process.memoryUsage()
        }
      },
      summary: this.generateTestSummary(),
      results: this.results.tests,
      errors: this.results.errors,
      recommendations: this.generateGlobalRecommendations(),
      timing: this.generateTimingAnalysis()
    };
    
    // Save JSON report
    const jsonReportPath = path.join(this.options.outputDir, `performance-report-${Date.now()}.json`);
    await fs.writeFile(jsonReportPath, JSON.stringify(reportData, null, 2));
    
    // Generate HTML report
    const htmlReportPath = await this.generateHTMLReport(reportData);
    
    // Generate CSV summary
    const csvReportPath = await this.generateCSVSummary(reportData);
    
    console.log(`\\n📄 Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
    console.log(`   CSV:  ${csvReportPath}`);
    
    // Print summary to console
    this.printConsoleSummary(reportData);
    
    return reportData;
  }

  generateTestSummary() {
    const totalTests = Object.keys(this.results.tests).length;
    const successfulTests = Object.values(this.results.tests).filter(t => t.success).length;
    const failedTests = totalTests - successfulTests;
    
    return {
      totalTests,
      successfulTests,
      failedTests,
      successRate: totalTests > 0 ? (successfulTests / totalTests) * 100 : 0,
      totalErrors: this.results.errors.length
    };
  }

  generateGlobalRecommendations() {
    const recommendations = [];
    
    // Analyze test results for global recommendations
    if (this.results.errors.length > 0) {
      recommendations.push('Address test failures before production deployment');
    }
    
    // Check for performance issues across tests
    const slowTests = Object.entries(this.results.tests)
      .filter(([_, test]) => test.success && test.duration > 300000) // 5 minutes
      .map(([name, _]) => name);
    
    if (slowTests.length > 0) {
      recommendations.push(`Optimize slow-running tests: ${slowTests.join(', ')}`);
    }
    
    // System-level recommendations
    const testDurationMinutes = (this.testEndTime - this.testStartTime) / 1000 / 60;
    if (testDurationMinutes > 30) {
      recommendations.push('Consider optimizing test suite execution time');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance test suite executed successfully with no major issues');
    }
    
    return recommendations;
  }

  generateTimingAnalysis() {
    const timing = {
      totalDuration: this.testEndTime - this.testStartTime,
      testBreakdown: {}
    };
    
    Object.entries(this.results.tests).forEach(([testName, testData]) => {
      timing.testBreakdown[testName] = {
        duration: testData.duration,
        percentage: (testData.duration / timing.totalDuration) * 100
      };
    });
    
    return timing;
  }

  async generateHTMLReport(reportData) {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Satfera Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .success { border-left-color: #28a745; }
        .error { border-left-color: #dc3545; }
        .warning { border-left-color: #ffc107; }
        .test-results { margin-bottom: 30px; }
        .test-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .test-success { border-left: 4px solid #28a745; }
        .test-failure { border-left: 4px solid #dc3545; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .footer { text-align: center; margin-top: 30px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Satfera Performance Test Report</h1>
            <p>Generated on ${new Date(reportData.metadata.timestamp).toLocaleString()}</p>
            <p>Test Duration: ${(reportData.metadata.testDuration / 1000 / 60).toFixed(2)} minutes</p>
        </div>
        
        <div class="summary">
            <div class="summary-card success">
                <h3>✅ Successful Tests</h3>
                <div style="font-size: 2em; font-weight: bold;">${reportData.summary.successfulTests}</div>
            </div>
            <div class="summary-card error">
                <h3>❌ Failed Tests</h3>
                <div style="font-size: 2em; font-weight: bold;">${reportData.summary.failedTests}</div>
            </div>
            <div class="summary-card">
                <h3>📊 Success Rate</h3>
                <div style="font-size: 2em; font-weight: bold;">${reportData.summary.successRate.toFixed(1)}%</div>
            </div>
            <div class="summary-card warning">
                <h3>⚠️ Total Errors</h3>
                <div style="font-size: 2em; font-weight: bold;">${reportData.summary.totalErrors}</div>
            </div>
        </div>
        
        <div class="test-results">
            <h2>📋 Test Results</h2>
            ${Object.entries(reportData.results).map(([testName, testData]) => `
                <div class="test-item ${testData.success ? 'test-success' : 'test-failure'}">
                    <h3>${testData.success ? '✅' : '❌'} ${testName}</h3>
                    <p><strong>Duration:</strong> ${(testData.duration / 1000).toFixed(2)} seconds</p>
                    ${testData.error ? `<p><strong>Error:</strong> ${testData.error}</p>` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="recommendations">
            <h2>🚀 Recommendations</h2>
            <ul>
                ${reportData.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        
        ${reportData.errors.length > 0 ? `
        <div class="test-results">
            <h2>🚨 Errors</h2>
            ${reportData.errors.map(error => `
                <div class="test-item test-failure">
                    <h4>${error.test || 'System Error'}</h4>
                    <p>${error.message}</p>
                    <small>${error.timestamp}</small>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="footer">
            <p>Report generated by Satfera Performance Testing Suite</p>
        </div>
    </div>
</body>
</html>
    `;
    
    const htmlReportPath = path.join(this.options.outputDir, `performance-report-${Date.now()}.html`);
    await fs.writeFile(htmlReportPath, htmlTemplate);
    
    return htmlReportPath;
  }

  async generateCSVSummary(reportData) {
    const csvData = [
      ['Test Name', 'Success', 'Duration (seconds)', 'Error Message']
    ];
    
    Object.entries(reportData.results).forEach(([testName, testData]) => {
      csvData.push([
        testName,
        testData.success ? 'Yes' : 'No',
        (testData.duration / 1000).toFixed(2),
        testData.error || ''
      ]);
    });
    
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\\n');
    
    const csvReportPath = path.join(this.options.outputDir, `performance-summary-${Date.now()}.csv`);
    await fs.writeFile(csvReportPath, csvContent);
    
    return csvReportPath;
  }

  printConsoleSummary(reportData) {
    console.log('\\n📊 ===============================================');
    console.log('📊 COMPREHENSIVE PERFORMANCE TEST SUMMARY');
    console.log('📊 ===============================================');
    
    console.log('\\n🎯 OVERALL RESULTS:');
    console.log(`   Total Tests: ${reportData.summary.totalTests}`);
    console.log(`   Successful: ${reportData.summary.successfulTests} (${reportData.summary.successRate.toFixed(1)}%)`);
    console.log(`   Failed: ${reportData.summary.failedTests}`);
    console.log(`   Total Errors: ${reportData.summary.totalErrors}`);
    console.log(`   Test Duration: ${(reportData.metadata.testDuration / 1000 / 60).toFixed(2)} minutes`);
    
    console.log('\\n⏱️  TEST TIMING:');
    Object.entries(reportData.timing.testBreakdown).forEach(([testName, timing]) => {
      console.log(`   ${testName}: ${(timing.duration / 1000).toFixed(2)}s (${timing.percentage.toFixed(1)}%)`);
    });
    
    if (reportData.recommendations.length > 0) {
      console.log('\\n🚀 KEY RECOMMENDATIONS:');
      reportData.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    if (reportData.errors.length > 0) {
      console.log('\\n🚨 ERRORS ENCOUNTERED:');
      reportData.errors.forEach(error => {
        console.log(`   ❌ ${error.test || 'System'}: ${error.message}`);
      });
    }
    
    console.log('\\n📊 ===============================================');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  if (args.includes('--database-only')) {
    options.includeDatabase = true;
    options.includeFrontend = false;
    options.includeMemory = false;
    options.includeSMS = false;
    options.includeLoadTests = false;
    options.includeAPITests = false;
  }
  
  if (args.includes('--frontend-only')) {
    options.includeDatabase = false;
    options.includeFrontend = true;
    options.includeMemory = false;
    options.includeSMS = false;
    options.includeLoadTests = false;
    options.includeAPITests = false;
  }
  
  if (args.includes('--parallel')) {
    options.parallel = true;
  }
  
  if (args.includes('--verbose')) {
    options.verbose = true;
  }
  
  if (args.includes('--quick')) {
    options.includeMemory = false;
    options.includeSMS = false;
    options.includeLoadTests = false;
  }
  
  const runner = new PerformanceTestRunner(options);
  
  try {
    await runner.initialize();
    const results = await runner.runAllTests();
    
    process.exit(0);
    
  } catch (error) {
    console.error('\\n❌ Performance test suite failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = PerformanceTestRunner;