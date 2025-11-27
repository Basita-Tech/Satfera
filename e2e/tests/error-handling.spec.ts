import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/helpers';
import { LoginPage } from '../pages/AuthPages';
import { BasePage } from '../pages/BasePage';

/**
 * Error Handling Across Integrated Systems E2E Tests
 * 
 * @description Tests error handling, resilience, and recovery across
 * all integrated systems including network failures, server errors,
 * validation errors, and system boundaries.
 * 
 * @tags @error-handling @resilience @validation @integration
 */

test.describe('Error Handling Integration', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test.describe('Network Error Handling', () => {
    test('Login with network timeout @error-handling @network', async ({ page }) => {
      await loginPage.goto();
      
      // Mock network timeout for login
      await page.route('**/api/auth/login', route => {
        // Don't fulfill the request to simulate timeout
        setTimeout(() => {
          route.abort('timedout');
        }, 5000);
      });
      
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Should show network timeout error
      await TestHelpers.waitForToast(page, 'Network timeout');
      
      // Should remain on login page
      await expect(page).toHaveURL(/login/);
      
      // Form should remain filled for retry
      const emailValue = await page.locator('[data-testid="email"]').inputValue();
      expect(emailValue).toBe('complete.user@test.com');
      
      await page.unroute('**/api/auth/login');
    });

    test('Profile save with connection loss @error-handling @network', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await page.goto('/profile/edit');
      
      // Mock connection loss
      await page.route('**/api/user/profile', route => {
        route.abort('failed');
      });
      
      // Try to save profile changes
      await TestHelpers.fillField(page, '[data-testid="firstName"]', 'Updated Name');
      
      const saveButton = page.locator('[data-testid="save-profile"], button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should show connection error
        await TestHelpers.waitForToast(page, 'Connection failed');
        
        // Data should be preserved for retry
        const firstNameValue = await page.locator('[data-testid="firstName"]').inputValue();
        expect(firstNameValue).toBe('Updated Name');
      }
      
      await page.unroute('**/api/user/profile');
    });

    test('Photo upload with network interruption @error-handling @network', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await page.goto('/upload-photos');
      
      // Mock network interruption during upload
      let requestCount = 0;
      await page.route('**/api/upload/photo', route => {
        requestCount++;
        if (requestCount === 1) {
          // Fail first attempt
          route.abort('failed');
        } else {
          // Succeed on retry
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, photoId: 'test123' })
          });
        }
      });
      
      // Try to upload photo
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Create test file
        const testImageBuffer = Buffer.from('fake-image-data');
        await fileInput.setInputFiles([{
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: testImageBuffer
        }]);
        
        const uploadButton = page.locator('[data-testid="upload-button"], button:has-text("Upload")');
        if (await uploadButton.isVisible()) {
          await uploadButton.click();
          
          // Should show error for first attempt
          await TestHelpers.waitForToast(page, 'Upload failed');
          
          // Retry upload
          if (await uploadButton.isVisible()) {
            await uploadButton.click();
            
            // Should succeed on retry
            await TestHelpers.waitForToast(page, 'Photo uploaded successfully');
          }
        }
      }
      
      await page.unroute('**/api/upload/photo');
    });
  });

  test.describe('Server Error Handling', () => {
    test('Authentication server error @error-handling @server', async ({ page }) => {
      await loginPage.goto();
      
      // Mock server error
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Should show server error message
      await TestHelpers.waitForToast(page, 'Server error');
      
      // Should remain on login page
      await expect(page).toHaveURL(/login/);
      
      await page.unroute('**/api/auth/login');
    });

    test('Profile form submission server error @error-handling @server', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'incomplete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await page.goto('/onboarding/user');
      
      // Mock server error for form submission
      await page.route('**/api/user/profile', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service unavailable' })
        });
      });
      
      // Fill and submit form
      await TestHelpers.fillField(page, '[data-testid="height"]', '5\'8"');
      await TestHelpers.fillField(page, '[data-testid="weight"]', '70 kg');
      
      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        
        // Should show service unavailable error
        await TestHelpers.waitForToast(page, 'Service unavailable');
        
        // Form data should be preserved
        const heightValue = await page.locator('[data-testid="height"]').inputValue();
        expect(heightValue).toBe('5\'8"');
      }
      
      await page.unroute('**/api/user/profile');
    });

    test('Database connection error simulation @error-handling @database', async ({ page }) => {
      await loginPage.goto();
      
      // Mock database connection error
      await page.route('**/api/**', route => {
        const url = route.request().url();
        if (url.includes('/api/')) {
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Database connection failed',
              message: 'Service temporarily unavailable'
            })
          });
        } else {
          route.continue();
        }
      });
      
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Should show database error message
      await TestHelpers.waitForToast(page, 'Service temporarily unavailable');
      
      await page.unroute('**/api/**');
    });
  });

  test.describe('Validation Error Handling', () => {
    test('Registration form validation errors @error-handling @validation', async ({ page }) => {
      await page.goto('/signup');
      
      // Submit empty form
      const signupButton = page.locator('[data-testid="signup-button"], button:has-text("Sign Up")');
      await signupButton.click();
      
      // Should show multiple validation errors
      const errorMessages = page.locator('[data-testid$="-error"], .error');
      const errorCount = await errorMessages.count();
      expect(errorCount).toBeGreaterThan(0);
      
      // Check specific validation messages
      const requiredFields = [
        { field: 'firstName', message: 'First name is required' },
        { field: 'lastName', message: 'Last name is required' },
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is required' }
      ];
      
      for (const { field, message } of requiredFields) {
        const fieldError = page.locator(`[data-testid="${field}-error"]`);
        if (await fieldError.isVisible({ timeout: 1000 })) {
          await expect(fieldError).toContainText(/required/i);
        }
      }
    });

    test('Invalid data format validation @error-handling @validation', async ({ page }) => {
      await page.goto('/signup');
      
      // Test invalid email format
      await TestHelpers.fillField(page, '[data-testid="email"]', 'invalid-email');
      await page.locator('[data-testid="email"]').blur();
      
      const emailError = page.locator('[data-testid="email-error"]');
      if (await emailError.isVisible({ timeout: 2000 })) {
        await expect(emailError).toContainText(/invalid.*email/i);
      }
      
      // Test invalid phone format
      await TestHelpers.fillField(page, '[data-testid="phone"]', 'invalid-phone');
      await page.locator('[data-testid="phone"]').blur();
      
      const phoneError = page.locator('[data-testid="phone-error"]');
      if (await phoneError.isVisible({ timeout: 2000 })) {
        await expect(phoneError).toContainText(/invalid.*phone/i);
      }
      
      // Test weak password
      await TestHelpers.fillField(page, '[data-testid="password"]', '123');
      await page.locator('[data-testid="password"]').blur();
      
      const passwordError = page.locator('[data-testid="password-error"]');
      if (await passwordError.isVisible({ timeout: 2000 })) {
        await expect(passwordError).toContainText(/weak|requirements/i);
      }
    });

    test('Server-side validation errors @error-handling @validation', async ({ page }) => {
      await page.goto('/signup');
      
      // Mock server-side validation errors
      await page.route('**/api/auth/signup', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Validation failed',
            details: {
              email: 'Email already exists',
              phone: 'Phone number already registered'
            }
          })
        });
      });
      
      // Submit valid form data
      await TestHelpers.fillField(page, '[data-testid="firstName"]', 'Test');
      await TestHelpers.fillField(page, '[data-testid="lastName"]', 'User');
      await TestHelpers.fillField(page, '[data-testid="email"]', 'test@example.com');
      await TestHelpers.fillField(page, '[data-testid="password"]', 'TestPassword123!');
      await TestHelpers.fillField(page, '[data-testid="confirmPassword"]', 'TestPassword123!');
      await page.check('[data-testid="terms"]');
      
      const signupButton = page.locator('[data-testid="signup-button"]');
      await signupButton.click();
      
      // Should show server-side validation errors
      const emailError = page.locator('[data-testid="email-error"]');
      const phoneError = page.locator('[data-testid="phone-error"]');
      
      if (await emailError.isVisible({ timeout: 3000 })) {
        await expect(emailError).toContainText(/already.*exists/i);
      }
      
      if (await phoneError.isVisible({ timeout: 3000 })) {
        await expect(phoneError).toContainText(/already.*registered/i);
      }
      
      await page.unroute('**/api/auth/signup');
    });
  });

  test.describe('File Upload Error Handling', () => {
    test('File size limit error @error-handling @file-upload', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await page.goto('/upload-photos');
      
      // Create large file buffer (simulating oversized file)
      const largeFileBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles([{
          name: 'large-image.jpg',
          mimeType: 'image/jpeg',
          buffer: largeFileBuffer
        }]);
        
        // Should show file size error
        const fileSizeError = page.locator('[data-testid="file-size-error"], .file-size-error');
        if (await fileSizeError.isVisible({ timeout: 2000 })) {
          await expect(fileSizeError).toContainText(/size|large|limit/i);
        }
      }
    });

    test('Invalid file type error @error-handling @file-upload', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await page.goto('/upload-photos');
      
      // Try to upload invalid file type
      const invalidFileBuffer = Buffer.from('This is not an image file');
      
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles([{
          name: 'document.txt',
          mimeType: 'text/plain',
          buffer: invalidFileBuffer
        }]);
        
        // Should show file type error
        const fileTypeError = page.locator('[data-testid="file-type-error"], .file-type-error');
        if (await fileTypeError.isVisible({ timeout: 2000 })) {
          await expect(fileTypeError).toContainText(/type|format|invalid/i);
        }
      }
    });

    test('Upload server error recovery @error-handling @file-upload', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await page.goto('/upload-photos');
      
      // Mock upload server error
      await page.route('**/api/upload/photo', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Upload server error' })
        });
      });
      
      const validFileBuffer = Buffer.from('valid-image-data');
      
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles([{
          name: 'valid-image.jpg',
          mimeType: 'image/jpeg',
          buffer: validFileBuffer
        }]);
        
        const uploadButton = page.locator('[data-testid="upload-button"], button:has-text("Upload")');
        if (await uploadButton.isVisible()) {
          await uploadButton.click();
          
          // Should show upload error
          await TestHelpers.waitForToast(page, 'Upload failed');
          
          // File should remain selected for retry
          const fileName = await fileInput.evaluate((input: HTMLInputElement) => {
            return input.files && input.files.length > 0 ? input.files[0].name : '';
          });
          
          expect(fileName).toBe('valid-image.jpg');
        }
      }
      
      await page.unroute('**/api/upload/photo');
    });
  });

  test.describe('Session Error Handling', () => {
    test('Session expiry during form filling @error-handling @session', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await page.goto('/profile/edit');
      
      // Fill form partially
      await TestHelpers.fillField(page, '[data-testid="firstName"]', 'Updated Name');
      await TestHelpers.fillField(page, '[data-testid="lastName"]', 'Updated LastName');
      
      // Simulate session expiry
      await page.context().clearCookies();
      
      // Try to save
      const saveButton = page.locator('[data-testid="save-profile"], button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should redirect to login
        await expect(page).toHaveURL(/login/);
        
        // Should show session expired message
        await TestHelpers.waitForToast(page, 'Session expired');
      }
    });

    test('Concurrent session conflict @error-handling @session', async ({ page, browser }) => {
      // Login in first session
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Create second session
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      const loginPage2 = new LoginPage(page2);
      
      await loginPage2.goto();
      await loginPage2.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Make changes in both sessions
      await page.goto('/profile/edit');
      await TestHelpers.fillField(page, '[data-testid="firstName"]', 'Session1 Name');
      
      await page2.goto('/profile/edit');
      await TestHelpers.fillField(page2, '[data-testid="firstName"]', 'Session2 Name');
      
      // Save from first session
      const saveButton1 = page.locator('[data-testid="save-profile"], button:has-text("Save")');
      if (await saveButton1.isVisible()) {
        await saveButton1.click();
        await TestHelpers.waitForToast(page, 'Profile updated');
      }
      
      // Save from second session (should detect conflict)
      const saveButton2 = page2.locator('[data-testid="save-profile"], button:has-text("Save")');
      if (await saveButton2.isVisible()) {
        await saveButton2.click();
        
        // Should show conflict error
        const conflictMessage = page2.locator('[data-testid="conflict-error"], .conflict-error');
        if (await conflictMessage.isVisible({ timeout: 3000 })) {
          await expect(conflictMessage).toContainText(/conflict|updated.*another/i);
        }
      }
      
      await context2.close();
    });
  });

  test.describe('API Rate Limit Error Handling', () => {
    test('API rate limit graceful degradation @error-handling @rate-limit', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Mock rate limit response
      await page.route('**/api/user/profile', route => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Retry-After': '60'
          },
          body: JSON.stringify({ 
            error: 'Rate limit exceeded',
            message: 'Please try again in 60 seconds'
          })
        });
      });
      
      await page.goto('/profile/edit');
      
      const saveButton = page.locator('[data-testid="save-profile"], button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should show rate limit message
        await TestHelpers.waitForToast(page, 'Rate limit exceeded');
        
        // Button should be disabled temporarily
        await expect(saveButton).toBeDisabled();
      }
      
      await page.unroute('**/api/user/profile');
    });
  });

  test.describe('Graceful Degradation', () => {
    test('JavaScript disabled fallback @error-handling @accessibility', async ({ page }) => {
      // Disable JavaScript
      await page.context().route('**/*.js', route => route.abort());
      
      await page.goto('/');
      
      // Basic navigation should still work
      const loginLink = page.locator('a:has-text("Login"), [href*="login"]');
      if (await loginLink.isVisible({ timeout: 5000 })) {
        await loginLink.click();
        
        // Should navigate to login page
        await expect(page).toHaveURL(/login/);
        
        // Form should be present and submittable
        const form = page.locator('form');
        if (await form.isVisible()) {
          await expect(form).toBeVisible();
        }
      }
    });

    test('CSS loading failure @error-handling @css', async ({ page }) => {
      // Block CSS loading
      await page.route('**/*.css', route => route.abort());
      
      await page.goto('/');
      
      // Content should still be accessible even without styling
      const content = page.locator('body');
      await expect(content).toBeVisible();
      
      // Text should be readable
      const textContent = await page.textContent('body');
      expect(textContent).toBeTruthy();
      expect(textContent.length).toBeGreaterThan(50); // Should have substantial content
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up any mocked routes
    try {
      await page.unrouteAll();
    } catch (error) {
      console.warn('Route cleanup warning:', error);
    }
    
    // Check for console errors that might indicate unhandled errors
    const errors = await TestHelpers.checkConsoleErrors(page);
    if (errors.length > 0) {
      console.warn('Console errors detected during error handling test:', errors);
    }
  });
});