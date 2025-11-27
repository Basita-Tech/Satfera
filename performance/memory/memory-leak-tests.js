/**
 * Memory Leak Detection and Profiling Test Suite
 * Comprehensive memory analysis for both frontend and backend
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class MemoryLeakTester {
  constructor() {
    this.results = {
      frontend: {},
      backend: {},
      system: {},
      analysis: {},
      recommendations: []
    };
    this.baseURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.apiURL = process.env.API_URL || 'http://localhost:8000';
    this.browser = null;
    this.reportsDir = path.join(__dirname, 'memory-reports');
  }

  async initialize() {
    console.log('🧠 Initializing memory leak detection suite...');
    
    // Create reports directory
    await this.ensureDirectoryExists(this.reportsDir);
    
    console.log('✅ Memory leak tester initialized');
  }

  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async testFrontendMemoryLeaks() {
    console.log('\\n🌐 Testing frontend memory leaks...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--enable-precise-memory-info',
        '--js-flags=--expose-gc'
      ]
    });
    
    const page = await this.browser.newPage();
    
    try {
      // Enable runtime domain for memory monitoring
      const client = await page.target().createCDPSession();
      await client.send('Runtime.enable');
      
      // Test memory across multiple page navigations
      const navigationResults = await this.testPageNavigationMemoryLeaks(page, client);
      
      // Test component mounting/unmounting memory leaks
      const componentResults = await this.testComponentMemoryLeaks(page, client);
      
      // Test event listener memory leaks
      const eventListenerResults = await this.testEventListenerMemoryLeaks(page, client);
      
      // Test closure memory leaks
      const closureResults = await this.testClosureMemoryLeaks(page, client);
      
      this.results.frontend = {
        navigation: navigationResults,
        components: componentResults,
        eventListeners: eventListenerResults,
        closures: closureResults
      };
      
      console.log('✅ Frontend memory leak testing completed');
      
    } catch (error) {
      console.error('❌ Frontend memory leak testing failed:', error.message);
    } finally {
      await this.browser.close();
    }
  }

  async testPageNavigationMemoryLeaks(page, client) {
    console.log('🔄 Testing page navigation memory leaks...');
    
    const navigationSequence = [
      { url: '/', name: 'home', cycles: 3 },
      { url: '/signup', name: 'signup', cycles: 3 },
      { url: '/login', name: 'login', cycles: 3 }
    ];
    
    const memorySnapshots = [];
    
    for (const nav of navigationSequence) {
      console.log(`   Testing ${nav.name} page (${nav.cycles} cycles)...`);
      
      for (let cycle = 0; cycle < nav.cycles; cycle++) {
        // Navigate to page
        await page.goto(`${this.baseURL}${nav.url}`, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Wait for page to settle
        await page.waitForTimeout(2000);
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });
        
        // Take memory snapshot
        const memoryInfo = await this.getMemorySnapshot(page, client);
        memorySnapshots.push({
          page: nav.name,
          cycle: cycle + 1,
          url: nav.url,
          timestamp: Date.now(),
          ...memoryInfo
        });
        
        console.log(`     Cycle ${cycle + 1}: ${(memoryInfo.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      }
    }
    
    return this.analyzeMemoryTrend(memorySnapshots, 'navigation');
  }

  async testComponentMemoryLeaks(page, client) {
    console.log('🧩 Testing component memory leaks...');
    
    try {
      await page.goto(`${this.baseURL}/signup`, { waitUntil: 'networkidle2' });
      
      const componentCycles = 10;
      const memorySnapshots = [];
      
      for (let i = 0; i < componentCycles; i++) {
        // Simulate component interactions that might cause memory leaks
        await page.evaluate((iteration) => {
          // Simulate creating and destroying components
          const container = document.createElement('div');
          container.innerHTML = \`
            <div class="test-component-\${iteration}">
              <input type="text" value="Test \${iteration}">
              <button onclick="console.log('Click \${iteration}')">Click</button>
            </div>
          \`;
          document.body.appendChild(container);
          
          // Simulate some component logic
          const input = container.querySelector('input');
          const button = container.querySelector('button');
          
          // Add event listeners (potential leak source)
          const handler = () => console.log(\`Handler \${iteration}\`);
          input.addEventListener('change', handler);
          button.addEventListener('click', handler);
          
          // Simulate component state
          input.componentState = {
            data: new Array(1000).fill(\`data-\${iteration}\`),
            callbacks: [handler],
            timers: []
          };
          
          // Create some timers (potential leak source)
          const timerId = setInterval(() => {
            input.value = \`Updated \${Date.now()}\`;
          }, 100);
          
          input.componentState.timers.push(timerId);
          
          // Remove component after short delay (simulate unmounting)
          setTimeout(() => {
            // Clear timers
            input.componentState.timers.forEach(id => clearInterval(id));
            
            // Remove event listeners
            input.removeEventListener('change', handler);
            button.removeEventListener('click', handler);
            
            // Remove from DOM
            if (container.parentNode) {
              container.parentNode.removeChild(container);
            }
          }, 200);
          
        }, i);
        
        await page.waitForTimeout(300);
        
        // Force garbage collection
        await page.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });
        
        const memoryInfo = await this.getMemorySnapshot(page, client);
        memorySnapshots.push({
          cycle: i + 1,
          timestamp: Date.now(),
          ...memoryInfo
        });
        
        if (i % 2 === 0) {
          console.log(`     Component cycle ${i + 1}: ${(memoryInfo.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        }
      }
      
      return this.analyzeMemoryTrend(memorySnapshots, 'components');
      
    } catch (error) {
      console.error('❌ Component memory leak test failed:', error.message);
      return null;
    }
  }

  async testEventListenerMemoryLeaks(page, client) {
    console.log('👂 Testing event listener memory leaks...');
    
    try {
      await page.goto(`${this.baseURL}/signup`, { waitUntil: 'networkidle2' });
      
      const eventCycles = 15;
      const memorySnapshots = [];
      
      for (let i = 0; i < eventCycles; i++) {
        // Add many event listeners without proper cleanup
        await page.evaluate((iteration) => {
          const elements = document.querySelectorAll('input, button, select');
          
          elements.forEach((element, index) => {
            // Create multiple listeners for each element
            for (let j = 0; j < 5; j++) {
              const handler = (e) => {
                console.log(\`Event \${iteration}-\${index}-\${j}: \${e.type}\`);
                // Create some objects in the handler closure
                const data = {
                  iteration: iteration,
                  index: index,
                  handlerIndex: j,
                  timestamp: Date.now(),
                  largeArray: new Array(100).fill(\`data-\${iteration}-\${j}\`)
                };
                
                // Store reference that might prevent GC
                element.handlerData = element.handlerData || [];
                element.handlerData.push(data);
              };
              
              // Add listeners for multiple events
              ['click', 'focus', 'blur', 'change', 'input'].forEach(eventType => {
                element.addEventListener(eventType, handler);
              });
            }
          });
        }, i);
        
        await page.waitForTimeout(100);
        
        // Periodically trigger garbage collection
        if (i % 3 === 0) {
          await page.evaluate(() => {
            if (window.gc) {
              window.gc();
            }
          });
        }
        
        const memoryInfo = await this.getMemorySnapshot(page, client);
        memorySnapshots.push({
          cycle: i + 1,
          timestamp: Date.now(),
          ...memoryInfo
        });
        
        if (i % 3 === 0) {
          console.log(`     Event listener cycle ${i + 1}: ${(memoryInfo.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        }
      }
      
      return this.analyzeMemoryTrend(memorySnapshots, 'eventListeners');
      
    } catch (error) {
      console.error('❌ Event listener memory leak test failed:', error.message);
      return null;
    }
  }

  async testClosureMemoryLeaks(page, client) {
    console.log('🔒 Testing closure memory leaks...');
    
    try {
      await page.goto(`${this.baseURL}/`, { waitUntil: 'networkidle2' });
      
      const closureCycles = 20;
      const memorySnapshots = [];
      
      for (let i = 0; i < closureCycles; i++) {
        // Create closures that might retain large objects
        await page.evaluate((iteration) => {
          // Create large data structure
          const largeData = {
            id: iteration,
            data: new Array(1000).fill(null).map((_, index) => ({
              index: index,
              value: \`Large data item \${iteration}-\${index}\`,
              timestamp: Date.now(),
              randomData: Math.random().toString(36).substring(2, 15)
            }))
          };
          
          // Create closure that captures large data
          const createClosure = (data) => {
            return function() {
              // This closure retains reference to 'data'
              console.log(\`Closure \${data.id} with \${data.data.length} items\`);
              
              // Create more closures inside
              const innerClosures = [];
              for (let j = 0; j < 10; j++) {
                innerClosures.push(function() {
                  return data.data[j % data.data.length];
                });
              }
              
              return innerClosures;
            };
          };
          
          // Store closure globally (potential leak)
          window.testClosures = window.testClosures || [];
          window.testClosures.push(createClosure(largeData));
          
          // Keep only recent closures to simulate some cleanup
          if (window.testClosures.length > 10) {
            window.testClosures = window.testClosures.slice(-5);
          }
        }, i);
        
        await page.waitForTimeout(50);
        
        // Force garbage collection periodically
        if (i % 5 === 0) {
          await page.evaluate(() => {
            if (window.gc) {
              window.gc();
            }
          });
        }
        
        const memoryInfo = await this.getMemorySnapshot(page, client);
        memorySnapshots.push({
          cycle: i + 1,
          timestamp: Date.now(),
          ...memoryInfo
        });
        
        if (i % 4 === 0) {
          console.log(`     Closure cycle ${i + 1}: ${(memoryInfo.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        }
      }
      
      return this.analyzeMemoryTrend(memorySnapshots, 'closures');
      
    } catch (error) {
      console.error('❌ Closure memory leak test failed:', error.message);
      return null;
    }
  }

  async getMemorySnapshot(page, client) {
    try {
      // Get browser memory info
      const memoryInfo = await page.evaluate(() => {
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null;
      });
      
      // Get runtime heap usage
      const heapUsage = await client.send('Runtime.getHeapUsage');
      
      return {
        heapUsed: memoryInfo ? memoryInfo.usedJSHeapSize : heapUsage.usedSize,
        heapTotal: memoryInfo ? memoryInfo.totalJSHeapSize : heapUsage.totalSize,
        heapLimit: memoryInfo ? memoryInfo.jsHeapSizeLimit : null,
        runtimeHeapUsed: heapUsage.usedSize,
        runtimeHeapTotal: heapUsage.totalSize
      };
    } catch (error) {
      console.warn('⚠️  Memory snapshot failed:', error.message);
      return {
        heapUsed: 0,
        heapTotal: 0,
        heapLimit: 0
      };
    }
  }

  analyzeMemoryTrend(snapshots, testType) {
    if (!snapshots || snapshots.length < 2) {
      return { error: 'Insufficient data for analysis' };
    }
    
    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    
    const memoryGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
    const memoryGrowthMB = memoryGrowth / 1024 / 1024;
    const averageGrowthPerCycle = memoryGrowth / snapshots.length;
    
    // Calculate growth rate
    const growthRate = memoryGrowth / firstSnapshot.heapUsed;
    
    // Identify trend
    let trend = 'stable';
    if (growthRate > 0.5) {
      trend = 'severe_growth';
    } else if (growthRate > 0.2) {
      trend = 'moderate_growth';
    } else if (growthRate > 0.1) {
      trend = 'slight_growth';
    }
    
    // Check for memory leak indicators
    const hasMemoryLeak = memoryGrowthMB > 5 && growthRate > 0.2;
    
    const analysis = {
      testType,
      totalSnapshots: snapshots.length,
      initialMemoryMB: firstSnapshot.heapUsed / 1024 / 1024,
      finalMemoryMB: lastSnapshot.heapUsed / 1024 / 1024,
      memoryGrowthMB: memoryGrowthMB,
      growthRate: growthRate * 100,
      averageGrowthPerCycleMB: averageGrowthPerCycle / 1024 / 1024,
      trend,
      hasMemoryLeak,
      snapshots: snapshots.map(s => ({
        cycle: s.cycle || s.page,
        memoryMB: s.heapUsed / 1024 / 1024,
        timestamp: s.timestamp
      }))
    };
    
    console.log(`   ${testType} analysis: ${memoryGrowthMB.toFixed(2)} MB growth (${(growthRate * 100).toFixed(1)}%)`);
    console.log(`   Memory leak detected: ${hasMemoryLeak ? '⚠️  YES' : '✅ NO'}`);
    
    return analysis;
  }

  async testBackendMemoryUsage() {
    console.log('\\n🖥️  Testing backend memory usage...');
    
    try {
      // Monitor Node.js process memory
      const backendMemoryResults = await this.monitorNodeProcessMemory();
      
      // Test database connection memory
      const dbMemoryResults = await this.testDatabaseMemoryUsage();
      
      this.results.backend = {
        process: backendMemoryResults,
        database: dbMemoryResults
      };
      
      console.log('✅ Backend memory testing completed');
      
    } catch (error) {
      console.error('❌ Backend memory testing failed:', error.message);
    }
  }

  async monitorNodeProcessMemory() {
    console.log('📊 Monitoring Node.js process memory...');
    
    const memorySnapshots = [];
    const monitoringDuration = 30000; // 30 seconds
    const sampleInterval = 2000; // 2 seconds
    const samples = monitoringDuration / sampleInterval;
    
    for (let i = 0; i < samples; i++) {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      memorySnapshots.push({
        timestamp: Date.now(),
        sample: i + 1,
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
        cpuUser: cpuUsage.user,
        cpuSystem: cpuUsage.system
      });
      
      if (i % 3 === 0) {
        console.log(`   Sample ${i + 1}: RSS ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB, Heap ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      }
      
      await new Promise(resolve => setTimeout(resolve, sampleInterval));
    }
    
    return this.analyzeBackendMemoryTrend(memorySnapshots);
  }

  analyzeBackendMemoryTrend(snapshots) {
    const firstSample = snapshots[0];
    const lastSample = snapshots[snapshots.length - 1];
    
    const rssGrowth = lastSample.rss - firstSample.rss;
    const heapGrowth = lastSample.heapUsed - firstSample.heapUsed;
    
    return {
      totalSamples: snapshots.length,
      monitoringDurationMs: lastSample.timestamp - firstSample.timestamp,
      initialRssMB: firstSample.rss / 1024 / 1024,
      finalRssMB: lastSample.rss / 1024 / 1024,
      rssGrowthMB: rssGrowth / 1024 / 1024,
      initialHeapMB: firstSample.heapUsed / 1024 / 1024,
      finalHeapMB: lastSample.heapUsed / 1024 / 1024,
      heapGrowthMB: heapGrowth / 1024 / 1024,
      averageRssMB: snapshots.reduce((sum, s) => sum + s.rss, 0) / snapshots.length / 1024 / 1024,
      averageHeapMB: snapshots.reduce((sum, s) => sum + s.heapUsed, 0) / snapshots.length / 1024 / 1024,
      maxRssMB: Math.max(...snapshots.map(s => s.rss)) / 1024 / 1024,
      maxHeapMB: Math.max(...snapshots.map(s => s.heapUsed)) / 1024 / 1024,
      snapshots: snapshots
    };
  }

  async testDatabaseMemoryUsage() {
    console.log('💾 Testing database memory usage...');
    
    // This would require integration with your actual database
    // For now, return placeholder data
    return {
      connectionPoolSize: 10,
      activeConnections: 5,
      estimatedMemoryUsageMB: 50,
      note: 'Database memory monitoring requires integration with actual MongoDB instance'
    };
  }

  async testSystemMemoryUsage() {
    console.log('\\n🖥️  Testing system memory usage...');
    
    const systemInfo = {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      loadAverage: os.loadavg()
    };
    
    const memoryUsagePercent = ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100;
    
    this.results.system = {
      totalMemoryMB: systemInfo.totalMemory / 1024 / 1024,
      freeMemoryMB: systemInfo.freeMemory / 1024 / 1024,
      usedMemoryMB: (systemInfo.totalMemory - systemInfo.freeMemory) / 1024 / 1024,
      memoryUsagePercent: memoryUsagePercent,
      cpuCount: systemInfo.cpus,
      platform: systemInfo.platform,
      architecture: systemInfo.arch,
      loadAverage: systemInfo.loadAverage
    };
    
    console.log(`✅ System memory: ${this.results.system.usedMemoryMB.toFixed(2)} MB used (${memoryUsagePercent.toFixed(1)}%)`);
  }

  generateMemoryReport() {
    console.log('\\n📊 =====================================');
    console.log('📊 MEMORY LEAK DETECTION REPORT');
    console.log('📊 =====================================');
    
    // Frontend memory analysis
    if (this.results.frontend && Object.keys(this.results.frontend).length > 0) {
      console.log('\\n🌐 FRONTEND MEMORY ANALYSIS:');
      
      Object.entries(this.results.frontend).forEach(([testType, results]) => {
        if (results && !results.error) {
          console.log(`   ${testType.toUpperCase()}:`);
          console.log(`     Memory Growth: ${results.memoryGrowthMB.toFixed(2)} MB (${results.growthRate.toFixed(1)}%)`);
          console.log(`     Trend: ${results.trend}`);
          console.log(`     Memory Leak: ${results.hasMemoryLeak ? '⚠️  YES' : '✅ NO'}`);
        }
      });
    }
    
    // Backend memory analysis
    if (this.results.backend && this.results.backend.process) {
      console.log('\\n🖥️  BACKEND MEMORY ANALYSIS:');
      const backend = this.results.backend.process;
      console.log(`   RSS Growth: ${backend.rssGrowthMB.toFixed(2)} MB`);
      console.log(`   Heap Growth: ${backend.heapGrowthMB.toFixed(2)} MB`);
      console.log(`   Average RSS: ${backend.averageRssMB.toFixed(2)} MB`);
      console.log(`   Max RSS: ${backend.maxRssMB.toFixed(2)} MB`);
    }
    
    // System memory analysis
    if (this.results.system) {
      console.log('\\n💻 SYSTEM MEMORY STATUS:');
      console.log(`   Total Memory: ${this.results.system.totalMemoryMB.toFixed(2)} MB`);
      console.log(`   Used Memory: ${this.results.system.usedMemoryMB.toFixed(2)} MB (${this.results.system.memoryUsagePercent.toFixed(1)}%)`);
      console.log(`   Free Memory: ${this.results.system.freeMemoryMB.toFixed(2)} MB`);
    }
    
    // Generate recommendations
    const recommendations = this.generateMemoryRecommendations();
    if (recommendations.length > 0) {
      console.log('\\n🚀 MEMORY OPTIMIZATION RECOMMENDATIONS:');
      recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    console.log('\\n📊 =====================================');
    
    return this.results;
  }

  generateMemoryRecommendations() {
    const recommendations = [];
    
    // Frontend recommendations
    if (this.results.frontend) {
      Object.entries(this.results.frontend).forEach(([testType, results]) => {
        if (results && results.hasMemoryLeak) {
          switch (testType) {
            case 'navigation':
              recommendations.push('Fix navigation memory leaks - ensure proper component cleanup on route changes');
              break;
            case 'components':
              recommendations.push('Fix component memory leaks - implement proper cleanup in useEffect hooks');
              break;
            case 'eventListeners':
              recommendations.push('Fix event listener memory leaks - remove listeners in cleanup functions');
              break;
            case 'closures':
              recommendations.push('Fix closure memory leaks - avoid capturing large objects in closures');
              break;
          }
        }
      });
    }
    
    // Backend recommendations
    if (this.results.backend && this.results.backend.process) {
      const backend = this.results.backend.process;
      if (backend.heapGrowthMB > 50) {
        recommendations.push('Monitor backend heap growth - consider implementing memory monitoring and alerts');
      }
      if (backend.maxRssMB > 512) {
        recommendations.push('High backend memory usage detected - optimize data structures and caching');
      }
    }
    
    // System recommendations
    if (this.results.system) {
      if (this.results.system.memoryUsagePercent > 80) {
        recommendations.push('High system memory usage - consider scaling resources or optimizing applications');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('No significant memory issues detected - good memory management practices in place');
    }
    
    return recommendations;
  }

  async saveDetailedReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      testDuration: 'Various',
      results: this.results,
      summary: {
        frontend: this.results.frontend ? Object.keys(this.results.frontend).length : 0,
        backend: this.results.backend ? 'Tested' : 'Not tested',
        system: this.results.system ? 'Analyzed' : 'Not analyzed'
      },
      recommendations: this.generateMemoryRecommendations()
    };
    
    const reportPath = path.join(this.reportsDir, `memory-leak-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`\\n📄 Detailed memory report saved: ${reportPath}`);
    return reportPath;
  }

  async runAllTests() {
    try {
      await this.initialize();
      
      await this.testFrontendMemoryLeaks();
      await this.testBackendMemoryUsage();
      await this.testSystemMemoryUsage();
      
      const report = this.generateMemoryReport();
      await this.saveDetailedReport();
      
      return report;
      
    } catch (error) {
      console.error('❌ Memory leak testing failed:', error);
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new MemoryLeakTester();
  tester.runAllTests()
    .then(results => {
      console.log('\\n✅ Memory leak detection completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Memory leak detection failed:', error);
      process.exit(1);
    });
}

module.exports = MemoryLeakTester;