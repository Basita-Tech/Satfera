import { Page, expect, Locator } from '@playwright/test';
import { TestUser } from './test-data';

/**
 * E2E Test Helper Functions
 * 
 * This module provides common utilities and helper functions for E2E tests
 */

export class TestHelpers {
  /**
   * Wait for page to be fully loaded including network idle
   */
  static async waitForPageLoad(page: Page, timeout: number = 30000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
  }

  /**
   * Fill form field with validation
   */
  static async fillField(page: Page, selector: string, value: string, options?: {
    validate?: boolean;
    timeout?: number;
  }): Promise<void> {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: options?.timeout });
    await element.clear();
    await element.fill(value);
    
    if (options?.validate !== false) {
      await expect(element).toHaveValue(value);
    }
  }

  /**
   * Select dropdown option
   */
  static async selectDropdown(page: Page, selector: string, option: string): Promise<void> {
    await page.locator(selector).click();
    await page.waitForTimeout(500); // Wait for dropdown to open
    await page.locator(`text="${option}"`).click();
  }

  /**
   * Upload file to file input
   */
  static async uploadFile(page: Page, selector: string, filePath: string): Promise<void> {
    const fileInput = page.locator(selector);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Wait for toast message and verify content
   */
  static async waitForToast(page: Page, expectedMessage?: string, timeout: number = 10000): Promise<void> {
    const toastSelector = '.toast, [data-testid="toast"], .notification, .alert';
    await page.waitForSelector(toastSelector, { timeout });
    
    if (expectedMessage) {
      await expect(page.locator(toastSelector)).toContainText(expectedMessage);
    }
  }

  /**
   * Wait for loading state to complete
   */
  static async waitForLoading(page: Page, timeout: number = 15000): Promise<void> {
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '.loader',
      '[aria-label="Loading"]'
    ];

    for (const selector of loadingSelectors) {
      try {
        await page.waitForSelector(selector, { state: 'detached', timeout: 2000 });
      } catch {
        // Loading indicator might not be present, continue
      }
    }
  }

  /**
   * Take screenshot with timestamp
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Check for console errors
   */
  static async checkConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    return errors;
  }

  /**
   * Mock network responses for testing
   */
  static async mockAPIResponse(page: Page, url: string, response: any, status: number = 200): Promise<void> {
    await page.route(url, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Navigate to page with retry logic
   */
  static async navigateWithRetry(page: Page, url: string, retries: number = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await page.waitForTimeout(2000);
      }
    }
  }

  /**
   * Login helper function
   */
  static async login(page: Page, user: Partial<TestUser>): Promise<void> {
    await page.goto('/login');
    
    if (user.email) {
      await this.fillField(page, '[data-testid="email"]', user.email);
    }
    
    if (user.password) {
      await this.fillField(page, '[data-testid="password"]', user.password);
    }
    
    await page.click('[data-testid="login-button"]');
    await this.waitForPageLoad(page);
  }

  /**
   * Logout helper function
   */
  static async logout(page: Page): Promise<void> {
    // Look for logout button/link in various locations
    const logoutSelectors = [
      '[data-testid="logout"]',
      'button:has-text("Logout")',
      'a:has-text("Logout")',
      '[aria-label="Logout"]'
    ];

    for (const selector of logoutSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          await element.click();
          await this.waitForPageLoad(page);
          return;
        }
      } catch {
        // Continue to next selector
      }
    }
  }

  /**
   * Fill multi-step form helper
   */
  static async fillMultiStepForm(page: Page, formData: any, steps: string[]): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepData = formData[step];
      
      if (stepData) {
        await this.fillFormStep(page, stepData);
        
        // Click next button if not the last step
        if (i < steps.length - 1) {
          await page.click('[data-testid="next-button"]');
          await this.waitForPageLoad(page);
        }
      }
    }
  }

  /**
   * Fill a single form step
   */
  static async fillFormStep(page: Page, stepData: Record<string, any>): Promise<void> {
    for (const [field, value] of Object.entries(stepData)) {
      if (value === undefined || value === null) continue;
      
      const selector = `[data-testid="${field}"], [name="${field}"]`;
      
      try {
        const element = page.locator(selector);
        const elementType = await element.getAttribute('type') || await element.evaluate(el => el.tagName.toLowerCase());
        
        switch (elementType) {
          case 'checkbox':
            if (value) {
              await element.check();
            }
            break;
          case 'radio':
            await page.check(`${selector}[value="${value}"]`);
            break;
          case 'select':
            await element.selectOption(value);
            break;
          default:
            await this.fillField(page, selector, value.toString());
        }
      } catch (error) {
        console.warn(`Failed to fill field ${field}:`, error);
      }
    }
  }

  /**
   * Wait for element to be visible and stable
   */
  static async waitForStableElement(page: Page, selector: string, timeout: number = 10000): Promise<Locator> {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    
    // Wait for element to stop moving (useful for animations)
    let previousBox = await element.boundingBox();
    await page.waitForTimeout(100);
    let currentBox = await element.boundingBox();
    
    while (previousBox && currentBox && 
           (previousBox.x !== currentBox.x || previousBox.y !== currentBox.y)) {
      await page.waitForTimeout(100);
      previousBox = currentBox;
      currentBox = await element.boundingBox();
    }
    
    return element;
  }

  /**
   * Generate OTP code for testing
   */
  static generateTestOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Verify page accessibility
   */
  static async checkAccessibility(page: Page): Promise<any[]> {
    // Basic accessibility checks
    const issues: any[] = [];
    
    // Check for images without alt text
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      issues.push({
        type: 'missing_alt_text',
        count: imagesWithoutAlt,
        severity: 'warning'
      });
    }
    
    // Check for form inputs without labels
    const inputsWithoutLabels = await page.locator('input:not([aria-label]):not([aria-labelledby])').count();
    if (inputsWithoutLabels > 0) {
      issues.push({
        type: 'missing_input_labels',
        count: inputsWithoutLabels,
        severity: 'error'
      });
    }
    
    return issues;
  }

  /**
   * Monitor network requests
   */
  static async monitorNetworkRequests(page: Page): Promise<{requests: any[], responses: any[]}> {
    const requests: any[] = [];
    const responses: any[] = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date()
      });
    });
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: new Date()
      });
    });
    
    return { requests, responses };
  }

  /**
   * Test security headers
   */
  static async checkSecurityHeaders(page: Page, url: string): Promise<{[key: string]: string | null}> {
    const response = await page.goto(url);
    
    if (!response) {
      throw new Error('Failed to get response');
    }
    
    const headers = response.headers();
    
    return {
      'content-security-policy': headers['content-security-policy'] || null,
      'x-frame-options': headers['x-frame-options'] || null,
      'x-content-type-options': headers['x-content-type-options'] || null,
      'strict-transport-security': headers['strict-transport-security'] || null,
      'x-xss-protection': headers['x-xss-protection'] || null,
      'referrer-policy': headers['referrer-policy'] || null,
    };
  }
}