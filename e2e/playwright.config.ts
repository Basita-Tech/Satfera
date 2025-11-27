import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * E2E Test Configuration for Satfera Matrimonial Application
 * 
 * This configuration sets up comprehensive E2E testing across multiple browsers
 * and viewports to ensure complete coverage of user journeys.
 */

export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Global timeout for each test
  timeout: 60 * 1000, // 60 seconds
  
  // Expect timeout for assertions
  expect: {
    timeout: 15 * 1000, // 15 seconds
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 1,
  
  // Number of workers for parallel test execution
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit-results.xml' }],
    ['line'],
  ],
  
  // Global test configuration
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:3000',
    
    // Browser context options
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Navigation timeout
    navigationTimeout: 30 * 1000,
    
    // Action timeout
    actionTimeout: 15 * 1000,
    
    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,
    
    // Viewport
    viewport: { width: 1280, height: 720 },
  },

  // Global setup and teardown
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),

  // Test projects for different browsers and scenarios
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    
    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // Mobile devices
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },

    // Tablet devices
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
      dependencies: ['setup'],
    },

    // Performance testing project
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Throttle network for performance testing
        // launchOptions: {
        //   args: ['--throttle=3G']
        // }
      },
      testMatch: /.*\.performance\.spec\.ts/,
      dependencies: ['setup'],
    },

    // Security testing project
    {
      name: 'security',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.security\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],

  // Web server configuration for local testing
  webServer: [
    // Frontend server
    {
      command: 'npm run dev',
      cwd: '../frontend',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    // Backend server
    {
      command: 'npm run dev',
      cwd: '../backend',
      port: 5000,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        MONGODB_URL: process.env.TEST_MONGODB_URL || 'mongodb://localhost:27017/satfera_e2e_test',
        REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
        JWT_SECRET: 'e2e_test_secret_key_12345',
        TWILIO_ACCOUNT_SID: 'test_account_sid',
        TWILIO_AUTH_TOKEN: 'test_auth_token',
        TWILIO_PHONE_NUMBER: '+1234567890',
      },
    },
  ],

  // Output directory for test artifacts
  outputDir: 'test-results/',
});