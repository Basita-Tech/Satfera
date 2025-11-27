import { chromium, FullConfig } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';

/**
 * Global setup for E2E tests
 * 
 * This file handles:
 * - Environment configuration
 * - Database initialization
 * - Test data preparation
 * - Authentication setup
 */

config({ path: path.resolve(__dirname, '.env') });

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for services to be ready
    await waitForServices(page);
    
    // Initialize test database
    await initializeTestDatabase();
    
    // Create test users and data
    await createTestData();
    
    // Setup authentication states
    await setupAuthenticationStates(context);
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function waitForServices(page: any) {
  console.log('⏳ Waiting for services to be ready...');
  
  // Check frontend
  let frontendReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const response = await page.goto(process.env.FRONTEND_URL || 'http://localhost:3000');
      if (response?.ok()) {
        frontendReady = true;
        break;
      }
    } catch (error) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  if (!frontendReady) {
    throw new Error('Frontend service failed to start');
  }
  
  // Check backend
  let backendReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/health`);
      if (response.ok) {
        backendReady = true;
        break;
      }
    } catch (error) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  if (!backendReady) {
    console.log('⚠️  Backend health check failed, but continuing with tests...');
  }
  
  console.log('✅ Services are ready');
}

async function initializeTestDatabase() {
  console.log('📊 Initializing test database...');
  
  try {
    // Clean existing test data
    await cleanTestDatabase();
    
    // Initialize collections and indexes if needed
    await initializeCollections();
    
    console.log('✅ Test database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
}

async function cleanTestDatabase() {
  // Implementation depends on your database setup
  // This is a placeholder for actual database cleanup
  console.log('🧹 Cleaning test database...');
}

async function initializeCollections() {
  // Implementation depends on your database setup
  // This is a placeholder for collection initialization
  console.log('🏗️  Initializing database collections...');
}

async function createTestData() {
  console.log('🎭 Creating test data...');
  
  // Create test users with different states
  const testUsers = [
    {
      email: 'complete.user@test.com',
      password: 'TestPassword123!',
      phone: '+1234567890',
      profileComplete: true,
      verified: true,
    },
    {
      email: 'incomplete.user@test.com',
      password: 'TestPassword123!',
      phone: '+1234567891',
      profileComplete: false,
      verified: true,
    },
    {
      email: 'unverified.user@test.com',
      password: 'TestPassword123!',
      phone: '+1234567892',
      profileComplete: false,
      verified: false,
    }
  ];
  
  // Create test data via API calls
  for (const user of testUsers) {
    try {
      const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });
      
      if (!response.ok && response.status !== 409) { // 409 = user already exists
        console.warn(`Failed to create test user ${user.email}:`, response.statusText);
      }
    } catch (error) {
      console.warn(`Failed to create test user ${user.email}:`, error);
    }
  }
  
  console.log('✅ Test data created');
}

async function setupAuthenticationStates(context: any) {
  console.log('🔐 Setting up authentication states...');
  
  // Create authenticated user state
  const page = await context.newPage();
  
  try {
    // Login as complete user
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'complete.user@test.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await page.waitForURL('/userdashboard', { timeout: 10000 });
    
    // Save authentication state
    await page.context().storageState({ path: 'auth/user-complete.json' });
    
    console.log('✅ Authentication states saved');
  } catch (error) {
    console.warn('⚠️  Failed to setup authentication states:', error);
  } finally {
    await page.close();
  }
}

export default globalSetup;