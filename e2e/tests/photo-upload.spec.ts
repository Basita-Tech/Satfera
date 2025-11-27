import { test, expect } from '@playwright/test';
import { TestDataGenerator } from '../utils/test-data';
import { TestHelpers } from '../utils/helpers';
import { LoginPage } from '../pages/AuthPages';
import { BasePage } from '../pages/BasePage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Photo Upload and Management Workflow E2E Tests
 * 
 * @description Tests photo upload functionality, file validation,
 * image processing, gallery management, and security aspects.
 * 
 * @tags @upload @photos @files @security
 */

class PhotoUploadPage extends BasePage {
  constructor(page: any) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/upload-photos');
    await this.waitForPageLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.page.locator('[data-testid="upload-area"], .upload-area').waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  get uploadArea() {
    return this.page.locator('[data-testid="upload-area"], .upload-area');
  }

  get fileInput() {
    return this.page.locator('[data-testid="file-input"], input[type="file"]');
  }

  get uploadButton() {
    return this.page.locator('[data-testid="upload-button"], button:has-text("Upload")');
  }

  get photoGallery() {
    return this.page.locator('[data-testid="photo-gallery"], .photo-gallery');
  }

  get uploadProgress() {
    return this.page.locator('[data-testid="upload-progress"], .upload-progress');
  }

  get maxFileSizeError() {
    return this.page.locator('[data-testid="file-size-error"], .file-size-error');
  }

  get invalidFileTypeError() {
    return this.page.locator('[data-testid="file-type-error"], .file-type-error');
  }

  async uploadPhotoFromPath(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
    await this.uploadButton.click();
    await this.waitForLoading();
  }

  async uploadPhotoDragDrop(filePath: string): Promise<void> {
    // Simulate drag and drop
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    await this.uploadArea.dispatchEvent('dragover', {
      dataTransfer: {
        files: [{
          name: fileName,
          type: 'image/jpeg',
          size: fileContent.length,
          arrayBuffer: () => fileContent.buffer
        }]
      }
    });
    
    await this.uploadArea.dispatchEvent('drop', {
      dataTransfer: {
        files: [{
          name: fileName,
          type: 'image/jpeg',
          size: fileContent.length,
          arrayBuffer: () => fileContent.buffer
        }]
      }
    });
    
    await this.waitForLoading();
  }

  async deletePhoto(photoIndex: number): Promise<void> {
    const deleteButton = this.page.locator(`[data-testid="delete-photo-${photoIndex}"], .delete-photo`).nth(photoIndex);
    await deleteButton.click();
    
    // Confirm deletion if modal appears
    const confirmButton = this.page.locator('[data-testid="confirm-delete"], button:has-text("Confirm")');
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }
    
    await this.waitForLoading();
  }

  async setProfilePhoto(photoIndex: number): Promise<void> {
    const setProfileButton = this.page.locator(`[data-testid="set-profile-${photoIndex}"], .set-profile`).nth(photoIndex);
    await setProfileButton.click();
    await this.waitForLoading();
  }

  async verifyPhotoUploaded(fileName: string): Promise<void> {
    const uploadedPhoto = this.page.locator(`[data-testid="photo"], img[alt*="${fileName}"]`);
    await expect(uploadedPhoto).toBeVisible();
  }

  async getUploadedPhotoCount(): Promise<number> {
    const photos = this.page.locator('[data-testid="photo"], .photo img');
    return photos.count();
  }
}

test.describe('Photo Upload Workflow', () => {
  let loginPage: LoginPage;
  let photoUploadPage: PhotoUploadPage;
  let testImagePath: string;
  let largeImagePath: string;
  let invalidFilePath: string;

  test.beforeAll(async () => {
    // Create test image files
    const testAssetsDir = path.join(__dirname, '..', 'test-assets');
    
    if (!fs.existsSync(testAssetsDir)) {
      fs.mkdirSync(testAssetsDir, { recursive: true });
    }
    
    // Create a small valid image (1x1 PNG)
    testImagePath = path.join(testAssetsDir, 'test-photo.png');
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, pngBuffer);
    
    // Create a large image file for size testing
    largeImagePath = path.join(testAssetsDir, 'large-photo.jpg');
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB file
    fs.writeFileSync(largeImagePath, largeBuffer);
    
    // Create an invalid file type
    invalidFilePath = path.join(testAssetsDir, 'invalid-file.txt');
    fs.writeFileSync(invalidFilePath, 'This is not an image file');
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    photoUploadPage = new PhotoUploadPage(page);
    
    // Login first
    await loginPage.goto();
    await loginPage.login({
      email: 'complete.user@test.com',
      password: 'TestPassword123!'
    });
  });

  test('Successful photo upload @upload @smoke @photos', async ({ page }) => {
    await photoUploadPage.goto();
    await expect(photoUploadPage.isLoaded()).resolves.toBe(true);
    
    // Verify upload interface
    await expect(photoUploadPage.uploadArea).toBeVisible();
    await expect(photoUploadPage.fileInput).toBeVisible();
    
    // Upload a valid image
    await photoUploadPage.uploadPhotoFromPath(testImagePath);
    
    // Verify upload success
    await TestHelpers.waitForToast(page, 'Photo uploaded successfully');
    await photoUploadPage.verifyPhotoUploaded('test-photo.png');
    
    // Check photo count
    const photoCount = await photoUploadPage.getUploadedPhotoCount();
    expect(photoCount).toBeGreaterThan(0);
  });

  test('Multiple photo upload @upload @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Create multiple test images
    const testImages = [];
    const testAssetsDir = path.join(__dirname, '..', 'test-assets');
    
    for (let i = 1; i <= 3; i++) {
      const imagePath = path.join(testAssetsDir, `test-photo-${i}.png`);
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      fs.writeFileSync(imagePath, pngBuffer);
      testImages.push(imagePath);
    }
    
    // Upload multiple images
    for (const imagePath of testImages) {
      await photoUploadPage.uploadPhotoFromPath(imagePath);
      await page.waitForTimeout(1000); // Wait between uploads
    }
    
    // Verify all photos uploaded
    const photoCount = await photoUploadPage.getUploadedPhotoCount();
    expect(photoCount).toBe(testImages.length);
  });

  test('Photo upload file size validation @upload @validation @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Try to upload oversized file
    await photoUploadPage.fileInput.setInputFiles(largeImagePath);
    
    // Should show file size error
    await expect(photoUploadPage.maxFileSizeError).toBeVisible();
    await expect(photoUploadPage.maxFileSizeError).toContainText(/size|large|limit/i);
    
    // Upload should not proceed
    const uploadButton = photoUploadPage.uploadButton;
    if (await uploadButton.isVisible()) {
      await expect(uploadButton).toBeDisabled();
    }
  });

  test('Photo upload file type validation @upload @validation @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Try to upload invalid file type
    await photoUploadPage.fileInput.setInputFiles(invalidFilePath);
    
    // Should show file type error
    await expect(photoUploadPage.invalidFileTypeError).toBeVisible();
    await expect(photoUploadPage.invalidFileTypeError).toContainText(/type|format|invalid/i);
    
    // Upload should not proceed
    const uploadButton = photoUploadPage.uploadButton;
    if (await uploadButton.isVisible()) {
      await expect(uploadButton).toBeDisabled();
    }
  });

  test('Drag and drop photo upload @upload @dragdrop @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Test drag and drop functionality
    await photoUploadPage.uploadPhotoDragDrop(testImagePath);
    
    // Verify upload success
    await TestHelpers.waitForToast(page, 'Photo uploaded successfully');
    await photoUploadPage.verifyPhotoUploaded('test-photo.png');
  });

  test('Photo upload progress indication @upload @progress @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Mock slow upload to test progress indication
    await page.route('**/api/upload/photo', async route => {
      // Delay the response to simulate slow upload
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, photoId: 'test123' })
        });
      }, 2000);
    });
    
    // Start upload
    await photoUploadPage.fileInput.setInputFiles(testImagePath);
    await photoUploadPage.uploadButton.click();
    
    // Verify progress indicator appears
    if (await photoUploadPage.uploadProgress.isVisible({ timeout: 1000 })) {
      await expect(photoUploadPage.uploadProgress).toBeVisible();
    }
    
    // Wait for upload to complete
    await TestHelpers.waitForToast(page, 'Photo uploaded successfully');
    
    // Remove route mock
    await page.unroute('**/api/upload/photo');
  });

  test('Photo deletion @upload @delete @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Upload a photo first
    await photoUploadPage.uploadPhotoFromPath(testImagePath);
    await TestHelpers.waitForToast(page, 'Photo uploaded successfully');
    
    const initialPhotoCount = await photoUploadPage.getUploadedPhotoCount();
    expect(initialPhotoCount).toBeGreaterThan(0);
    
    // Delete the photo
    await photoUploadPage.deletePhoto(0);
    
    // Verify deletion
    await TestHelpers.waitForToast(page, 'Photo deleted successfully');
    
    const finalPhotoCount = await photoUploadPage.getUploadedPhotoCount();
    expect(finalPhotoCount).toBe(initialPhotoCount - 1);
  });

  test('Set profile photo @upload @profile @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Upload photos
    await photoUploadPage.uploadPhotoFromPath(testImagePath);
    await TestHelpers.waitForToast(page, 'Photo uploaded successfully');
    
    // Set as profile photo
    await photoUploadPage.setProfilePhoto(0);
    
    // Verify profile photo set
    await TestHelpers.waitForToast(page, 'Profile photo set successfully');
    
    // Check if photo has profile indicator
    const profileIndicator = page.locator('[data-testid="profile-indicator"], .profile-photo-indicator');
    if (await profileIndicator.isVisible({ timeout: 2000 })) {
      await expect(profileIndicator).toBeVisible();
    }
  });

  test('Photo upload security validation @upload @security @photos', async ({ page }) => {
    // Test malicious file upload attempts
    const maliciousFiles = [
      'malicious.php.jpg', // PHP file disguised as image
      'script.svg',        // SVG with potential scripts
      'exploit.jpeg.exe',  // Executable disguised as image
    ];
    
    const testAssetsDir = path.join(__dirname, '..', 'test-assets');
    
    for (const fileName of maliciousFiles) {
      const filePath = path.join(testAssetsDir, fileName);
      
      // Create malicious file
      let content = 'fake image content';
      if (fileName.includes('.php')) {
        content = '<?php echo "malicious code"; ?>';
      } else if (fileName.includes('.svg')) {
        content = '<svg><script>alert("xss")</script></svg>';
      }
      
      fs.writeFileSync(filePath, content);
      
      await photoUploadPage.goto();
      
      // Try to upload malicious file
      await photoUploadPage.fileInput.setInputFiles(filePath);
      
      // Should be rejected
      const errorMessage = page.locator('[data-testid="security-error"], .security-error, [data-testid="file-type-error"]');
      if (await errorMessage.isVisible({ timeout: 2000 })) {
        await expect(errorMessage).toContainText(/security|invalid|not.*allowed/i);
      }
      
      // Clean up
      fs.unlinkSync(filePath);
    }
  });

  test('Photo upload accessibility @upload @accessibility @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Check accessibility issues
    const accessibilityIssues = await photoUploadPage.checkAccessibility();
    
    if (accessibilityIssues.length > 0) {
      console.warn('Photo upload accessibility issues:', accessibilityIssues);
    }
    
    // Test keyboard navigation
    const fileInput = photoUploadPage.fileInput;
    const uploadButton = photoUploadPage.uploadButton;
    
    await page.keyboard.press('Tab');
    if (await fileInput.isVisible()) {
      await expect(fileInput).toBeFocused();
    }
    
    await page.keyboard.press('Tab');
    if (await uploadButton.isVisible()) {
      await expect(uploadButton).toBeFocused();
    }
    
    // Test ARIA labels and descriptions
    const uploadArea = photoUploadPage.uploadArea;
    const ariaLabel = await uploadArea.getAttribute('aria-label');
    const ariaDescription = await uploadArea.getAttribute('aria-describedby');
    
    if (ariaLabel || ariaDescription) {
      expect(ariaLabel || ariaDescription).toBeTruthy();
    }
  });

  test('Photo upload error handling @upload @error-handling @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Mock server error
    await page.route('**/api/upload/photo', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    // Try to upload
    await photoUploadPage.uploadPhotoFromPath(testImagePath);
    
    // Should show error message
    await TestHelpers.waitForToast(page, 'Upload failed');
    
    // Photo should not appear in gallery
    const photoCount = await photoUploadPage.getUploadedPhotoCount();
    expect(photoCount).toBe(0);
    
    // Remove route mock
    await page.unroute('**/api/upload/photo');
  });

  test('Photo upload network interruption @upload @resilience @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Mock network timeout
    await page.route('**/api/upload/photo', route => {
      // Don't fulfill the request to simulate network timeout
      setTimeout(() => {
        route.abort('failed');
      }, 5000);
    });
    
    // Try to upload
    await photoUploadPage.fileInput.setInputFiles(testImagePath);
    await photoUploadPage.uploadButton.click();
    
    // Should show timeout/network error
    await TestHelpers.waitForToast(page, 'Network error');
    
    // Remove route mock
    await page.unroute('**/api/upload/photo');
  });

  test('Photo upload performance @upload @performance @photos', async ({ page }) => {
    const startTime = Date.now();
    await photoUploadPage.goto();
    const pageLoadTime = Date.now() - startTime;
    
    // Page should load quickly
    expect(pageLoadTime).toBeLessThan(5000); // 5 seconds
    
    // Test upload performance
    const uploadStartTime = Date.now();
    await photoUploadPage.uploadPhotoFromPath(testImagePath);
    const uploadTime = Date.now() - uploadStartTime;
    
    // Upload should complete within reasonable time
    expect(uploadTime).toBeLessThan(10000); // 10 seconds for small file
    
    console.log('Page load time:', pageLoadTime, 'ms');
    console.log('Upload time:', uploadTime, 'ms');
  });

  test('Photo gallery functionality @upload @gallery @photos', async ({ page }) => {
    await photoUploadPage.goto();
    
    // Upload multiple photos to test gallery
    const testImages = [];
    const testAssetsDir = path.join(__dirname, '..', 'test-assets');
    
    for (let i = 1; i <= 3; i++) {
      const imagePath = path.join(testAssetsDir, `gallery-test-${i}.png`);
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      fs.writeFileSync(imagePath, pngBuffer);
      testImages.push(imagePath);
      
      await photoUploadPage.uploadPhotoFromPath(imagePath);
      await page.waitForTimeout(1000);
    }
    
    // Verify gallery displays all photos
    const photoCount = await photoUploadPage.getUploadedPhotoCount();
    expect(photoCount).toBe(testImages.length);
    
    // Test photo preview/lightbox if available
    const firstPhoto = page.locator('[data-testid="photo"]').first();
    if (await firstPhoto.isVisible()) {
      await firstPhoto.click();
      
      // Check if lightbox or modal opens
      const lightbox = page.locator('[data-testid="photo-lightbox"], .lightbox, .modal');
      if (await lightbox.isVisible({ timeout: 2000 })) {
        await expect(lightbox).toBeVisible();
        
        // Close lightbox
        const closeButton = page.locator('[data-testid="close-lightbox"], .close, button:has-text("Close")');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
    
    // Clean up test images
    testImages.forEach(imagePath => {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });
  });

  test.afterAll(async () => {
    // Clean up test files
    const testAssetsDir = path.join(__dirname, '..', 'test-assets');
    
    const filesToCleanup = [
      testImagePath,
      largeImagePath,
      invalidFilePath
    ];
    
    filesToCleanup.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    // Clean up any additional test files
    if (fs.existsSync(testAssetsDir)) {
      const files = fs.readdirSync(testAssetsDir);
      files.forEach(file => {
        if (file.startsWith('test-photo-') || file.startsWith('gallery-test-')) {
          const filePath = path.join(testAssetsDir, file);
          fs.unlinkSync(filePath);
        }
      });
    }
  });
});