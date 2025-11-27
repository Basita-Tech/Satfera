import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Home Page Object Model
 * 
 * Represents the landing page of the Satfera matrimonial application
 */

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page elements
  get logo(): Locator {
    return this.page.locator('[data-testid="logo"], .logo');
  }

  get heroSection(): Locator {
    return this.page.locator('[data-testid="hero"], .hero');
  }

  get signUpButton(): Locator {
    return this.page.locator('[data-testid="signup-button"], button:has-text("Sign Up"), a:has-text("Sign Up")');
  }

  get loginButton(): Locator {
    return this.page.locator('[data-testid="login-button"], button:has-text("Log In"), a:has-text("Log In")');
  }

  get featuresSection(): Locator {
    return this.page.locator('[data-testid="features"], .features');
  }

  get testimonialsSection(): Locator {
    return this.page.locator('[data-testid="testimonials"], .testimonials');
  }

  get navigationMenu(): Locator {
    return this.page.locator('[data-testid="nav-menu"], .nav-menu, nav');
  }

  get searchSection(): Locator {
    return this.page.locator('[data-testid="search"], .search');
  }

  get contactSection(): Locator {
    return this.page.locator('[data-testid="contact"], .contact');
  }

  // Navigation methods
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.logo.waitFor({ state: 'visible', timeout: 10000 });
      await this.heroSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // User actions
  async clickSignUp(): Promise<void> {
    await this.signUpButton.click();
    await this.waitForPageLoad();
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
    await this.waitForPageLoad();
  }

  async navigateToSignUp(): Promise<void> {
    await this.clickSignUp();
    await expect(this.page).toHaveURL(/.*\/signup/);
  }

  async navigateToLogin(): Promise<void> {
    await this.clickLogin();
    await expect(this.page).toHaveURL(/.*\/login/);
  }

  // Search functionality (if available on home page)
  async performQuickSearch(criteria: {
    ageFrom?: string;
    ageTo?: string;
    religion?: string;
    location?: string;
  }): Promise<void> {
    const searchSection = this.searchSection;
    
    if (await searchSection.isVisible()) {
      if (criteria.ageFrom) {
        await this.fillField('[data-testid="age-from"], [name="ageFrom"]', criteria.ageFrom);
      }
      
      if (criteria.ageTo) {
        await this.fillField('[data-testid="age-to"], [name="ageTo"]', criteria.ageTo);
      }
      
      if (criteria.religion) {
        await this.selectDropdown('[data-testid="religion"], [name="religion"]', criteria.religion);
      }
      
      if (criteria.location) {
        await this.fillField('[data-testid="location"], [name="location"]', criteria.location);
      }
      
      await this.page.locator('[data-testid="search-button"], button:has-text("Search")').click();
      await this.waitForPageLoad();
    }
  }

  // Verification methods
  async verifyPageElements(): Promise<void> {
    await expect(this.logo).toBeVisible();
    await expect(this.heroSection).toBeVisible();
    await expect(this.signUpButton).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  async verifyPageContent(): Promise<void> {
    // Verify essential content is present
    await expect(this.page.getByText(/matrimonial|marriage|wedding/i)).toBeVisible();
    await expect(this.page.getByText(/find.*partner|soul.*mate|life.*partner/i)).toBeVisible();
  }

  async verifyNavigationMenu(): Promise<void> {
    const nav = this.navigationMenu;
    if (await nav.isVisible()) {
      const expectedMenuItems = ['Home', 'About', 'Features', 'Contact'];
      
      for (const item of expectedMenuItems) {
        const menuItem = nav.locator(`text="${item}"`);
        if (await menuItem.isVisible()) {
          await expect(menuItem).toBeVisible();
        }
      }
    }
  }

  async verifyResponsiveDesign(): Promise<void> {
    // Test mobile view
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(1000);
    await expect(this.logo).toBeVisible();
    
    // Test tablet view
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(1000);
    await expect(this.heroSection).toBeVisible();
    
    // Reset to desktop view
    await this.page.setViewportSize({ width: 1280, height: 720 });
    await this.page.waitForTimeout(1000);
  }

  async checkPagePerformance(): Promise<{loadTime: number; firstContentfulPaint: number}> {
    const performanceTiming = await this.page.evaluate(() => {
      const timing = performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        firstContentfulPaint: performance.getEntriesByType('paint')
          .find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      };
    });
    
    return performanceTiming;
  }

  async verifyMetaTags(): Promise<void> {
    // Check for essential meta tags
    const title = await this.page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    
    const description = await this.page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    
    const viewport = await this.page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
  }

  async checkSEOElements(): Promise<void> {
    // Check for SEO-friendly elements
    const h1Count = await this.page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);
    expect(h1Count).toBeLessThanOrEqual(2); // Best practice: one main H1
    
    // Check for proper heading hierarchy
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for alt attributes on images
    const images = this.page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const alt = await image.getAttribute('alt');
      if (alt === null || alt === '') {
        console.warn(`Image ${i} is missing alt attribute`);
      }
    }
  }

  async testKeyboardNavigation(): Promise<void> {
    // Test tab navigation through interactive elements
    await this.page.focus('body');
    
    const interactiveElements = [
      this.loginButton,
      this.signUpButton,
    ];
    
    for (let i = 0; i < interactiveElements.length; i++) {
      await this.page.keyboard.press('Tab');
      // Allow time for focus to move
      await this.page.waitForTimeout(100);
    }
  }

  async checkExternalLinks(): Promise<void> {
    const links = this.page.locator('a[href^="http"]:not([href*="localhost"])');
    const linkCount = await links.count();
    
    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      const target = await link.getAttribute('target');
      
      // External links should open in new tab
      if (href && !href.includes(this.page.url())) {
        expect(target).toBe('_blank');
        
        // Check for security attributes
        const rel = await link.getAttribute('rel');
        expect(rel).toContain('noopener');
      }
    }
  }

  async getPageLoadMetrics(): Promise<{
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
  }> {
    return this.page.evaluate(() => {
      const timing = performance.timing;
      const paintEntries = performance.getEntriesByType('paint');
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: lcpEntries[lcpEntries.length - 1]?.startTime || 0,
      };
    });
  }
}