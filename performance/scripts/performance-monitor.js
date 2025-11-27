#!/usr/bin/env node

/**
 * Real-time Performance Monitor
 * Monitors system performance metrics during test execution
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      interval: options.interval || 5000, // 5 seconds
      duration: options.duration || 300000, // 5 minutes
      outputFile: options.outputFile || path.join(__dirname, '..', 'reports', `monitor-${Date.now()}.json`),
      includeSystem: options.includeSystem !== false,
      includeProcess: options.includeProcess !== false,
      includeNetwork: options.includeNetwork !== false,
      verbose: options.verbose || false
    };
    
    this.metrics = [];
    this.startTime = null;
    this.endTime = null;
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  async start() {
    if (this.isMonitoring) {
      throw new Error('Monitor is already running');
    }
    
    console.log('📊 Starting performance monitor...');
    console.log(`⚙️  Monitoring interval: ${this.options.interval}ms`);
    console.log(`⏱️  Maximum duration: ${this.options.duration}ms`);
    
    this.startTime = performance.now();
    this.isMonitoring = true;
    
    // Take initial measurement
    await this.collectMetrics();
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      
      // Check if we've exceeded maximum duration
      const elapsed = performance.now() - this.startTime;
      if (elapsed >= this.options.duration) {
        console.log('⏰ Maximum monitoring duration reached, stopping...');
        await this.stop();
      }
    }, this.options.interval);
    
    // Set up automatic stop
    setTimeout(async () => {
      if (this.isMonitoring) {
        await this.stop();
      }
    }, this.options.duration);
    
    console.log('✅ Performance monitor started');
    this.emit('started');
    
    return this;
  }

  async stop() {
    if (!this.isMonitoring) {
      return;
    }
    
    console.log('🛑 Stopping performance monitor...');
    
    this.isMonitoring = false;
    this.endTime = performance.now();
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // Take final measurement
    await this.collectMetrics();
    
    // Generate report
    const report = await this.generateReport();
    
    console.log('✅ Performance monitoring completed');
    console.log(`📄 Report saved: ${this.options.outputFile}`);
    
    this.emit('stopped', report);
    
    return report;
  }

  async collectMetrics() {
    const timestamp = Date.now();
    const metricsData = {
      timestamp: timestamp,
      elapsed: this.startTime ? performance.now() - this.startTime : 0
    };
    
    try {
      if (this.options.includeSystem) {
        metricsData.system = await this.getSystemMetrics();
      }
      
      if (this.options.includeProcess) {
        metricsData.process = await this.getProcessMetrics();
      }
      
      if (this.options.includeNetwork) {
        metricsData.network = await this.getNetworkMetrics();
      }
      
      this.metrics.push(metricsData);
      
      if (this.options.verbose) {
        this.logMetrics(metricsData);
      }
      
      this.emit('metrics', metricsData);
      
    } catch (error) {
      console.error('❌ Error collecting metrics:', error.message);
      this.emit('error', error);
    }
  }

  async getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: (usedMem / totalMem) * 100
      },
      cpu: {
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
        uptime: os.uptime()
      },
      platform: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release()
      }
    };
  }

  async getProcessMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version
    };
  }

  async getNetworkMetrics() {
    const networkInterfaces = os.networkInterfaces();
    const metrics = {
      interfaces: Object.keys(networkInterfaces).length,
      addresses: []
    };
    
    Object.entries(networkInterfaces).forEach(([name, addresses]) => {
      addresses.forEach(address => {
        if (!address.internal) {
          metrics.addresses.push({
            interface: name,
            family: address.family,
            address: address.address,
            mac: address.mac
          });
        }
      });
    });
    
    return metrics;
  }

  logMetrics(metrics) {
    const elapsed = (metrics.elapsed / 1000).toFixed(1);
    console.log(`\\n📊 Metrics at ${elapsed}s:`);
    
    if (metrics.system) {
      const sys = metrics.system;
      console.log(`   System Memory: ${(sys.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB (${sys.memory.usagePercent.toFixed(1)}%)`);
      console.log(`   Load Average: [${sys.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}]`);
    }
    
    if (metrics.process) {
      const proc = metrics.process;
      console.log(`   Process RSS: ${(proc.memory.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Process Heap: ${(proc.memory.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(proc.memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  analyzeMetrics() {
    if (this.metrics.length < 2) {
      return { error: 'Insufficient data for analysis' };
    }
    
    const analysis = {
      duration: this.endTime - this.startTime,
      sampleCount: this.metrics.length,
      system: {},
      process: {},
      trends: {},
      alerts: []
    };
    
    // System memory analysis
    if (this.metrics[0].system) {
      const memoryUsages = this.metrics.map(m => m.system.memory.usagePercent);
      const loadAverages = this.metrics.map(m => m.system.cpu.loadAverage[0]);
      
      analysis.system.memory = {
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages),
        avg: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        trend: this.calculateTrend(memoryUsages)
      };
      
      analysis.system.loadAverage = {
        min: Math.min(...loadAverages),
        max: Math.max(...loadAverages),
        avg: loadAverages.reduce((a, b) => a + b, 0) / loadAverages.length,
        trend: this.calculateTrend(loadAverages)
      };
      
      // Generate alerts
      if (analysis.system.memory.max > 90) {
        analysis.alerts.push({
          type: 'high_memory_usage',
          message: `System memory usage exceeded 90% (max: ${analysis.system.memory.max.toFixed(1)}%)`,
          severity: 'critical'
        });
      }
      
      if (analysis.system.loadAverage.max > os.cpus().length) {
        analysis.alerts.push({
          type: 'high_load_average',
          message: `Load average exceeded CPU count (max: ${analysis.system.loadAverage.max.toFixed(2)})`,
          severity: 'warning'
        });
      }
    }
    
    // Process memory analysis
    if (this.metrics[0].process) {
      const heapUsages = this.metrics.map(m => m.process.memory.heapUsed);
      const rssUsages = this.metrics.map(m => m.process.memory.rss);
      
      analysis.process.heapUsed = {
        min: Math.min(...heapUsages),
        max: Math.max(...heapUsages),
        avg: heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length,
        growth: heapUsages[heapUsages.length - 1] - heapUsages[0],
        trend: this.calculateTrend(heapUsages)
      };
      
      analysis.process.rss = {
        min: Math.min(...rssUsages),
        max: Math.max(...rssUsages),
        avg: rssUsages.reduce((a, b) => a + b, 0) / rssUsages.length,
        growth: rssUsages[rssUsages.length - 1] - rssUsages[0],
        trend: this.calculateTrend(rssUsages)
      };
      
      // Memory leak detection
      const heapGrowthMB = analysis.process.heapUsed.growth / 1024 / 1024;
      const rssGrowthMB = analysis.process.rss.growth / 1024 / 1024;
      
      if (heapGrowthMB > 100) {
        analysis.alerts.push({
          type: 'potential_memory_leak',
          message: `Significant heap growth detected: ${heapGrowthMB.toFixed(2)} MB`,
          severity: 'warning'
        });
      }
      
      if (rssGrowthMB > 200) {
        analysis.alerts.push({
          type: 'high_memory_growth',
          message: `High RSS growth detected: ${rssGrowthMB.toFixed(2)} MB`,
          severity: 'critical'
        });
      }
    }
    
    return analysis;
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const percentChange = ((last - first) / first) * 100;
    
    if (percentChange > 10) return 'increasing';
    if (percentChange < -10) return 'decreasing';
    return 'stable';
  }

  async generateReport() {
    console.log('📄 Generating monitoring report...');
    
    const analysis = this.analyzeMetrics();
    
    const report = {
      metadata: {
        startTime: this.startTime,
        endTime: this.endTime,
        duration: this.endTime - this.startTime,
        sampleCount: this.metrics.length,
        interval: this.options.interval,
        generatedAt: new Date().toISOString()
      },
      configuration: this.options,
      metrics: this.metrics,
      analysis: analysis,
      summary: {
        totalSamples: this.metrics.length,
        monitoringDuration: (this.endTime - this.startTime) / 1000,
        alertCount: analysis.alerts ? analysis.alerts.length : 0,
        criticalAlerts: analysis.alerts ? analysis.alerts.filter(a => a.severity === 'critical').length : 0
      }
    };
    
    // Save report to file
    await this.ensureDirectoryExists(path.dirname(this.options.outputFile));
    await fs.writeFile(this.options.outputFile, JSON.stringify(report, null, 2));
    
    // Generate summary
    this.printSummary(report);
    
    return report;
  }

  printSummary(report) {
    console.log('\\n📊 =============================');
    console.log('📊 PERFORMANCE MONITORING SUMMARY');
    console.log('📊 =============================');
    
    console.log('\\n⏱️  MONITORING SESSION:');
    console.log(`   Duration: ${report.summary.monitoringDuration.toFixed(2)} seconds`);
    console.log(`   Samples: ${report.summary.totalSamples}`);
    console.log(`   Interval: ${this.options.interval}ms`);
    
    if (report.analysis.system) {
      console.log('\\n🖥️  SYSTEM METRICS:');
      console.log(`   Memory Usage: ${report.analysis.system.memory?.min?.toFixed(1)}% - ${report.analysis.system.memory?.max?.toFixed(1)}% (avg: ${report.analysis.system.memory?.avg?.toFixed(1)}%)`);
      console.log(`   Load Average: ${report.analysis.system.loadAverage?.min?.toFixed(2)} - ${report.analysis.system.loadAverage?.max?.toFixed(2)} (avg: ${report.analysis.system.loadAverage?.avg?.toFixed(2)})`);
    }
    
    if (report.analysis.process) {
      console.log('\\n⚙️  PROCESS METRICS:');
      console.log(`   Heap Growth: ${(report.analysis.process.heapUsed?.growth / 1024 / 1024)?.toFixed(2)} MB`);
      console.log(`   RSS Growth: ${(report.analysis.process.rss?.growth / 1024 / 1024)?.toFixed(2)} MB`);
      console.log(`   Max Heap: ${(report.analysis.process.heapUsed?.max / 1024 / 1024)?.toFixed(2)} MB`);
      console.log(`   Max RSS: ${(report.analysis.process.rss?.max / 1024 / 1024)?.toFixed(2)} MB`);
    }
    
    if (report.analysis.alerts && report.analysis.alerts.length > 0) {
      console.log('\\n🚨 ALERTS:');
      report.analysis.alerts.forEach(alert => {
        const icon = alert.severity === 'critical' ? '🔴' : '⚠️';
        console.log(`   ${icon} ${alert.message}`);
      });
    } else {
      console.log('\\n✅ No performance alerts generated');
    }
    
    console.log('\\n📊 =============================');
  }

  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    interval: 5000,
    duration: 300000,
    verbose: false
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--interval' && i + 1 < args.length) {
      options.interval = parseInt(args[i + 1]) * 1000; // Convert to ms
      i++;
    }
    
    if (arg === '--duration' && i + 1 < args.length) {
      options.duration = parseInt(args[i + 1]) * 1000; // Convert to ms
      i++;
    }
    
    if (arg === '--verbose') {
      options.verbose = true;
    }
    
    if (arg === '--output' && i + 1 < args.length) {
      options.outputFile = args[i + 1];
      i++;
    }
  }
  
  console.log('🚀 Starting performance monitor...');
  console.log('Press Ctrl+C to stop monitoring early');
  
  const monitor = new PerformanceMonitor(options);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\\n\\n⚡ Received interrupt signal, stopping monitor...');
    await monitor.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\\n\\n⚡ Received termination signal, stopping monitor...');
    await monitor.stop();
    process.exit(0);
  });
  
  try {
    await monitor.start();
    
    // Wait for monitoring to complete
    return new Promise((resolve) => {
      monitor.on('stopped', (report) => {
        resolve(report);
      });
    });
    
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\\n✅ Performance monitoring completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Performance monitoring failed:', error.message);
      process.exit(1);
    });
}

module.exports = PerformanceMonitor;