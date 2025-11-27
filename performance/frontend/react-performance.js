/**
 * React Component Performance Testing Suite
 * Tests for React-specific performance metrics and optimizations
 */

const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class ReactPerformanceTester {
  constructor() {
    this.browser = null;
    this.results = {
      components: {},
      rendering: {},
      stateUpdates: {},
      memoryLeaks: {},
      bundleAnalysis: {}
    };
    this.baseURL = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  async initialize() {
    console.log('🚀 Initializing React performance testing...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    console.log(`✅ Browser launched for React performance testing`);
  }

  async testComponentRenderingPerformance() {
    console.log('\\n🔄 Testing React component rendering performance...');
    
    const page = await this.browser.newPage();
    
    try {
      // Enable Performance API
      await page.evaluateOnNewDocument(() => {
        window.renderTimes = [];
        window.componentUpdateTimes = [];
        
        // Hook into React DevTools if available
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
          
          hook.onCommitFiberRoot = (id, root, priorityLevel) => {
            const now = performance.now();
            window.renderTimes.push({
              timestamp: now,
              fiberRoot: id,
              priorityLevel: priorityLevel
            });
          };
        }
        
        // Performance observer for long tasks
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'measure' || entry.entryType === 'mark') {
                window.componentUpdateTimes.push({
                  name: entry.name,
                  startTime: entry.startTime,
                  duration: entry.duration
                });
              }
            }
          });
          
          observer.observe({ entryTypes: ['measure', 'mark'] });
        }
      });
      
      // Test different pages/components
      const pagesToTest = [
        { url: '/', name: 'HomePage' },
        { url: '/signup', name: 'SignUpPage' },
        { url: '/login', name: 'LoginPage' }
      ];
      
      for (const pageTest of pagesToTest) {
        console.log(`🔍 Testing ${pageTest.name} rendering...`);
        
        const startTime = performance.now();
        await page.goto(`${this.baseURL}${pageTest.url}`, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
        const endTime = performance.now();
        
        // Wait for React to settle
        await page.waitForTimeout(1000);
        
        // Measure component rendering metrics
        const renderMetrics = await page.evaluate(() => {
          return {
            renderTimes: window.renderTimes || [],
            componentUpdateTimes: window.componentUpdateTimes || [],
            paintTiming: performance.getEntriesByType('paint'),
            navigationTiming: performance.getEntriesByType('navigation')[0],
            resourceTiming: performance.getEntriesByType('resource').length,
            memoryInfo: performance.memory ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null
          };
        });
        
        // Test component re-renders by interacting with forms
        let interactionMetrics = null;
        if (pageTest.name === 'SignUpPage') {
          interactionMetrics = await this.testFormInteractions(page);
        }
        
        this.results.components[pageTest.name] = {
          totalLoadTime: endTime - startTime,
          renderMetrics,
          interactionMetrics,
          url: pageTest.url
        };
        
        console.log(`✅ ${pageTest.name}: ${(endTime - startTime).toFixed(2)}ms total load time`);
      }
      
    } catch (error) {
      console.error('❌ Component rendering test failed:', error.message);
    } finally {
      await page.close();
    }
  }

  async testFormInteractions(page) {
    console.log('📝 Testing form interaction performance...');
    
    try {
      const interactionTests = [];
      
      // Test input field responsiveness
      const inputs = await page.$$('input[type="text"], input[type="email"], input[type="password"]');
      
      for (let i = 0; i < Math.min(inputs.length, 3); i++) {
        const input = inputs[i];
        
        const startTime = performance.now();
        await input.type('test input', { delay: 10 });
        const endTime = performance.now();
        
        interactionTests.push({
          type: 'input',
          duration: endTime - startTime,
          inputIndex: i
        });
        
        // Clear the input
        await input.evaluate(el => el.value = '');
      }
      
      // Test dropdown interactions
      const selects = await page.$$('select');
      for (let i = 0; i < Math.min(selects.length, 2); i++) {
        const select = selects[i];
        
        const startTime = performance.now();
        await select.click();
        await page.waitForTimeout(100);
        const endTime = performance.now();
        
        interactionTests.push({
          type: 'select',
          duration: endTime - startTime,
          selectIndex: i
        });
      }
      
      return {
        totalInteractions: interactionTests.length,
        averageResponseTime: interactionTests.reduce((sum, test) => sum + test.duration, 0) / interactionTests.length,
        interactions: interactionTests
      };
      
    } catch (error) {
      console.warn('⚠️  Form interaction test failed:', error.message);
      return null;
    }
  }

  async testStateUpdatePerformance() {
    console.log('\\n🔄 Testing React state update performance...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(`${this.baseURL}/signup`, { waitUntil: 'networkidle2' });
      
      // Inject performance testing code
      const stateUpdateMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const results = [];
          let updateCount = 0;
          const maxUpdates = 20;
          
          // Find a form input to trigger state updates
          const input = document.querySelector('input[type="email"]') || document.querySelector('input[type="text"]');
          
          if (!input) {
            resolve({ error: 'No suitable input found' });
            return;
          }
          
          const performStateUpdate = () => {
            const startTime = performance.now();
            
            // Simulate rapid state updates
            const testValue = `test${Math.random()}@example.com`;
            input.value = testValue;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Use requestAnimationFrame to measure render completion
            requestAnimationFrame(() => {
              const endTime = performance.now();
              results.push({
                updateIndex: updateCount,
                duration: endTime - startTime,
                timestamp: endTime
              });
              
              updateCount++;
              
              if (updateCount < maxUpdates) {
                setTimeout(performStateUpdate, 50);
              } else {
                resolve({
                  totalUpdates: updateCount,
                  updates: results,
                  averageUpdateTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
                  maxUpdateTime: Math.max(...results.map(r => r.duration)),
                  minUpdateTime: Math.min(...results.map(r => r.duration))
                });
              }
            });
          };
          
          performStateUpdate();
        });
      });
      
      this.results.stateUpdates = stateUpdateMetrics;
      
      console.log(`✅ State update performance tested:`);
      if (stateUpdateMetrics.averageUpdateTime) {
        console.log(`   Average update time: ${stateUpdateMetrics.averageUpdateTime.toFixed(2)}ms`);
        console.log(`   Max update time: ${stateUpdateMetrics.maxUpdateTime.toFixed(2)}ms`);
        console.log(`   Total updates tested: ${stateUpdateMetrics.totalUpdates}`);
      }
      
    } catch (error) {
      console.error('❌ State update performance test failed:', error.message);
    } finally {
      await page.close();
    }
  }

  async testMemoryLeaks() {
    console.log('\\n🧠 Testing for memory leaks...');
    
    const page = await this.browser.newPage();
    
    try {
      // Initial memory measurement
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null;
      });
      
      if (!initialMemory) {
        console.warn('⚠️  Memory API not available, skipping memory leak test');
        return;
      }
      
      console.log(`📊 Initial memory usage: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Navigate between pages multiple times to test for memory leaks
      const navigationSequence = [
        '/',
        '/signup',
        '/login',
        '/signup',
        '/',
        '/login'
      ];
      
      const memoryMeasurements = [initialMemory];
      
      for (let i = 0; i < navigationSequence.length; i++) {
        const url = `${this.baseURL}${navigationSequence[i]}`;
        console.log(`🔄 Navigating to ${navigationSequence[i]} (${i + 1}/${navigationSequence.length})`);
        
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // Wait for any animations or async operations to complete
        await page.waitForTimeout(2000);
        
        // Force garbage collection if possible
        await page.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });
        
        // Measure memory after navigation
        const currentMemory = await page.evaluate(() => {
          return performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            timestamp: performance.now()
          } : null;
        });
        
        if (currentMemory) {
          memoryMeasurements.push(currentMemory);
          console.log(`📊 Memory after navigation ${i + 1}: ${(currentMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
        }
      }
      
      // Analyze memory trend
      const memoryGrowth = memoryMeasurements.map((measurement, index) => ({
        navigationIndex: index,
        memoryMB: measurement.usedJSHeapSize / 1024 / 1024,
        growthFromInitial: (measurement.usedJSHeapSize - initialMemory.usedJSHeapSize) / 1024 / 1024
      }));
      
      const totalGrowth = memoryGrowth[memoryGrowth.length - 1].growthFromInitial;
      const averageGrowthPerNavigation = totalGrowth / (navigationSequence.length);
      
      this.results.memoryLeaks = {
        initialMemoryMB: initialMemory.usedJSHeapSize / 1024 / 1024,
        finalMemoryMB: memoryMeasurements[memoryMeasurements.length - 1].usedJSHeapSize / 1024 / 1024,
        totalGrowthMB: totalGrowth,
        averageGrowthPerNavigationMB: averageGrowthPerNavigation,
        navigationsCount: navigationSequence.length,
        measurements: memoryGrowth,
        hasMemoryLeak: totalGrowth > 10 && averageGrowthPerNavigation > 1 // Threshold: >10MB total or >1MB per navigation
      };
      
      console.log(`✅ Memory leak test completed:`);
      console.log(`   Total memory growth: ${totalGrowth.toFixed(2)} MB`);
      console.log(`   Average growth per navigation: ${averageGrowthPerNavigation.toFixed(2)} MB`);
      console.log(`   Potential memory leak: ${this.results.memoryLeaks.hasMemoryLeak ? 'YES ⚠️' : 'NO ✅'}`);
      
    } catch (error) {
      console.error('❌ Memory leak test failed:', error.message);
    } finally {
      await page.close();
    }
  }

  async testBundlePerformance() {
    console.log('\\n📦 Testing JavaScript bundle performance...');
    
    const page = await this.browser.newPage();
    
    try {
      // Monitor network requests for JS bundles
      const jsRequests = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('.js') && response.status() === 200) {
          try {
            const contentLength = response.headers()['content-length'];
            jsRequests.push({
              url: url,
              size: contentLength ? parseInt(contentLength) : 0,
              timing: response.timing()
            });
          } catch (error) {
            // Ignore errors getting response details
          }
        }
      });
      
      const startTime = performance.now();
      await page.goto(`${this.baseURL}/`, { waitUntil: 'networkidle2' });
      const endTime = performance.now();
      
      // Analyze JavaScript execution performance
      const jsPerformance = await page.evaluate(() => {
        const scriptElements = document.querySelectorAll('script[src]');
        const inlineScripts = document.querySelectorAll('script:not([src])');
        
        return {
          externalScripts: scriptElements.length,
          inlineScripts: inlineScripts.length,
          totalScripts: scriptElements.length + inlineScripts.length,
          resourceTiming: performance.getEntriesByType('resource')
            .filter(entry => entry.name.includes('.js'))
            .map(entry => ({
              name: entry.name,
              duration: entry.duration,
              transferSize: entry.transferSize,
              encodedBodySize: entry.encodedBodySize,
              decodedBodySize: entry.decodedBodySize
            }))
        };
      });
      
      // Calculate bundle metrics
      const totalBundleSize = jsRequests.reduce((sum, req) => sum + req.size, 0);
      const averageLoadTime = jsPerformance.resourceTiming.length > 0 
        ? jsPerformance.resourceTiming.reduce((sum, rt) => sum + rt.duration, 0) / jsPerformance.resourceTiming.length
        : 0;
      
      this.results.bundleAnalysis = {
        totalLoadTime: endTime - startTime,
        bundleRequests: jsRequests.length,
        totalBundleSize: totalBundleSize,
        totalBundleSizeMB: totalBundleSize / 1024 / 1024,
        averageScriptLoadTime: averageLoadTime,
        scriptAnalysis: jsPerformance,
        largestBundle: jsRequests.sort((a, b) => b.size - a.size)[0]
      };
      
      console.log(`✅ Bundle performance analysis completed:`);
      console.log(`   Total JS bundle size: ${(totalBundleSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Number of JS files: ${jsRequests.length}`);
      console.log(`   Average script load time: ${averageLoadTime.toFixed(2)}ms`);
      
      if (this.results.bundleAnalysis.largestBundle) {
        console.log(`   Largest bundle: ${(this.results.bundleAnalysis.largestBundle.size / 1024).toFixed(2)} KB`);
      }
      
    } catch (error) {
      console.error('❌ Bundle performance test failed:', error.message);
    } finally {
      await page.close();
    }
  }

  generatePerformanceReport() {
    console.log('\\n📊 ========================================');
    console.log('📊 REACT PERFORMANCE TESTING REPORT');
    console.log('📊 ========================================');
    
    // Component rendering performance
    if (Object.keys(this.results.components).length > 0) {
      console.log('\\n🔄 COMPONENT RENDERING PERFORMANCE:');
      Object.entries(this.results.components).forEach(([component, data]) => {
        console.log(`   ${component}:`);
        console.log(`     Total Load Time: ${data.totalLoadTime.toFixed(2)}ms`);
        if (data.renderMetrics.paintTiming.length > 0) {
          const fcp = data.renderMetrics.paintTiming.find(p => p.name === 'first-contentful-paint');
          if (fcp) console.log(`     First Contentful Paint: ${fcp.startTime.toFixed(2)}ms`);
        }
        if (data.interactionMetrics) {
          console.log(`     Average Interaction Time: ${data.interactionMetrics.averageResponseTime.toFixed(2)}ms`);
        }
      });
    }
    
    // State update performance
    if (this.results.stateUpdates && this.results.stateUpdates.averageUpdateTime) {
      console.log('\\n🔄 STATE UPDATE PERFORMANCE:');
      console.log(`   Average Update Time: ${this.results.stateUpdates.averageUpdateTime.toFixed(2)}ms`);
      console.log(`   Max Update Time: ${this.results.stateUpdates.maxUpdateTime.toFixed(2)}ms`);
      console.log(`   Total Updates Tested: ${this.results.stateUpdates.totalUpdates}`);
    }
    
    // Memory leak analysis
    if (this.results.memoryLeaks && this.results.memoryLeaks.totalGrowthMB !== undefined) {
      console.log('\\n🧠 MEMORY LEAK ANALYSIS:');
      console.log(`   Initial Memory: ${this.results.memoryLeaks.initialMemoryMB.toFixed(2)} MB`);
      console.log(`   Final Memory: ${this.results.memoryLeaks.finalMemoryMB.toFixed(2)} MB`);
      console.log(`   Total Growth: ${this.results.memoryLeaks.totalGrowthMB.toFixed(2)} MB`);
      console.log(`   Avg Growth per Navigation: ${this.results.memoryLeaks.averageGrowthPerNavigationMB.toFixed(2)} MB`);
      console.log(`   Memory Leak Detected: ${this.results.memoryLeaks.hasMemoryLeak ? '⚠️  YES' : '✅ NO'}`);
    }
    
    // Bundle analysis
    if (this.results.bundleAnalysis && this.results.bundleAnalysis.totalBundleSizeMB) {
      console.log('\\n📦 BUNDLE PERFORMANCE:');
      console.log(`   Total Bundle Size: ${this.results.bundleAnalysis.totalBundleSizeMB.toFixed(2)} MB`);
      console.log(`   Number of JS Files: ${this.results.bundleAnalysis.bundleRequests}`);
      console.log(`   Average Script Load Time: ${this.results.bundleAnalysis.averageScriptLoadTime.toFixed(2)}ms`);
    }
    
    // Performance recommendations
    console.log('\\n🚀 PERFORMANCE RECOMMENDATIONS:');
    const recommendations = this.generateRecommendations();
    recommendations.forEach(rec => console.log(`   • ${rec}`));
    
    console.log('\\n📊 ========================================');
    
    return this.results;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Component performance recommendations
    if (this.results.components) {
      const slowComponents = Object.entries(this.results.components)
        .filter(([_, data]) => data.totalLoadTime > 3000);
      
      if (slowComponents.length > 0) {
        recommendations.push(`Optimize slow-loading components: ${slowComponents.map(([name]) => name).join(', ')}`);
      }
    }
    
    // State update recommendations
    if (this.results.stateUpdates && this.results.stateUpdates.averageUpdateTime > 16) {
      recommendations.push('Consider optimizing state updates - average update time exceeds 16ms (60fps threshold)');
    }
    
    // Memory leak recommendations
    if (this.results.memoryLeaks && this.results.memoryLeaks.hasMemoryLeak) {
      recommendations.push('Address potential memory leaks - significant memory growth detected during navigation');
    }
    
    // Bundle size recommendations
    if (this.results.bundleAnalysis) {
      if (this.results.bundleAnalysis.totalBundleSizeMB > 2) {
        recommendations.push(`Reduce bundle size (${this.results.bundleAnalysis.totalBundleSizeMB.toFixed(2)}MB) - consider code splitting`);
      }
      
      if (this.results.bundleAnalysis.bundleRequests > 20) {
        recommendations.push(`Reduce number of JavaScript requests (${this.results.bundleAnalysis.bundleRequests}) - consider bundling`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('No major performance issues detected - great job!');
    }
    
    return recommendations;
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
      
      await this.testComponentRenderingPerformance();
      await this.testStateUpdatePerformance();
      await this.testMemoryLeaks();
      await this.testBundlePerformance();
      
      const report = this.generatePerformanceReport();
      
      await this.cleanup();
      
      return report;
      
    } catch (error) {
      console.error('❌ React performance testing failed:', error);
      await this.cleanup();
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ReactPerformanceTester();
  tester.runAllTests()
    .then(results => {
      console.log('\\n✅ React performance testing completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ React performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = ReactPerformanceTester;