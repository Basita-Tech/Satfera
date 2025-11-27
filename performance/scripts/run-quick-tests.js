#!/usr/bin/env node

/**
 * Quick Performance Test Runner
 * Runs essential performance tests for rapid feedback
 */

const PerformanceTestRunner = require('./run-all-tests');
const { performance } = require('perf_hooks');

class QuickTestRunner {
  constructor() {
    this.results = {};
    this.startTime = null;
  }

  async runQuickTests() {
    console.log('⚡ Starting Quick Performance Test Suite...');
    console.log('🎯 Running essential tests for rapid feedback\\n');
    
    this.startTime = performance.now();
    
    const runner = new PerformanceTestRunner({
      // Essential tests only
      includeDatabase: true,
      includeFrontend: true,
      includeMemory: false,
      includeSMS: false,
      includeLoadTests: false,
      includeAPITests: true,
      
      // Quick execution
      parallel: true,
      verbose: false,
      outputDir: require('path').join(__dirname, '..', 'reports', 'quick')
    });
    
    try {
      await runner.initialize();
      
      // Run quick health checks first
      await this.runHealthChecks();
      
      // Run core performance tests
      const results = await this.runCoreTests(runner);
      
      const endTime = performance.now();
      const duration = (endTime - this.startTime) / 1000;
      
      console.log('\\n⚡ Quick Performance Tests Summary:');
      console.log(`⏱️  Total time: ${duration.toFixed(2)} seconds`);
      
      this.generateQuickReport(results, duration);
      
      return results;
      
    } catch (error) {
      console.error('❌ Quick tests failed:', error.message);
      throw error;
    }
  }

  async runHealthChecks() {
    console.log('🔍 Running system health checks...');
    
    const healthChecks = [
      this.checkAPIHealth(),
      this.checkDatabaseHealth(),
      this.checkFrontendHealth()
    ];
    
    const results = await Promise.allSettled(healthChecks);
    
    results.forEach((result, index) => {
      const checkNames = ['API', 'Database', 'Frontend'];
      const checkName = checkNames[index];
      
      if (result.status === 'fulfilled') {
        console.log(`✅ ${checkName} health check passed`);
      } else {
        console.log(`⚠️  ${checkName} health check failed: ${result.reason.message}`);
      }
    });
    
    console.log('');
  }

  async checkAPIHealth() {
    const axios = require('axios');
    const apiURL = process.env.API_URL || 'http://localhost:8000';
    
    try {
      const response = await axios.get(`${apiURL}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      throw new Error(`API health check failed: ${error.message}`);
    }
  }

  async checkDatabaseHealth() {
    // Simple database connection check
    try {
      const mongoose = require('mongoose');
      const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/satfera_test';
      
      await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 3000
      });
      
      await mongoose.disconnect();
      return true;
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  async checkFrontendHealth() {
    const axios = require('axios');
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    try {
      const response = await axios.get(frontendURL, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      throw new Error(`Frontend health check failed: ${error.message}`);
    }
  }

  async runCoreTests(runner) {
    console.log('🚀 Running core performance tests...');
    
    const coreTests = [
      {
        name: 'API Response Time',
        run: () => this.testAPIResponseTime(),
        timeout: 30000
      },
      {
        name: 'Database Query Performance',
        run: () => this.testDatabasePerformance(),
        timeout: 45000
      },
      {
        name: 'Frontend Load Time',
        run: () => this.testFrontendLoadTime(),
        timeout: 60000
      }
    ];
    
    const results = {};
    
    for (const test of coreTests) {
      console.log(`\\n🔍 Running ${test.name}...`);
      
      try {
        const startTime = performance.now();
        const result = await Promise.race([
          test.run(),
          this.createTimeout(test.timeout, test.name)
        ]);
        const endTime = performance.now();
        
        results[test.name] = {
          success: true,
          duration: endTime - startTime,
          result: result
        };
        
        console.log(`✅ ${test.name} completed in ${((endTime - startTime) / 1000).toFixed(2)}s`);
        
      } catch (error) {
        console.error(`❌ ${test.name} failed: ${error.message}`);
        
        results[test.name] = {
          success: false,
          error: error.message
        };
      }
    }
    
    return results;
  }

  createTimeout(ms, testName) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${testName} timed out after ${ms}ms`));
      }, ms);
    });
  }

  async testAPIResponseTime() {
    const axios = require('axios');
    const apiURL = process.env.API_URL || 'http://localhost:8000';
    
    const endpoints = [
      '/',
      '/health',
      '/api/v1/auth/send-email-otp'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = performance.now();
        
        let response;
        if (endpoint === '/api/v1/auth/send-email-otp') {
          response = await axios.post(`${apiURL}${endpoint}`, {
            email: 'quick.test@example.com'
          }, { timeout: 10000 });
        } else {
          response = await axios.get(`${apiURL}${endpoint}`, { timeout: 5000 });
        }
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        results.push({
          endpoint,
          responseTime,
          status: response.status,
          success: true
        });
        
      } catch (error) {
        results.push({
          endpoint,
          responseTime: 0,
          status: error.response?.status || 0,
          success: false,
          error: error.message
        });
      }
    }
    
    const avgResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.success).length;
    
    return {
      averageResponseTime: avgResponseTime,
      endpoints: results,
      successRate: (results.filter(r => r.success).length / results.length) * 100
    };
  }

  async testDatabasePerformance() {
    const mongoose = require('mongoose');
    const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/satfera_quick_test';
    
    try {
      // Connect to database
      const connectStart = performance.now();
      await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 5000
      });
      const connectEnd = performance.now();
      const connectionTime = connectEnd - connectStart;
      
      // Simple query test
      const queryStart = performance.now();
      const collections = await mongoose.connection.db.listCollections().toArray();
      const queryEnd = performance.now();
      const queryTime = queryEnd - queryStart;
      
      await mongoose.disconnect();
      
      return {
        connectionTime,
        queryTime,
        collectionsFound: collections.length,
        totalTime: connectionTime + queryTime
      };
      
    } catch (error) {
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }
      throw error;
    }
  }

  async testFrontendLoadTime() {
    const puppeteer = require('puppeteer');
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      // Test home page load
      const homePageStart = performance.now();
      await page.goto(frontendURL, { waitUntil: 'networkidle2', timeout: 30000 });
      const homePageEnd = performance.now();
      const homePageTime = homePageEnd - homePageStart;
      
      // Get basic metrics
      const metrics = await page.evaluate(() => {
        const paintEntries = performance.getEntriesByType('paint');
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        
        return {
          firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
          domContentLoaded: navigationEntry?.domContentLoadedEventEnd || 0,
          loadComplete: navigationEntry?.loadEventEnd || 0
        };
      });
      
      await browser.close();
      
      return {
        homePageLoadTime: homePageTime,
        firstPaint: metrics.firstPaint,
        firstContentfulPaint: metrics.firstContentfulPaint,
        domContentLoaded: metrics.domContentLoaded,
        loadComplete: metrics.loadComplete
      };
      
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      throw error;
    }
  }

  generateQuickReport(results, duration) {
    console.log('\\n📊 ================================');
    console.log('📊 QUICK PERFORMANCE TEST REPORT');
    console.log('📊 ================================');
    
    const successful = Object.values(results).filter(r => r.success).length;
    const total = Object.keys(results).length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    console.log('\\n🎯 SUMMARY:');
    console.log(`   Tests Run: ${total}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`   Total Time: ${duration.toFixed(2)}s`);
    
    console.log('\\n📋 TEST RESULTS:');
    
    Object.entries(results).forEach(([testName, result]) => {
      console.log(`\\n   ${result.success ? '✅' : '❌'} ${testName}:`);
      
      if (result.success) {
        if (result.duration) {
          console.log(`     Duration: ${(result.duration / 1000).toFixed(2)}s`);
        }
        
        if (testName === 'API Response Time' && result.result) {
          console.log(`     Avg Response Time: ${result.result.averageResponseTime.toFixed(2)}ms`);
          console.log(`     Success Rate: ${result.result.successRate.toFixed(1)}%`);
        }
        
        if (testName === 'Database Query Performance' && result.result) {
          console.log(`     Connection Time: ${result.result.connectionTime.toFixed(2)}ms`);
          console.log(`     Query Time: ${result.result.queryTime.toFixed(2)}ms`);
        }
        
        if (testName === 'Frontend Load Time' && result.result) {
          console.log(`     Page Load Time: ${result.result.homePageLoadTime.toFixed(2)}ms`);
          console.log(`     First Contentful Paint: ${result.result.firstContentfulPaint.toFixed(2)}ms`);
        }
      } else {
        console.log(`     Error: ${result.error}`);
      }
    });
    
    // Quick recommendations
    console.log('\\n🚀 QUICK RECOMMENDATIONS:');
    this.generateQuickRecommendations(results);
    
    console.log('\\n📊 ================================');
  }

  generateQuickRecommendations(results) {
    const recommendations = [];
    
    // API performance recommendations
    const apiResult = results['API Response Time'];
    if (apiResult?.success && apiResult.result) {
      if (apiResult.result.averageResponseTime > 1000) {
        recommendations.push('API response times are slow (>1s) - investigate backend performance');
      }
      if (apiResult.result.successRate < 100) {
        recommendations.push('Some API endpoints are failing - check error logs');
      }
    } else if (!apiResult?.success) {
      recommendations.push('API tests failed - ensure backend is running and accessible');
    }
    
    // Database recommendations
    const dbResult = results['Database Query Performance'];
    if (dbResult?.success && dbResult.result) {
      if (dbResult.result.connectionTime > 2000) {
        recommendations.push('Database connection time is slow (>2s) - check network or database performance');
      }
      if (dbResult.result.queryTime > 500) {
        recommendations.push('Database queries are slow (>500ms) - consider indexing or query optimization');
      }
    } else if (!dbResult?.success) {
      recommendations.push('Database tests failed - ensure MongoDB is running and accessible');
    }
    
    // Frontend recommendations
    const frontendResult = results['Frontend Load Time'];
    if (frontendResult?.success && frontendResult.result) {
      if (frontendResult.result.homePageLoadTime > 5000) {
        recommendations.push('Frontend load time is slow (>5s) - optimize bundle size or server response');
      }
      if (frontendResult.result.firstContentfulPaint > 2000) {
        recommendations.push('First Contentful Paint is slow (>2s) - optimize critical rendering path');
      }
    } else if (!frontendResult?.success) {
      recommendations.push('Frontend tests failed - ensure frontend is running and accessible');
    }
    
    // Overall recommendations
    const successRate = Object.values(results).filter(r => r.success).length / Object.keys(results).length * 100;
    if (successRate < 100) {
      recommendations.push('Some tests failed - investigate and fix issues before deployment');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All quick tests passed - system appears to be performing well');
    }
    
    recommendations.forEach(rec => console.log(`   • ${rec}`));
  }
}

// Command line interface
async function main() {
  const runner = new QuickTestRunner();
  
  try {
    await runner.runQuickTests();
    console.log('\\n✅ Quick performance tests completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\\n❌ Quick performance tests failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = QuickTestRunner;