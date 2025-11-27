/**
 * SMS/OTP System Load Testing Suite
 * Comprehensive testing for SMS delivery and OTP verification performance
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class SMSLoadTester {
  constructor() {
    this.results = {
      smsDelivery: {},
      otpVerification: {},
      rateLimiting: {},
      errorHandling: {},
      performance: {},
      costAnalysis: {},
      recommendations: []
    };
    this.apiURL = process.env.API_URL || 'http://localhost:8000';
    this.testPhoneNumbers = this.generateTestPhoneNumbers();
    this.deliveryTracker = new Map();
    this.reportsDir = path.join(__dirname, 'sms-reports');
  }

  async initialize() {
    console.log('📱 Initializing SMS/OTP load testing suite...');
    
    // Create reports directory
    await this.ensureDirectoryExists(this.reportsDir);
    
    // Validate test environment
    await this.validateTestEnvironment();
    
    console.log('✅ SMS load tester initialized');
  }

  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  generateTestPhoneNumbers() {
    // Generate test phone numbers for different scenarios
    const testNumbers = [];
    
    // Valid US test numbers
    for (let i = 1000; i < 1100; i++) {
      testNumbers.push(`+1555${i}001`);
    }
    
    // Valid Indian test numbers
    for (let i = 1000; i < 1050; i++) {
      testNumbers.push(`+9198${i}00001`);
    }
    
    // Invalid numbers for error testing
    const invalidNumbers = [
      '+1invalid',
      '123',
      '',
      '+1' + '5'.repeat(20),
      'notaphone',
      '+91' + '1'.repeat(15)
    ];
    
    return {
      valid: testNumbers,
      invalid: invalidNumbers
    };
  }

  async validateTestEnvironment() {
    console.log('🔍 Validating test environment...');
    
    try {
      // Test API connectivity
      const response = await axios.get(`${this.apiURL}/health`, { timeout: 5000 });
      console.log('✅ API connectivity confirmed');
      
      // Check if we're in test mode
      if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
        console.warn('⚠️  Warning: Not in test environment. SMS tests may send actual messages.');
      }
      
    } catch (error) {
      console.error('❌ API connectivity failed:', error.message);
      throw new Error('Cannot proceed without API connectivity');
    }
  }

  async testSMSDeliveryPerformance() {
    console.log('\\n📲 Testing SMS delivery performance...');
    
    const testScenarios = [
      { name: 'single_sms', count: 1, description: 'Single SMS delivery' },
      { name: 'small_batch', count: 10, description: 'Small batch (10 SMS)' },
      { name: 'medium_batch', count: 50, description: 'Medium batch (50 SMS)' },
      { name: 'large_batch', count: 100, description: 'Large batch (100 SMS)' }
    ];
    
    for (const scenario of testScenarios) {
      console.log(`\\n🔄 Testing ${scenario.description}...`);
      
      const deliveryResults = await this.runSMSDeliveryScenario(scenario);
      this.results.smsDelivery[scenario.name] = deliveryResults;
      
      console.log(`✅ ${scenario.description} completed:`);
      console.log(`   Success rate: ${deliveryResults.successRate.toFixed(2)}%`);
      console.log(`   Average delivery time: ${deliveryResults.averageDeliveryTime.toFixed(2)}ms`);
      console.log(`   Total requests: ${deliveryResults.totalRequests}`);
      
      // Wait between scenarios to avoid rate limiting
      await this.wait(2000);
    }
  }

  async runSMSDeliveryScenario(scenario) {
    const startTime = performance.now();
    const requests = [];
    const results = [];
    
    // Prepare phone numbers for this scenario
    const phoneNumbers = this.testPhoneNumbers.valid.slice(0, scenario.count);
    
    // Send SMS requests
    for (let i = 0; i < scenario.count; i++) {
      const phone = phoneNumbers[i % phoneNumbers.length];
      
      const request = this.sendSMSOTP(phone, i)
        .then(result => ({
          success: true,
          phone: phone,
          requestIndex: i,
          ...result
        }))
        .catch(error => ({
          success: false,
          phone: phone,
          requestIndex: i,
          error: error.message,
          responseTime: 0
        }));
      
      requests.push(request);
      
      // Small delay between requests to simulate realistic usage
      if (i < scenario.count - 1) {
        await this.wait(100);
      }
    }
    
    // Wait for all requests to complete
    const requestResults = await Promise.all(requests);
    const endTime = performance.now();
    
    // Analyze results
    const successfulRequests = requestResults.filter(r => r.success);
    const failedRequests = requestResults.filter(r => !r.success);
    
    const successRate = (successfulRequests.length / requestResults.length) * 100;
    const averageDeliveryTime = successfulRequests.length > 0
      ? successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length
      : 0;
    
    const totalTime = endTime - startTime;
    const throughput = (successfulRequests.length / totalTime) * 1000; // requests per second
    
    return {
      scenario: scenario.name,
      totalRequests: scenario.count,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      successRate: successRate,
      averageDeliveryTime: averageDeliveryTime,
      maxDeliveryTime: Math.max(...successfulRequests.map(r => r.responseTime), 0),
      minDeliveryTime: Math.min(...successfulRequests.map(r => r.responseTime), 0),
      totalTime: totalTime,
      throughput: throughput,
      results: requestResults,
      errors: failedRequests.map(r => ({ phone: r.phone, error: r.error }))
    };
  }

  async sendSMSOTP(phoneNumber, requestIndex = 0) {
    const startTime = performance.now();
    
    try {
      const response = await axios.post(
        `${this.apiURL}/api/v1/auth/send-sms-otp`,
        { 
          phone: phoneNumber,
          testMode: true, // Indicate this is a test
          requestId: `load_test_${requestIndex}_${Date.now()}`
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SMS-LoadTester/1.0'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Track delivery for verification testing
      this.deliveryTracker.set(phoneNumber, {
        sentAt: Date.now(),
        responseTime: responseTime,
        status: response.status,
        requestIndex: requestIndex
      });
      
      return {
        responseTime: responseTime,
        status: response.status,
        success: response.status >= 200 && response.status < 300,
        data: response.data
      };
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Track failed attempts
      this.deliveryTracker.set(phoneNumber, {
        sentAt: Date.now(),
        responseTime: responseTime,
        status: error.response?.status || 0,
        error: error.message,
        requestIndex: requestIndex
      });
      
      throw {
        responseTime: responseTime,
        status: error.response?.status || 0,
        message: error.message,
        code: error.code
      };
    }
  }

  async testOTPVerificationPerformance() {
    console.log('\\n🔐 Testing OTP verification performance...');
    
    const verificationScenarios = [
      { name: 'valid_otp', otpType: 'valid', count: 20 },
      { name: 'invalid_otp', otpType: 'invalid', count: 15 },
      { name: 'expired_otp', otpType: 'expired', count: 10 },
      { name: 'mixed_verification', otpType: 'mixed', count: 30 }
    ];
    
    for (const scenario of verificationScenarios) {
      console.log(`\\n🔍 Testing ${scenario.name} (${scenario.count} attempts)...`);
      
      const verificationResults = await this.runOTPVerificationScenario(scenario);
      this.results.otpVerification[scenario.name] = verificationResults;
      
      console.log(`✅ ${scenario.name} completed:`);
      console.log(`   Success rate: ${verificationResults.successRate.toFixed(2)}%`);
      console.log(`   Average verification time: ${verificationResults.averageVerificationTime.toFixed(2)}ms`);
      
      await this.wait(1000);
    }
  }

  async runOTPVerificationScenario(scenario) {
    const phoneNumbers = this.testPhoneNumbers.valid.slice(0, scenario.count);
    const verificationResults = [];
    
    for (let i = 0; i < scenario.count; i++) {
      const phone = phoneNumbers[i % phoneNumbers.length];
      const otp = this.generateOTPForScenario(scenario.otpType, i);
      
      try {
        const result = await this.verifyOTP(phone, otp);
        verificationResults.push({
          success: true,
          phone: phone,
          otp: otp,
          scenario: scenario.otpType,
          ...result
        });
      } catch (error) {
        verificationResults.push({
          success: false,
          phone: phone,
          otp: otp,
          scenario: scenario.otpType,
          error: error.message,
          responseTime: error.responseTime || 0
        });
      }
      
      // Small delay between verifications
      if (i < scenario.count - 1) {
        await this.wait(200);
      }
    }
    
    // Analyze verification results
    const successfulVerifications = verificationResults.filter(r => r.success);
    const failedVerifications = verificationResults.filter(r => !r.success);
    
    const successRate = (successfulVerifications.length / verificationResults.length) * 100;
    const averageVerificationTime = successfulVerifications.length > 0
      ? successfulVerifications.reduce((sum, r) => sum + r.responseTime, 0) / successfulVerifications.length
      : 0;
    
    return {
      scenario: scenario.name,
      totalVerifications: scenario.count,
      successfulVerifications: successfulVerifications.length,
      failedVerifications: failedVerifications.length,
      successRate: successRate,
      averageVerificationTime: averageVerificationTime,
      results: verificationResults
    };
  }

  generateOTPForScenario(otpType, index) {
    switch (otpType) {
      case 'valid':
        // In a real test, you'd need the actual OTP
        // For testing, we'll use a mock valid OTP
        return '123456';
      case 'invalid':
        return '000000';
      case 'expired':
        return '999999';
      case 'mixed':
        return index % 3 === 0 ? '123456' : (index % 3 === 1 ? '000000' : '999999');
      default:
        return '123456';
    }
  }

  async verifyOTP(phoneNumber, otp) {
    const startTime = performance.now();
    
    try {
      const response = await axios.post(
        `${this.apiURL}/api/v1/auth/verify-sms-otp`,
        { 
          phone: phoneNumber,
          otp: otp,
          testMode: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SMS-LoadTester/1.0'
          },
          timeout: 15000
        }
      );
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      return {
        responseTime: responseTime,
        status: response.status,
        success: response.status >= 200 && response.status < 300,
        data: response.data
      };
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      throw {
        responseTime: responseTime,
        status: error.response?.status || 0,
        message: error.message,
        code: error.code
      };
    }
  }

  async testRateLimiting() {
    console.log('\\n🚦 Testing rate limiting behavior...');
    
    const rateLimitingTests = [
      { name: 'burst_requests', requests: 20, interval: 100, description: 'Burst of 20 requests' },
      { name: 'sustained_load', requests: 50, interval: 500, description: 'Sustained load test' },
      { name: 'rapid_fire', requests: 10, interval: 50, description: 'Rapid fire requests' }
    ];
    
    for (const test of rateLimitingTests) {
      console.log(`\\n⚡ Testing ${test.description}...`);
      
      const rateLimitResults = await this.runRateLimitTest(test);
      this.results.rateLimiting[test.name] = rateLimitResults;
      
      console.log(`✅ ${test.description} completed:`);
      console.log(`   Rate limited requests: ${rateLimitResults.rateLimitedRequests}`);
      console.log(`   Success rate: ${rateLimitResults.successRate.toFixed(2)}%`);
      
      await this.wait(5000); // Wait between rate limit tests
    }
  }

  async runRateLimitTest(test) {
    const phoneNumber = this.testPhoneNumbers.valid[0];
    const results = [];
    
    const startTime = performance.now();
    
    for (let i = 0; i < test.requests; i++) {
      try {
        const result = await this.sendSMSOTP(phoneNumber, i);
        results.push({
          success: true,
          requestIndex: i,
          status: result.status,
          responseTime: result.responseTime,
          rateLimited: result.status === 429
        });
      } catch (error) {
        results.push({
          success: false,
          requestIndex: i,
          status: error.status,
          responseTime: error.responseTime,
          rateLimited: error.status === 429,
          error: error.message
        });
      }
      
      if (i < test.requests - 1) {
        await this.wait(test.interval);
      }
    }
    
    const endTime = performance.now();
    
    const successfulRequests = results.filter(r => r.success && !r.rateLimited);
    const rateLimitedRequests = results.filter(r => r.rateLimited);
    const failedRequests = results.filter(r => !r.success && !r.rateLimited);
    
    return {
      testName: test.name,
      totalRequests: test.requests,
      successfulRequests: successfulRequests.length,
      rateLimitedRequests: rateLimitedRequests.length,
      failedRequests: failedRequests.length,
      successRate: (successfulRequests.length / test.requests) * 100,
      rateLimitRate: (rateLimitedRequests.length / test.requests) * 100,
      totalTime: endTime - startTime,
      results: results
    };
  }

  async testErrorHandling() {
    console.log('\\n🚨 Testing error handling scenarios...');
    
    const errorScenarios = [
      { name: 'invalid_phone_numbers', phones: this.testPhoneNumbers.invalid },
      { name: 'empty_payload', phones: [''] },
      { name: 'malformed_requests', phones: [null, undefined, 123, {}] }
    ];
    
    for (const scenario of errorScenarios) {
      console.log(`\\n❌ Testing ${scenario.name}...`);
      
      const errorResults = await this.runErrorHandlingTest(scenario);
      this.results.errorHandling[scenario.name] = errorResults;
      
      console.log(`✅ ${scenario.name} completed: ${errorResults.totalErrors} errors handled`);
    }
  }

  async runErrorHandlingTest(scenario) {
    const results = [];
    
    for (let i = 0; i < scenario.phones.length; i++) {
      const phone = scenario.phones[i];
      
      try {
        const result = await this.sendSMSOTP(phone, i);
        results.push({
          input: phone,
          success: true,
          status: result.status,
          responseTime: result.responseTime
        });
      } catch (error) {
        results.push({
          input: phone,
          success: false,
          status: error.status,
          error: error.message,
          responseTime: error.responseTime,
          expectedError: true
        });
      }
    }
    
    const totalErrors = results.filter(r => !r.success).length;
    const unexpectedSuccesses = results.filter(r => r.success).length;
    
    return {
      scenario: scenario.name,
      totalTests: scenario.phones.length,
      totalErrors: totalErrors,
      unexpectedSuccesses: unexpectedSuccesses,
      results: results
    };
  }

  async testConcurrentSMSRequests() {
    console.log('\\n🔄 Testing concurrent SMS requests...');
    
    const concurrentTests = [
      { name: 'low_concurrency', concurrent: 5, description: '5 concurrent requests' },
      { name: 'medium_concurrency', concurrent: 15, description: '15 concurrent requests' },
      { name: 'high_concurrency', concurrent: 25, description: '25 concurrent requests' }
    ];
    
    for (const test of concurrentTests) {
      console.log(`\\n🚀 Testing ${test.description}...`);
      
      const concurrentResults = await this.runConcurrentTest(test);
      this.results.performance[test.name] = concurrentResults;
      
      console.log(`✅ ${test.description} completed:`);
      console.log(`   Success rate: ${concurrentResults.successRate.toFixed(2)}%`);
      console.log(`   Average response time: ${concurrentResults.averageResponseTime.toFixed(2)}ms`);
      
      await this.wait(3000);
    }
  }

  async runConcurrentTest(test) {
    const phoneNumbers = this.testPhoneNumbers.valid.slice(0, test.concurrent);
    const requests = [];
    
    const startTime = performance.now();
    
    // Start all requests concurrently
    for (let i = 0; i < test.concurrent; i++) {
      const phone = phoneNumbers[i % phoneNumbers.length];
      const request = this.sendSMSOTP(phone, i)
        .then(result => ({ success: true, phone, ...result }))
        .catch(error => ({ success: false, phone, error: error.message, responseTime: error.responseTime }));
      
      requests.push(request);
    }
    
    // Wait for all requests to complete
    const results = await Promise.all(requests);
    const endTime = performance.now();
    
    const successfulRequests = results.filter(r => r.success);
    const failedRequests = results.filter(r => !r.success);
    
    const successRate = (successfulRequests.length / results.length) * 100;
    const averageResponseTime = successfulRequests.length > 0
      ? successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length
      : 0;
    
    return {
      testName: test.name,
      concurrentRequests: test.concurrent,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      successRate: successRate,
      averageResponseTime: averageResponseTime,
      maxResponseTime: Math.max(...successfulRequests.map(r => r.responseTime), 0),
      totalTime: endTime - startTime,
      results: results
    };
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateSMSReport() {
    console.log('\\n📊 ================================');
    console.log('📊 SMS/OTP LOAD TESTING REPORT');
    console.log('📊 ================================');
    
    // SMS Delivery Performance
    if (Object.keys(this.results.smsDelivery).length > 0) {
      console.log('\\n📲 SMS DELIVERY PERFORMANCE:');
      Object.entries(this.results.smsDelivery).forEach(([scenario, data]) => {
        console.log(`   ${scenario.toUpperCase()}:`);
        console.log(`     Success Rate: ${data.successRate.toFixed(2)}%`);
        console.log(`     Average Delivery Time: ${data.averageDeliveryTime.toFixed(2)}ms`);
        console.log(`     Throughput: ${data.throughput.toFixed(2)} requests/sec`);
      });
    }
    
    // OTP Verification Performance
    if (Object.keys(this.results.otpVerification).length > 0) {
      console.log('\\n🔐 OTP VERIFICATION PERFORMANCE:');
      Object.entries(this.results.otpVerification).forEach(([scenario, data]) => {
        console.log(`   ${scenario.toUpperCase()}:`);
        console.log(`     Success Rate: ${data.successRate.toFixed(2)}%`);
        console.log(`     Average Verification Time: ${data.averageVerificationTime.toFixed(2)}ms`);
      });
    }
    
    // Rate Limiting
    if (Object.keys(this.results.rateLimiting).length > 0) {
      console.log('\\n🚦 RATE LIMITING ANALYSIS:');
      Object.entries(this.results.rateLimiting).forEach(([test, data]) => {
        console.log(`   ${test.toUpperCase()}:`);
        console.log(`     Rate Limited: ${data.rateLimitedRequests}/${data.totalRequests} requests`);
        console.log(`     Rate Limit Rate: ${data.rateLimitRate.toFixed(2)}%`);
      });
    }
    
    // Concurrent Performance
    if (Object.keys(this.results.performance).length > 0) {
      console.log('\\n🔄 CONCURRENT REQUEST PERFORMANCE:');
      Object.entries(this.results.performance).forEach(([test, data]) => {
        console.log(`   ${test.toUpperCase()}:`);
        console.log(`     Concurrent Requests: ${data.concurrentRequests}`);
        console.log(`     Success Rate: ${data.successRate.toFixed(2)}%`);
        console.log(`     Average Response Time: ${data.averageResponseTime.toFixed(2)}ms`);
      });
    }
    
    // Error Handling
    if (Object.keys(this.results.errorHandling).length > 0) {
      console.log('\\n🚨 ERROR HANDLING:');
      Object.entries(this.results.errorHandling).forEach(([scenario, data]) => {
        console.log(`   ${scenario.toUpperCase()}:`);
        console.log(`     Total Errors: ${data.totalErrors}/${data.totalTests}`);
        console.log(`     Unexpected Successes: ${data.unexpectedSuccesses}`);
      });
    }
    
    // Generate recommendations
    const recommendations = this.generateSMSRecommendations();
    if (recommendations.length > 0) {
      console.log('\\n🚀 RECOMMENDATIONS:');
      recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    console.log('\\n📊 ================================');
    
    return this.results;
  }

  generateSMSRecommendations() {
    const recommendations = [];
    
    // SMS delivery recommendations
    if (this.results.smsDelivery) {
      Object.entries(this.results.smsDelivery).forEach(([scenario, data]) => {
        if (data.successRate < 95) {
          recommendations.push(`Improve SMS delivery success rate for ${scenario} (currently ${data.successRate.toFixed(1)}%)`);
        }
        if (data.averageDeliveryTime > 5000) {
          recommendations.push(`Optimize SMS delivery time for ${scenario} (currently ${data.averageDeliveryTime.toFixed(0)}ms)`);
        }
      });
    }
    
    // OTP verification recommendations
    if (this.results.otpVerification) {
      Object.entries(this.results.otpVerification).forEach(([scenario, data]) => {
        if (scenario === 'valid_otp' && data.successRate < 98) {
          recommendations.push('Improve valid OTP verification success rate');
        }
        if (data.averageVerificationTime > 2000) {
          recommendations.push(`Optimize OTP verification time for ${scenario}`);
        }
      });
    }
    
    // Rate limiting recommendations
    if (this.results.rateLimiting) {
      const hasEffectiveRateLimit = Object.values(this.results.rateLimiting)
        .some(data => data.rateLimitRate > 0);
      
      if (!hasEffectiveRateLimit) {
        recommendations.push('Consider implementing rate limiting to prevent abuse');
      }
    }
    
    // Concurrent performance recommendations
    if (this.results.performance) {
      Object.entries(this.results.performance).forEach(([test, data]) => {
        if (data.successRate < 90) {
          recommendations.push(`Improve concurrent request handling for ${test}`);
        }
      });
    }
    
    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('SMS/OTP system performance is within acceptable ranges');
    }
    
    // Add cost optimization recommendations
    recommendations.push('Monitor SMS costs and implement usage analytics');
    recommendations.push('Consider implementing SMS delivery status tracking');
    recommendations.push('Implement retry logic for failed SMS deliveries');
    
    return recommendations;
  }

  async saveDetailedReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      testConfiguration: {
        apiURL: this.apiURL,
        totalTestPhones: this.testPhoneNumbers.valid.length,
        testEnvironment: process.env.NODE_ENV || 'unknown'
      },
      results: this.results,
      summary: {
        smsDeliveryTests: Object.keys(this.results.smsDelivery).length,
        otpVerificationTests: Object.keys(this.results.otpVerification).length,
        rateLimitingTests: Object.keys(this.results.rateLimiting).length,
        errorHandlingTests: Object.keys(this.results.errorHandling).length,
        performanceTests: Object.keys(this.results.performance).length
      },
      recommendations: this.generateSMSRecommendations()
    };
    
    const reportPath = path.join(this.reportsDir, `sms-load-test-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`\\n📄 Detailed SMS report saved: ${reportPath}`);
    return reportPath;
  }

  async runAllTests() {
    try {
      await this.initialize();
      
      await this.testSMSDeliveryPerformance();
      await this.testOTPVerificationPerformance();
      await this.testRateLimiting();
      await this.testErrorHandling();
      await this.testConcurrentSMSRequests();
      
      const report = this.generateSMSReport();
      await this.saveDetailedReport();
      
      return report;
      
    } catch (error) {
      console.error('❌ SMS load testing failed:', error);
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SMSLoadTester();
  tester.runAllTests()
    .then(results => {
      console.log('\\n✅ SMS/OTP load testing completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ SMS/OTP load testing failed:', error);
      process.exit(1);
    });
}

module.exports = SMSLoadTester;