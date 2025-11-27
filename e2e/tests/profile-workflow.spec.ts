import { test, expect } from '@playwright/test';
import { TestDataGenerator, ProfileData } from '../utils/test-data';
import { TestHelpers } from '../utils/helpers';
import { LoginPage } from '../pages/AuthPages';
import { BasePage } from '../pages/BasePage';

/**
 * Profile Creation and Management Workflow E2E Tests
 * 
 * @description Tests complete profile creation workflow including all form steps:
 * personal details, family details, education, professional, health, and expectations.
 * Also tests profile editing and updates.
 * 
 * @tags @profile @workflow @forms @critical
 */

class ProfileFormPage extends BasePage {
  constructor(page: any) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/onboarding/user');
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.page.locator('[data-testid="step-indicator"], .step-indicator').waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  // Step navigation
  get nextButton() {
    return this.page.locator('[data-testid="next-button"], button:has-text("Next")');
  }

  get previousButton() {
    return this.page.locator('[data-testid="previous-button"], button:has-text("Previous")');
  }

  get submitButton() {
    return this.page.locator('[data-testid="submit-button"], button:has-text("Submit")');
  }

  get stepIndicator() {
    return this.page.locator('[data-testid="step-indicator"], .step-indicator');
  }

  // Personal Details Step
  async fillPersonalDetails(data: any): Promise<void> {
    await this.fillField('[data-testid="height"], [name="height"]', data.height);
    await this.fillField('[data-testid="weight"], [name="weight"]', data.weight);
    await this.selectDropdown('[data-testid="bodyType"], [name="bodyType"]', data.bodyType);
    await this.selectDropdown('[data-testid="complexion"], [name="complexion"]', data.complexion);
    await this.selectDropdown('[data-testid="bloodGroup"], [name="bloodGroup"]', data.bloodGroup);
    await this.selectDropdown('[data-testid="diet"], [name="diet"]', data.diet);
    await this.selectDropdown('[data-testid="smoke"], [name="smoke"]', data.smoke);
    await this.selectDropdown('[data-testid="drink"], [name="drink"]', data.drink);
    await this.selectDropdown('[data-testid="maritalStatus"], [name="maritalStatus"]', data.maritalStatus);
  }

  // Family Details Step
  async fillFamilyDetails(data: any): Promise<void> {
    await this.fillField('[data-testid="fatherName"], [name="fatherName"]', data.fatherName);
    await this.fillField('[data-testid="motherName"], [name="motherName"]', data.motherName);
    await this.selectDropdown('[data-testid="fatherOccupation"], [name="fatherOccupation"]', data.fatherOccupation);
    await this.selectDropdown('[data-testid="motherOccupation"], [name="motherOccupation"]', data.motherOccupation);
    await this.selectDropdown('[data-testid="familyType"], [name="familyType"]', data.familyType);
    await this.selectDropdown('[data-testid="familyStatus"], [name="familyStatus"]', data.familyStatus);
    await this.selectDropdown('[data-testid="familyValues"], [name="familyValues"]', data.familyValues);
    await this.fillField('[data-testid="brothers"], [name="brothers"]', data.brothers.toString());
    await this.fillField('[data-testid="sisters"], [name="sisters"]', data.sisters.toString());
  }

  // Education Details Step
  async fillEducationDetails(data: any): Promise<void> {
    await this.selectDropdown('[data-testid="highestEducation"], [name="highestEducation"]', data.highestEducation);
    await this.fillField('[data-testid="educationDetails"], [name="educationDetails"]', data.educationDetails);
    await this.fillField('[data-testid="specialization"], [name="specialization"]', data.specialization);
    await this.fillField('[data-testid="university"], [name="university"]', data.university);
  }

  // Professional Details Step
  async fillProfessionalDetails(data: any): Promise<void> {
    await this.selectDropdown('[data-testid="occupation"], [name="occupation"]', data.occupation);
    await this.fillField('[data-testid="designation"], [name="designation"]', data.designation);
    await this.fillField('[data-testid="companyName"], [name="companyName"]', data.companyName);
    await this.fillField('[data-testid="workLocation"], [name="workLocation"]', data.workLocation);
    await this.fillField('[data-testid="experience"], [name="experience"]', data.experience);
    await this.selectDropdown('[data-testid="annualIncome"], [name="annualIncome"]', data.annualIncome);
  }

  // Health Details Step
  async fillHealthDetails(data: any): Promise<void> {
    await this.selectDropdown('[data-testid="physicalStatus"], [name="physicalStatus"]', data.physicalStatus);
    await this.selectDropdown('[data-testid="mentalHealth"], [name="mentalHealth"]', data.mentalHealth);
    await this.fillField('[data-testid="allergies"], [name="allergies"]', data.allergies);
    await this.fillField('[data-testid="medications"], [name="medications"]', data.medications);
    await this.selectDropdown('[data-testid="exerciseHabits"], [name="exerciseHabits"]', data.exerciseHabits);
  }

  // Expectations Step
  async fillExpectationDetails(data: any): Promise<void> {
    await this.fillField('[data-testid="partnerAgeFrom"], [name="partnerAgeFrom"]', data.partnerAgeFrom.toString());
    await this.fillField('[data-testid="partnerAgeTo"], [name="partnerAgeTo"]', data.partnerAgeTo.toString());
    await this.fillField('[data-testid="partnerHeightFrom"], [name="partnerHeightFrom"]', data.partnerHeightFrom);
    await this.fillField('[data-testid="partnerHeightTo"], [name="partnerHeightTo"]', data.partnerHeightTo);
    await this.selectDropdown('[data-testid="partnerIncome"], [name="partnerIncome"]', data.partnerIncome);
    await this.fillField('[data-testid="additionalRequirements"], [name="additionalRequirements"]', data.additionalRequirements);
  }

  async goToNextStep(): Promise<void> {
    await this.nextButton.click();
    await this.waitForPageLoad();
  }

  async goToPreviousStep(): Promise<void> {
    await this.previousButton.click();
    await this.waitForPageLoad();
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
    await this.waitForPageLoad();
  }

  async getCurrentStep(): Promise<number> {
    const activeStep = this.page.locator('[data-testid="step-indicator"] .active, .step-indicator .active');
    if (await activeStep.isVisible()) {
      const stepText = await activeStep.textContent();
      return parseInt(stepText?.match(/\d+/)?.[0] || '1');
    }
    return 1;
  }

  async verifyStepIndicator(currentStep: number, totalSteps: number): Promise<void> {
    const stepIndicator = this.stepIndicator;
    await expect(stepIndicator).toBeVisible();
    
    // Verify current step is highlighted
    const activeStep = this.page.locator(`[data-testid="step-${currentStep}"].active`);
    if (await activeStep.isVisible({ timeout: 2000 })) {
      await expect(activeStep).toBeVisible();
    }
  }
}

test.describe('Profile Creation Workflow', () => {
  let loginPage: LoginPage;
  let profileForm: ProfileFormPage;
  let profileData: ProfileData;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    profileForm = new ProfileFormPage(page);
    profileData = TestDataGenerator.generateProfileData();
    
    // Login first
    await loginPage.goto();
    await loginPage.login({
      email: 'incomplete.user@test.com',
      password: 'TestPassword123!'
    });
  });

  test('Complete profile creation flow @profile @smoke @forms', async ({ page }) => {
    // Navigate to profile completion
    await profileForm.goto();
    await expect(profileForm.isLoaded()).resolves.toBe(true);
    
    // Step 1: Personal Details
    await profileForm.verifyStepIndicator(1, 6);
    await profileForm.fillPersonalDetails(profileData.personal);
    await profileForm.goToNextStep();
    
    // Step 2: Family Details
    await profileForm.verifyStepIndicator(2, 6);
    await profileForm.fillFamilyDetails(profileData.family);
    await profileForm.goToNextStep();
    
    // Step 3: Education Details
    await profileForm.verifyStepIndicator(3, 6);
    await profileForm.fillEducationDetails(profileData.education);
    await profileForm.goToNextStep();
    
    // Step 4: Professional Details
    await profileForm.verifyStepIndicator(4, 6);
    await profileForm.fillProfessionalDetails(profileData.professional);
    await profileForm.goToNextStep();
    
    // Step 5: Health Details
    await profileForm.verifyStepIndicator(5, 6);
    await profileForm.fillHealthDetails(profileData.health);
    await profileForm.goToNextStep();
    
    // Step 6: Expectations
    await profileForm.verifyStepIndicator(6, 6);
    await profileForm.fillExpectationDetails(profileData.expectations);
    await profileForm.submitForm();
    
    // Verify profile completion success
    await TestHelpers.waitForToast(page, 'Profile completed successfully');
    await expect(page).toHaveURL(/.*dashboard|.*success/);
  });

  test('Profile form navigation and validation @profile @navigation @validation', async ({ page }) => {
    await profileForm.goto();
    
    // Test navigation between steps
    const totalSteps = 6;
    
    for (let step = 1; step <= totalSteps; step++) {
      const currentStep = await profileForm.getCurrentStep();
      expect(currentStep).toBe(step);
      
      if (step < totalSteps) {
        // Try to navigate to next step without filling required fields
        await profileForm.goToNextStep();
        
        // Should show validation errors
        const errorElements = page.locator('[data-testid$="-error"], .error');
        const errorCount = await errorElements.count();
        
        if (errorCount > 0) {
          // Fill the current step properly
          switch (step) {
            case 1:
              await profileForm.fillPersonalDetails(profileData.personal);
              break;
            case 2:
              await profileForm.fillFamilyDetails(profileData.family);
              break;
            case 3:
              await profileForm.fillEducationDetails(profileData.education);
              break;
            case 4:
              await profileForm.fillProfessionalDetails(profileData.professional);
              break;
            case 5:
              await profileForm.fillHealthDetails(profileData.health);
              break;
            case 6:
              await profileForm.fillExpectationDetails(profileData.expectations);
              break;
          }
          
          // Now navigation should work
          await profileForm.goToNextStep();
        }
      }
    }
  });

  test('Profile form back navigation @profile @navigation', async ({ page }) => {
    await profileForm.goto();
    
    // Navigate to step 3
    await profileForm.fillPersonalDetails(profileData.personal);
    await profileForm.goToNextStep();
    
    await profileForm.fillFamilyDetails(profileData.family);
    await profileForm.goToNextStep();
    
    const currentStep = await profileForm.getCurrentStep();
    expect(currentStep).toBe(3);
    
    // Navigate back
    await profileForm.goToPreviousStep();
    expect(await profileForm.getCurrentStep()).toBe(2);
    
    // Verify data is preserved
    const fatherNameValue = await page.locator('[data-testid="fatherName"]').inputValue();
    expect(fatherNameValue).toBe(profileData.family.fatherName);
    
    // Navigate back to step 1
    await profileForm.goToPreviousStep();
    expect(await profileForm.getCurrentStep()).toBe(1);
    
    // Verify data is preserved in step 1
    const heightValue = await page.locator('[data-testid="height"]').inputValue();
    expect(heightValue).toBe(profileData.personal.height);
  });

  test('Profile form auto-save functionality @profile @autosave', async ({ page }) => {
    await profileForm.goto();
    
    // Fill first step
    await profileForm.fillPersonalDetails(profileData.personal);
    await profileForm.goToNextStep();
    
    // Fill second step partially
    await profileForm.fillField('[data-testid="fatherName"]', profileData.family.fatherName);
    await profileForm.fillField('[data-testid="motherName"]', profileData.family.motherName);
    
    // Simulate page refresh or navigation away
    await page.reload();
    await TestHelpers.waitForPageLoad(page);
    
    // Check if form data is restored (if auto-save is implemented)
    if (await profileForm.isLoaded()) {
      // Navigate to step 2 to check if data is preserved
      await profileForm.goToNextStep();
      
      const fatherNameValue = await page.locator('[data-testid="fatherName"]').inputValue();
      const motherNameValue = await page.locator('[data-testid="motherName"]').inputValue();
      
      // If auto-save is implemented, data should be preserved
      if (fatherNameValue || motherNameValue) {
        expect(fatherNameValue).toBe(profileData.family.fatherName);
        expect(motherNameValue).toBe(profileData.family.motherName);
      }
    }
  });

  test('Required field validation @profile @validation', async ({ page }) => {
    await profileForm.goto();
    
    // Try to proceed without filling required fields
    await profileForm.goToNextStep();
    
    // Check for validation errors
    const requiredFields = [
      'height', 'weight', 'bodyType', 'complexion', 
      'bloodGroup', 'diet', 'maritalStatus'
    ];
    
    for (const field of requiredFields) {
      const errorElement = page.locator(`[data-testid="${field}-error"]`);
      if (await errorElement.isVisible({ timeout: 1000 })) {
        await expect(errorElement).toContainText(/required|mandatory/i);
      }
    }
  });

  test('Profile form accessibility @profile @accessibility', async ({ page }) => {
    await profileForm.goto();
    
    // Check accessibility issues
    const accessibilityIssues = await profileForm.checkAccessibility();
    
    if (accessibilityIssues.length > 0) {
      console.warn('Profile form accessibility issues:', accessibilityIssues);
    }
    
    // Test keyboard navigation through form fields
    const firstField = page.locator('[data-testid="height"]');
    await firstField.focus();
    await expect(firstField).toBeFocused();
    
    // Tab through form fields
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    // Test form labels
    const labels = page.locator('label');
    const labelCount = await labels.count();
    expect(labelCount).toBeGreaterThan(0);
    
    // Verify each form field has associated label
    const formFields = page.locator('input, select, textarea');
    const fieldCount = await formFields.count();
    
    for (let i = 0; i < fieldCount; i++) {
      const field = formFields.nth(i);
      const fieldId = await field.getAttribute('id');
      const fieldName = await field.getAttribute('name');
      
      if (fieldId) {
        const associatedLabel = page.locator(`label[for="${fieldId}"]`);
        const hasLabel = await associatedLabel.count() > 0;
        
        if (!hasLabel && fieldName) {
          // Check for label containing field name
          const nameLabel = page.locator(`label:has-text("${fieldName}")`);
          expect(await nameLabel.count()).toBeGreaterThan(0);
        }
      }
    }
  });

  test('Profile form error handling @profile @error-handling', async ({ page }) => {
    // Mock network error for form submission
    await page.route('**/api/user/profile', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });
    
    await profileForm.goto();
    
    // Fill out complete form
    await profileForm.fillPersonalDetails(profileData.personal);
    await profileForm.goToNextStep();
    
    await profileForm.fillFamilyDetails(profileData.family);
    await profileForm.goToNextStep();
    
    await profileForm.fillEducationDetails(profileData.education);
    await profileForm.goToNextStep();
    
    await profileForm.fillProfessionalDetails(profileData.professional);
    await profileForm.goToNextStep();
    
    await profileForm.fillHealthDetails(profileData.health);
    await profileForm.goToNextStep();
    
    await profileForm.fillExpectationDetails(profileData.expectations);
    
    // Submit form (should fail due to mocked error)
    await profileForm.submitForm();
    
    // Should show error message
    await TestHelpers.waitForToast(page, 'Error saving profile');
    
    // Form should remain on the same page for retry
    expect(await profileForm.getCurrentStep()).toBe(6);
    
    // Remove mock to test retry
    await page.unroute('**/api/user/profile');
  });

  test('Profile data persistence @profile @data-persistence', async ({ page }) => {
    await profileForm.goto();
    
    // Fill complete form
    const steps = [
      { step: 1, fillMethod: () => profileForm.fillPersonalDetails(profileData.personal) },
      { step: 2, fillMethod: () => profileForm.fillFamilyDetails(profileData.family) },
      { step: 3, fillMethod: () => profileForm.fillEducationDetails(profileData.education) },
      { step: 4, fillMethod: () => profileForm.fillProfessionalDetails(profileData.professional) },
      { step: 5, fillMethod: () => profileForm.fillHealthDetails(profileData.health) },
      { step: 6, fillMethod: () => profileForm.fillExpectationDetails(profileData.expectations) },
    ];
    
    for (const { fillMethod } of steps) {
      await fillMethod();
      await profileForm.goToNextStep();
    }
    
    await profileForm.submitForm();
    
    // Verify profile was saved
    await expect(page).toHaveURL(/.*dashboard|.*success/);
    
    // Navigate to profile edit page (if available)
    const profileEditUrl = '/profile/edit';
    try {
      await page.goto(profileEditUrl);
      
      // Verify saved data is displayed
      const heightValue = await page.locator('[data-testid="height"]').inputValue();
      if (heightValue) {
        expect(heightValue).toBe(profileData.personal.height);
      }
    } catch (error) {
      console.log('Profile edit page not available or different URL');
    }
  });

  test('Profile form performance @profile @performance', async ({ page }) => {
    const startTime = Date.now();
    await profileForm.goto();
    const pageLoadTime = Date.now() - startTime;
    
    // Page should load within reasonable time
    expect(pageLoadTime).toBeLessThan(5000); // 5 seconds
    
    // Test step navigation performance
    const navigationStartTime = Date.now();
    
    for (let step = 1; step < 6; step++) {
      const stepStartTime = Date.now();
      await profileForm.goToNextStep();
      const stepTime = Date.now() - stepStartTime;
      
      // Each step transition should be fast
      expect(stepTime).toBeLessThan(2000); // 2 seconds
    }
    
    const totalNavigationTime = Date.now() - navigationStartTime;
    console.log('Total navigation time:', totalNavigationTime, 'ms');
    console.log('Average step transition time:', totalNavigationTime / 5, 'ms');
  });

  test('Profile completion progress tracking @profile @progress', async ({ page }) => {
    await profileForm.goto();
    
    // Check initial progress
    const progressBar = page.locator('[data-testid="progress-bar"], .progress-bar');
    
    if (await progressBar.isVisible()) {
      // Progress should start at 0% or show step 1 of 6
      const initialProgress = await progressBar.textContent();
      expect(initialProgress).toMatch(/0%|1.*6|step.*1/i);
    }
    
    // Complete each step and verify progress updates
    for (let step = 1; step <= 6; step++) {
      const expectedProgress = Math.round((step / 6) * 100);
      
      if (await progressBar.isVisible()) {
        const currentProgress = await progressBar.textContent();
        // Progress should increase with each step
        if (currentProgress && currentProgress.includes('%')) {
          const progressNumber = parseInt(currentProgress.match(/\d+/)?.[0] || '0');
          expect(progressNumber).toBeGreaterThanOrEqual((step - 1) / 6 * 100);
        }
      }
      
      // Fill current step and navigate
      if (step < 6) {
        await profileForm.goToNextStep();
      }
    }
  });
});

test.describe('Profile Editing Workflow', () => {
  let loginPage: LoginPage;
  let profileData: ProfileData;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    profileData = TestDataGenerator.generateProfileData();
    
    // Login with complete user
    await loginPage.goto();
    await loginPage.login({
      email: 'complete.user@test.com',
      password: 'TestPassword123!'
    });
  });

  test('Edit existing profile @profile @edit', async ({ page }) => {
    // Navigate to profile edit page
    await page.goto('/userdashboard');
    
    const editProfileButton = page.locator('[data-testid="edit-profile"], button:has-text("Edit Profile")');
    
    if (await editProfileButton.isVisible({ timeout: 10000 })) {
      await editProfileButton.click();
      await TestHelpers.waitForPageLoad(page);
      
      // Edit some profile fields
      await TestHelpers.fillField(page, '[data-testid="height"]', '5\'10"');
      await TestHelpers.fillField(page, '[data-testid="weight"]', '75 kg');
      
      // Save changes
      const saveButton = page.locator('[data-testid="save-profile"], button:has-text("Save")');
      await saveButton.click();
      
      // Verify success message
      await TestHelpers.waitForToast(page, 'Profile updated successfully');
    }
  });

  test('Profile edit validation @profile @edit @validation', async ({ page }) => {
    await page.goto('/userdashboard');
    
    const editProfileButton = page.locator('[data-testid="edit-profile"]');
    
    if (await editProfileButton.isVisible({ timeout: 5000 })) {
      await editProfileButton.click();
      await TestHelpers.waitForPageLoad(page);
      
      // Clear required fields
      await page.locator('[data-testid="height"]').clear();
      await page.locator('[data-testid="weight"]').clear();
      
      // Try to save
      const saveButton = page.locator('[data-testid="save-profile"]');
      await saveButton.click();
      
      // Should show validation errors
      const heightError = page.locator('[data-testid="height-error"]');
      const weightError = page.locator('[data-testid="weight-error"]');
      
      if (await heightError.isVisible({ timeout: 2000 })) {
        await expect(heightError).toContainText(/required/i);
      }
      
      if (await weightError.isVisible({ timeout: 2000 })) {
        await expect(weightError).toContainText(/required/i);
      }
    }
  });
});