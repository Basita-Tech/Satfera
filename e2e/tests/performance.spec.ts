import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/helpers';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/AuthPages';

/**
 * Performance Testing for Complete Workflows E2E
 * 
 * @description Tests performance across complete user journeys including
 * page load times, API response times, rendering performance, and
 * resource utilization.
 * 
 * @tags @performance @load-time @rendering @resources
 */

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  timeToInteractive: number;
}

interface ResourceMetrics {
  totalRequests: number;
  totalBytes: number;
  imageBytes: number;
  scriptBytes: number;
  cssBytes: number;
  failedRequests: number;
}

class PerformanceTestHelper {
  static async getPerformanceMetrics(page: any): Promise<PerformanceMetrics> {
    return page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          const timing = performance.timing;
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const paintEntries = performance.getEntriesByType('paint');
          
          const metrics: PerformanceMetrics = {
            loadTime: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
            largestContentfulPaint: 0,
            firstInputDelay: 0,
            cumulativeLayoutShift: 0,
            totalBlockingTime: 0,
            timeToInteractive: 0
          };
          
          // Get LCP
          const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
          if (lcpEntries.length > 0) {
            metrics.largestContentfulPaint = (lcpEntries[lcpEntries.length - 1] as any).startTime;
          }
          
          // Get CLS
          const clsEntries = entries.filter(entry => entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput);
          metrics.cumulativeLayoutShift = clsEntries.reduce((sum, entry) => sum + (entry as any).value, 0);
          
          resolve(metrics);
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift', 'longtask'] });
        
        // Fallback timeout
        setTimeout(() => {
          const timing = performance.timing;
          resolve({
            loadTime: timing.loadEventEnd - timing.navigationStart,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            firstContentfulPaint: performance.getEntriesByType('paint')
              .find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
            largestContentfulPaint: 0,
            firstInputDelay: 0,
            cumulativeLayoutShift: 0,
            totalBlockingTime: 0,
            timeToInteractive: 0
          });
        }, 5000);
      });
    });
  }

  static async getResourceMetrics(page: any): Promise<ResourceMetrics> {
    return page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      let totalBytes = 0;
      let imageBytes = 0;
      let scriptBytes = 0;
      let cssBytes = 0;
      let failedRequests = 0;
      
      resources.forEach(resource => {
        const size = resource.transferSize || 0;
        totalBytes += size;
        
        if (resource.initiatorType === 'img') {
          imageBytes += size;
        } else if (resource.initiatorType === 'script') {
          scriptBytes += size;
        } else if (resource.initiatorType === 'css') {
          cssBytes += size;
        }
        
        // Check for failed requests (status code in name is not available in standard API)
        // This is a simplified check
        if (resource.duration === 0 && resource.transferSize === 0) {
          failedRequests++;
        }
      });
      
      return {
        totalRequests: resources.length,
        totalBytes,
        imageBytes,
        scriptBytes,
        cssBytes,
        failedRequests
      };
    });
  }

  static async measureAPIResponseTime(page: any, url: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<number> {
    const startTime = Date.now();
    
    try {
      const response = await page.request[method.toLowerCase()](url, data ? { data } : {});
      const endTime = Date.now();
      
      return endTime - startTime;
    } catch (error) {
      console.error('API request failed:', error);
      return -1;
    }
  }
}

test.describe('Performance Testing', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
  });

  test.describe('Page Load Performance', () => {
    test('Homepage performance @performance @load-time @critical', async ({ page }) => {
      const startTime = Date.now();
      
      await homePage.goto();
      await homePage.waitForPageLoad();
      
      const loadTime = Date.now() - startTime;
      const metrics = await PerformanceTestHelper.getPerformanceMetrics(page);
      const resourceMetrics = await PerformanceTestHelper.getResourceMetrics(page);
      
      // Performance assertions (adjust thresholds based on requirements)
      expect(loadTime).toBeLessThan(5000); // 5 seconds total load time
      expect(metrics.domContentLoaded).toBeLessThan(3000); // 3 seconds DOM ready
      expect(metrics.firstContentfulPaint).toBeLessThan(2000); // 2 seconds FCP
      
      if (metrics.largestContentfulPaint > 0) {
        expect(metrics.largestContentfulPaint).toBeLessThan(4000); // 4 seconds LCP
      }
      
      // Resource efficiency
      expect(resourceMetrics.totalBytes).toBeLessThan(5 * 1024 * 1024); // 5MB total
      expect(resourceMetrics.failedRequests).toBe(0); // No failed requests
      
      console.log('Homepage Performance Metrics:', {
        loadTime,
        ...metrics,
        ...resourceMetrics
      });
    });

    test('Login page performance @performance @load-time', async ({ page }) => {
      const startTime = Date.now();
      
      await loginPage.goto();
      await loginPage.waitForPageLoad();
      
      const loadTime = Date.now() - startTime;
      const metrics = await PerformanceTestHelper.getPerformanceMetrics(page);
      
      expect(loadTime).toBeLessThan(3000); // 3 seconds
      expect(metrics.domContentLoaded).toBeLessThan(2000); // 2 seconds
      expect(metrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds
      
      console.log('Login Page Performance:', { loadTime, ...metrics });
    });

    test('Profile form performance @performance @load-time', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login({
        email: 'incomplete.user@test.com',
        password: 'TestPassword123!'
      });
      
      const startTime = Date.now();
      await page.goto('/onboarding/user');
      await TestHelpers.waitForPageLoad(page);
      
      const loadTime = Date.now() - startTime;
      const metrics = await PerformanceTestHelper.getPerformanceMetrics(page);
      
      expect(loadTime).toBeLessThan(4000); // 4 seconds for form page
      expect(metrics.domContentLoaded).toBeLessThan(2500); // 2.5 seconds
      
      console.log('Profile Form Performance:', { loadTime, ...metrics });
    });

    test('Photo upload page performance @performance @load-time', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      const startTime = Date.now();
      await page.goto('/upload-photos');
      await TestHelpers.waitForPageLoad(page);
      
      const loadTime = Date.now() - startTime;
      const metrics = await PerformanceTestHelper.getPerformanceMetrics(page);
      
      expect(loadTime).toBeLessThan(3500); // 3.5 seconds
      expect(metrics.domContentLoaded).toBeLessThan(2000); // 2 seconds
      
      console.log('Photo Upload Performance:', { loadTime, ...metrics });
    });
  });

  test.describe('API Performance', () => {
    test('Authentication API performance @performance @api', async ({ page }) => {
      await loginPage.goto();
      
      // Measure login API response time
      const loginTime = await PerformanceTestHelper.measureAPIResponseTime(
        page,
        '/api/auth/login',
        'POST',
        {
          email: 'complete.user@test.com',
          password: 'TestPassword123!'
        }
      );
      
      expect(loginTime).toBeLessThan(2000); // 2 seconds
      expect(loginTime).toBeGreaterThan(0); // Should not fail
      
      console.log('Login API Response Time:', loginTime, 'ms');
    });

    test('Profile API performance @performance @api', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Measure profile fetch API
      const profileFetchTime = await PerformanceTestHelper.measureAPIResponseTime(
        page,
        '/api/user/profile'
      );
      
      expect(profileFetchTime).toBeLessThan(1500); // 1.5 seconds
      expect(profileFetchTime).toBeGreaterThan(0);
      
      console.log('Profile Fetch API Response Time:', profileFetchTime, 'ms');
    });

    test('Search API performance @performance @api', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login({
        email: 'complete.user@test.com',
        password: 'TestPassword123!'
      });
      
      // Measure search API performance
      const searchTime = await PerformanceTestHelper.measureAPIResponseTime(
        page,
        '/api/matches/search',
        'POST',
        {
          ageFrom: 25,
          ageTo: 35,
          location: 'Mumbai'
        }
      );
      
      if (searchTime > 0) {
        expect(searchTime).toBeLessThan(3000); // 3 seconds for search
        console.log('Search API Response Time:', searchTime, 'ms');
      }
    });
  });

  test.describe('User Journey Performance', () => {
    test('Complete registration flow performance @performance @journey', async ({ page }) => {
      const startTime = Date.now();
      
      // Registration journey
      await homePage.goto();
      const homeLoadTime = Date.now() - startTime;
      
      const signupStartTime = Date.now();
      await homePage.navigateToSignUp();
      const signupPageTime = Date.now() - signupStartTime;
      
      // Fill and submit signup form
      const formFillStartTime = Date.now();
      const testUser = {
        firstName: 'Performance',
        lastName: 'Test',
        email: 'performance.test@example.com',
        password: 'TestPassword123!',
        phone: '+919876543210',
        dateOfBirth: '1990-01-01',
        gender: 'male' as const
      };
      
      await TestHelpers.fillField(page, '[data-testid="firstName"]', testUser.firstName);
      await TestHelpers.fillField(page, '[data-testid="lastName"]', testUser.lastName);
      await TestHelpers.fillField(page, '[data-testid="email"]', testUser.email);
      await TestHelpers.fillField(page, '[data-testid="password"]', testUser.password);
      await TestHelpers.fillField(page, '[data-testid="confirmPassword"]', testUser.password);
      await page.check('[data-testid="terms"]');
      
      const submitStartTime = Date.now();
      await page.click('[data-testid="signup-button"]');
      await TestHelpers.waitForPageLoad(page);
      const submitTime = Date.now() - submitStartTime;
      
      const totalJourneyTime = Date.now() - startTime;
      
      // Performance assertions
      expect(homeLoadTime).toBeLessThan(5000); // 5 seconds
      expect(signupPageTime).toBeLessThan(3000); // 3 seconds
      expect(submitTime).toBeLessThan(5000); // 5 seconds
      expect(totalJourneyTime).toBeLessThan(15000); // 15 seconds total
      
      console.log('Registration Journey Performance:', {
        homeLoadTime,
        signupPageTime,
        submitTime,
        totalJourneyTime
      });
    });

    test('Complete profile creation performance @performance @journey', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login({
        email: 'incomplete.user@test.com',
        password: 'TestPassword123!'
      });
      
      const startTime = Date.now();
      await page.goto('/onboarding/user');
      await TestHelpers.waitForPageLoad(page);
      
      // Simulate filling all form steps
      const steps = ['personal', 'family', 'education', 'professional', 'health', 'expectations'];
      const stepTimes: number[] = [];
      
      for (let i = 0; i < steps.length; i++) {
        const stepStartTime = Date.now();
        
        // Fill current step (simplified)
        const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
        const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Submit")');
        
        if (i < steps.length - 1) {
          if (await nextButton.isVisible({ timeout: 1000 })) {
            await nextButton.click();
            await TestHelpers.waitForPageLoad(page);
          }
        } else {
          if (await submitButton.isVisible({ timeout: 1000 })) {
            await submitButton.click();
            await TestHelpers.waitForPageLoad(page);
          }
        }
        
        const stepTime = Date.now() - stepStartTime;
        stepTimes.push(stepTime);
        
        // Each step should complete quickly
        expect(stepTime).toBeLessThan(3000); // 3 seconds per step
      }
      
      const totalProfileTime = Date.now() - startTime;
      expect(totalProfileTime).toBeLessThan(20000); // 20 seconds total
      
      console.log('Profile Creation Performance:', {
        stepTimes,
        totalProfileTime,
        averageStepTime: stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length
      });
    });
  });

  test.describe('Resource Performance', () => {
    test('Image loading performance @performance @images', async ({ page }) => {
      await homePage.goto();
      await homePage.waitForPageLoad();
      
      // Get all images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        // Measure image load times
        const imageLoadPromises = [];
        
        for (let i = 0; i < imageCount; i++) {
          const image = images.nth(i);
          const promise = image.evaluate((img: HTMLImageElement) => {
            return new Promise((resolve) => {
              if (img.complete) {
                resolve(0);
              } else {
                const startTime = performance.now();
                img.onload = () => resolve(performance.now() - startTime);
                img.onerror = () => resolve(-1);
              }
            });
          });
          imageLoadPromises.push(promise);
        }
        
        const imageLoadTimes = await Promise.all(imageLoadPromises);
        const validLoadTimes = imageLoadTimes.filter(time => time >= 0);
        
        if (validLoadTimes.length > 0) {
          const averageImageLoadTime = validLoadTimes.reduce((a, b) => a + b, 0) / validLoadTimes.length;
          expect(averageImageLoadTime).toBeLessThan(2000); // 2 seconds average
          
          console.log('Image Performance:', {
            totalImages: imageCount,
            averageLoadTime: averageImageLoadTime,
            maxLoadTime: Math.max(...validLoadTimes),
            minLoadTime: Math.min(...validLoadTimes)
          });
        }
      }
    });

    test('JavaScript bundle performance @performance @javascript', async ({ page }) => {
      await homePage.goto();
      
      const resourceMetrics = await PerformanceTestHelper.getResourceMetrics(page);
      
      // JavaScript bundle should not be too large
      expect(resourceMetrics.scriptBytes).toBeLessThan(2 * 1024 * 1024); // 2MB
      
      // Check for render blocking
      const renderBlockingScripts = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script');
        let blockingCount = 0;
        
        scripts.forEach(script => {
          if (!script.async && !script.defer && script.src) {
            blockingCount++;
          }
        });
        
        return blockingCount;
      });
      
      // Minimize render blocking scripts
      expect(renderBlockingScripts).toBeLessThan(3);
      
      console.log('JavaScript Performance:', {
        scriptBytes: resourceMetrics.scriptBytes,
        renderBlockingScripts
      });
    });

    test('CSS performance @performance @css', async ({ page }) => {
      await homePage.goto();
      
      const resourceMetrics = await PerformanceTestHelper.getResourceMetrics(page);
      
      // CSS should be optimized
      expect(resourceMetrics.cssBytes).toBeLessThan(500 * 1024); // 500KB
      
      // Check for render blocking CSS
      const criticalCSS = await page.evaluate(() => {
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        return stylesheets.length;
      });
      
      // Should have reasonable number of CSS files
      expect(criticalCSS).toBeLessThan(10);
      
      console.log('CSS Performance:', {
        cssBytes: resourceMetrics.cssBytes,
        stylesheetCount: criticalCSS
      });
    });
  });

  test.describe('Mobile Performance', () => {
    test('Mobile homepage performance @performance @mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await homePage.goto();
      await homePage.waitForPageLoad();
      
      const loadTime = Date.now() - startTime;
      const metrics = await PerformanceTestHelper.getPerformanceMetrics(page);
      
      // Mobile should be slightly more lenient but still fast
      expect(loadTime).toBeLessThan(6000); // 6 seconds
      expect(metrics.firstContentfulPaint).toBeLessThan(2500); // 2.5 seconds
      
      console.log('Mobile Performance:', { loadTime, ...metrics });
    });

    test('Mobile form performance @performance @mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await loginPage.goto();
      await loginPage.login({
        email: 'incomplete.user@test.com',
        password: 'TestPassword123!'
      });
      
      const startTime = Date.now();
      await page.goto('/onboarding/user');
      await TestHelpers.waitForPageLoad(page);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5 seconds on mobile
      
      console.log('Mobile Form Performance:', { loadTime });
    });
  });

  test.describe('Performance Monitoring', () => {
    test('Memory usage monitoring @performance @memory', async ({ page }) => {
      await homePage.goto();
      
      // Monitor memory usage
      const memoryInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          return {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (memoryInfo) {
        // Memory usage should be reasonable
        const memoryUsageMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
        expect(memoryUsageMB).toBeLessThan(50); // 50MB
        
        console.log('Memory Usage:', {
          usedMB: memoryUsageMB,
          totalMB: memoryInfo.totalJSHeapSize / (1024 * 1024),
          limitMB: memoryInfo.jsHeapSizeLimit / (1024 * 1024)
        });
      }
    });

    test('Network usage monitoring @performance @network', async ({ page }) => {
      // Monitor network activity
      let requestCount = 0;
      let responseSize = 0;
      
      page.on('request', request => {
        requestCount++;
      });
      
      page.on('response', async response => {
        try {
          const headers = response.headers();
          const contentLength = headers['content-length'];
          if (contentLength) {
            responseSize += parseInt(contentLength, 10);
          }
        } catch (error) {
          // Ignore header parsing errors
        }
      });
      
      await homePage.goto();
      await homePage.waitForPageLoad();
      
      // Should not make excessive network requests
      expect(requestCount).toBeLessThan(50); // 50 requests
      
      // Total response size should be reasonable
      const responseSizeMB = responseSize / (1024 * 1024);
      expect(responseSizeMB).toBeLessThan(10); // 10MB
      
      console.log('Network Usage:', {
        requestCount,
        responseSizeMB
      });
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up performance monitoring
    try {
      await page.evaluate(() => {
        if (performance.clearMarks) {
          performance.clearMarks();
        }
        if (performance.clearMeasures) {
          performance.clearMeasures();
        }
      });
    } catch (error) {
      console.warn('Performance cleanup warning:', error);
    }
  });
});