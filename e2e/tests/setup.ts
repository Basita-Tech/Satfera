import { test as setup } from '@playwright/test';
import { TestDataGenerator } from '../utils/test-data';
import { TestHelpers } from '../utils/helpers';

/**
 * Test Setup for E2E Tests
 * 
 * This file handles authentication and data setup for tests
 */

const authFile = 'auth/user-complete.json';

setup('authenticate as complete user', async ({ page }) => {
  // Login as complete user and save auth state
  await page.goto('/login');
  
  await TestHelpers.fillField(page, '[data-testid="email"]', 'complete.user@test.com');
  await TestHelpers.fillField(page, '[data-testid="password"]', 'TestPassword123!');
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login
  await page.waitForURL(/.*dashboard/, { timeout: 30000 });
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});

setup('create test data', async ({ page }) => {
  // Create additional test users and data if needed
  const testUsers = [
    TestDataGenerator.generateTestUser({
      email: 'performance.user@test.com',
      firstName: 'Performance',
      lastName: 'Tester'
    }),
    TestDataGenerator.generateTestUser({
      email: 'security.user@test.com',
      firstName: 'Security',
      lastName: 'Tester'
    })
  ];
  
  // Create users via API if possible
  for (const user of testUsers) {
    try {
      await page.request.post('/api/auth/signup', {
        data: user
      });
    } catch (error) {
      // User might already exist, ignore
      console.log(`User ${user.email} might already exist`);
    }
  }
});