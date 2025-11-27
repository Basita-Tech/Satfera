import { Page, Locator } from '@playwright/test';
import { TestHelpers } from '../utils/helpers';

/**
 * Base Page Object Model
 * 
 * This class provides common functionality for all page objects
 */

export abstract class BasePage {
  protected page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the page
   */
  abstract goto(): Promise<void>;

  /**
   * Verify the page is loaded correctly
   */
  abstract isLoaded(): Promise<boolean>;

  /**
   * Common elements present on most pages
   */
  get header(): Locator {
    return this.page.locator('header, [data-testid="header"]');
  }

  get footer(): Locator {
    return this.page.locator('footer, [data-testid="footer"]');
  }

  get loadingIndicator(): Locator {
    return this.page.locator('[data-testid="loading"], .loading, .spinner');
  }

  get errorMessage(): Locator {
    return this.page.locator('[data-testid="error"], .error, .alert-error');
  }

  get successMessage(): Locator {
    return this.page.locator('[data-testid="success"], .success, .alert-success');
  }

  get toastMessage(): Locator {
    return this.page.locator('.toast, [data-testid="toast"], .notification');
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await TestHelpers.waitForPageLoad(this.page);
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoading(): Promise<void> {
    await TestHelpers.waitForLoading(this.page);
  }

  /**
   * Take a screenshot of the page
   */
  async takeScreenshot(name: string): Promise<void> {
    await TestHelpers.takeScreenshot(this.page, name);
  }

  /**
   * Check for console errors
   */
  async getConsoleErrors(): Promise<string[]> {
    return TestHelpers.checkConsoleErrors(this.page);
  }

  /**
   * Fill a form field
   */
  async fillField(selector: string, value: string, validate: boolean = true): Promise<void> {
    await TestHelpers.fillField(this.page, selector, value, { validate });
  }

  /**
   * Select from dropdown
   */
  async selectDropdown(selector: string, option: string): Promise<void> {
    await TestHelpers.selectDropdown(this.page, selector, option);
  }

  /**
   * Wait for toast message
   */
  async waitForToast(expectedMessage?: string): Promise<void> {
    await TestHelpers.waitForToast(this.page, expectedMessage);
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      await this.page.locator(selector).waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Click element with retry logic
   */
  async clickWithRetry(selector: string, retries: number = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.locator(selector).click({ timeout: 10000 });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Scroll element into view
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for element to be stable
   */
  async waitForStableElement(selector: string): Promise<Locator> {
    return TestHelpers.waitForStableElement(this.page, selector);
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Check accessibility issues
   */
  async checkAccessibility(): Promise<any[]> {
    return TestHelpers.checkAccessibility(this.page);
  }

  /**
   * Monitor network requests
   */
  async startNetworkMonitoring(): Promise<{requests: any[], responses: any[]}> {
    return TestHelpers.monitorNetworkRequests(this.page);
  }

  /**
   * Check security headers
   */
  async checkSecurityHeaders(): Promise<{[key: string]: string | null}> {
    return TestHelpers.checkSecurityHeaders(this.page, this.getCurrentUrl());
  }

  /**
   * Handle modal dialogs
   */
  async handleDialog(accept: boolean = true, promptText?: string): Promise<void> {
    this.page.on('dialog', async dialog => {
      if (promptText) {
        await dialog.accept(promptText);
      } else if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Upload file
   */
  async uploadFile(selector: string, filePath: string): Promise<void> {
    await TestHelpers.uploadFile(this.page, selector, filePath);
  }

  /**
   * Clear form field
   */
  async clearField(selector: string): Promise<void> {
    await this.page.locator(selector).clear();
  }

  /**
   * Press key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Hover over element
   */
  async hover(selector: string): Promise<void> {
    await this.page.locator(selector).hover();
  }

  /**
   * Double click element
   */
  async doubleClick(selector: string): Promise<void> {
    await this.page.locator(selector).dblclick();
  }

  /**
   * Right click element
   */
  async rightClick(selector: string): Promise<void> {
    await this.page.locator(selector).click({ button: 'right' });
  }

  /**
   * Get element text
   */
  async getText(selector: string): Promise<string> {
    return this.page.locator(selector).textContent() || '';
  }

  /**
   * Get element attribute
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return this.page.locator(selector).getAttribute(attribute);
  }

  /**
   * Check if element is enabled
   */
  async isEnabled(selector: string): Promise<boolean> {
    return this.page.locator(selector).isEnabled();
  }

  /**
   * Check if element is checked
   */
  async isChecked(selector: string): Promise<boolean> {
    return this.page.locator(selector).isChecked();
  }

  /**
   * Get element count
   */
  async getElementCount(selector: string): Promise<number> {
    return this.page.locator(selector).count();
  }

  /**
   * Wait for network response
   */
  async waitForResponse(urlPattern: string | RegExp, timeout: number = 30000): Promise<any> {
    return this.page.waitForResponse(urlPattern, { timeout });
  }

  /**
   * Wait for request
   */
  async waitForRequest(urlPattern: string | RegExp, timeout: number = 30000): Promise<any> {
    return this.page.waitForRequest(urlPattern, { timeout });
  }
}