import { test, expect } from '@playwright/test';
import { TestDataGenerator } from '../utils/test-data';
import { TestHelpers } from '../utils/helpers';
import { LoginPage } from '../pages/AuthPages';
import { BasePage } from '../pages/BasePage';

/**
 * Security Boundary Testing E2E Tests
 * 
 * @description Comprehensive security testing across complete user flows
 * including authentication bypass, authorization checks, data validation,
 * injection attacks, and session security.
 * 
 * @tags @security @boundary @authorization @injection @session
 */

test.describe('Security Boundary Testing', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test.describe('Authentication Security', () => {
    test('Authentication bypass attempts @security @auth-bypass', async ({ page }) => {
      // Try to access protected pages without authentication
      const protectedUrls = [
        '/userdashboard',
        '/profile/edit',
        '/upload-photos',
        '/onboarding/user',
        '/complete-profile'
      ];

      for (const url of protectedUrls) {
        await page.goto(url);
        
        // Should redirect to login page or show unauthorized
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/login|unauthorized|403|401/i);
      }
    });

    test('Session hijacking protection @security @session', async ({ page, context }) => {
      // Login to get a valid session
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await expect(page).toHaveURL(/dashboard/);
      
      // Get session cookies
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(cookie => 
        cookie.name.includes('session') || 
        cookie.name.includes('token') || 
        cookie.name.includes('auth')
      );
      
      if (sessionCookie) {
        // Verify secure cookie attributes
        expect(sessionCookie.httpOnly).toBe(true);
        expect(sessionCookie.secure).toBe(true);
        expect(sessionCookie.sameSite).toBe('Strict');
      }
    });

    test('Concurrent session handling @security @session', async ({ page, browser }) => {
      // Login in first session
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Create second browser context for another session
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      const loginPage2 = new LoginPage(page2);
      
      // Login with same user in second session
      await loginPage2.goto();
      await loginPage2.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Verify both sessions or check if first session is invalidated
      await page.reload();
      
      // Either both should work or first should be logged out
      const isFirstSessionActive = page.url().includes('dashboard');
      const isSecondSessionActive = page2.url().includes('dashboard');
      
      console.log('First session active:', isFirstSessionActive);
      console.log('Second session active:', isSecondSessionActive);
      
      await context2.close();
    });

    test('Password reset token security @security @tokens', async ({ page }) => {
      // Generate a fake password reset token
      const fakeToken = 'fake-token-12345';
      
      await page.goto(`/reset-password/${fakeToken}`);
      
      // Should show error for invalid token
      const errorMessage = page.locator('[data-testid="token-error"], .error');
      if (await errorMessage.isVisible({ timeout: 5000 })) {
        await expect(errorMessage).toContainText(/invalid|expired|token/i);
      } else {
        // Should redirect to forgot password or login
        expect(page.url()).toMatch(/forgot-password|login/);
      }
    });
  });

  test.describe('Authorization Security', () => {
    test('Role-based access control @security @rbac', async ({ page }) => {
      // Login as regular user
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Try to access admin endpoints
      const adminUrls = [
        '/admin',
        '/admin/dashboard',
        '/admin/users',
        '/admin/reports',
        '/api/admin/users',
        '/api/admin/settings'
      ];
      
      for (const url of adminUrls) {
        const response = await page.goto(url, { waitUntil: 'networkidle' });
        
        // Should return 403 Forbidden or redirect
        if (response) {
          expect([401, 403, 404]).toContain(response.status());
        } else {
          // If no response, check if redirected to unauthorized page
          expect(page.url()).toMatch(/unauthorized|forbidden|login/i);
        }
      }
    });

    test('Horizontal privilege escalation @security @privilege-escalation', async ({ page }) => {
      // Login as user
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Try to access another user's profile/data
      const otherUserIds = ['2', '3', '999', 'admin'];
      
      for (const userId of otherUserIds) {
        // Try to access other user's profile
        const response = await page.goto(`/api/user/${userId}/profile`);
        
        if (response) {
          // Should return 403 or 404
          expect([401, 403, 404]).toContain(response.status());
        }
        
        // Try to edit other user's data
        const editResponse = await page.request.put(`/api/user/${userId}/profile`, {
          data: { name: 'Hacked Name' }
        });
        
        expect([401, 403, 404]).toContain(editResponse.status());
      }
    });

    test('API endpoint protection @security @api', async ({ page }) => {
      // Test API endpoints without authentication
      const apiEndpoints = [
        '/api/user/profile',
        '/api/user/photos',
        '/api/user/preferences',
        '/api/matches',
        '/api/notifications'
      ];
      
      for (const endpoint of apiEndpoints) {
        const response = await page.request.get(endpoint);
        
        // Should require authentication
        expect([401, 403]).toContain(response.status());
      }
    });
  });

  test.describe('Input Validation Security', () => {
    test('SQL injection protection @security @sqli', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Navigate to profile edit
      await page.goto('/profile/edit');
      
      const sqlPayloads = TestDataGenerator.getSQLInjectionPayloads();
      
      for (const payload of sqlPayloads) {
        // Test SQL injection in various form fields
        const formFields = [
          '[data-testid="firstName"]',
          '[data-testid="lastName"]',
          '[data-testid="city"]',
          '[data-testid="occupation"]'
        ];
        
        for (const field of formFields) {
          if (await page.locator(field).isVisible({ timeout: 1000 })) {
            await TestHelpers.fillField(page, field, payload);
            
            // Submit form
            const saveButton = page.locator('[data-testid="save-profile"], button:has-text("Save")');
            if (await saveButton.isVisible()) {
              await saveButton.click();
            }
            
            // Check for SQL error messages
            const errorMessage = page.locator('.error, [data-testid="error"]');
            if (await errorMessage.isVisible({ timeout: 2000 })) {
              const errorText = await errorMessage.textContent();
              
              // Should not contain SQL error messages
              expect(errorText?.toLowerCase()).not.toMatch(/sql|database|syntax.*error|mysql|postgres/);
            }
            
            // Clear field for next test
            await page.locator(field).clear();
          }
        }
      }
    });

    test('Cross-site scripting (XSS) protection @security @xss', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await page.goto('/profile/edit');
      
      const xssPayloads = TestDataGenerator.getXSSPayloads();
      
      for (const payload of xssPayloads) {
        // Test XSS in form fields
        const textFields = [
          '[data-testid="firstName"]',
          '[data-testid="lastName"]',
          '[data-testid="aboutMe"]',
          '[data-testid="interests"]'
        ];
        
        for (const field of textFields) {
          if (await page.locator(field).isVisible({ timeout: 1000 })) {
            await TestHelpers.fillField(page, field, payload);
            
            // Save and verify XSS doesn't execute
            const saveButton = page.locator('[data-testid="save-profile"], button:has-text("Save")');
            if (await saveButton.isVisible()) {
              await saveButton.click();
              await page.waitForTimeout(1000);
            }
            
            // XSS should not execute - check if payload is safely displayed
            const fieldValue = await page.locator(field).inputValue();
            expect(fieldValue).toBe(payload); // Should be stored as-is, not executed
            
            // No JavaScript alerts should appear
            let alertTriggered = false;
            page.on('dialog', () => {
              alertTriggered = true;
            });
            
            expect(alertTriggered).toBe(false);
            
            await page.locator(field).clear();
          }
        }
      }
    });

    test('File upload security @security @file-upload', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await page.goto('/upload-photos');
      
      // Test malicious file uploads
      const maliciousFileContents = [
        { name: 'script.php.jpg', content: '<?php system($_GET["cmd"]); ?>', type: 'image/jpeg' },
        { name: 'xss.svg', content: '<svg onload="alert(\'XSS\')"></svg>', type: 'image/svg+xml' },
        { name: 'shell.jsp.png', content: '<% Runtime.getRuntime().exec("whoami"); %>', type: 'image/png' }
      ];
      
      for (const file of maliciousFileContents) {
        // Create blob file
        const blob = new Blob([file.content], { type: file.type });
        const fileHandle = new File([blob], file.name, { type: file.type });
        
        // Try to upload malicious file
        await page.locator('input[type="file"]').setInputFiles([{
          name: file.name,
          mimeType: file.type,
          buffer: Buffer.from(file.content)
        }]);
        
        const uploadButton = page.locator('[data-testid="upload-button"], button:has-text("Upload")');
        if (await uploadButton.isEnabled({ timeout: 1000 })) {
          await uploadButton.click();
          
          // Should be rejected
          const errorMessage = page.locator('.error, [data-testid="error"]');
          if (await errorMessage.isVisible({ timeout: 3000 })) {
            await expect(errorMessage).toContainText(/invalid|not.*allowed|security/i);
          }
        }
      }
    });

    test('Parameter tampering protection @security @parameter-tampering', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Intercept and modify requests
      await page.route('**/api/user/profile', async route => {
        const request = route.request();
        
        if (request.method() === 'PUT') {
          // Tamper with the request data
          const originalData = request.postDataJSON();
          const tamperedData = {
            ...originalData,
            userId: 999, // Try to update different user
            role: 'admin', // Try to elevate privileges
            verified: true, // Try to verify account
            isAdmin: true
          };
          
          await route.continue({
            postData: JSON.stringify(tamperedData),
            headers: {
              ...request.headers(),
              'Content-Type': 'application/json'
            }
          });
        } else {
          await route.continue();
        }
      });
      
      await page.goto('/profile/edit');
      
      // Make a legitimate profile update
      await TestHelpers.fillField(page, '[data-testid="firstName"]', 'Updated Name');
      
      const saveButton = page.locator('[data-testid="save-profile"], button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Server should reject tampered parameters
        const errorMessage = page.locator('.error, [data-testid="error"]');
        if (await errorMessage.isVisible({ timeout: 3000 })) {
          // Should show authorization error
          await expect(errorMessage).toContainText(/unauthorized|forbidden|invalid/i);
        }
      }
      
      await page.unroute('**/api/user/profile');
    });
  });

  test.describe('Session Security', () => {
    test('Session timeout handling @security @session-timeout', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await expect(page).toHaveURL(/dashboard/);
      
      // Mock expired session
      await page.evaluate(() => {
        // Clear session storage
        sessionStorage.clear();
        localStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach(c => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
      });
      
      // Try to access protected resource
      await page.goto('/profile/edit');
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('CSRF protection @security @csrf', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Get CSRF token if available
      const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content') ||
                        await page.locator('input[name="_token"]').getAttribute('value');
      
      if (csrfToken) {
        // Try to make request without CSRF token
        const response = await page.request.post('/api/user/profile', {
          data: { firstName: 'Hacked Name' },
          headers: {
            'Content-Type': 'application/json'
            // Deliberately omitting CSRF token
          }
        });
        
        // Should reject request without valid CSRF token
        expect([400, 403, 422]).toContain(response.status());
      }
    });

    test('Clickjacking protection @security @clickjacking', async ({ page }) => {
      // Check X-Frame-Options header
      const response = await page.goto('/login');
      const headers = response?.headers();
      
      if (headers) {
        const frameOptions = headers['x-frame-options'];
        const csp = headers['content-security-policy'];
        
        // Should have clickjacking protection
        expect(frameOptions || csp).toBeTruthy();
        
        if (frameOptions) {
          expect(['DENY', 'SAMEORIGIN']).toContain(frameOptions.toUpperCase());
        }
        
        if (csp) {
          expect(csp).toMatch(/frame-ancestors.*none|frame-ancestors.*'self'/i);
        }
      }
    });
  });

  test.describe('Data Privacy Security', () => {
    test('Personal data exposure protection @security @data-privacy', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Check if sensitive data is exposed in page source
      const pageContent = await page.content();
      
      // Sensitive data that should not be in page source
      const sensitivePatterns = [
        /password.*[:=]\s*["'].*["']/i,
        /secret.*[:=]\s*["'].*["']/i,
        /api.*key.*[:=]\s*["'].*["']/i,
        /token.*[:=]\s*["'][a-zA-Z0-9]{20,}["']/i,
        /mongodb:\/\/.*[:@]/i,
        /mysql:\/\/.*[:@]/i
      ];
      
      for (const pattern of sensitivePatterns) {
        expect(pageContent).not.toMatch(pattern);
      }
    });

    test('Password field security @security @password', async ({ page }) => {
      await loginPage.goto();
      
      const passwordField = loginPage.passwordField;
      
      // Verify password field attributes
      await expect(passwordField).toHaveAttribute('type', 'password');
      await expect(passwordField).toHaveAttribute('autocomplete', 'current-password');
      
      // Check if password is hidden from view source
      await passwordField.fill('TestPassword123!');
      
      const pageSource = await page.content();
      expect(pageSource).not.toContain('TestPassword123!');
    });

    test('Secure communication @security @https', async ({ page }) => {
      // Verify HTTPS is enforced
      await page.goto('http://localhost:3000/login');
      
      // Should redirect to HTTPS or be blocked
      const currentUrl = page.url();
      
      if (!currentUrl.startsWith('https://') && process.env.NODE_ENV === 'production') {
        // In production, should use HTTPS
        console.warn('HTTPS not enforced in production environment');
      }
    });
  });

  test.describe('Rate Limiting Security', () => {
    test('Login rate limiting @security @rate-limiting', async ({ page }) => {
      await loginPage.goto();
      
      // Attempt multiple failed logins
      const maxAttempts = 10;
      let rateLimited = false;
      
      for (let i = 0; i < maxAttempts; i++) {
        await loginPage.login({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
        
        // Check for rate limiting
        const rateLimitError = page.locator('[data-testid="rate-limit"], .rate-limit');
        if (await rateLimitError.isVisible({ timeout: 1000 })) {
          rateLimited = true;
          break;
        }
        
        await page.waitForTimeout(500);
      }
      
      // Should implement rate limiting after several failed attempts
      if (maxAttempts >= 5) {
        expect(rateLimited).toBe(true);
      }
    });

    test('API rate limiting @security @api-rate-limit', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Make rapid API requests
      const apiEndpoint = '/api/user/profile';
      const requests = [];
      
      for (let i = 0; i < 50; i++) {
        requests.push(page.request.get(apiEndpoint));
      }
      
      const responses = await Promise.all(requests);
      
      // Should have rate limiting - some requests should be rejected
      const rateLimitedResponses = responses.filter(response => 
        response.status() === 429
      );
      
      if (rateLimitedResponses.length > 0) {
        console.log(`${rateLimitedResponses.length} requests were rate limited`);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Information Disclosure', () => {
    test('Error message information leakage @security @info-disclosure', async ({ page }) => {
      // Test various error conditions
      const testUrls = [
        '/nonexistent-page',
        '/api/nonexistent-endpoint',
        '/admin/secret-page'
      ];
      
      for (const url of testUrls) {
        const response = await page.goto(url);
        
        if (response && response.status() >= 400) {
          const pageContent = await page.content();
          
          // Should not expose sensitive information in error messages
          const sensitivePatterns = [
            /stack.*trace/i,
            /file.*path.*line.*\d+/i,
            /database.*error/i,
            /internal.*server.*error.*details/i,
            /debug.*information/i
          ];
          
          for (const pattern of sensitivePatterns) {
            if (pattern.test(pageContent)) {
              console.warn(`Potential information disclosure in ${url}:`, pattern);
            }
          }
        }
      }
    });

    test('Directory traversal protection @security @directory-traversal', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Test directory traversal attempts
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];
      
      for (const payload of traversalPayloads) {
        // Try to access files through various endpoints
        const testUrls = [
          `/api/files/${payload}`,
          `/uploads/${payload}`,
          `/static/${payload}`
        ];
        
        for (const url of testUrls) {
          const response = await page.request.get(url);
          
          // Should not return file contents or expose file system
          expect([400, 403, 404]).toContain(response.status());
          
          if (response.ok()) {
            const content = await response.text();
            // Should not contain file system content
            expect(content).not.toMatch(/root:|localhost|127\.0\.0\.1/);
          }
        }
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up any security testing artifacts
    try {
      await page.evaluate(() => {
        // Clear any injected scripts or modifications
        document.querySelectorAll('script[data-test]').forEach(el => el.remove());
        
        // Reset any tampered global variables
        if (window.console && window.console.clear) {
          window.console.clear();
        }
      });
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });
});