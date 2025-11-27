# Satfera Performance Testing Suite

Comprehensive performance testing framework for the Satfera matrimonial application, covering all aspects of system performance including database, frontend, memory management, and load testing.

## 🎯 Overview

This performance testing suite provides:
- **Database Performance Testing** - MongoDB and Redis performance analysis
- **Frontend Performance Testing** - Lighthouse audits and React performance metrics
- **Memory Leak Detection** - Frontend and backend memory analysis
- **SMS/OTP Load Testing** - Twilio integration performance
- **Load Testing** - Artillery.js scenarios for various user loads
- **API Performance Testing** - Jest-based endpoint performance tests
- **Real-time Monitoring** - System performance monitoring during tests
- **Comprehensive Reporting** - HTML, JSON, and executive summary reports

## 🚀 Quick Start

### Prerequisites

1. **Node.js** >= 18.0.0
2. **MongoDB** running locally or accessible remotely
3. **Redis** running locally or accessible remotely
4. **Frontend application** running on port 3000
5. **Backend API** running on port 8000

### Installation

```bash
cd performance
npm install
```

### Environment Setup

Create a `.env` file in the performance directory:

```env
# API Configuration
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/satfera_test
REDIS_URL=redis://localhost:6379

# Test Configuration
NODE_ENV=test
```

### Quick Performance Check

Run essential performance tests for rapid feedback:

```bash
npm run test:quick
# or
node scripts/run-quick-tests.js
```

### Complete Performance Test Suite

Run all performance tests:

```bash
npm run test:all
# or
node scripts/run-all-tests.js
```

## 📋 Available Test Scripts

### Individual Test Categories

```bash
# Database performance tests
npm run test:db
node database/db-performance.js

# Frontend performance tests (Lighthouse)
npm run test:frontend
node frontend/lighthouse-tests.js

# Memory leak detection
npm run test:memory
node memory/memory-leak-tests.js

# SMS/OTP load tests
npm run test:sms
node sms/sms-load-tests.js

# API performance tests
npm run test:api
npm test

# Load tests (Artillery)
npm run test:load:light      # Light load (5 users/sec)
npm run test:load:normal     # Normal load (50-100 users/sec)
npm run test:load:heavy      # Heavy load (200-600 users/sec)
npm run test:load:stress     # Stress test (1000-5000+ users/sec)
npm run test:load:spike      # Spike testing
npm run test:load:endurance  # Long-term endurance test
```

### Test Runner Options

```bash
# Run tests in parallel (faster execution)
node scripts/run-all-tests.js --parallel

# Run only specific test categories
node scripts/run-all-tests.js --database-only
node scripts/run-all-tests.js --frontend-only

# Quick tests (excludes memory, SMS, and load tests)
node scripts/run-all-tests.js --quick

# Verbose output
node scripts/run-all-tests.js --verbose
```

### Performance Monitoring

Monitor system performance in real-time during test execution:

```bash
# Monitor for 5 minutes with 5-second intervals
node scripts/performance-monitor.js

# Custom monitoring duration and intervals
node scripts/performance-monitor.js --duration 600 --interval 10

# Verbose monitoring output
node scripts/performance-monitor.js --verbose
```

## 📊 Test Coverage

### Database Performance Tests
- **MongoDB**: Connection time, query performance, indexing efficiency, concurrent operations
- **Redis**: Basic operations, bulk operations, data structures, memory usage
- **Connection Pooling**: Pool performance under load
- **Query Optimization**: Complex query analysis and recommendations

### Frontend Performance Tests
- **Lighthouse Audits**: Performance, accessibility, best practices, SEO scores
- **Core Web Vitals**: FCP, LCP, FID, CLS measurements
- **React Performance**: Component rendering, state updates, memory usage
- **Bundle Analysis**: JavaScript bundle size and loading performance
- **Mobile Performance**: Mobile-specific performance metrics

### Memory Leak Detection
- **Frontend Memory Leaks**: Component mounting/unmounting, event listeners, closures
- **Backend Memory Monitoring**: Node.js process memory growth
- **Browser Memory Analysis**: Heap usage patterns and growth trends
- **Memory Profiling**: Detailed memory usage analysis

### SMS/OTP Performance Tests
- **Delivery Performance**: SMS delivery times and success rates
- **OTP Verification**: Verification response times and accuracy
- **Rate Limiting**: Testing rate limit effectiveness
- **Error Handling**: Invalid input and error scenario testing
- **Concurrent Requests**: SMS system performance under load

### Load Testing Scenarios
- **Light Load**: 5 users/sec for gradual warm-up
- **Normal Load**: 50-100 users/sec for typical usage
- **Heavy Load**: 200-600 users/sec for peak traffic
- **Stress Load**: 1000-5000+ users/sec to find breaking points
- **Spike Testing**: Sudden traffic spikes simulation
- **Endurance Testing**: Long-term sustained load (1-3 hours)

### API Performance Tests
- **Authentication Endpoints**: Login, signup, OTP operations
- **User Profile Operations**: CRUD operations performance
- **File Upload Performance**: Image upload and processing
- **Response Time Analysis**: Endpoint-specific performance metrics
- **Concurrent Request Handling**: API scalability testing

## 📈 Performance Metrics & Thresholds

### Response Time Targets
- **Health Check**: < 100ms
- **API Endpoints**: < 1000ms
- **Database Queries**: < 500ms
- **File Uploads**: < 10s (100KB), < 30s (1MB)
- **Page Load Time**: < 3s (desktop), < 5s (mobile)

### Lighthouse Score Targets
- **Performance**: > 85
- **Accessibility**: > 90
- **Best Practices**: > 85
- **SEO**: > 80

### Memory Usage Limits
- **Memory Growth**: < 50MB per hour
- **Memory Leaks**: 0 detected leaks
- **Heap Size**: < 512MB peak usage

### SMS/OTP Performance Targets
- **SMS Delivery**: > 95% success rate, < 5s delivery time
- **OTP Verification**: < 2s response time
- **Rate Limiting**: Effective blocking of excessive requests

## 📊 Reports and Analysis

### Report Types

1. **Real-time Console Output** - Live progress and results
2. **JSON Reports** - Detailed machine-readable data
3. **HTML Reports** - Interactive visual reports
4. **Executive Summary** - High-level markdown summary
5. **CSV Exports** - Data for spreadsheet analysis

### Report Locations

All reports are saved in the `reports/` directory:

```
performance/reports/
├── comprehensive-performance-analysis-{timestamp}.json
├── performance-analysis-{timestamp}.html
├── executive-summary-{timestamp}.md
├── performance-summary-{timestamp}.csv
└── {category}-specific-reports/
```

### Comprehensive Analysis Report

Generate a complete analysis with optimization recommendations:

```bash
node reports/generate-report.js
```

This creates:
- **Performance bottleneck identification**
- **Optimization recommendations**
- **Implementation timeline**
- **Risk assessment**
- **Production readiness evaluation**

## 🔧 Configuration

### Test Configuration

Modify `package.json` scripts or create custom configurations:

```javascript
// Example custom configuration
const PerformanceTestRunner = require('./scripts/run-all-tests');

const customRunner = new PerformanceTestRunner({
  includeDatabase: true,
  includeFrontend: true,
  includeMemory: false,      // Skip memory tests
  includeSMS: true,
  includeLoadTests: false,   // Skip load tests
  parallel: true,            // Run in parallel
  outputDir: './custom-reports'
});
```

### Artillery Configuration

Load test scenarios can be customized in `load-tests/scenarios/`:

```yaml
# Example custom scenario
config:
  target: 'http://localhost:8000'
  phases:
    - duration: 300
      arrivalRate: 25
      name: "Custom load test"

scenarios:
  - name: "Custom user flow"
    weight: 100
    flow:
      # Define custom test flow
```

### Lighthouse Configuration

Frontend performance tests use desktop configuration by default. Modify `frontend/lighthouse-tests.js` for custom settings:

```javascript
// Custom Lighthouse configuration
const customConfig = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile',    // Test mobile performance
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4
    }
  }
};
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused Errors**
   ```bash
   # Ensure services are running
   # Backend: npm run dev (in backend directory)
   # Frontend: npm run dev (in frontend directory)
   # MongoDB: mongod
   # Redis: redis-server
   ```

2. **Memory Test Failures**
   ```bash
   # Enable garbage collection for memory tests
   node --expose-gc memory/memory-leak-tests.js
   ```

3. **Artillery Command Not Found**
   ```bash
   # Install Artillery globally
   npm install -g artillery
   ```

4. **Lighthouse Errors**
   ```bash
   # Install required dependencies
   npm install lighthouse puppeteer
   ```

### Test Environment Issues

- **Port Conflicts**: Ensure ports 3000 (frontend) and 8000 (backend) are available
- **Database Connections**: Verify MongoDB and Redis are accessible
- **Memory Limits**: Increase Node.js memory limit for large tests: `--max-old-space-size=4096`
- **Network Issues**: Use localhost URLs for local testing

### Performance Issues

If tests are running slowly:
1. Use `--parallel` flag for faster execution
2. Run specific test categories instead of full suite
3. Reduce load test duration and user counts
4. Skip memory and endurance tests for quick feedback

## 🎯 Best Practices

### Before Running Tests

1. **Ensure Clean Environment**
   - Restart services
   - Clear caches
   - Close unnecessary applications

2. **Stable Network Connection**
   - Use wired connection if possible
   - Avoid network-intensive tasks during testing

3. **Sufficient System Resources**
   - At least 8GB RAM recommended
   - Close resource-intensive applications

### Interpreting Results

1. **Establish Baselines**
   - Run tests multiple times
   - Track performance trends over time
   - Compare against previous versions

2. **Focus on Trends**
   - Single test runs can vary
   - Look for consistent patterns
   - Monitor performance degradation

3. **Prioritize Critical Path**
   - Focus on user-facing performance
   - Prioritize authentication and core flows
   - Address critical bottlenecks first

### Continuous Performance Testing

1. **Integrate with CI/CD**
   - Run quick tests on every commit
   - Full suite on release branches
   - Performance regression detection

2. **Regular Monitoring**
   - Weekly full performance audits
   - Monthly comprehensive analysis
   - Quarterly capacity planning

3. **Performance Budgets**
   - Set performance targets
   - Alert on budget violations
   - Track performance debt

## 📚 Additional Resources

### Performance Optimization Guides

- [Database Optimization](./docs/database-optimization.md)
- [Frontend Performance](./docs/frontend-optimization.md)
- [Memory Management](./docs/memory-optimization.md)
- [API Performance](./docs/api-optimization.md)

### Tools and Libraries

- **Artillery**: Load testing framework
- **Lighthouse**: Web performance auditing
- **Puppeteer**: Browser automation
- **Jest**: JavaScript testing framework
- **MongoDB**: Database performance monitoring
- **Redis**: Cache performance analysis

### External Resources

- [Web.dev Performance](https://web.dev/performance/)
- [MongoDB Performance Best Practices](https://docs.mongodb.com/manual/administration/optimization/)
- [React Performance Optimization](https://reactjs.org/docs/optimizing-performance.html)
- [Node.js Performance Monitoring](https://nodejs.org/en/docs/guides/simple-profiling/)

## 🤝 Contributing

To contribute to the performance testing suite:

1. **Add New Test Categories**
   - Create test files in appropriate directories
   - Update test runner configurations
   - Add documentation

2. **Improve Existing Tests**
   - Enhance test coverage
   - Add new performance metrics
   - Optimize test execution

3. **Report Issues**
   - Document performance regressions
   - Suggest optimization opportunities
   - Share best practices

## 📄 License

This performance testing suite is part of the Satfera project and follows the same licensing terms.

---

**Need Help?** Contact the development team or create an issue in the project repository.

**Performance Testing Team** - Ensuring optimal performance for the Satfera platform.