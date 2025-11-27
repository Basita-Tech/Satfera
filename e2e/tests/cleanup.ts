import { test as cleanup } from '@playwright/test';

/**
 * Test Cleanup for E2E Tests
 * 
 * This file handles cleanup after tests complete
 */

cleanup('cleanup test data', async ({ page }) => {
  // Clean up test users created during tests
  const testEmails = [
    'performance.user@test.com',
    'security.user@test.com',
    'test@example.com'
  ];
  
  for (const email of testEmails) {
    try {
      await page.request.delete('/api/test/cleanup/user', {
        data: { email }
      });
    } catch (error) {
      // Ignore cleanup errors
      console.log(`Failed to cleanup user ${email}:`, error);
    }
  }
});

cleanup('cleanup uploaded files', async ({ page }) => {
  // Clean up test files uploaded during tests
  try {
    await page.request.delete('/api/test/cleanup/files');
  } catch (error) {
    console.log('Failed to cleanup uploaded files:', error);
  }
});

cleanup('cleanup auth states', async ({ page }) => {
  // Clean up saved authentication states
  const fs = require('fs').promises;
  const path = require('path');
  
  const authDir = path.join(__dirname, '..', 'auth');
  
  try {
    await fs.rmdir(authDir, { recursive: true });
  } catch (error) {
    // Directory might not exist
  }
});