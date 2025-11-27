import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { TestUser } from '../utils/test-data';

/**
 * Authentication Pages Object Models
 * 
 * Contains page objects for all authentication-related pages
 */

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page elements
  get emailField(): Locator {
    return this.page.locator('[data-testid="email"], [name="email"], input[type="email"]');
  }

  get passwordField(): Locator {
    return this.page.locator('[data-testid="password"], [name="password"], input[type="password"]');
  }

  get loginButton(): Locator {
    return this.page.locator('[data-testid="login-button"], button:has-text("Login"), button[type="submit"]');
  }

  get forgotPasswordLink(): Locator {
    return this.page.locator('[data-testid="forgot-password"], a:has-text("Forgot Password")');
  }

  get signUpLink(): Locator {
    return this.page.locator('[data-testid="signup-link"], a:has-text("Sign Up")');
  }

  get rememberMeCheckbox(): Locator {
    return this.page.locator('[data-testid="remember-me"], input[name="rememberMe"]');
  }

  get googleLoginButton(): Locator {
    return this.page.locator('[data-testid="google-login"], button:has-text("Google")');
  }

  get showPasswordButton(): Locator {
    return this.page.locator('[data-testid="show-password"], button[aria-label="Show password"]');
  }

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.emailField.waitFor({ state: 'visible', timeout: 10000 });
      await this.passwordField.waitFor({ state: 'visible', timeout: 5000 });
      await this.loginButton.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // User actions
  async login(user: Partial<TestUser>): Promise<void> {
    if (user.email) {
      await this.fillField('[data-testid="email"]', user.email);
    }
    
    if (user.password) {
      await this.fillField('[data-testid="password"]', user.password);
    }
    
    await this.loginButton.click();
    await this.waitForPageLoad();
  }

  async loginWithRememberMe(user: Partial<TestUser>): Promise<void> {
    await this.login(user);
    await this.rememberMeCheckbox.check();
    await this.loginButton.click();
    await this.waitForPageLoad();
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.waitForPageLoad();
  }

  async clickSignUp(): Promise<void> {
    await this.signUpLink.click();
    await this.waitForPageLoad();
  }

  async togglePasswordVisibility(): Promise<void> {
    if (await this.showPasswordButton.isVisible()) {
      await this.showPasswordButton.click();
    }
  }

  // Verification methods
  async verifyLoginForm(): Promise<void> {
    await expect(this.emailField).toBeVisible();
    await expect(this.passwordField).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.loginButton).toBeEnabled();
  }

  async verifyFormValidation(): Promise<void> {
    // Test empty form submission
    await this.loginButton.click();
    
    const emailError = this.page.locator('[data-testid="email-error"], .email-error');
    const passwordError = this.page.locator('[data-testid="password-error"], .password-error');
    
    await expect(emailError).toBeVisible();
    await expect(passwordError).toBeVisible();
  }

  async verifyInvalidCredentials(): Promise<void> {
    await this.fillField('[data-testid="email"]', 'invalid@example.com');
    await this.fillField('[data-testid="password"]', 'wrongpassword');
    await this.loginButton.click();
    
    await this.waitForToast('Invalid credentials');
  }
}

export class SignUpPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page elements
  get firstNameField(): Locator {
    return this.page.locator('[data-testid="firstName"], [name="firstName"]');
  }

  get lastNameField(): Locator {
    return this.page.locator('[data-testid="lastName"], [name="lastName"]');
  }

  get emailField(): Locator {
    return this.page.locator('[data-testid="email"], [name="email"]');
  }

  get phoneField(): Locator {
    return this.page.locator('[data-testid="phone"], [name="phone"]');
  }

  get passwordField(): Locator {
    return this.page.locator('[data-testid="password"], [name="password"]');
  }

  get confirmPasswordField(): Locator {
    return this.page.locator('[data-testid="confirmPassword"], [name="confirmPassword"]');
  }

  get genderField(): Locator {
    return this.page.locator('[data-testid="gender"], [name="gender"]');
  }

  get dateOfBirthField(): Locator {
    return this.page.locator('[data-testid="dateOfBirth"], [name="dateOfBirth"]');
  }

  get termsCheckbox(): Locator {
    return this.page.locator('[data-testid="terms"], [name="terms"]');
  }

  get signUpButton(): Locator {
    return this.page.locator('[data-testid="signup-button"], button:has-text("Sign Up")');
  }

  get loginLink(): Locator {
    return this.page.locator('[data-testid="login-link"], a:has-text("Login")');
  }

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/signup');
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.firstNameField.waitFor({ state: 'visible', timeout: 10000 });
      await this.emailField.waitFor({ state: 'visible', timeout: 5000 });
      await this.signUpButton.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // User actions
  async signUp(user: TestUser): Promise<void> {
    await this.fillField('[data-testid="firstName"]', user.firstName);
    await this.fillField('[data-testid="lastName"]', user.lastName);
    await this.fillField('[data-testid="email"]', user.email);
    await this.fillField('[data-testid="phone"]', user.phone);
    await this.fillField('[data-testid="password"]', user.password);
    await this.fillField('[data-testid="confirmPassword"]', user.password);
    
    if (await this.genderField.isVisible()) {
      await this.selectDropdown('[data-testid="gender"]', user.gender);
    }
    
    if (await this.dateOfBirthField.isVisible()) {
      await this.fillField('[data-testid="dateOfBirth"]', user.dateOfBirth);
    }
    
    await this.termsCheckbox.check();
    await this.signUpButton.click();
    await this.waitForPageLoad();
  }

  async partialSignUp(user: Partial<TestUser>): Promise<void> {
    if (user.firstName) {
      await this.fillField('[data-testid="firstName"]', user.firstName);
    }
    
    if (user.lastName) {
      await this.fillField('[data-testid="lastName"]', user.lastName);
    }
    
    if (user.email) {
      await this.fillField('[data-testid="email"]', user.email);
    }
    
    if (user.phone) {
      await this.fillField('[data-testid="phone"]', user.phone);
    }
    
    if (user.password) {
      await this.fillField('[data-testid="password"]', user.password);
      await this.fillField('[data-testid="confirmPassword"]', user.password);
    }
    
    await this.signUpButton.click();
  }

  // Verification methods
  async verifySignUpForm(): Promise<void> {
    await expect(this.firstNameField).toBeVisible();
    await expect(this.lastNameField).toBeVisible();
    await expect(this.emailField).toBeVisible();
    await expect(this.phoneField).toBeVisible();
    await expect(this.passwordField).toBeVisible();
    await expect(this.confirmPasswordField).toBeVisible();
    await expect(this.termsCheckbox).toBeVisible();
    await expect(this.signUpButton).toBeVisible();
  }

  async verifyPasswordRequirements(): Promise<void> {
    // Test weak password
    await this.fillField('[data-testid="password"]', '123');
    await this.passwordField.blur();
    
    const passwordError = this.page.locator('[data-testid="password-error"]');
    await expect(passwordError).toBeVisible();
    await expect(passwordError).toContainText(/weak|requirements|characters/i);
  }

  async verifyPasswordMismatch(): Promise<void> {
    await this.fillField('[data-testid="password"]', 'Password123!');
    await this.fillField('[data-testid="confirmPassword"]', 'DifferentPassword123!');
    await this.confirmPasswordField.blur();
    
    const confirmError = this.page.locator('[data-testid="confirmPassword-error"]');
    await expect(confirmError).toBeVisible();
    await expect(confirmError).toContainText(/match|same/i);
  }
}

export class OTPVerificationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page elements
  get otpInput1(): Locator {
    return this.page.locator('[data-testid="otp-1"], input[name="otp1"]');
  }

  get otpInput2(): Locator {
    return this.page.locator('[data-testid="otp-2"], input[name="otp2"]');
  }

  get otpInput3(): Locator {
    return this.page.locator('[data-testid="otp-3"], input[name="otp3"]');
  }

  get otpInput4(): Locator {
    return this.page.locator('[data-testid="otp-4"], input[name="otp4"]');
  }

  get otpInput5(): Locator {
    return this.page.locator('[data-testid="otp-5"], input[name="otp5"]');
  }

  get otpInput6(): Locator {
    return this.page.locator('[data-testid="otp-6"], input[name="otp6"]');
  }

  get verifyButton(): Locator {
    return this.page.locator('[data-testid="verify-button"], button:has-text("Verify")');
  }

  get resendButton(): Locator {
    return this.page.locator('[data-testid="resend-button"], button:has-text("Resend")');
  }

  get backButton(): Locator {
    return this.page.locator('[data-testid="back-button"], button:has-text("Back")');
  }

  get timerDisplay(): Locator {
    return this.page.locator('[data-testid="timer"], .timer');
  }

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/verify-otp');
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.otpInput1.waitFor({ state: 'visible', timeout: 10000 });
      await this.verifyButton.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // User actions
  async enterOTP(otp: string): Promise<void> {
    const digits = otp.split('');
    const inputs = [
      this.otpInput1,
      this.otpInput2,
      this.otpInput3,
      this.otpInput4,
      this.otpInput5,
      this.otpInput6,
    ];

    for (let i = 0; i < Math.min(digits.length, inputs.length); i++) {
      await inputs[i].fill(digits[i]);
    }
  }

  async verifyOTP(otp: string): Promise<void> {
    await this.enterOTP(otp);
    await this.verifyButton.click();
    await this.waitForPageLoad();
  }

  async resendOTP(): Promise<void> {
    await this.resendButton.click();
    await this.waitForToast('OTP sent successfully');
  }

  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.waitForPageLoad();
  }

  // Verification methods
  async verifyOTPForm(): Promise<void> {
    await expect(this.otpInput1).toBeVisible();
    await expect(this.otpInput2).toBeVisible();
    await expect(this.otpInput3).toBeVisible();
    await expect(this.otpInput4).toBeVisible();
    await expect(this.otpInput5).toBeVisible();
    await expect(this.otpInput6).toBeVisible();
    await expect(this.verifyButton).toBeVisible();
    await expect(this.resendButton).toBeVisible();
  }

  async verifyInvalidOTP(): Promise<void> {
    await this.verifyOTP('123456');
    await this.waitForToast('Invalid OTP');
  }

  async verifyOTPAutoAdvance(): Promise<void> {
    // Test that focus advances automatically between OTP inputs
    await this.otpInput1.fill('1');
    await expect(this.otpInput2).toBeFocused();
    
    await this.otpInput2.fill('2');
    await expect(this.otpInput3).toBeFocused();
  }
}

export class ForgotPasswordPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page elements
  get emailField(): Locator {
    return this.page.locator('[data-testid="email"], [name="email"]');
  }

  get submitButton(): Locator {
    return this.page.locator('[data-testid="submit-button"], button:has-text("Submit")');
  }

  get backToLoginLink(): Locator {
    return this.page.locator('[data-testid="back-login"], a:has-text("Back to Login")');
  }

  get resetInstructions(): Locator {
    return this.page.locator('[data-testid="instructions"], .instructions');
  }

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/forgot-password');
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.emailField.waitFor({ state: 'visible', timeout: 10000 });
      await this.submitButton.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // User actions
  async requestPasswordReset(email: string): Promise<void> {
    await this.fillField('[data-testid="email"]', email);
    await this.submitButton.click();
    await this.waitForPageLoad();
  }

  async goBackToLogin(): Promise<void> {
    await this.backToLoginLink.click();
    await this.waitForPageLoad();
  }

  // Verification methods
  async verifyPasswordResetForm(): Promise<void> {
    await expect(this.emailField).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.backToLoginLink).toBeVisible();
  }

  async verifyPasswordResetSent(): Promise<void> {
    await expect(this.resetInstructions).toBeVisible();
    await expect(this.resetInstructions).toContainText(/sent|email|instructions/i);
  }
}

export class ResetPasswordPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page elements
  get newPasswordField(): Locator {
    return this.page.locator('[data-testid="newPassword"], [name="newPassword"]');
  }

  get confirmPasswordField(): Locator {
    return this.page.locator('[data-testid="confirmPassword"], [name="confirmPassword"]');
  }

  get resetButton(): Locator {
    return this.page.locator('[data-testid="reset-button"], button:has-text("Reset Password")');
  }

  // Navigation
  async goto(token: string): Promise<void> {
    await this.page.goto(`/reset-password/${token}`);
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.newPasswordField.waitFor({ state: 'visible', timeout: 10000 });
      await this.confirmPasswordField.waitFor({ state: 'visible', timeout: 5000 });
      await this.resetButton.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // User actions
  async resetPassword(newPassword: string): Promise<void> {
    await this.fillField('[data-testid="newPassword"]', newPassword);
    await this.fillField('[data-testid="confirmPassword"]', newPassword);
    await this.resetButton.click();
    await this.waitForPageLoad();
  }

  // Verification methods
  async verifyResetPasswordForm(): Promise<void> {
    await expect(this.newPasswordField).toBeVisible();
    await expect(this.confirmPasswordField).toBeVisible();
    await expect(this.resetButton).toBeVisible();
  }

  async verifyPasswordResetSuccess(): Promise<void> {
    await this.waitForToast('Password reset successfully');
  }
}