/**
 * Lighthouse Frontend Performance Testing Suite
 * Comprehensive frontend performance analysis using Google Lighthouse
 */

const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class FrontendPerformanceTester {
  constructor() {
    this.browser = null;
    this.results = {
      pages: {},
      summary: {},
      recommendations: []
    };
    this.baseURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.reportsDir = path.join(__dirname, 'reports');
  }

  async initialize() {
    console.log('🚀 Initializing Lighthouse performance testing...');
    
    // Create reports directory
    await this.ensureDirectoryExists(this.reportsDir);
    
    // Launch browser for testing
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    console.log(`✅ Browser launched, testing against: ${this.baseURL}`);
  }

  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async runLighthouseAudit(url, pageName, options = {}) {
    console.log(`\\n🔍 Running Lighthouse audit for ${pageName}...`);
    
    const defaultConfig = {
      extends: 'lighthouse:default',
      settings: {
        formFactor: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false
        },
        emulatedUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    try {
      const startTime = performance.now();
      const result = await lighthouse(url, {
        port: new URL(this.browser.wsEndpoint()).port,
        output: 'html',
        logLevel: 'error'
      }, defaultConfig);
      const endTime = performance.now();

      const auditTime = endTime - startTime;
      
      // Save the HTML report
      const reportPath = path.join(this.reportsDir, `${pageName}-lighthouse-report.html`);
      await fs.writeFile(reportPath, result.report);
      
      // Extract key metrics
      const lhr = result.lhr;
      const metrics = {
        url: url,
        pageName: pageName,
        auditTime: auditTime.toFixed(2),
        timestamp: new Date().toISOString(),
        performance: {
          score: Math.round(lhr.categories.performance.score * 100),
          firstContentfulPaint: this.extractMetric(lhr, 'first-contentful-paint'),
          largestContentfulPaint: this.extractMetric(lhr, 'largest-contentful-paint'),
          firstMeaningfulPaint: this.extractMetric(lhr, 'first-meaningful-paint'),
          speedIndex: this.extractMetric(lhr, 'speed-index'),
          timeToInteractive: this.extractMetric(lhr, 'interactive'),
          totalBlockingTime: this.extractMetric(lhr, 'total-blocking-time'),
          cumulativeLayoutShift: this.extractMetric(lhr, 'cumulative-layout-shift')
        },
        accessibility: {
          score: Math.round(lhr.categories.accessibility.score * 100)
        },
        bestPractices: {
          score: Math.round(lhr.categories['best-practices'].score * 100)
        },
        seo: {
          score: Math.round(lhr.categories.seo.score * 100)
        },
        pwa: {
          score: lhr.categories.pwa ? Math.round(lhr.categories.pwa.score * 100) : null
        },
        networkRequests: {
          total: lhr.audits['network-requests']?.details?.items?.length || 0,
          totalSize: this.calculateTotalSize(lhr.audits['network-requests']?.details?.items || [])
        },
        resourceSummary: this.extractResourceSummary(lhr),
        opportunities: this.extractOpportunities(lhr)
      };

      this.results.pages[pageName] = metrics;
      
      console.log(`✅ ${pageName} audit completed:`);
      console.log(`   Performance Score: ${metrics.performance.score}/100`);
      console.log(`   First Contentful Paint: ${metrics.performance.firstContentfulPaint?.displayValue || 'N/A'}`);
      console.log(`   Largest Contentful Paint: ${metrics.performance.largestContentfulPaint?.displayValue || 'N/A'}`);
      console.log(`   Time to Interactive: ${metrics.performance.timeToInteractive?.displayValue || 'N/A'}`);
      console.log(`   Total Blocking Time: ${metrics.performance.totalBlockingTime?.displayValue || 'N/A'}`);
      console.log(`   Cumulative Layout Shift: ${metrics.performance.cumulativeLayoutShift?.displayValue || 'N/A'}`);
      console.log(`   Report saved: ${reportPath}`);
      
      return metrics;
      
    } catch (error) {
      console.error(`❌ Lighthouse audit failed for ${pageName}:`, error.message);
      throw error;
    }
  }

  extractMetric(lhr, metricName) {
    const audit = lhr.audits[metricName];
    if (!audit) return null;
    
    return {
      score: audit.score,
      numericValue: audit.numericValue,
      displayValue: audit.displayValue,
      title: audit.title
    };
  }

  calculateTotalSize(networkItems) {
    return networkItems.reduce((total, item) => {
      return total + (item.transferSize || 0);
    }, 0);
  }

  extractResourceSummary(lhr) {
    const resourceSummary = lhr.audits['resource-summary'];
    if (!resourceSummary || !resourceSummary.details || !resourceSummary.details.items) {
      return null;
    }
    
    const summary = {};
    resourceSummary.details.items.forEach(item => {
      summary[item.resourceType] = {
        count: item.requestCount,
        size: item.size
      };
    });
    
    return summary;
  }

  extractOpportunities(lhr) {
    const opportunities = [];
    const opportunityAudits = [
      'render-blocking-resources',
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'offscreen-images',
      'unminified-css',
      'unminified-javascript',
      'efficient-animated-content',
      'duplicated-javascript'
    ];
    
    opportunityAudits.forEach(auditName => {
      const audit = lhr.audits[auditName];
      if (audit && audit.score < 1 && audit.details && audit.details.overallSavingsMs > 0) {
        opportunities.push({
          audit: auditName,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          potentialSavings: audit.details.overallSavingsMs,
          displayValue: audit.displayValue
        });
      }
    });
    
    return opportunities;
  }

  async testHomePage() {
    const homeUrl = `${this.baseURL}/`;
    return await this.runLighthouseAudit(homeUrl, 'home');
  }

  async testLoginPage() {
    const loginUrl = `${this.baseURL}/login`;
    return await this.runLighthouseAudit(loginUrl, 'login');
  }

  async testSignupPage() {
    const signupUrl = `${this.baseURL}/signup`;
    return await this.runLighthouseAudit(signupUrl, 'signup');
  }

  async testDashboardPage() {
    // Note: Dashboard might require authentication
    const dashboardUrl = `${this.baseURL}/dashboard`;
    try {
      return await this.runLighthouseAudit(dashboardUrl, 'dashboard');
    } catch (error) {
      console.warn(`⚠️  Dashboard test skipped (likely requires auth): ${error.message}`);
      return null;
    }
  }

  async testProfileFormPages() {
    const formPages = [
      { url: '/profile/personal', name: 'profile-personal' },
      { url: '/profile/family', name: 'profile-family' },
      { url: '/profile/education', name: 'profile-education' },
      { url: '/profile/professional', name: 'profile-professional' }
    ];
    
    const results = {};
    
    for (const page of formPages) {
      try {
        const fullUrl = `${this.baseURL}${page.url}`;
        results[page.name] = await this.runLighthouseAudit(fullUrl, page.name);
      } catch (error) {
        console.warn(`⚠️  ${page.name} test skipped: ${error.message}`);
        results[page.name] = null;
      }
    }
    
    return results;
  }

  async runMobileAudits() {
    console.log('\\n📱 Running mobile performance audits...');
    
    const mobileConfig = {
      extends: 'lighthouse:default',
      settings: {
        formFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4
        },
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false
        }
      }
    };
    
    const mobilePages = ['home', 'login', 'signup'];
    const mobileResults = {};
    
    for (const pageName of mobilePages) {
      try {
        const url = pageName === 'home' ? `${this.baseURL}/` : `${this.baseURL}/${pageName}`;
        const mobilePageName = `${pageName}-mobile`;
        
        console.log(`📱 Testing ${pageName} on mobile...`);
        const result = await lighthouse(url, {
          port: new URL(this.browser.wsEndpoint()).port,
          output: 'html',
          logLevel: 'error'
        }, mobileConfig);
        
        // Save mobile report
        const reportPath = path.join(this.reportsDir, `${mobilePageName}-lighthouse-report.html`);
        await fs.writeFile(reportPath, result.report);
        
        const lhr = result.lhr;
        mobileResults[mobilePageName] = {
          url: url,
          pageName: mobilePageName,
          performance: {
            score: Math.round(lhr.categories.performance.score * 100),
            firstContentfulPaint: this.extractMetric(lhr, 'first-contentful-paint'),
            largestContentfulPaint: this.extractMetric(lhr, 'largest-contentful-paint'),
            timeToInteractive: this.extractMetric(lhr, 'interactive'),
            totalBlockingTime: this.extractMetric(lhr, 'total-blocking-time'),
            cumulativeLayoutShift: this.extractMetric(lhr, 'cumulative-layout-shift')
          }
        };
        
        console.log(`✅ ${mobilePageName}: Performance ${mobileResults[mobilePageName].performance.score}/100`);
        
      } catch (error) {
        console.warn(`⚠️  Mobile test for ${pageName} failed: ${error.message}`);
        mobileResults[`${pageName}-mobile`] = null;
      }
    }
    
    return mobileResults;
  }

  async performComponentPerformanceTests() {
    console.log('\\n🧩 Running component-specific performance tests...');
    
    const page = await this.browser.newPage();
    
    try {
      // Navigate to a page with forms
      await page.goto(`${this.baseURL}/signup`, { waitUntil: 'networkidle2' });
      
      // Test form interaction performance
      const formTests = await this.testFormPerformance(page);
      
      // Test image loading performance
      const imageTests = await this.testImageLoadingPerformance(page);
      
      // Test JavaScript bundle performance
      const jsTests = await this.testJavaScriptPerformance(page);
      
      return {
        forms: formTests,
        images: imageTests,
        javascript: jsTests
      };
      
    } catch (error) {
      console.error('❌ Component performance tests failed:', error.message);
      return null;
    } finally {
      await page.close();
    }
  }

  async testFormPerformance(page) {
    console.log('📝 Testing form interaction performance...');
    
    try {
      // Measure form input responsiveness
      const inputStartTime = performance.now();
      await page.type('input[type="email"]', 'test@example.com', { delay: 50 });
      const inputEndTime = performance.now();
      
      // Measure form validation response time
      const validationStartTime = performance.now();
      await page.click('input[type="password"]'); // Trigger validation
      await page.waitForTimeout(100); // Wait for validation
      const validationEndTime = performance.now();
      
      return {
        inputResponseTime: inputEndTime - inputStartTime,
        validationResponseTime: validationEndTime - validationStartTime
      };
      
    } catch (error) {
      console.warn('⚠️  Form performance test failed:', error.message);
      return null;
    }
  }

  async testImageLoadingPerformance(page) {
    console.log('🖼️  Testing image loading performance...');
    
    try {
      // Count images and measure load times
      const imageMetrics = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const imageData = [];
        
        images.forEach(img => {
          imageData.push({
            src: img.src,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete,
            size: img.naturalWidth * img.naturalHeight
          });
        });
        
        return {
          totalImages: images.length,
          images: imageData
        };
      });
      
      return imageMetrics;
      
    } catch (error) {
      console.warn('⚠️  Image performance test failed:', error.message);
      return null;
    }
  }

  async testJavaScriptPerformance(page) {
    console.log('📜 Testing JavaScript performance...');
    
    try {
      // Measure JavaScript execution time
      const jsMetrics = await page.evaluate(() => {
        const start = performance.now();
        
        // Simulate some JavaScript operations
        let result = 0;
        for (let i = 0; i < 100000; i++) {
          result += Math.random();
        }
        
        const end = performance.now();
        
        return {
          executionTime: end - start,
          result: result,
          memoryUsage: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          } : null
        };
      });
      
      return jsMetrics;
      
    } catch (error) {
      console.warn('⚠️  JavaScript performance test failed:', error.message);
      return null;
    }
  }

  generateSummary() {
    const pages = Object.values(this.results.pages).filter(page => page !== null);
    
    if (pages.length === 0) {
      return { message: 'No valid page results to summarize' };
    }
    
    const summary = {
      totalPages: pages.length,
      averagePerformanceScore: pages.reduce((sum, page) => sum + page.performance.score, 0) / pages.length,
      averageAccessibilityScore: pages.reduce((sum, page) => sum + page.accessibility.score, 0) / pages.length,
      averageBestPracticesScore: pages.reduce((sum, page) => sum + page.bestPractices.score, 0) / pages.length,
      averageSeoScore: pages.reduce((sum, page) => sum + page.seo.score, 0) / pages.length,
      commonIssues: this.identifyCommonIssues(),
      recommendations: this.generateRecommendations()
    };
    
    this.results.summary = summary;
    return summary;
  }

  identifyCommonIssues() {
    const issues = [];
    const pages = Object.values(this.results.pages).filter(page => page !== null);
    
    // Check for common performance issues
    const lowPerformancePages = pages.filter(page => page.performance.score < 70);
    if (lowPerformancePages.length > 0) {
      issues.push(`Low performance scores on ${lowPerformancePages.length} page(s)`);
    }
    
    const slowFCPPages = pages.filter(page => 
      page.performance.firstContentfulPaint?.numericValue > 2000
    );
    if (slowFCPPages.length > 0) {
      issues.push(`Slow First Contentful Paint on ${slowFCPPages.length} page(s)`);
    }
    
    const slowLCPPages = pages.filter(page => 
      page.performance.largestContentfulPaint?.numericValue > 2500
    );
    if (slowLCPPages.length > 0) {
      issues.push(`Slow Largest Contentful Paint on ${slowLCPPages.length} page(s)`);
    }
    
    return issues;
  }

  generateRecommendations() {
    const recommendations = [];
    const pages = Object.values(this.results.pages).filter(page => page !== null);
    
    // Collect all opportunities
    const allOpportunities = pages.reduce((acc, page) => {
      return acc.concat(page.opportunities || []);
    }, []);
    
    // Group opportunities by type
    const groupedOpportunities = allOpportunities.reduce((groups, opportunity) => {
      const key = opportunity.audit;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(opportunity);
      return groups;
    }, {});
    
    // Generate recommendations based on most common opportunities
    Object.entries(groupedOpportunities).forEach(([auditType, opportunities]) => {
      if (opportunities.length > 1) {
        const totalSavings = opportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0);
        recommendations.push({
          type: auditType,
          title: opportunities[0].title,
          description: opportunities[0].description,
          affectedPages: opportunities.length,
          totalPotentialSavings: Math.round(totalSavings),
          priority: totalSavings > 1000 ? 'high' : totalSavings > 500 ? 'medium' : 'low'
        });
      }
    });
    
    return recommendations.sort((a, b) => b.totalPotentialSavings - a.totalPotentialSavings);
  }

  async generateReport() {
    console.log('\\n📊 =======================================');
    console.log('📊 FRONTEND PERFORMANCE TESTING REPORT');
    console.log('📊 =======================================');
    
    const summary = this.generateSummary();
    
    console.log('\\n🏠 PAGE PERFORMANCE SCORES:');
    Object.entries(this.results.pages).forEach(([pageName, data]) => {
      if (data) {
        console.log(`   ${pageName}: ${data.performance.score}/100`);
        console.log(`     FCP: ${data.performance.firstContentfulPaint?.displayValue || 'N/A'}`);
        console.log(`     LCP: ${data.performance.largestContentfulPaint?.displayValue || 'N/A'}`);
        console.log(`     TTI: ${data.performance.timeToInteractive?.displayValue || 'N/A'}`);
      }
    });
    
    console.log('\\n📊 OVERALL SUMMARY:');
    console.log(`   Pages Tested: ${summary.totalPages}`);
    console.log(`   Average Performance Score: ${summary.averagePerformanceScore?.toFixed(1)}/100`);
    console.log(`   Average Accessibility Score: ${summary.averageAccessibilityScore?.toFixed(1)}/100`);
    console.log(`   Average Best Practices Score: ${summary.averageBestPracticesScore?.toFixed(1)}/100`);
    console.log(`   Average SEO Score: ${summary.averageSeoScore?.toFixed(1)}/100`);
    
    if (summary.commonIssues && summary.commonIssues.length > 0) {
      console.log('\\n⚠️  COMMON ISSUES:');
      summary.commonIssues.forEach(issue => console.log(`   • ${issue}`));
    }
    
    if (summary.recommendations && summary.recommendations.length > 0) {
      console.log('\\n🚀 TOP RECOMMENDATIONS:');
      summary.recommendations.slice(0, 5).forEach(rec => {
        console.log(`   ${rec.priority.toUpperCase()}: ${rec.title}`);
        console.log(`     Potential savings: ${rec.totalPotentialSavings}ms across ${rec.affectedPages} page(s)`);
      });
    }
    
    // Save detailed report
    const reportPath = path.join(this.reportsDir, 'frontend-performance-summary.json');
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\\n📄 Detailed report saved: ${reportPath}`);
    
    console.log('\\n📊 =======================================');
    
    return this.results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  async runAllTests() {
    try {
      await this.initialize();
      
      // Test main pages
      await this.testHomePage();
      await this.testLoginPage();
      await this.testSignupPage();
      await this.testDashboardPage();
      
      // Test profile form pages
      const formResults = await this.testProfileFormPages();
      Object.assign(this.results.pages, formResults);
      
      // Test mobile performance
      const mobileResults = await this.runMobileAudits();
      Object.assign(this.results.pages, mobileResults);
      
      // Test component performance
      const componentResults = await this.performComponentPerformanceTests();
      this.results.componentTests = componentResults;
      
      // Generate final report
      const report = await this.generateReport();
      
      await this.cleanup();
      
      return report;
      
    } catch (error) {
      console.error('❌ Frontend performance testing failed:', error);
      await this.cleanup();
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new FrontendPerformanceTester();
  tester.runAllTests()
    .then(results => {
      console.log('\\n✅ Frontend performance testing completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Frontend performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = FrontendPerformanceTester;