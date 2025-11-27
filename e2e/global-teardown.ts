import { FullConfig } from '@playwright/test';

/**
 * Global teardown for E2E tests
 * 
 * This file handles cleanup after all tests have completed:
 * - Database cleanup
 * - File cleanup
 * - Resource cleanup
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...');
  
  try {
    // Clean up test database
    await cleanupTestDatabase();
    
    // Clean up test files
    await cleanupTestFiles();
    
    // Clean up uploaded files
    await cleanupUploadedFiles();
    
    // Clean up authentication states
    await cleanupAuthStates();
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

async function cleanupTestDatabase() {
  console.log('🗄️  Cleaning up test database...');
  
  try {
    // Clean up test collections
    // Implementation depends on your database setup
    
    // Remove test users
    const testUserEmails = [
      'complete.user@test.com',
      'incomplete.user@test.com',
      'unverified.user@test.com',
      'testuser@example.com',
    ];
    
    for (const email of testUserEmails) {
      try {
        // API call to delete test user
        await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/test/cleanup/user`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`, // If admin token is available
          },
          body: JSON.stringify({ email }),
        });
      } catch (error) {
        console.warn(`Failed to cleanup user ${email}:`, error);
      }
    }
    
    console.log('✅ Database cleanup completed');
  } catch (error) {
    console.warn('⚠️  Database cleanup failed:', error);
  }
}

async function cleanupTestFiles() {
  console.log('📁 Cleaning up test files...');
  
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Clean up test report artifacts older than 7 days
    const directories = ['playwright-report', 'test-results'];
    
    for (const dir of directories) {
      const dirPath = path.join(__dirname, dir);
      
      try {
        const stats = await fs.stat(dirPath);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        if (stats.mtime < weekAgo) {
          await fs.rmdir(dirPath, { recursive: true });
          console.log(`Cleaned up old directory: ${dir}`);
        }
      } catch (error) {
        // Directory doesn't exist or other error, ignore
      }
    }
    
    console.log('✅ Test files cleanup completed');
  } catch (error) {
    console.warn('⚠️  Test files cleanup failed:', error);
  }
}

async function cleanupUploadedFiles() {
  console.log('🖼️  Cleaning up uploaded test files...');
  
  try {
    // Clean up test photos and files uploaded during testing
    const uploadPaths = [
      '../backend/uploads/test',
      '../backend/uploads/profiles/test',
      './test-assets/uploaded',
    ];
    
    const fs = require('fs').promises;
    const path = require('path');
    
    for (const uploadPath of uploadPaths) {
      try {
        const fullPath = path.join(__dirname, uploadPath);
        await fs.rmdir(fullPath, { recursive: true });
        console.log(`Cleaned up upload directory: ${uploadPath}`);
      } catch (error) {
        // Directory doesn't exist, ignore
      }
    }
    
    console.log('✅ Uploaded files cleanup completed');
  } catch (error) {
    console.warn('⚠️  Uploaded files cleanup failed:', error);
  }
}

async function cleanupAuthStates() {
  console.log('🔐 Cleaning up authentication states...');
  
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Clean up saved authentication states
    const authDir = path.join(__dirname, 'auth');
    
    try {
      await fs.rmdir(authDir, { recursive: true });
      console.log('Cleaned up authentication states');
    } catch (error) {
      // Directory doesn't exist, ignore
    }
    
    console.log('✅ Authentication states cleanup completed');
  } catch (error) {
    console.warn('⚠️  Authentication states cleanup failed:', error);
  }
}

export default globalTeardown;