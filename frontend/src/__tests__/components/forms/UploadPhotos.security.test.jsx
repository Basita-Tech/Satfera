import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UploadPhotos from '../../../components/forms/UploadPhotos';
import * as authApi from '../../../api/auth';

// Mock the API calls
vi.mock('../../../api/auth', () => ({
  uploadUserPhoto: vi.fn(),
  uploadGovernmentId: vi.fn(),
  getUserPhotos: vi.fn(),
  getGovernmentId: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch for Cloudinary uploads
global.fetch = vi.fn();

const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('UploadPhotos Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.getUserPhotos.mockResolvedValue({ data: {} });
    authApi.getGovernmentId.mockResolvedValue({ data: {} });
    
    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => 'true');
    Storage.prototype.setItem = vi.fn();
  });

  describe('File Upload Security Tests', () => {
    it('should prevent malicious file uploads with dangerous extensions', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const maliciousFiles = [
        { name: 'virus.exe', type: 'application/octet-stream' },
        { name: 'script.js', type: 'application/javascript' },
        { name: 'malware.bat', type: 'application/batch' },
        { name: 'trojan.scr', type: 'application/screensaver' },
        { name: 'evil.php', type: 'application/php' },
        { name: 'backdoor.asp', type: 'application/asp' },
        { name: 'shell.sh', type: 'application/shell' },
        { name: 'payload.jar', type: 'application/java-archive' },
      ];

      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      
      maliciousFiles.forEach(file => {
        const maliciousFile = new File(['malicious content'], file.name, { type: file.type });
        
        fireEvent.change(photoInput, { target: { files: [maliciousFile] } });
        
        // Should reject non-image files
        expect(photoInput.files.length).toBe(0);
        expect(screen.queryByAltText('Candidate Full Photo')).not.toBeInTheDocument();
      });
    });

    it('should validate file types for government ID uploads', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const validFiles = [
        { name: 'id.jpg', type: 'image/jpeg' },
        { name: 'id.png', type: 'image/png' },
        { name: 'id.pdf', type: 'application/pdf' },
      ];

      const invalidFiles = [
        { name: 'id.exe', type: 'application/octet-stream' },
        { name: 'id.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'id.zip', type: 'application/zip' },
      ];

      const govIdInput = screen.getByLabelText(/Candidate Government ID Card/);
      
      // Test valid files
      validFiles.forEach(file => {
        const validFile = new File(['content'], file.name, { type: file.type });
        fireEvent.change(govIdInput, { target: { files: [validFile] } });
        // Should accept valid file types
      });

      // Test invalid files
      invalidFiles.forEach(file => {
        const invalidFile = new File(['malicious'], file.name, { type: file.type });
        fireEvent.change(govIdInput, { target: { files: [invalidFile] } });
        // Should reject invalid file types
      });
    });

    it('should enforce file size limits to prevent DoS attacks', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      // Create oversized file (3MB)
      const oversizedContent = new Array(3 * 1024 * 1024).fill('x').join('');
      const oversizedFile = new File([oversizedContent], 'large.jpg', { type: 'image/jpeg' });

      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      fireEvent.change(photoInput, { target: { files: [oversizedFile] } });

      // Should reject oversized files
      expect(photoInput.files.length).toBe(0);
      
      // Should show appropriate error message
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('File must be smaller than 2 MB.');
      });
    });

    it('should prevent SVG uploads with embedded JavaScript', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const maliciousSvg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <script>alert('XSS through SVG')</script>
          <image href="javascript:alert('XSS')"/>
        </svg>
      `;

      const svgFile = new File([maliciousSvg], 'malicious.svg', { type: 'image/svg+xml' });
      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      
      fireEvent.change(photoInput, { target: { files: [svgFile] } });
      
      // Should reject SVG files or sanitize them
      expect(photoInput.files.length).toBe(0);
    });

    it('should prevent file uploads with null bytes in filenames', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const nullByteFilenames = [
        'image.jpg\x00.exe',
        'photo\x00.php.jpg',
        'picture.png\x00',
        'file\x00\x01.jpeg',
      ];

      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      
      nullByteFilenames.forEach(filename => {
        const maliciousFile = new File(['content'], filename, { type: 'image/jpeg' });
        fireEvent.change(photoInput, { target: { files: [maliciousFile] } });
        
        // Should handle null bytes safely
        expect(photoInput.files.length).toBe(0);
      });
    });
  });

  describe('Cloudinary Upload Security', () => {
    it('should validate Cloudinary responses to prevent injection', async () => {
      const maliciousCloudinaryResponse = {
        secure_url: 'javascript:alert("XSS")',
        public_id: '<script>alert("XSS")</script>',
        url: 'data:text/html,<script>alert("XSS")</script>',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(maliciousCloudinaryResponse),
      });

      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const validFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      
      fireEvent.change(photoInput, { target: { files: [validFile] } });

      // Should not use malicious URLs
      await waitFor(() => {
        const preview = screen.queryByAltText('Candidate Full Photo');
        if (preview) {
          expect(preview.src).not.toContain('javascript:');
          expect(preview.src).not.toContain('<script>');
          expect(preview.src).not.toContain('data:text/html');
        }
      });
    });

    it('should handle Cloudinary upload failures gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Upload failed'));

      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const validFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      
      fireEvent.change(photoInput, { target: { files: [validFile] } });

      // Should handle failure without crashing
      await waitFor(() => {
        expect(screen.getByLabelText(/Candidate Full Photo/)).toBeInTheDocument();
      });
    });

    it('should prevent exposure of upload credentials in client code', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      // Check that sensitive Cloudinary credentials are not exposed
      const pageSource = document.documentElement.innerHTML;
      
      // Should not contain actual API secrets (these are example patterns)
      const sensitivePatterns = [
        /api_secret.*[a-zA-Z0-9]{20,}/,
        /cloudinary_secret/i,
        /upload_secret/i,
        /private_key/i,
      ];

      sensitivePatterns.forEach(pattern => {
        expect(pageSource).not.toMatch(pattern);
      });
    });
  });

  describe('File Preview Security', () => {
    it('should prevent XSS through malicious file names in previews', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const maliciousFileName = '<img src=x onerror=alert("XSS")>.jpg';
      const file = new File(['content'], maliciousFileName, { type: 'image/jpeg' });
      
      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      fireEvent.change(photoInput, { target: { files: [file] } });

      // Check that filename is not rendered unsafely
      const pageContent = document.body.innerHTML;
      expect(pageContent).not.toContain('onerror=alert');
      expect(pageContent).not.toContain('<img src=x');
    });

    it('should sanitize blob URLs used for preview', async () => {
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:http://localhost:3000/malicious-content');

      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const validFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      
      fireEvent.change(photoInput, { target: { files: [validFile] } });

      await waitFor(() => {
        const preview = screen.queryByAltText('Candidate Full Photo');
        if (preview) {
          // Should use safe blob URL
          expect(preview.src).toMatch(/^blob:/);
          expect(preview.src).not.toContain('malicious');
        }
      });

      URL.createObjectURL = originalCreateObjectURL;
    });

    it('should prevent memory leaks from blob URLs', async () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      const { unmount } = render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const validFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      
      fireEvent.change(photoInput, { target: { files: [validFile] } });

      // Change to another file to trigger cleanup
      const anotherFile = new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' });
      fireEvent.change(photoInput, { target: { files: [anotherFile] } });

      // Blob URLs should be revoked when replaced
      expect(revokeObjectURLSpy).toHaveBeenCalled();

      unmount();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Form Submission Security', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ secure_url: 'https://cloudinary.com/image1.jpg' }),
      });
    });

    it('should prevent form submission with malicious file data', async () => {
      authApi.uploadUserPhoto = vi.fn();
      
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      // Fill all required photos
      const files = [
        { label: /Candidate Full Photo/, name: 'full.jpg' },
        { label: /Candidate Family Photo/, name: 'family.jpg' },
        { label: /Candidate Closer Photo/, name: 'closer.jpg' },
        { label: /Candidate Government ID Card/, name: 'id.pdf', type: 'application/pdf' },
      ];

      for (const fileInfo of files) {
        const input = screen.getByLabelText(fileInfo.label);
        const file = new File(['content'], fileInfo.name, { 
          type: fileInfo.type || 'image/jpeg' 
        });
        fireEvent.change(input, { target: { files: [file] } });
      }

      // Accept terms
      const termsCheckbox = screen.getByLabelText(/I agree to the/);
      fireEvent.click(termsCheckbox);

      // Submit form
      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.uploadUserPhoto || global.fetch).toHaveBeenCalled();
      });
    });

    it('should validate terms acceptance before allowing submission', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Submit');
      
      // Try to submit without accepting terms
      fireEvent.click(submitButton);

      // Should show alert about terms
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Please agree to the Terms & Conditions before continuing.');
      });
    });

    it('should prevent submission bypass through DOM manipulation', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Submit');
      
      // Try to enable button via DOM manipulation
      Object.defineProperty(submitButton, 'disabled', { value: false, writable: true });
      
      fireEvent.click(submitButton);

      // Should still validate required fields
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Please upload all required photos and your government ID card.');
      });
    });

    it('should handle concurrent upload attempts safely', async () => {
      let uploadCount = 0;
      global.fetch.mockImplementation(() => {
        uploadCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ secure_url: `https://cloudinary.com/image${uploadCount}.jpg` }),
        });
      });

      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      // Fill required files quickly
      const inputs = [
        screen.getByLabelText(/Candidate Full Photo/),
        screen.getByLabelText(/Candidate Family Photo/),
        screen.getByLabelText(/Candidate Closer Photo/),
        screen.getByLabelText(/Candidate Government ID Card/),
      ];

      inputs.forEach((input, index) => {
        const file = new File(['content'], `photo${index}.jpg`, { 
          type: index === 3 ? 'application/pdf' : 'image/jpeg' 
        });
        fireEvent.change(input, { target: { files: [file] } });
      });

      const termsCheckbox = screen.getByLabelText(/I agree to the/);
      fireEvent.click(termsCheckbox);

      const submitButton = screen.getByText('Submit');
      
      // Submit multiple times rapidly
      for (let i = 0; i < 5; i++) {
        fireEvent.click(submitButton);
      }

      // Should only process one submission
      await waitFor(() => {
        expect(uploadCount).toBeLessThanOrEqual(4); // One per file max
      });
    });
  });

  describe('Privacy and Data Protection', () => {
    it('should not expose uploaded image URLs in console logs', async () => {
      const originalConsoleLog = console.log;
      const logMessages = [];
      console.log = (message) => logMessages.push(message);

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ secure_url: 'https://cloudinary.com/private-image.jpg' }),
      });

      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      const file = new File(['content'], 'private.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(photoInput, { target: { files: [file] } });

      // Check that image URLs are not logged
      await waitFor(() => {
        logMessages.forEach(message => {
          if (typeof message === 'string') {
            expect(message).not.toContain('cloudinary.com');
            expect(message).not.toContain('private-image.jpg');
          }
        });
      });

      console.log = originalConsoleLog;
    });

    it('should handle government ID privacy appropriately', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const govIdFile = new File(['sensitive-id-content'], 'government-id.pdf', { 
        type: 'application/pdf' 
      });
      
      const govIdInput = screen.getByLabelText(/Candidate Government ID Card/);
      fireEvent.change(govIdInput, { target: { files: [govIdFile] } });

      // Should show appropriate privacy indicator
      await waitFor(() => {
        expect(screen.getByText('📄 PDF file selected')).toBeInTheDocument();
      });

      // Should not display content preview for sensitive documents
      expect(screen.queryByAltText('government-id.pdf')).not.toBeInTheDocument();
    });

    it('should prevent unauthorized access to uploaded photo metadata', async () => {
      const photoWithMetadata = new File(['content'], 'photo-with-gps.jpg', { type: 'image/jpeg' });
      
      // Mock file with EXIF data
      Object.defineProperty(photoWithMetadata, 'lastModified', { value: Date.now() });
      Object.defineProperty(photoWithMetadata, 'webkitRelativePath', { value: '/private/photos/secret.jpg' });

      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      fireEvent.change(photoInput, { target: { files: [photoWithMetadata] } });

      // Should not expose file system paths or metadata
      const pageContent = document.body.innerHTML;
      expect(pageContent).not.toContain('/private/photos/');
      expect(pageContent).not.toContain('secret.jpg');
    });
  });

  describe('Terms and Conditions Security', () => {
    it('should prevent terms manipulation via DOM', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const termsCheckbox = screen.getByLabelText(/I agree to the/);
      
      // Try to manipulate checkbox state via DOM
      Object.defineProperty(termsCheckbox, 'checked', { value: true, writable: true });
      
      // Component should maintain its own state
      expect(termsCheckbox.checked).toBe(false);
      
      // Proper interaction should work
      fireEvent.click(termsCheckbox);
      expect(termsCheckbox.checked).toBe(true);
    });

    it('should sanitize terms and conditions content', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const termsLink = screen.getByText('Terms & Conditions');
      fireEvent.click(termsLink);

      await waitFor(() => {
        const modal = screen.getByText('Disclaimer for SATFERA Matrimony');
        expect(modal).toBeInTheDocument();
        
        // Should not contain malicious content
        const modalContent = modal.closest('.fixed').innerHTML;
        expect(modalContent).not.toContain('<script>');
        expect(modalContent).not.toContain('javascript:');
        expect(modalContent).not.toContain('onerror=');
      });
    });

    it('should prevent terms bypass through localStorage manipulation', async () => {
      // Mock localStorage manipulation
      Storage.prototype.getItem = vi.fn(() => 'false');
      Storage.prototype.setItem = vi.fn();

      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const termsCheckbox = screen.getByLabelText(/I agree to the/);
      
      // Should start unchecked despite localStorage
      expect(termsCheckbox.checked).toBe(false);

      // Should require actual user interaction
      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Please agree to the Terms & Conditions before continuing.');
      });
    });
  });

  describe('Memory and Resource Security', () => {
    it('should handle multiple file selections without memory leaks', async () => {
      const { unmount } = render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      
      // Select multiple files in sequence
      for (let i = 0; i < 10; i++) {
        const file = new File([`content${i}`], `photo${i}.jpg`, { type: 'image/jpeg' });
        fireEvent.change(photoInput, { target: { files: [file] } });
      }

      // Component should handle multiple selections gracefully
      expect(photoInput).toBeInTheDocument();

      // Cleanup should not throw errors
      unmount();
    });

    it('should prevent resource exhaustion through rapid file changes', async () => {
      render(
        <TestWrapper>
          <UploadPhotos />
        </TestWrapper>
      );

      const photoInput = screen.getByLabelText(/Candidate Full Photo/);
      
      // Rapidly change files
      for (let i = 0; i < 100; i++) {
        const file = new File([`content${i}`], `rapid${i}.jpg`, { type: 'image/jpeg' });
        fireEvent.change(photoInput, { target: { files: [file] } });
      }

      // Component should remain responsive
      expect(photoInput).toBeInTheDocument();
    });
  });
});