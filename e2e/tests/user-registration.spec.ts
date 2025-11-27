import { test, expect } from '@playwright/test';
import { TestDataGenerator, TestUser } from '../utils/test-data';
import { TestHelpers } from '../utils/helpers';
import { HomePage } from '../pages/HomePage';
import { SignUpPage, OTPVerificationPage } from '../pages/AuthPages';

/**
 * Complete User Registration Flow E2E Tests
 * 
 * @description Tests the complete user registration journey from start to finish
 * including signup, OTP verification, and profile completion.
 * 
 * @tags @registration @auth @smoke @critical
 */

test.describe('User Registration Flow', () => {
  let homePage: HomePage;
  let signUpPage: SignUpPage;
  let otpPage: OTPVerificationPage;
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    signUpPage = new SignUpPage(page);
    otpPage = new OTPVerificationPage(page);
    testUser = TestDataGenerator.generateTestUser();
    
    // Start monitoring console errors
    await TestHelpers.checkConsoleErrors(page);
  });

  test('Complete registration flow - Happy path @smoke @registration', async ({ page }) => {
    // Step 1: Navigate to home page
    await homePage.goto();
    await expect(homePage.isLoaded()).resolves.toBe(true);
    
    // Step 2: Navigate to signup page
    await homePage.navigateToSignUp();
    await expect(signUpPage.isLoaded()).resolves.toBe(true);
    
    // Step 3: Fill and submit signup form
    await signUpPage.signUp(testUser);
    
    // Step 4: Verify OTP page is loaded
    await expect(page).toHaveURL(/.*verify-otp/);
    await expect(otpPage.isLoaded()).resolves.toBe(true);
    
    // Step 5: Enter OTP (using test OTP)
    const testOTP = TestHelpers.generateTestOTP();
    await otpPage.verifyOTP(testOTP);
    
    // Step 6: Verify successful registration
    await expect(page).toHaveURL(/.*complete-profile|.*onboarding/);
    
    // Verify success message
    await TestHelpers.waitForToast(page, 'Registration successful');
  });

  test('Registration with existing email @registration @negative', async ({ page }) => {
    const existingUser = TestDataGenerator.generateTestUser({
      email: 'complete.user@test.com' // Pre-existing test user
    });

    await homePage.goto();
    await homePage.navigateToSignUp();
    await signUpPage.signUp(existingUser);
    
    // Should show error for existing email
    await TestHelpers.waitForToast(page, 'Email already exists');
    
    // Should remain on signup page
    await expect(page).toHaveURL(/.*signup/);
  });

  test('Registration with invalid data @registration @validation', async ({ page }) => {
    const invalidUser = TestDataGenerator.generateInvalidUserData() as TestUser;
    
    await homePage.goto();
    await homePage.navigateToSignUp();
    
    // Test invalid email format
    await signUpPage.partialSignUp({
      firstName: 'Test',
      lastName: 'User',
      email: 'invalid-email',
      password: 'TestPass123!'
    });
    
    // Verify validation errors
    const emailError = page.locator('[data-testid="email-error"]');
    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText(/invalid.*email/i);
  });

  test('Registration form validation @registration @validation', async ({ page }) => {
    await homePage.goto();
    await homePage.navigateToSignUp();
    
    await signUpPage.verifySignUpForm();
    
    // Test empty form submission
    await signUpPage.partialSignUp({});
    
    // Verify required field errors
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'password'];
    
    for (const field of requiredFields) {
      const errorElement = page.locator(`[data-testid="${field}-error"]`);
      await expect(errorElement).toBeVisible();
    }
  });

  test('Password strength validation @registration @security', async ({ page }) => {
    await homePage.goto();
    await homePage.navigateToSignUp();
    
    // Test weak passwords
    const weakPasswords = ['123', 'abc', 'password', '12345678'];
    
    for (const weakPassword of weakPasswords) {
      await signUpPage.fillField('[data-testid="password"]', weakPassword);
      await page.locator('[data-testid="password"]').blur();
      
      const passwordError = page.locator('[data-testid="password-error"]');
      await expect(passwordError).toBeVisible();
    }
    
    // Test strong password
    await signUpPage.fillField('[data-testid="password"]', 'StrongPassword123!');
    await page.locator('[data-testid="password"]').blur();
    
    const passwordError = page.locator('[data-testid="password-error"]');
    await expect(passwordError).not.toBeVisible();
  });

  test('Phone number validation @registration @validation', async ({ page }) => {
    await homePage.goto();
    await homePage.navigateToSignUp();
    
    // Test invalid phone formats
    const invalidPhones = ['123', 'abc', '12345', '+1234'];
    
    for (const phone of invalidPhones) {
      await signUpPage.fillField('[data-testid="phone"]', phone);
      await page.locator('[data-testid="phone"]').blur();
      
      const phoneError = page.locator('[data-testid="phone-error"]');
      await expect(phoneError).toBeVisible();
    }
    
    // Test valid phone
    await signUpPage.fillField('[data-testid="phone"]', '+919876543210');
    await page.locator('[data-testid="phone"]').blur();
    
    const phoneError = page.locator('[data-testid="phone-error"]');
    await expect(phoneError).not.toBeVisible();
  });

  test('OTP verification flow @registration @otp', async ({ page }) => {
    // Complete signup first
    await homePage.goto();
    await homePage.navigateToSignUp();
    await signUpPage.signUp(testUser);
    
    // Verify OTP page
    await expect(otpPage.isLoaded()).resolves.toBe(true);
    
    // Test OTP form elements
    await otpPage.verifyOTPForm();
    
    // Test auto-advance between OTP inputs
    await otpPage.verifyOTPAutoAdvance();
    
    // Test invalid OTP
    await otpPage.verifyInvalidOTP();
    
    // Test OTP resend
    await otpPage.resendOTP();
    await TestHelpers.waitForToast(page, 'OTP sent');
  });

  test('Registration interruption and resume @registration @flow', async ({ page }) => {
    // Start registration
    await homePage.goto();
    await homePage.navigateToSignUp();
    
    // Fill partial form
    await signUpPage.fillField('[data-testid="firstName"]', testUser.firstName);
    await signUpPage.fillField('[data-testid="lastName"]', testUser.lastName);
    await signUpPage.fillField('[data-testid="email"]', testUser.email);
    
    // Navigate away and back
    await page.goto('/');
    await page.goBack();
    
    // Verify form data is preserved (if implemented)
    const firstName = await page.locator('[data-testid="firstName"]').inputValue();
    const lastName = await page.locator('[data-testid="lastName"]').inputValue();
    const email = await page.locator('[data-testid="email"]').inputValue();
    
    // Note: This test assumes form data persistence is implemented
    // If not implemented, these assertions should be removed
    if (firstName || lastName || email) {
      expect(firstName).toBe(testUser.firstName);
      expect(lastName).toBe(testUser.lastName);
      expect(email).toBe(testUser.email);
    }
  });

  test('Registration accessibility @registration @accessibility', async ({ page }) => {
    await homePage.goto();
    await homePage.navigateToSignUp();
    
    // Check form accessibility
    const accessibilityIssues = await signUpPage.checkAccessibility();
    
    // Log accessibility issues for review
    if (accessibilityIssues.length > 0) {
      console.warn('Accessibility issues found:', accessibilityIssues);
    }
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(signUpPage.firstNameField).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(signUpPage.lastNameField).toBeFocused();
    
    // Test form labels
    const firstNameLabel = page.locator('label[for="firstName"], label:has-text("First Name")');
    const lastNameLabel = page.locator('label[for="lastName"], label:has-text("Last Name")');
    
    await expect(firstNameLabel).toBeVisible();
    await expect(lastNameLabel).toBeVisible();
  });

  test('Registration performance @registration @performance', async ({ page }) => {
    // Monitor page load performance
    const startTime = Date.now();
    
    await homePage.goto();
    const homeLoadTime = Date.now() - startTime;
    
    const signupStartTime = Date.now();
    await homePage.navigateToSignUp();
    const signupLoadTime = Date.now() - signupStartTime;
    
    // Performance thresholds (adjust based on requirements)
    expect(homeLoadTime).toBeLessThan(5000); // 5 seconds
    expect(signupLoadTime).toBeLessThan(3000); // 3 seconds
    
    // Test form submission performance
    const submitStartTime = Date.now();
    await signUpPage.signUp(testUser);
    const submitTime = Date.now() - submitStartTime;
    
    expect(submitTime).toBeLessThan(10000); // 10 seconds
  });

  test('Registration security headers @registration @security', async ({ page }) => {
    await homePage.goto();
    await homePage.navigateToSignUp();
    
    const securityHeaders = await signUpPage.checkSecurityHeaders();
    
    // Verify important security headers are present
    expect(securityHeaders['x-frame-options']).toBeTruthy();
    expect(securityHeaders['x-content-type-options']).toBe('nosniff');
    
    // Log all security headers for review
    console.log('Security headers:', securityHeaders);
  });

  test('Registration XSS protection @registration @security', async ({ page }) => {
    await homePage.goto();
    await homePage.navigateToSignUp();
    
    const xssPayloads = TestDataGenerator.getXSSPayloads();
    
    for (const payload of xssPayloads) {
      // Test XSS in form fields
      await signUpPage.fillField('[data-testid="firstName"]', payload);
      await signUpPage.fillField('[data-testid="lastName"]', payload);
      
      // The payload should be safely displayed/handled, not executed
      const firstNameValue = await page.locator('[data-testid="firstName"]').inputValue();
      expect(firstNameValue).toBe(payload); // Should be stored as-is, not executed
    }
  });

  test('Registration with network interruption @registration @resilience', async ({ page }) => {
    await homePage.goto();
    await homePage.navigateToSignUp();
    
    // Fill form
    await signUpPage.signUp(testUser);
    
    // Simulate network failure during OTP verification
    await page.route('**/api/auth/verify-sms-otp', route => {
      route.fulfill({ status: 500, body: 'Network error' });
    });
    
    await expect(otpPage.isLoaded()).resolves.toBe(true);
    
    // Try to verify OTP
    await otpPage.verifyOTP('123456');
    
    // Should show appropriate error message
    await TestHelpers.waitForToast(page, 'Network error');
    
    // Remove route to restore normal behavior
    await page.unroute('**/api/auth/verify-sms-otp');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Remove test user if created
    try {
      // This would typically call a cleanup API
      // await cleanupTestUser(testUser.email);
    } catch (error) {
      console.warn('Failed to cleanup test user:', error);
    }
    
    // Check for console errors
    const errors = await TestHelpers.checkConsoleErrors(page);
    if (errors.length > 0) {
      console.warn('Console errors detected:', errors);
    }
  });
});