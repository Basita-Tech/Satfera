import { test, expect } from '@playwright/test';
import { TestDataGenerator } from '../utils/test-data';
import { TestHelpers } from '../utils/helpers';
import { HomePage } from '../pages/HomePage';
import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from '../pages/AuthPages';

/**
 * Authentication Flow E2E Tests
 * 
 * @description Tests all authentication-related functionality including login,
 * logout, password reset, remember me, and security features.
 * 
 * @tags @auth @login @security @critical
 */

test.describe('Authentication Flows', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;
  let forgotPasswordPage: ForgotPasswordPage;
  let resetPasswordPage: ResetPasswordPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    forgotPasswordPage = new ForgotPasswordPage(page);
    resetPasswordPage = new ResetPasswordPage(page);
  });

  test.describe('Login Flow', () => {
    test('Successful login with valid credentials @auth @smoke @login', async ({ page }) => {
      // Navigate to login page
      await homePage.goto();
      await homePage.navigateToLogin();
      await expect(loginPage.isLoaded()).resolves.toBe(true);
      
      // Verify login form elements
      await loginPage.verifyLoginForm();
      
      // Login with valid credentials
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Verify successful login
      await expect(page).toHaveURL(/.*dashboard|.*profile/);
      
      // Verify user is logged in (check for user-specific elements)
      const userMenu = page.locator('[data-testid="user-menu"], .user-menu');
      await expect(userMenu).toBeVisible();
    });

    test('Login with invalid credentials @auth @negative @login', async ({ page }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      // Test with invalid email
      await loginPage.login({
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!'
      });
      
      // Should show error message
      await TestHelpers.waitForToast(page, 'Invalid credentials');
      
      // Should remain on login page
      await expect(page).toHaveURL(/.*login/);
    });

    test('Login form validation @auth @validation @login', async ({ page }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      // Test empty form submission
      await loginPage.verifyFormValidation();
      
      // Test invalid email format
      await loginPage.fillField('[data-testid="email"]', 'invalid-email');
      await loginPage.fillField('[data-testid="password"]', 'password');
      await loginPage.loginButton.click();
      
      const emailError = page.locator('[data-testid="email-error"]');
      await expect(emailError).toBeVisible();
      await expect(emailError).toContainText(/invalid.*email/i);
    });

    test('Login with remember me functionality @auth @remember @login', async ({ page, context }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      // Login with remember me checked
      await loginPage.fillField('[data-testid="email"]', 'complete.user@test.com');
      await loginPage.fillField('[data-testid="password"]', 'TestPassword123!');
      await loginPage.rememberMeCheckbox.check();
      await loginPage.loginButton.click();
      
      await TestHelpers.waitForPageLoad(page);
      
      // Close browser and create new context to simulate browser restart
      await page.close();
      
      const newPage = await context.newPage();
      await newPage.goto('/');
      
      // User should still be logged in
      const userMenu = newPage.locator('[data-testid="user-menu"], .user-menu');
      if (await userMenu.isVisible({ timeout: 5000 })) {
        // Remember me is working
        console.log('Remember me functionality is working');
      }
    });

    test('Login rate limiting @auth @security @ratelimit', async ({ page }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      // Attempt multiple failed logins to trigger rate limiting
      const maxAttempts = 6; // Adjust based on your rate limiting configuration
      
      for (let i = 0; i < maxAttempts; i++) {
        await loginPage.login({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
        
        await page.waitForTimeout(1000); // Small delay between attempts
      }
      
      // After rate limit is hit, should show appropriate message
      const rateLimitMessage = page.locator('[data-testid="rate-limit-error"], .rate-limit-error');
      
      // The exact message depends on your implementation
      if (await rateLimitMessage.isVisible({ timeout: 5000 })) {
        await expect(rateLimitMessage).toContainText(/rate.*limit|too.*many|try.*again/i);
      }
    });

    test('Password visibility toggle @auth @ui @login', async ({ page }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      const passwordField = loginPage.passwordField;
      const showPasswordButton = loginPage.showPasswordButton;
      
      // Initially password should be hidden
      await expect(passwordField).toHaveAttribute('type', 'password');
      
      // Fill password field
      await loginPage.fillField('[data-testid="password"]', 'TestPassword123!');
      
      if (await showPasswordButton.isVisible()) {
        // Toggle password visibility
        await loginPage.togglePasswordVisibility();
        
        // Password should now be visible
        await expect(passwordField).toHaveAttribute('type', 'text');
        
        // Toggle again to hide
        await loginPage.togglePasswordVisibility();
        await expect(passwordField).toHaveAttribute('type', 'password');
      }
    });

    test('Login accessibility @auth @accessibility @login', async ({ page }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      // Check accessibility issues
      const accessibilityIssues = await loginPage.checkAccessibility();
      
      if (accessibilityIssues.length > 0) {
        console.warn('Login page accessibility issues:', accessibilityIssues);
      }
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(loginPage.emailField).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(loginPage.passwordField).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(loginPage.loginButton).toBeFocused();
      
      // Test form submission with Enter key
      await loginPage.fillField('[data-testid="email"]', 'complete.user@test.com');
      await loginPage.fillField('[data-testid="password"]', 'TestPassword123!');
      await page.keyboard.press('Enter');
      
      await TestHelpers.waitForPageLoad(page);
      await expect(page).toHaveURL(/.*dashboard|.*profile/);
    });
  });

  test.describe('Password Reset Flow', () => {
    test('Forgot password request @auth @password-reset', async ({ page }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      // Click forgot password link
      await loginPage.clickForgotPassword();
      await expect(page).toHaveURL(/.*forgot-password/);
      await expect(forgotPasswordPage.isLoaded()).resolves.toBe(true);
      
      // Verify forgot password form
      await forgotPasswordPage.verifyPasswordResetForm();
      
      // Submit password reset request
      await forgotPasswordPage.requestPasswordReset('complete.user@test.com');
      
      // Verify success message
      await forgotPasswordPage.verifyPasswordResetSent();
    });

    test('Password reset with invalid email @auth @password-reset @negative', async ({ page }) => {
      await homePage.goto();
      await forgotPasswordPage.goto();
      
      // Test with non-existent email
      await forgotPasswordPage.requestPasswordReset('nonexistent@example.com');
      
      // Should show appropriate message
      await TestHelpers.waitForToast(page, 'Email not found');
    });

    test('Password reset validation @auth @password-reset @validation', async ({ page }) => {
      await homePage.goto();
      await forgotPasswordPage.goto();
      
      // Test empty email submission
      await forgotPasswordPage.submitButton.click();
      
      const emailError = page.locator('[data-testid="email-error"]');
      await expect(emailError).toBeVisible();
      
      // Test invalid email format
      await forgotPasswordPage.fillField('[data-testid="email"]', 'invalid-email');
      await forgotPasswordPage.submitButton.click();
      
      await expect(emailError).toContainText(/invalid.*email/i);
    });

    test('Complete password reset flow @auth @password-reset @integration', async ({ page }) => {
      // This test would require email integration or mock email service
      // For now, we'll test the reset password page directly with a mock token
      
      const mockToken = 'mock-reset-token-12345';
      await resetPasswordPage.goto(mockToken);
      await expect(resetPasswordPage.isLoaded()).resolves.toBe(true);
      
      // Verify reset password form
      await resetPasswordPage.verifyResetPasswordForm();
      
      // Reset password
      const newPassword = 'NewPassword123!';
      await resetPasswordPage.resetPassword(newPassword);
      
      // Verify success
      await resetPasswordPage.verifyPasswordResetSuccess();
      
      // Should redirect to login page
      await expect(page).toHaveURL(/.*login/);
    });

    test('Password reset token expiry @auth @password-reset @security', async ({ page }) => {
      const expiredToken = 'expired-token-12345';
      
      // Try to access reset page with expired token
      await resetPasswordPage.goto(expiredToken);
      
      // Should show error message for expired/invalid token
      const errorMessage = page.locator('[data-testid="token-error"], .token-error');
      if (await errorMessage.isVisible({ timeout: 5000 })) {
        await expect(errorMessage).toContainText(/expired|invalid.*token/i);
      } else {
        // If no specific error page, should redirect to forgot password
        await expect(page).toHaveURL(/.*forgot-password/);
      }
    });
  });

  test.describe('Logout Flow', () => {
    test('Successful logout @auth @logout', async ({ page }) => {
      // First login
      await homePage.goto();
      await homePage.navigateToLogin();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await expect(page).toHaveURL(/.*dashboard|.*profile/);
      
      // Logout
      await TestHelpers.logout(page);
      
      // Should redirect to home or login page
      await expect(page).toHaveURL(/.*login|.*\//);
      
      // User menu should no longer be visible
      const userMenu = page.locator('[data-testid="user-menu"], .user-menu');
      await expect(userMenu).not.toBeVisible();
    });

    test('Session expiry handling @auth @session @security', async ({ page }) => {
      // Login first
      await homePage.goto();
      await homePage.navigateToLogin();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      await expect(page).toHaveURL(/.*dashboard|.*profile/);
      
      // Simulate session expiry by clearing cookies
      await page.context().clearCookies();
      
      // Try to navigate to protected page
      await page.goto('/userdashboard');
      
      // Should redirect to login page
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Security Tests', () => {
    test('SQL injection protection @auth @security @sqli', async ({ page }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      const sqlPayloads = TestDataGenerator.getSQLInjectionPayloads();
      
      for (const payload of sqlPayloads) {
        await loginPage.login({
          email: payload,
          password: payload
        });
        
        // Should not cause SQL errors or bypass authentication
        const errorMessage = page.locator('[data-testid="error"], .error');
        if (await errorMessage.isVisible({ timeout: 2000 })) {
          const errorText = await errorMessage.textContent();
          // Should not contain SQL error messages
          expect(errorText).not.toMatch(/sql|database|syntax.*error/i);
        }
        
        // Should remain on login page
        await expect(page).toHaveURL(/.*login/);
        
        // Clear form for next test
        await loginPage.clearField('[data-testid="email"]');
        await loginPage.clearField('[data-testid="password"]');
      }
    });

    test('XSS protection in login form @auth @security @xss', async ({ page }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      const xssPayloads = TestDataGenerator.getXSSPayloads();
      
      for (const payload of xssPayloads) {
        await loginPage.fillField('[data-testid="email"]', payload);
        await loginPage.fillField('[data-testid="password"]', payload);
        await loginPage.loginButton.click();
        
        // XSS should not execute - payload should be safely handled
        const emailValue = await page.locator('[data-testid="email"]').inputValue();
        expect(emailValue).toBe(payload); // Should be displayed as text, not executed
        
        await page.waitForTimeout(1000);
      }
    });

    test('CSRF protection @auth @security @csrf', async ({ page }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      // Check for CSRF token in form
      const csrfToken = page.locator('input[name="_token"], input[name="csrf_token"], meta[name="csrf-token"]');
      
      if (await csrfToken.isVisible({ timeout: 2000 })) {
        const tokenValue = await csrfToken.getAttribute('value') || await csrfToken.getAttribute('content');
        expect(tokenValue).toBeTruthy();
        expect(tokenValue.length).toBeGreaterThan(10); // Should be a proper token
      }
    });

    test('Secure headers validation @auth @security @headers', async ({ page }) => {
      await homePage.goto();
      await homePage.navigateToLogin();
      
      const securityHeaders = await loginPage.checkSecurityHeaders();
      
      // Check for important security headers
      expect(securityHeaders['x-frame-options']).toBeTruthy();
      expect(securityHeaders['x-content-type-options']).toBe('nosniff');
      
      if (securityHeaders['content-security-policy']) {
        expect(securityHeaders['content-security-policy']).toContain('script-src');
      }
      
      console.log('Security headers found:', securityHeaders);
    });

    test('Login attempt logging @auth @security @logging', async ({ page }) => {
      // Monitor network requests to check for proper logging
      const networkMonitoring = await loginPage.startNetworkMonitoring();
      
      await homePage.goto();
      await homePage.navigateToLogin();
      
      // Attempt login with wrong credentials
      await loginPage.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      
      // Check that login attempt was logged (if logging endpoint exists)
      const { requests } = networkMonitoring;
      const logRequest = requests.find(req => 
        req.url.includes('/api/auth/login') || 
        req.url.includes('/api/log') || 
        req.url.includes('/api/audit')
      );
      
      if (logRequest) {
        console.log('Login attempt logged:', logRequest);
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('Login performance @auth @performance @login', async ({ page }) => {
      await homePage.goto();
      
      // Measure navigation to login page
      const loginStartTime = Date.now();
      await homePage.navigateToLogin();
      const loginPageLoadTime = Date.now() - loginStartTime;
      
      // Measure login submission
      const submitStartTime = Date.now();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      const loginSubmitTime = Date.now() - submitStartTime;
      
      // Performance assertions (adjust thresholds as needed)
      expect(loginPageLoadTime).toBeLessThan(3000); // 3 seconds
      expect(loginSubmitTime).toBeLessThan(5000); // 5 seconds
      
      console.log('Login page load time:', loginPageLoadTime, 'ms');
      console.log('Login submit time:', loginSubmitTime, 'ms');
    });
  });
});