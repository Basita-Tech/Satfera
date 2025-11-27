import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/helpers';
import { LoginPage } from '../pages/AuthPages';
import { BasePage } from '../pages/BasePage';

/**
 * User Browsing and Matchmaking Workflow E2E Tests
 * 
 * @description Tests complete matchmaking functionality including
 * profile browsing, search, filtering, matching algorithms,
 * interest expression, and communication features.
 * 
 * @tags @matchmaking @search @browse @communication
 */

class UserDashboardPage extends BasePage {
  constructor(page: any) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/userdashboard');
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.page.locator('[data-testid="dashboard"], .dashboard').waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  get profileCard() {
    return this.page.locator('[data-testid="profile-card"], .profile-card');
  }

  get searchButton() {
    return this.page.locator('[data-testid="search-button"], button:has-text("Search")');
  }

  get browseProfiles() {
    return this.page.locator('[data-testid="browse-profiles"], a:has-text("Browse")');
  }

  get matchesSection() {
    return this.page.locator('[data-testid="matches"], .matches');
  }

  get notificationsSection() {
    return this.page.locator('[data-testid="notifications"], .notifications');
  }
}

class SearchPage extends BasePage {
  constructor(page: any) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/search');
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.page.locator('[data-testid="search-form"], .search-form').waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  // Search filters
  get ageFromField() {
    return this.page.locator('[data-testid="age-from"], [name="ageFrom"]');
  }

  get ageToField() {
    return this.page.locator('[data-testid="age-to"], [name="ageTo"]');
  }

  get locationField() {
    return this.page.locator('[data-testid="location"], [name="location"]');
  }

  get religionField() {
    return this.page.locator('[data-testid="religion"], [name="religion"]');
  }

  get educationField() {
    return this.page.locator('[data-testid="education"], [name="education"]');
  }

  get occupationField() {
    return this.page.locator('[data-testid="occupation"], [name="occupation"]');
  }

  get searchButton() {
    return this.page.locator('[data-testid="search-submit"], button:has-text("Search")');
  }

  get clearFiltersButton() {
    return this.page.locator('[data-testid="clear-filters"], button:has-text("Clear")');
  }

  get searchResults() {
    return this.page.locator('[data-testid="search-results"], .search-results');
  }

  get resultCards() {
    return this.page.locator('[data-testid="profile-result"], .profile-result');
  }

  async searchWithFilters(filters: {
    ageFrom?: string;
    ageTo?: string;
    location?: string;
    religion?: string;
    education?: string;
    occupation?: string;
  }): Promise<void> {
    if (filters.ageFrom) {
      await this.fillField('[data-testid="age-from"]', filters.ageFrom);
    }
    
    if (filters.ageTo) {
      await this.fillField('[data-testid="age-to"]', filters.ageTo);
    }
    
    if (filters.location) {
      await this.fillField('[data-testid="location"]', filters.location);
    }
    
    if (filters.religion) {
      await this.selectDropdown('[data-testid="religion"]', filters.religion);
    }
    
    if (filters.education) {
      await this.selectDropdown('[data-testid="education"]', filters.education);
    }
    
    if (filters.occupation) {
      await this.selectDropdown('[data-testid="occupation"]', filters.occupation);
    }
    
    await this.searchButton.click();
    await this.waitForLoading();
  }

  async getSearchResultCount(): Promise<number> {
    await this.waitForLoading();
    return this.resultCards.count();
  }

  async viewProfile(index: number): Promise<void> {
    const profileCard = this.resultCards.nth(index);
    const viewButton = profileCard.locator('[data-testid="view-profile"], button:has-text("View Profile")');
    await viewButton.click();
    await this.waitForPageLoad();
  }

  async expressInterest(index: number): Promise<void> {
    const profileCard = this.resultCards.nth(index);
    const interestButton = profileCard.locator('[data-testid="express-interest"], button:has-text("Express Interest")');
    await interestButton.click();
    await this.waitForLoading();
  }

  async shortlistProfile(index: number): Promise<void> {
    const profileCard = this.resultCards.nth(index);
    const shortlistButton = profileCard.locator('[data-testid="shortlist"], button:has-text("Shortlist")');
    await shortlistButton.click();
    await this.waitForLoading();
  }
}

class ProfileViewPage extends BasePage {
  constructor(page: any) {
    super(page);
  }

  async goto(profileId: string): Promise<void> {
    await this.page.goto(`/profile/${profileId}`);
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.page.locator('[data-testid="profile-details"], .profile-details').waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  get profilePhoto() {
    return this.page.locator('[data-testid="profile-photo"], .profile-photo');
  }

  get personalDetails() {
    return this.page.locator('[data-testid="personal-details"], .personal-details');
  }

  get familyDetails() {
    return this.page.locator('[data-testid="family-details"], .family-details');
  }

  get educationDetails() {
    return this.page.locator('[data-testid="education-details"], .education-details');
  }

  get professionalDetails() {
    return this.page.locator('[data-testid="professional-details"], .professional-details');
  }

  get contactButton() {
    return this.page.locator('[data-testid="contact-profile"], button:has-text("Contact")');
  }

  get expressInterestButton() {
    return this.page.locator('[data-testid="express-interest"], button:has-text("Express Interest")');
  }

  get shortlistButton() {
    return this.page.locator('[data-testid="shortlist"], button:has-text("Shortlist")');
  }

  get reportButton() {
    return this.page.locator('[data-testid="report-profile"], button:has-text("Report")');
  }

  get backButton() {
    return this.page.locator('[data-testid="back"], button:has-text("Back")');
  }

  async expressInterest(): Promise<void> {
    await this.expressInterestButton.click();
    await this.waitForLoading();
  }

  async addToShortlist(): Promise<void> {
    await this.shortlistButton.click();
    await this.waitForLoading();
  }

  async contactProfile(): Promise<void> {
    await this.contactButton.click();
    await this.waitForPageLoad();
  }

  async reportProfile(reason: string): Promise<void> {
    await this.reportButton.click();
    
    // Select reason in modal
    const reasonSelect = this.page.locator('[data-testid="report-reason"], select[name="reason"]');
    if (await reasonSelect.isVisible({ timeout: 2000 })) {
      await reasonSelect.selectOption(reason);
      
      const submitReport = this.page.locator('[data-testid="submit-report"], button:has-text("Submit")');
      await submitReport.click();
      await this.waitForLoading();
    }
  }
}

test.describe('Matchmaking and Browse Workflow', () => {
  let loginPage: LoginPage;
  let dashboardPage: UserDashboardPage;
  let searchPage: SearchPage;
  let profileViewPage: ProfileViewPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new UserDashboardPage(page);
    searchPage = new SearchPage(page);
    profileViewPage = new ProfileViewPage(page);
    
    // Login first
    await loginPage.goto();
    await loginPage.login({
      email: 'complete.user@test.com',
      password: 'TestPassword123!'
    });
  });

  test.describe('User Dashboard', () => {
    test('Dashboard overview display @matchmaking @smoke @dashboard', async ({ page }) => {
      await dashboardPage.goto();
      await expect(dashboardPage.isLoaded()).resolves.toBe(true);
      
      // Verify dashboard elements
      await expect(dashboardPage.profileCard).toBeVisible();
      
      if (await dashboardPage.matchesSection.isVisible({ timeout: 5000 })) {
        await expect(dashboardPage.matchesSection).toBeVisible();
      }
      
      if (await dashboardPage.notificationsSection.isVisible({ timeout: 5000 })) {
        await expect(dashboardPage.notificationsSection).toBeVisible();
      }
      
      // Check for search functionality
      if (await dashboardPage.searchButton.isVisible({ timeout: 2000 })) {
        await expect(dashboardPage.searchButton).toBeEnabled();
      }
    });

    test('Profile completeness check @matchmaking @profile', async ({ page }) => {
      await dashboardPage.goto();
      
      // Check if profile completion indicator exists
      const completionIndicator = page.locator('[data-testid="profile-completion"], .profile-completion');
      
      if (await completionIndicator.isVisible({ timeout: 2000 })) {
        const completionText = await completionIndicator.textContent();
        expect(completionText).toMatch(/\d+%|\bcomplete\b/i);
      }
      
      // Check for incomplete profile warnings
      const warningMessage = page.locator('[data-testid="incomplete-warning"], .warning');
      
      if (await warningMessage.isVisible({ timeout: 2000 })) {
        await expect(warningMessage).toContainText(/complete.*profile|add.*details/i);
      }
    });

    test('Recent matches display @matchmaking @matches', async ({ page }) => {
      await dashboardPage.goto();
      
      const matchesSection = dashboardPage.matchesSection;
      
      if (await matchesSection.isVisible({ timeout: 5000 })) {
        // Check for match cards
        const matchCards = page.locator('[data-testid="match-card"], .match-card');
        const matchCount = await matchCards.count();
        
        if (matchCount > 0) {
          // Verify match card elements
          const firstMatch = matchCards.first();
          
          const photo = firstMatch.locator('[data-testid="match-photo"], img');
          const name = firstMatch.locator('[data-testid="match-name"], .name');
          const age = firstMatch.locator('[data-testid="match-age"], .age');
          
          await expect(photo).toBeVisible();
          await expect(name).toBeVisible();
          await expect(age).toBeVisible();
          
          console.log(`Found ${matchCount} matches on dashboard`);
        } else {
          // No matches case
          const noMatchesMessage = page.locator('[data-testid="no-matches"], .no-matches');
          if (await noMatchesMessage.isVisible({ timeout: 2000 })) {
            await expect(noMatchesMessage).toContainText(/no.*matches|find.*matches/i);
          }
        }
      }
    });
  });

  test.describe('Search Functionality', () => {
    test('Basic profile search @matchmaking @search @critical', async ({ page }) => {
      // Navigate to search page
      await dashboardPage.goto();
      
      if (await dashboardPage.browseProfiles.isVisible({ timeout: 5000 })) {
        await dashboardPage.browseProfiles.click();
      } else {
        await searchPage.goto();
      }
      
      await expect(searchPage.isLoaded()).resolves.toBe(true);
      
      // Perform basic search
      await searchPage.searchWithFilters({
        ageFrom: '25',
        ageTo: '35'
      });
      
      // Verify search results
      await expect(searchPage.searchResults).toBeVisible();
      
      const resultCount = await searchPage.getSearchResultCount();
      console.log(`Search returned ${resultCount} results`);
      
      if (resultCount > 0) {
        // Verify result structure
        const firstResult = searchPage.resultCards.first();
        
        const profilePhoto = firstResult.locator('[data-testid="result-photo"], img');
        const profileName = firstResult.locator('[data-testid="result-name"], .name');
        const profileAge = firstResult.locator('[data-testid="result-age"], .age');
        
        await expect(profilePhoto).toBeVisible();
        await expect(profileName).toBeVisible();
        await expect(profileAge).toBeVisible();
      } else {
        // No results case
        const noResults = page.locator('[data-testid="no-results"], .no-results');
        if (await noResults.isVisible({ timeout: 2000 })) {
          await expect(noResults).toContainText(/no.*profiles.*found|no.*results/i);
        }
      }
    });

    test('Advanced search filters @matchmaking @search @filters', async ({ page }) => {
      await searchPage.goto();
      
      // Test various filter combinations
      const filterCombinations = [
        {
          ageFrom: '25',
          ageTo: '30',
          religion: 'Hindu',
          education: 'Graduate'
        },
        {
          location: 'Mumbai',
          occupation: 'Engineer'
        },
        {
          ageFrom: '28',
          ageTo: '35',
          location: 'Delhi',
          religion: 'Christian'
        }
      ];
      
      for (const filters of filterCombinations) {
        await searchPage.searchWithFilters(filters);
        
        const resultCount = await searchPage.getSearchResultCount();
        console.log(`Filters ${JSON.stringify(filters)} returned ${resultCount} results`);
        
        // Clear filters for next test
        if (await searchPage.clearFiltersButton.isVisible({ timeout: 1000 })) {
          await searchPage.clearFiltersButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('Search result pagination @matchmaking @search @pagination', async ({ page }) => {
      await searchPage.goto();
      
      // Perform search that likely has many results
      await searchPage.searchWithFilters({
        ageFrom: '21',
        ageTo: '45'
      });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 10) {
        // Check for pagination controls
        const pagination = page.locator('[data-testid="pagination"], .pagination');
        
        if (await pagination.isVisible({ timeout: 3000 })) {
          const nextButton = page.locator('[data-testid="next-page"], button:has-text("Next")');
          const pageNumbers = page.locator('[data-testid="page-number"], .page-number');
          
          if (await nextButton.isVisible()) {
            await nextButton.click();
            await searchPage.waitForLoading();
            
            // Verify page changed
            const newResults = await searchPage.getSearchResultCount();
            expect(newResults).toBeGreaterThan(0);
          }
        }
      }
    });

    test('Search performance @matchmaking @search @performance', async ({ page }) => {
      await searchPage.goto();
      
      // Measure search performance
      const startTime = Date.now();
      
      await searchPage.searchWithFilters({
        ageFrom: '25',
        ageTo: '35',
        location: 'Mumbai'
      });
      
      const searchTime = Date.now() - startTime;
      
      // Search should complete within reasonable time
      expect(searchTime).toBeLessThan(5000); // 5 seconds
      
      console.log(`Search completed in ${searchTime}ms`);
    });
  });

  test.describe('Profile Viewing', () => {
    test('View detailed profile @matchmaking @profile @view', async ({ page }) => {
      await searchPage.goto();
      
      // Search for profiles
      await searchPage.searchWithFilters({
        ageFrom: '25',
        ageTo: '35'
      });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        // View first profile
        await searchPage.viewProfile(0);
        
        // Verify profile page loaded
        await expect(profileViewPage.isLoaded()).resolves.toBe(true);
        
        // Verify profile sections
        await expect(profileViewPage.personalDetails).toBeVisible();
        
        if (await profileViewPage.familyDetails.isVisible({ timeout: 2000 })) {
          await expect(profileViewPage.familyDetails).toBeVisible();
        }
        
        if (await profileViewPage.educationDetails.isVisible({ timeout: 2000 })) {
          await expect(profileViewPage.educationDetails).toBeVisible();
        }
        
        if (await profileViewPage.professionalDetails.isVisible({ timeout: 2000 })) {
          await expect(profileViewPage.professionalDetails).toBeVisible();
        }
        
        // Check action buttons
        await expect(profileViewPage.expressInterestButton).toBeVisible();
        
        if (await profileViewPage.shortlistButton.isVisible({ timeout: 2000 })) {
          await expect(profileViewPage.shortlistButton).toBeVisible();
        }
        
        if (await profileViewPage.contactButton.isVisible({ timeout: 2000 })) {
          await expect(profileViewPage.contactButton).toBeVisible();
        }
      } else {
        console.log('No profiles found to view');
      }
    });

    test('Profile photo gallery @matchmaking @profile @photos', async ({ page }) => {
      await searchPage.goto();
      await searchPage.searchWithFilters({ ageFrom: '25', ageTo: '35' });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        await searchPage.viewProfile(0);
        
        // Check photo gallery
        const photoGallery = page.locator('[data-testid="photo-gallery"], .photo-gallery');
        
        if (await photoGallery.isVisible({ timeout: 3000 })) {
          const photos = photoGallery.locator('img');
          const photoCount = await photos.count();
          
          if (photoCount > 1) {
            // Test photo navigation
            const nextPhoto = page.locator('[data-testid="next-photo"], button:has-text("Next")');
            const prevPhoto = page.locator('[data-testid="prev-photo"], button:has-text("Previous")');
            
            if (await nextPhoto.isVisible()) {
              await nextPhoto.click();
              await page.waitForTimeout(500);
            }
            
            // Test photo modal/lightbox
            const firstPhoto = photos.first();
            await firstPhoto.click();
            
            const photoModal = page.locator('[data-testid="photo-modal"], .photo-modal, .lightbox');
            if (await photoModal.isVisible({ timeout: 2000 })) {
              await expect(photoModal).toBeVisible();
              
              // Close modal
              const closeButton = page.locator('[data-testid="close-modal"], .close');
              if (await closeButton.isVisible()) {
                await closeButton.click();
              } else {
                await page.keyboard.press('Escape');
              }
            }
          }
        }
      }
    });
  });

  test.describe('Interest Expression', () => {
    test('Express interest in profile @matchmaking @interest @communication', async ({ page }) => {
      await searchPage.goto();
      await searchPage.searchWithFilters({ ageFrom: '25', ageTo: '35' });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        // Express interest from search results
        await searchPage.expressInterest(0);
        
        // Verify interest expressed
        await TestHelpers.waitForToast(page, 'Interest expressed successfully');
        
        // Button should change state
        const interestButton = searchPage.resultCards.first()
          .locator('[data-testid="express-interest"]');
        
        if (await interestButton.isVisible()) {
          const buttonText = await interestButton.textContent();
          expect(buttonText).toMatch(/sent|expressed/i);
        }
      }
    });

    test('Express interest from profile view @matchmaking @interest', async ({ page }) => {
      await searchPage.goto();
      await searchPage.searchWithFilters({ ageFrom: '25', ageTo: '35' });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        await searchPage.viewProfile(0);
        await profileViewPage.expressInterest();
        
        // Verify interest expressed
        await TestHelpers.waitForToast(page, 'Interest expressed successfully');
        
        // Button should change state
        const buttonText = await profileViewPage.expressInterestButton.textContent();
        expect(buttonText).toMatch(/sent|expressed/i);
      }
    });

    test('Shortlist profile @matchmaking @shortlist', async ({ page }) => {
      await searchPage.goto();
      await searchPage.searchWithFilters({ ageFrom: '25', ageTo: '35' });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        await searchPage.shortlistProfile(0);
        
        // Verify shortlist success
        await TestHelpers.waitForToast(page, 'Added to shortlist');
        
        // Check shortlist section in dashboard
        await dashboardPage.goto();
        
        const shortlistSection = page.locator('[data-testid="shortlist"], .shortlist');
        if (await shortlistSection.isVisible({ timeout: 3000 })) {
          const shortlistCount = await shortlistSection.locator('.profile-card').count();
          expect(shortlistCount).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Communication Features', () => {
    test('Contact profile @matchmaking @communication', async ({ page }) => {
      await searchPage.goto();
      await searchPage.searchWithFilters({ ageFrom: '25', ageTo: '35' });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        await searchPage.viewProfile(0);
        
        if (await profileViewPage.contactButton.isVisible({ timeout: 2000 })) {
          await profileViewPage.contactProfile();
          
          // Should navigate to contact/message page
          await expect(page).toHaveURL(/contact|message|chat/);
          
          // Verify contact form or chat interface
          const contactForm = page.locator('[data-testid="contact-form"], form');
          const chatInterface = page.locator('[data-testid="chat"], .chat');
          
          if (await contactForm.isVisible({ timeout: 2000 })) {
            await expect(contactForm).toBeVisible();
            
            const messageField = contactForm.locator('[data-testid="message"], textarea');
            const sendButton = contactForm.locator('[data-testid="send"], button:has-text("Send")');
            
            await expect(messageField).toBeVisible();
            await expect(sendButton).toBeVisible();
          } else if (await chatInterface.isVisible({ timeout: 2000 })) {
            await expect(chatInterface).toBeVisible();
          }
        }
      }
    });

    test('View notifications @matchmaking @notifications', async ({ page }) => {
      await dashboardPage.goto();
      
      const notificationsSection = dashboardPage.notificationsSection;
      
      if (await notificationsSection.isVisible({ timeout: 3000 })) {
        const notifications = notificationsSection.locator('[data-testid="notification"], .notification');
        const notificationCount = await notifications.count();
        
        if (notificationCount > 0) {
          // Check notification types
          const firstNotification = notifications.first();
          const notificationText = await firstNotification.textContent();
          
          // Should contain relevant notification content
          expect(notificationText).toMatch(/interest|message|view|contact/i);
          
          // Mark as read functionality
          const markReadButton = firstNotification.locator('[data-testid="mark-read"], button:has-text("Mark Read")');
          if (await markReadButton.isVisible({ timeout: 1000 })) {
            await markReadButton.click();
            await TestHelpers.waitForToast(page, 'Notification marked as read');
          }
        } else {
          const noNotifications = page.locator('[data-testid="no-notifications"], .no-notifications');
          if (await noNotifications.isVisible({ timeout: 2000 })) {
            await expect(noNotifications).toContainText(/no.*notifications|all.*caught.*up/i);
          }
        }
      }
    });
  });

  test.describe('Profile Management', () => {
    test('Report inappropriate profile @matchmaking @security @reporting', async ({ page }) => {
      await searchPage.goto();
      await searchPage.searchWithFilters({ ageFrom: '25', ageTo: '35' });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        await searchPage.viewProfile(0);
        
        if (await profileViewPage.reportButton.isVisible({ timeout: 2000 })) {
          await profileViewPage.reportProfile('Inappropriate content');
          
          // Verify report submitted
          await TestHelpers.waitForToast(page, 'Report submitted successfully');
          
          // Profile might be hidden from future searches
          await searchPage.goto();
          await searchPage.searchWithFilters({ ageFrom: '25', ageTo: '35' });
        }
      }
    });

    test('Block/Hide profile @matchmaking @privacy', async ({ page }) => {
      await searchPage.goto();
      await searchPage.searchWithFilters({ ageFrom: '25', ageTo: '35' });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        await searchPage.viewProfile(0);
        
        const blockButton = page.locator('[data-testid="block-profile"], button:has-text("Block")');
        const hideButton = page.locator('[data-testid="hide-profile"], button:has-text("Hide")');
        
        if (await blockButton.isVisible({ timeout: 2000 })) {
          await blockButton.click();
          
          // Confirm action
          const confirmButton = page.locator('[data-testid="confirm-block"], button:has-text("Confirm")');
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
            await TestHelpers.waitForToast(page, 'Profile blocked successfully');
          }
        } else if (await hideButton.isVisible({ timeout: 2000 })) {
          await hideButton.click();
          await TestHelpers.waitForToast(page, 'Profile hidden');
        }
      }
    });
  });

  test.describe('Matchmaking Algorithm', () => {
    test('Compatibility score display @matchmaking @algorithm', async ({ page }) => {
      await searchPage.goto();
      await searchPage.searchWithFilters({ ageFrom: '25', ageTo: '35' });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        // Check for compatibility scores in search results
        const compatibilityScores = page.locator('[data-testid="compatibility-score"], .compatibility-score');
        const scoreCount = await compatibilityScores.count();
        
        if (scoreCount > 0) {
          const firstScore = compatibilityScores.first();
          const scoreText = await firstScore.textContent();
          
          // Should display percentage or descriptive compatibility
          expect(scoreText).toMatch(/\d+%|high|medium|low|excellent|good/i);
          
          console.log(`Compatibility scores found: ${scoreCount}`);
        }
        
        // Check profile view for detailed compatibility
        await searchPage.viewProfile(0);
        
        const detailedCompatibility = page.locator('[data-testid="detailed-compatibility"], .detailed-compatibility');
        if (await detailedCompatibility.isVisible({ timeout: 3000 })) {
          const compatibilityBreakdown = detailedCompatibility.locator('[data-testid="compatibility-factor"], .compatibility-factor');
          const factorCount = await compatibilityBreakdown.count();
          
          if (factorCount > 0) {
            console.log(`Compatibility factors displayed: ${factorCount}`);
          }
        }
      }
    });

    test('Recommended matches @matchmaking @recommendations', async ({ page }) => {
      await dashboardPage.goto();
      
      // Check for recommended matches section
      const recommendedSection = page.locator('[data-testid="recommended"], .recommended');
      
      if (await recommendedSection.isVisible({ timeout: 3000 })) {
        const recommendedProfiles = recommendedSection.locator('[data-testid="recommended-profile"], .recommended-profile');
        const recommendedCount = await recommendedProfiles.count();
        
        if (recommendedCount > 0) {
          console.log(`Found ${recommendedCount} recommended matches`);
          
          // Verify recommendation quality indicators
          const firstRecommended = recommendedProfiles.first();
          const reasonText = firstRecommended.locator('[data-testid="recommendation-reason"], .recommendation-reason');
          
          if (await reasonText.isVisible({ timeout: 2000 })) {
            const reason = await reasonText.textContent();
            expect(reason).toMatch(/similar.*interests|location|education|profession/i);
          }
        }
      }
    });
  });

  test.describe('Mobile Matchmaking Experience', () => {
    test('Mobile search interface @matchmaking @mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await searchPage.goto();
      
      // Verify mobile-friendly interface
      await expect(searchPage.searchButton).toBeVisible();
      
      // Test mobile search
      await searchPage.searchWithFilters({
        ageFrom: '25',
        ageTo: '35'
      });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        // Verify mobile result cards
        const firstResult = searchPage.resultCards.first();
        await expect(firstResult).toBeVisible();
        
        // Test mobile profile view
        await searchPage.viewProfile(0);
        await expect(profileViewPage.isLoaded()).resolves.toBe(true);
      }
    });

    test('Mobile gesture interactions @matchmaking @mobile @gestures', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await searchPage.goto();
      await searchPage.searchWithFilters({ ageFrom: '25', ageTo: '35' });
      
      const resultCount = await searchPage.getSearchResultCount();
      
      if (resultCount > 0) {
        await searchPage.viewProfile(0);
        
        // Test swipe gestures for photo gallery (if implemented)
        const photoGallery = page.locator('[data-testid="photo-gallery"], .photo-gallery');
        
        if (await photoGallery.isVisible({ timeout: 2000 })) {
          // Simulate swipe left
          await photoGallery.dispatchEvent('touchstart', {
            touches: [{ clientX: 200, clientY: 200 }]
          });
          
          await photoGallery.dispatchEvent('touchmove', {
            touches: [{ clientX: 100, clientY: 200 }]
          });
          
          await photoGallery.dispatchEvent('touchend', {});
          
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up any actions performed during tests
    try {
      // Reset any filters or state changes
      const clearButton = page.locator('[data-testid="clear-filters"], button:has-text("Clear")');
      if (await clearButton.isVisible({ timeout: 1000 })) {
        await clearButton.click();
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });
});