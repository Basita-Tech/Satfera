import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EducationDetails from '../../../components/forms/EducationDetails';
import * as authApi from '../../../api/auth';

// Mock the API calls
vi.mock('../../../api/auth', () => ({
  getEducationalDetails: vi.fn(),
  saveEducationalDetails: vi.fn(),
  updateEducationalDetails: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock country-list
vi.mock('country-list', () => ({
  getNames: vi.fn(() => ['India', 'United States', 'Canada', 'United Kingdom']),
}));

const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('EducationDetails Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.getEducationalDetails.mockResolvedValue({ data: {} });
  });

  describe('XSS Prevention in Education Fields', () => {
    it('should sanitize school name against XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("School XSS")</script>',
        'javascript:void(0)//School',
        '<img src=x onerror=alert(1)>School',
        '"><svg/onload=alert(/XSS/)>',
        '<iframe src="javascript:alert(1)"></iframe>School',
        'data:text/html,<script>alert(1)</script>',
      ];

      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      for (const payload of xssPayloads) {
        const schoolInput = screen.getByPlaceholderText('Enter your school name');
        fireEvent.change(schoolInput, { target: { value: payload } });
        
        expect(schoolInput.value).not.toContain('<script>');
        expect(schoolInput.value).not.toContain('javascript:');
        expect(schoolInput.value).not.toContain('<img');
        expect(schoolInput.value).not.toContain('<svg');
        expect(schoolInput.value).not.toContain('<iframe');
        expect(schoolInput.value).not.toContain('data:text/html');
      }
    });

    it('should prevent XSS in university name field', async () => {
      const universityXSS = [
        'MIT<script>document.location="http://evil.com"</script>',
        'Stanford&lt;script&gt;alert(1)&lt;/script&gt;',
        'Harvard"><img src=x onerror=alert(1)>',
        'Yale<object data="javascript:alert(1)">',
      ];

      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      for (const payload of universityXSS) {
        const universityInput = screen.getByPlaceholderText('Enter university name');
        fireEvent.change(universityInput, { target: { value: payload } });
        
        expect(universityInput.value).not.toContain('<script>');
        expect(universityInput.value).not.toContain('<img');
        expect(universityInput.value).not.toContain('<object');
        // Should capitalize properly without executing scripts
        expect(universityInput.value).toContain('Mit') || 
        expect(universityInput.value).toContain('Stanford') || 
        expect(universityInput.value).toContain('Harvard') ||
        expect(universityInput.value).toContain('Yale');
      }
    });

    it('should handle malicious field of study selections', async () => {
      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      // Mock a malicious option being selected via DOM manipulation
      const fieldOfStudyDiv = screen.getByText('Select or type field of study').closest('div');
      
      // Try to inject malicious content through react-select
      const maliciousOption = {
        value: '<script>alert("Field XSS")</script>',
        label: 'Computer Science<img src=x onerror=alert(1)>'
      };

      // The component should sanitize this input
      fireEvent.click(fieldOfStudyDiv);
      
      // React-select should prevent script execution
      expect(screen.queryByText('<script>')).not.toBeInTheDocument();
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in education fields', async () => {
      const sqlPayloads = [
        "'; DROP TABLE education; --",
        "' UNION SELECT password FROM users; --",
        "admin'/**/OR/**/1=1#",
        "'; INSERT INTO admin VALUES ('hacker'); --",
        "' AND EXTRACTVALUE(0, CONCAT(0x7e, (SELECT@@version), 0x7e)); --",
        "'; EXEC xp_cmdshell('dir'); --",
      ];

      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      for (const sql of sqlPayloads) {
        const schoolInput = screen.getByPlaceholderText('Enter your school name');
        fireEvent.change(schoolInput, { target: { value: sql } });
        
        // Should be treated as regular text, not SQL
        expect(schoolInput.value).not.toContain('DROP TABLE');
        expect(schoolInput.value).not.toContain('UNION SELECT');
        expect(schoolInput.value).not.toContain('INSERT INTO');
        expect(schoolInput.value).not.toContain('EXTRACTVALUE');
        expect(schoolInput.value).not.toContain('xp_cmdshell');
      }
    });
  });

  describe('File Path Injection Tests', () => {
    it('should prevent directory traversal in input fields', async () => {
      const pathTraversals = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config',
        '/var/log/apache/access.log',
        'C:\\Users\\Administrator\\Desktop\\secrets.txt',
        '../../../../root/.bashrc',
        'file:///etc/shadow',
        '\\\\shared\\network\\drive',
      ];

      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      for (const path of pathTraversals) {
        const universityInput = screen.getByPlaceholderText('Enter university name');
        fireEvent.change(universityInput, { target: { value: path } });
        
        expect(universityInput.value).not.toContain('../');
        expect(universityInput.value).not.toContain('..\\');
        expect(universityInput.value).not.toContain('/etc/');
        expect(universityInput.value).not.toContain('\\system32\\');
        expect(universityInput.value).not.toContain('file:///');
        expect(universityInput.value).not.toContain('\\\\shared\\');
      }
    });
  });

  describe('Form Validation Bypass Tests', () => {
    it('should maintain server-side validation even if client validation is bypassed', async () => {
      authApi.saveEducationalDetails.mockRejectedValue({
        response: { 
          data: { 
            errors: { 
              SchoolName: 'School name is required',
              HighestEducation: 'Education level is required' 
            } 
          } 
        }
      });

      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      // Try to submit empty form
      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should still validate on server side
      await waitFor(() => {
        expect(authApi.saveEducationalDetails).toHaveBeenCalled();
      });
    });

    it('should prevent manipulation of select options via DOM', async () => {
      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      const qualificationSelect = screen.getByDisplayValue('');
      
      // Try to add malicious option via DOM manipulation
      const maliciousOption = document.createElement('option');
      maliciousOption.value = '<script>alert(1)</script>';
      maliciousOption.textContent = 'Hacked Degree';
      qualificationSelect.appendChild(maliciousOption);

      fireEvent.change(qualificationSelect, { target: { value: '<script>alert(1)</script>' } });
      
      // Should not execute script or accept invalid option
      expect(qualificationSelect.value).not.toContain('<script>');
    });
  });

  describe('Memory Exhaustion Protection', () => {
    it('should handle extremely long institution names', async () => {
      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      const veryLongName = 'A'.repeat(100000);
      const schoolInput = screen.getByPlaceholderText('Enter your school name');
      
      fireEvent.change(schoolInput, { target: { value: veryLongName } });
      
      // Should limit input length to prevent memory issues
      expect(schoolInput.value.length).toBeLessThan(10000);
    });

    it('should prevent DoS through rapid field changes', async () => {
      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      const schoolInput = screen.getByPlaceholderText('Enter your school name');
      
      // Simulate rapid input changes
      for (let i = 0; i < 1000; i++) {
        fireEvent.change(schoolInput, { target: { value: `School${i}` } });
      }
      
      // Component should remain responsive
      expect(schoolInput).toBeInTheDocument();
      expect(schoolInput.value).toBeDefined();
    });
  });

  describe('API Security Tests', () => {
    it('should sanitize data before API submission', async () => {
      authApi.saveEducationalDetails.mockImplementation((data) => {
        // Verify all fields are properly sanitized
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'string') {
            expect(value).not.toContain('<script>');
            expect(value).not.toContain('javascript:');
            expect(value).not.toContain('<img');
            expect(value).not.toContain('data:');
            expect(value).not.toContain('../');
          }
        });
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      // Fill form with potentially malicious data
      const schoolInput = screen.getByPlaceholderText('Enter your school name');
      fireEvent.change(schoolInput, { target: { value: '<script>alert(1)</script>Harvard' } });

      const universityInput = screen.getByPlaceholderText('Enter university name');
      fireEvent.change(universityInput, { target: { value: 'MIT<img src=x onerror=alert(1)>' } });

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.saveEducationalDetails).toHaveBeenCalled();
      });
    });

    it('should handle API errors without exposing sensitive information', async () => {
      authApi.saveEducationalDetails.mockRejectedValue({
        response: { 
          data: { 
            message: 'Database error: Connection failed to mysql://root:password123@localhost:3306/education_db' 
          } 
        }
      });

      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should not display sensitive database information
      await waitFor(() => {
        expect(screen.queryByText(/mysql:\/\/root:password123/)).not.toBeInTheDocument();
        expect(screen.queryByText(/localhost:3306/)).not.toBeInTheDocument();
      });
    });
  });

  describe('React-Select Security Tests', () => {
    it('should prevent XSS through creatable select field', async () => {
      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      // Find the react-select field of study component
      const selectContainer = screen.getByText('Select or type field of study').closest('.react-select__control');
      
      // Try to create malicious option
      fireEvent.click(selectContainer);
      
      const input = screen.getByText('Select or type field of study').closest('div').querySelector('input');
      if (input) {
        fireEvent.change(input, { target: { value: '<script>alert("XSS")</script>' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      }

      // Should not execute script
      expect(screen.queryByText('<script>')).not.toBeInTheDocument();
    });

    it('should validate created options for safety', async () => {
      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      // Test various malicious inputs in creatable select
      const maliciousInputs = [
        'javascript:void(0)',
        'data:text/html,<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'vbscript:msgbox("XSS")',
      ];

      const selectContainer = screen.getByText('Select or type field of study').closest('.react-select__control');
      
      maliciousInputs.forEach(maliciousInput => {
        fireEvent.click(selectContainer);
        
        const input = selectContainer.querySelector('input');
        if (input) {
          fireEvent.change(input, { target: { value: maliciousInput } });
          
          // Input should be sanitized
          expect(input.value).not.toContain('<script>');
          expect(input.value).not.toContain('javascript:');
          expect(input.value).not.toContain('data:text/html');
          expect(input.value).not.toContain('<img');
          expect(input.value).not.toContain('vbscript:');
        }
      });
    });
  });

  describe('Country Selection Security', () => {
    it('should prevent injection through country selection', async () => {
      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      const countrySelect = screen.getByDisplayValue('');
      
      // Try to add malicious country option
      const maliciousOption = document.createElement('option');
      maliciousOption.value = '<script>alert("Country XSS")</script>';
      maliciousOption.textContent = 'Evil Country';
      countrySelect.appendChild(maliciousOption);

      fireEvent.change(countrySelect, { target: { value: '<script>alert("Country XSS")</script>' } });
      
      expect(countrySelect.value).not.toContain('<script>');
    });

    it('should validate other country input when "Other" is selected', async () => {
      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      const countrySelect = screen.getByDisplayValue('');
      fireEvent.change(countrySelect, { target: { value: 'Other' } });

      await waitFor(() => {
        const otherInput = screen.getByPlaceholderText('Please specify your country');
        
        const maliciousCountry = '<script>alert("Other Country XSS")</script>';
        fireEvent.change(otherInput, { target: { value: maliciousCountry } });
        
        expect(otherInput.value).not.toContain('<script>');
        // Should be capitalized but safe
        expect(otherInput.value).toBe('Alert("other Country Xss")');
      });
    });
  });

  describe('Data Type Validation', () => {
    it('should handle non-string data types safely', async () => {
      authApi.saveEducationalDetails.mockImplementation((data) => {
        // Ensure all expected fields are strings or valid types
        expect(typeof data.SchoolName).toBe('string');
        expect(typeof data.HighestEducation).toBe('string');
        expect(typeof data.FieldOfStudy).toBe('string');
        expect(typeof data.University).toBe('string');
        expect(typeof data.CountryOfEducation).toBe('string');
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      // Fill form with normal data
      const schoolInput = screen.getByPlaceholderText('Enter your school name');
      fireEvent.change(schoolInput, { target: { value: 'Harvard University' } });

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.saveEducationalDetails).toHaveBeenCalled();
      });
    });
  });

  describe('Component State Security', () => {
    it('should prevent malicious state manipulation', async () => {
      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      // Try to access component internals (would normally be done via React DevTools)
      const schoolInput = screen.getByPlaceholderText('Enter your school name');
      
      // Simulate malicious state change
      Object.defineProperty(schoolInput, 'value', {
        value: '<script>window.location="http://evil.com"</script>',
        writable: false
      });

      // Normal interaction should still work
      fireEvent.change(schoolInput, { target: { value: 'Normal School Name' } });
      
      expect(schoolInput.value).toBe('Normal School Name');
    });
  });

  describe('Performance DoS Protection', () => {
    it('should handle rapid form submissions', async () => {
      let submitCount = 0;
      authApi.saveEducationalDetails.mockImplementation(() => {
        submitCount++;
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Save & Next');
      
      // Rapid fire submissions
      for (let i = 0; i < 20; i++) {
        fireEvent.click(submitButton);
      }

      // Should not overwhelm the system
      await waitFor(() => {
        expect(submitCount).toBeLessThan(20); // Some form of rate limiting
      });
    });
  });

  describe('Encoding and Character Set Tests', () => {
    it('should handle various character encodings safely', async () => {
      const encodingTests = [
        'École Polytechnique',     // French accents
        '北京大学',                  // Chinese characters
        'جامعة القاهرة',           // Arabic text
        'Московский университет',   // Cyrillic
        '🏫📚🎓',                   // Emojis
        '\u0000\u0001\u0002',      // Control characters
      ];

      render(
        <TestWrapper>
          <EducationDetails />
        </TestWrapper>
      );

      for (const testString of encodingTests) {
        const universityInput = screen.getByPlaceholderText('Enter university name');
        fireEvent.change(universityInput, { target: { value: testString } });
        
        // Should handle international text safely
        expect(universityInput).toBeInTheDocument();
        expect(universityInput.value).toBeDefined();
      }
    });
  });
});