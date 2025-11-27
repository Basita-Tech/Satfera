/**
 * API Performance Testing Suite
 * Jest-based performance tests for Satfera API endpoints
 */

const request = require('supertest');
const { performance } = require('perf_hooks');

// Mock Express app for testing (replace with actual app import)
const express = require('express');

describe('API Performance Tests', () => {
  let app;
  let baseURL;
  let authToken;
  const performanceResults = {
    auth: {},
    users: {},
    profiles: {},
    uploads: {},
    general: {}
  };

  beforeAll(async () => {
    // Setup test environment
    baseURL = process.env.API_URL || 'http://localhost:8000';
    console.log(`\\n🚀 Starting API performance tests against: ${baseURL}`);
    
    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Generate performance report
    generatePerformanceReport();
    
    // Cleanup test data
    await cleanupTestData();
  });

  async function setupTestData() {
    // Create test users and data for performance testing
    console.log('📝 Setting up test data...');
  }

  async function cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
  }

  describe('Authentication Performance', () => {
    test('POST /api/v1/auth/signup - Performance', async () => {
      const testUser = {
        firstName: 'PerfTest',
        lastName: 'User',
        email: `perftest.${Date.now()}@test.com`,
        password: 'TestPass123!',
        phone: '+15551234567',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        religion: 'Hindu',
        caste: 'General'
      };

      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const uniqueUser = {
          ...testUser,
          email: `perftest.${Date.now()}.${i}@test.com`,
          phone: `+1555${String(i).padStart(7, '0')}`
        };

        const startTime = performance.now();
        const response = await request(baseURL)
          .post('/api/v1/auth/signup')
          .send(uniqueUser);
        const endTime = performance.now();

        times.push(endTime - startTime);

        // Expect reasonable response time (under 2 seconds)
        expect(endTime - startTime).toBeLessThan(2000);
        
        if (response.status !== 500) { // Allow for some failures in perf testing
          expect([200, 201, 400, 409]).toContain(response.status);
        }
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.auth.signup = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        times
      };

      console.log(`✅ Signup Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });

    test('POST /api/v1/auth/login - Performance', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const iterations = 20;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const response = await request(baseURL)
          .post('/api/v1/auth/login')
          .send(loginData);
        const endTime = performance.now();

        times.push(endTime - startTime);

        // Expect reasonable response time (under 1 second)
        expect(endTime - startTime).toBeLessThan(1000);
        
        // Don't fail test on auth errors during perf testing
        expect([200, 201, 401, 404]).toContain(response.status);

        if (response.status === 200 || response.status === 201) {
          authToken = response.body.token;
        }
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.auth.login = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        times
      };

      console.log(`✅ Login Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });

    test('POST /api/v1/auth/send-email-otp - Performance', async () => {
      const iterations = 15;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const testEmail = `perftest.otp.${Date.now()}.${i}@test.com`;
        
        const startTime = performance.now();
        const response = await request(baseURL)
          .post('/api/v1/auth/send-email-otp')
          .send({ email: testEmail });
        const endTime = performance.now();

        times.push(endTime - startTime);

        // OTP sending should be reasonable (under 3 seconds for email)
        expect(endTime - startTime).toBeLessThan(3000);
        
        expect([200, 201, 400, 429]).toContain(response.status);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.auth.emailOtp = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        times
      };

      console.log(`✅ Email OTP Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });

    test('POST /api/v1/auth/send-sms-otp - Performance', async () => {
      const iterations = 10; // Fewer iterations for SMS due to rate limits
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const testPhone = `+1555${String(Date.now()).slice(-7)}`;
        
        const startTime = performance.now();
        const response = await request(baseURL)
          .post('/api/v1/auth/send-sms-otp')
          .send({ phone: testPhone });
        const endTime = performance.now();

        times.push(endTime - startTime);

        // SMS OTP should complete reasonably (under 5 seconds)
        expect(endTime - startTime).toBeLessThan(5000);
        
        expect([200, 201, 400, 429]).toContain(response.status);
        
        // Wait between SMS requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.auth.smsOtp = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        times
      };

      console.log(`✅ SMS OTP Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });

    test('POST /api/v1/auth/forgot-password - Performance', async () => {
      const iterations = 15;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const testEmail = `forgot.password.${Date.now()}.${i}@test.com`;
        
        const startTime = performance.now();
        const response = await request(baseURL)
          .post('/api/v1/auth/forgot-password')
          .send({ email: testEmail });
        const endTime = performance.now();

        times.push(endTime - startTime);

        // Password reset should be reasonable
        expect(endTime - startTime).toBeLessThan(2000);
        
        expect([200, 201, 400, 404]).toContain(response.status);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.auth.forgotPassword = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        times
      };

      console.log(`✅ Forgot Password Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });
  });

  describe('User Profile Performance', () => {
    test('GET /api/v1/user-personal/profile - Performance', async () => {
      const iterations = 25;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const response = await request(baseURL)
          .get('/api/v1/user-personal/profile')
          .set('Authorization', `Bearer ${authToken || 'fake-token'}`);
        const endTime = performance.now();

        times.push(endTime - startTime);

        // Profile retrieval should be fast
        expect(endTime - startTime).toBeLessThan(500);
        
        expect([200, 401, 404]).toContain(response.status);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.profiles.getProfile = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        times
      };

      console.log(`✅ Get Profile Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });

    test('PUT/POST /api/v1/user-personal/update - Performance', async () => {
      const updateData = {
        firstName: 'UpdatedName',
        lastName: 'UpdatedLastName',
        bio: 'This is an updated bio for performance testing'
      };

      const iterations = 15;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const uniqueData = {
          ...updateData,
          firstName: `UpdatedName${i}`,
          bio: `Updated bio ${i} for performance testing`
        };

        const startTime = performance.now();
        const response = await request(baseURL)
          .put('/api/v1/user-personal/update')
          .set('Authorization', `Bearer ${authToken || 'fake-token'}`)
          .send(uniqueData);
        const endTime = performance.now();

        times.push(endTime - startTime);

        // Profile updates should complete reasonably
        expect(endTime - startTime).toBeLessThan(1000);
        
        expect([200, 201, 400, 401, 404]).toContain(response.status);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.profiles.updateProfile = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        times
      };

      console.log(`✅ Update Profile Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });
  });

  describe('File Upload Performance', () => {
    test('POST /api/v1/upload - Performance', async () => {
      const iterations = 5; // Fewer iterations for file uploads
      const times = [];

      // Create a small test file buffer (simulating image upload)
      const testImageBuffer = Buffer.alloc(1024 * 100); // 100KB test file
      testImageBuffer.fill(0xFF); // Fill with data

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const response = await request(baseURL)
          .post('/api/v1/upload')
          .set('Authorization', `Bearer ${authToken || 'fake-token'}`)
          .attach('file', testImageBuffer, `test-image-${i}.jpg`)
          .field('type', 'profile');
        const endTime = performance.now();

        times.push(endTime - startTime);

        // File uploads can take longer but should be reasonable
        expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
        
        expect([200, 201, 400, 401, 413, 415]).toContain(response.status);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.uploads.fileUpload = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        fileSizeKB: 100,
        times
      };

      console.log(`✅ File Upload Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });

    test('Large File Upload Performance', async () => {
      const iterations = 3; // Very few iterations for large files
      const times = [];

      // Create a larger test file (1MB)
      const largeImageBuffer = Buffer.alloc(1024 * 1024); // 1MB test file
      largeImageBuffer.fill(0xFF);

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const response = await request(baseURL)
          .post('/api/v1/upload')
          .set('Authorization', `Bearer ${authToken || 'fake-token'}`)
          .attach('file', largeImageBuffer, `large-test-image-${i}.jpg`)
          .field('type', 'profile');
        const endTime = performance.now();

        times.push(endTime - startTime);

        // Large file uploads can take longer
        expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max
        
        expect([200, 201, 400, 401, 413, 415]).toContain(response.status);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.uploads.largeFileUpload = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        fileSizeMB: 1,
        times
      };

      console.log(`✅ Large File Upload Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });
  });

  describe('General API Performance', () => {
    test('GET /health - Performance', async () => {
      const iterations = 50;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const response = await request(baseURL)
          .get('/health');
        const endTime = performance.now();

        times.push(endTime - startTime);

        // Health check should be very fast
        expect(endTime - startTime).toBeLessThan(100);
        expect(response.status).toBe(200);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.general.healthCheck = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        times
      };

      console.log(`✅ Health Check Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });

    test('GET / - Root Endpoint Performance', async () => {
      const iterations = 30;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const response = await request(baseURL)
          .get('/');
        const endTime = performance.now();

        times.push(endTime - startTime);

        // Root endpoint should be fast
        expect(endTime - startTime).toBeLessThan(200);
        expect(response.status).toBe(200);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.general.rootEndpoint = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        times
      };

      console.log(`✅ Root Endpoint Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });

    test('404 Error Performance', async () => {
      const iterations = 20;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const response = await request(baseURL)
          .get(`/nonexistent-endpoint-${i}`);
        const endTime = performance.now();

        times.push(endTime - startTime);

        // 404 responses should be fast
        expect(endTime - startTime).toBeLessThan(200);
        expect(response.status).toBe(404);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      performanceResults.general.notFound = {
        iterations,
        avgTime: avgTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        minTime: minTime.toFixed(2),
        times
      };

      console.log(`✅ 404 Error Performance: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Request Performance', () => {
    test('Concurrent Health Checks', async () => {
      const concurrentRequests = 25;
      const requests = [];

      const overallStart = performance.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(baseURL)
            .get('/health')
        );
      }

      const responses = await Promise.all(requests);
      const overallEnd = performance.now();

      const totalTime = overallEnd - overallStart;
      const avgTimePerRequest = totalTime / concurrentRequests;

      // All health checks should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Concurrent requests should not significantly increase individual response time
      expect(avgTimePerRequest).toBeLessThan(500);

      performanceResults.general.concurrentHealthChecks = {
        concurrentRequests,
        totalTime: totalTime.toFixed(2),
        avgTimePerRequest: avgTimePerRequest.toFixed(2)
      };

      console.log(`✅ Concurrent Health Checks: ${concurrentRequests} requests in ${totalTime.toFixed(2)}ms`);
    });

    test('Mixed Concurrent Operations', async () => {
      const requests = [];
      const operationsCount = 20;

      const overallStart = performance.now();
      
      for (let i = 0; i < operationsCount; i++) {
        if (i % 4 === 0) {
          requests.push(request(baseURL).get('/health'));
        } else if (i % 4 === 1) {
          requests.push(request(baseURL).get('/'));
        } else if (i % 4 === 2) {
          requests.push(
            request(baseURL)
              .get('/api/v1/user-personal/profile')
              .set('Authorization', `Bearer fake-token-${i}`)
          );
        } else {
          requests.push(
            request(baseURL)
              .post('/api/v1/auth/send-email-otp')
              .send({ email: `concurrent.test.${i}@test.com` })
          );
        }
      }

      const responses = await Promise.all(requests);
      const overallEnd = performance.now();

      const totalTime = overallEnd - overallStart;
      const avgTimePerRequest = totalTime / operationsCount;

      performanceResults.general.mixedConcurrentOps = {
        operationsCount,
        totalTime: totalTime.toFixed(2),
        avgTimePerRequest: avgTimePerRequest.toFixed(2),
        successCount: responses.filter(r => r.status < 500).length
      };

      console.log(`✅ Mixed Concurrent Operations: ${operationsCount} ops in ${totalTime.toFixed(2)}ms`);
    });
  });

  function generatePerformanceReport() {
    console.log('\\n📊 ===================================');
    console.log('📊 API PERFORMANCE TESTING REPORT');
    console.log('📊 ===================================');
    
    console.log('\\n🔐 AUTHENTICATION PERFORMANCE:');
    if (performanceResults.auth.signup) {
      console.log(`   Signup: Avg ${performanceResults.auth.signup.avgTime}ms (${performanceResults.auth.signup.iterations} tests)`);
    }
    if (performanceResults.auth.login) {
      console.log(`   Login: Avg ${performanceResults.auth.login.avgTime}ms (${performanceResults.auth.login.iterations} tests)`);
    }
    if (performanceResults.auth.emailOtp) {
      console.log(`   Email OTP: Avg ${performanceResults.auth.emailOtp.avgTime}ms (${performanceResults.auth.emailOtp.iterations} tests)`);
    }
    if (performanceResults.auth.smsOtp) {
      console.log(`   SMS OTP: Avg ${performanceResults.auth.smsOtp.avgTime}ms (${performanceResults.auth.smsOtp.iterations} tests)`);
    }
    if (performanceResults.auth.forgotPassword) {
      console.log(`   Forgot Password: Avg ${performanceResults.auth.forgotPassword.avgTime}ms (${performanceResults.auth.forgotPassword.iterations} tests)`);
    }
    
    console.log('\\n👤 PROFILE PERFORMANCE:');
    if (performanceResults.profiles.getProfile) {
      console.log(`   Get Profile: Avg ${performanceResults.profiles.getProfile.avgTime}ms (${performanceResults.profiles.getProfile.iterations} tests)`);
    }
    if (performanceResults.profiles.updateProfile) {
      console.log(`   Update Profile: Avg ${performanceResults.profiles.updateProfile.avgTime}ms (${performanceResults.profiles.updateProfile.iterations} tests)`);
    }
    
    console.log('\\n📁 UPLOAD PERFORMANCE:');
    if (performanceResults.uploads.fileUpload) {
      console.log(`   File Upload (100KB): Avg ${performanceResults.uploads.fileUpload.avgTime}ms (${performanceResults.uploads.fileUpload.iterations} tests)`);
    }
    if (performanceResults.uploads.largeFileUpload) {
      console.log(`   Large File Upload (1MB): Avg ${performanceResults.uploads.largeFileUpload.avgTime}ms (${performanceResults.uploads.largeFileUpload.iterations} tests)`);
    }
    
    console.log('\\n🌐 GENERAL PERFORMANCE:');
    if (performanceResults.general.healthCheck) {
      console.log(`   Health Check: Avg ${performanceResults.general.healthCheck.avgTime}ms (${performanceResults.general.healthCheck.iterations} tests)`);
    }
    if (performanceResults.general.rootEndpoint) {
      console.log(`   Root Endpoint: Avg ${performanceResults.general.rootEndpoint.avgTime}ms (${performanceResults.general.rootEndpoint.iterations} tests)`);
    }
    if (performanceResults.general.concurrentHealthChecks) {
      console.log(`   Concurrent Health Checks: ${performanceResults.general.concurrentHealthChecks.concurrentRequests} requests in ${performanceResults.general.concurrentHealthChecks.totalTime}ms`);
    }
    
    // Performance Analysis
    console.log('\\n⚠️  PERFORMANCE ANALYSIS:');
    const issues = [];
    
    // Check for performance issues
    if (performanceResults.auth.signup && parseFloat(performanceResults.auth.signup.avgTime) > 1500) {
      issues.push('❌ Slow signup performance (>1.5s average)');
    }
    if (performanceResults.auth.login && parseFloat(performanceResults.auth.login.avgTime) > 800) {
      issues.push('❌ Slow login performance (>800ms average)');
    }
    if (performanceResults.profiles.getProfile && parseFloat(performanceResults.profiles.getProfile.avgTime) > 300) {
      issues.push('❌ Slow profile retrieval (>300ms average)');
    }
    if (performanceResults.general.healthCheck && parseFloat(performanceResults.general.healthCheck.avgTime) > 50) {
      issues.push('❌ Slow health check (>50ms average)');
    }
    if (performanceResults.uploads.fileUpload && parseFloat(performanceResults.uploads.fileUpload.avgTime) > 5000) {
      issues.push('❌ Slow file uploads (>5s average for 100KB)');
    }
    
    if (issues.length === 0) {
      console.log('✅ All API performance metrics within acceptable ranges');
    } else {
      issues.forEach(issue => console.log(issue));
    }
    
    console.log('\\n📊 ===================================');
    
    return performanceResults;
  }
});

module.exports = { performanceResults };