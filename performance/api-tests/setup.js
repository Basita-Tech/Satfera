/**
 * Jest Setup for API Performance Tests
 */

// Increase timeout for performance tests
jest.setTimeout(60000);

// Global test configuration
global.console = {
  ...console,
  log: jest.fn((...args) => {
    // Allow performance logging during tests
    if (args[0] && (args[0].includes('✅') || args[0].includes('📊') || args[0].includes('❌'))) {
      console.log(...args);
    }
  }),
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Setup global test variables
global.testConfig = {
  baseURL: process.env.API_URL || 'http://localhost:8000',
  testTimeout: 60000,
  performanceThresholds: {
    healthCheck: 100,
    login: 1000,
    signup: 2000,
    profileGet: 500,
    profileUpdate: 1000,
    fileUpload: 10000,
    largeFileUpload: 30000
  }
};

// Global test cleanup
afterEach(() => {
  // Clean up any test-specific data
});

beforeAll(() => {
  console.log('🚀 Starting API Performance Test Suite');
  console.log(`📡 Target URL: ${global.testConfig.baseURL}`);
});

afterAll(() => {
  console.log('🏁 API Performance Test Suite Completed');
});