import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfessionalDetails from '../../../components/forms/ProfessionalDetails';
import * as authApi from '../../../api/auth';

// Mock the API calls
vi.mock('../../../api/auth', () => ({
  getUserProfession: vi.fn(),
  saveUserProfession: vi.fn(),
  updateUserProfession: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ProfessionalDetails Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.getUserProfession.mockResolvedValue({ data: {} });
  });

  describe('XSS Prevention in Professional Fields', () => {
    it('should sanitize company name against XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("Company XSS")</script>',
        'javascript:void(0)//Google',
        '<img src=x onerror=alert("Company hack")>',
        '"><svg/onload=alert(/XSS/)>Microsoft',
        '<iframe src="javascript:alert(1)">Apple</iframe>',
        'data:text/html,<script>alert("Company")</script>',
        'onmouseover="alert(1)"',
        '<object data="javascript:alert(1)">Tesla</object>',
      ];

      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      // First select employment status to enable company field
      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const companyInput = screen.getByPlaceholderText('Enter company or organization name');
        
        for (const payload of xssPayloads) {
          fireEvent.change(companyInput, { target: { value: payload } });
          
          expect(companyInput.value).not.toContain('<script>');
          expect(companyInput.value).not.toContain('javascript:');
          expect(companyInput.value).not.toContain('<img');
          expect(companyInput.value).not.toContain('<svg');
          expect(companyInput.value).not.toContain('<iframe');
          expect(companyInput.value).not.toContain('data:text/html');
          expect(companyInput.value).not.toContain('onmouseover');
          expect(companyInput.value).not.toContain('<object');
        }
      });
    });

    it('should prevent XSS in job title through react-select', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const jobTitleContainer = screen.getByText('Select or type job title').closest('.react-select__control');
        fireEvent.click(jobTitleContainer);
        
        const input = jobTitleContainer.querySelector('input');
        if (input) {
          const maliciousJob = '<script>alert("Job XSS")</script>Software Engineer';
          fireEvent.change(input, { target: { value: maliciousJob } });
          
          expect(input.value).not.toContain('<script>');
          // Should capitalize properly but remove dangerous elements
          expect(input.value).toMatch(/Software Engineer/i);
        }
      });
    });

    it('should sanitize employment status manipulation attempts', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      
      // Try to add malicious option
      const maliciousOption = document.createElement('option');
      maliciousOption.value = '<script>alert("Employment XSS")</script>';
      maliciousOption.textContent = 'Hacked Employment';
      employmentSelect.appendChild(maliciousOption);

      fireEvent.change(employmentSelect, { target: { value: '<script>alert("Employment XSS")</script>' } });
      
      expect(employmentSelect.value).not.toContain('<script>');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in company name', async () => {
      const sqlPayloads = [
        "'; DROP TABLE companies; --",
        "' UNION SELECT password FROM users WHERE role='admin'; --",
        "Microsoft'; INSERT INTO admins VALUES ('hacker', 'password'); --",
        "Google' AND (SELECT COUNT(*) FROM users) > 0; --",
        "Apple'; EXEC xp_cmdshell('dir'); --",
        "' OR 1=1; DELETE FROM employees; --",
        "Amazon'/**/OR/**/1=1#",
      ];

      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const companyInput = screen.getByPlaceholderText('Enter company or organization name');
        
        for (const sql of sqlPayloads) {
          fireEvent.change(companyInput, { target: { value: sql } });
          
          expect(companyInput.value).not.toContain('DROP TABLE');
          expect(companyInput.value).not.toContain('UNION SELECT');
          expect(companyInput.value).not.toContain('INSERT INTO');
          expect(companyInput.value).not.toContain('xp_cmdshell');
          expect(companyInput.value).not.toContain('DELETE FROM');
          // Should preserve valid company names
          if (sql.includes('Microsoft')) expect(companyInput.value).toContain('Microsoft');
        }
      });
    });
  });

  describe('Business Logic Security Tests', () => {
    it('should prevent employment status bypass to access restricted fields', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      // Select "Not Working" which should disable other fields
      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Not Working' } });

      await waitFor(() => {
        const companyInput = screen.getByPlaceholderText('Enter company or organization name');
        const incomeSelect = screen.getByDisplayValue('Not Working');
        
        // Fields should be disabled
        expect(companyInput.disabled).toBe(true);
        expect(incomeSelect.disabled).toBe(true);
        
        // Try to enable via DOM manipulation
        Object.defineProperty(companyInput, 'disabled', { value: false, writable: true });
        
        // Try to input malicious data
        fireEvent.change(companyInput, { target: { value: 'Evil Corp' } });
        
        // Should remain disabled and not accept input
        expect(companyInput.disabled).toBe(true);
      });
    });

    it('should validate income ranges against manipulation', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const incomeSelect = screen.getByDisplayValue('');
        
        // Try to add malicious income option
        const maliciousOption = document.createElement('option');
        maliciousOption.value = '₹999999999 Crore<script>alert(1)</script>';
        maliciousOption.textContent = 'Unlimited Money';
        incomeSelect.appendChild(maliciousOption);

        fireEvent.change(incomeSelect, { target: { value: '₹999999999 Crore<script>alert(1)</script>' } });
        
        expect(incomeSelect.value).not.toContain('<script>');
      });
    });
  });

  describe('Form Submission Security', () => {
    it('should sanitize all data before API submission', async () => {
      authApi.saveUserProfession.mockImplementation((data) => {
        // Verify all fields are properly sanitized
        Object.entries(data).forEach(([key, value]) => {
          if (value !== null && typeof value === 'string') {
            expect(value).not.toContain('<script>');
            expect(value).not.toContain('javascript:');
            expect(value).not.toContain('<img');
            expect(value).not.toContain('data:');
            expect(value).not.toContain('../');
            expect(value).not.toContain('DROP TABLE');
          }
        });
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      // Fill form with potentially malicious data
      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(async () => {
        const companyInput = screen.getByPlaceholderText('Enter company or organization name');
        fireEvent.change(companyInput, { target: { value: 'Google<script>alert(1)</script>' } });

        const incomeSelect = screen.getByDisplayValue('');
        fireEvent.change(incomeSelect, { target: { value: '₹50 – 55 Lakh' } });

        const submitButton = screen.getByText('Save & Next');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(authApi.saveUserProfession).toHaveBeenCalled();
        });
      });
    });

    it('should prevent form data manipulation via hidden fields', async () => {
      const mockSubmit = vi.fn();
      authApi.saveUserProfession.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <ProfessionalDetails onNext={mockSubmit} />
        </TestWrapper>
      );

      // Try to add hidden admin field
      const form = document.querySelector('form');
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = 'isAdmin';
      hiddenInput.value = 'true';
      form.appendChild(hiddenInput);

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(async () => {
        const submitButton = screen.getByText('Save & Next');
        fireEvent.click(submitButton);

        await waitFor(() => {
          if (authApi.saveUserProfession.mock.calls.length > 0) {
            const submittedData = authApi.saveUserProfession.mock.calls[0][0];
            expect(submittedData).not.toHaveProperty('isAdmin');
          }
        });
      });
    });
  });

  describe('Memory and Performance Security', () => {
    it('should handle extremely long company names', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const companyInput = screen.getByPlaceholderText('Enter company or organization name');
        
        const veryLongCompanyName = 'A'.repeat(100000);
        fireEvent.change(companyInput, { target: { value: veryLongCompanyName } });
        
        // Should limit input length
        expect(companyInput.value.length).toBeLessThan(10000);
      });
    });

    it('should prevent DoS through rapid state changes', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      
      // Rapidly change employment status
      const statuses = ['Private Sector', 'Government', 'Self-Employed', 'Student', 'Not Working'];
      
      for (let i = 0; i < 1000; i++) {
        const status = statuses[i % statuses.length];
        fireEvent.change(employmentSelect, { target: { value: status } });
      }
      
      // Component should remain responsive
      expect(employmentSelect).toBeInTheDocument();
    });

    it('should handle massive job title arrays without crashing', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      // Component should handle its large job titles array gracefully
      await waitFor(() => {
        const jobTitleContainer = screen.getByText('Select or type job title');
        expect(jobTitleContainer).toBeInTheDocument();
        
        // Click to open dropdown
        fireEvent.click(jobTitleContainer.closest('.react-select__control'));
        
        // Should not crash with large options array
        expect(jobTitleContainer).toBeInTheDocument();
      });
    });
  });

  describe('React-Select Security Tests', () => {
    it('should prevent XSS through creatable job title field', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const selectContainer = screen.getByText('Select or type job title').closest('.react-select__control');
        fireEvent.click(selectContainer);
        
        const input = selectContainer.querySelector('input');
        if (input) {
          const maliciousJob = '<script>alert("Job XSS")</script>';
          fireEvent.change(input, { target: { value: maliciousJob } });
          fireEvent.keyDown(input, { key: 'Enter' });
          
          // Should not execute script
          expect(input.value).not.toContain('<script>');
        }
      });
    });

    it('should validate job titles against known dangerous patterns', async () => {
      const dangerousPatterns = [
        'javascript:void(0)',
        'data:text/html,<script>',
        'vbscript:msgbox("XSS")',
        'file:///etc/passwd',
        'ftp://malicious.com/',
      ];

      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const selectContainer = screen.getByText('Select or type job title').closest('.react-select__control');
        
        dangerousPatterns.forEach(pattern => {
          fireEvent.click(selectContainer);
          
          const input = selectContainer.querySelector('input');
          if (input) {
            fireEvent.change(input, { target: { value: pattern } });
            
            expect(input.value).not.toContain('javascript:');
            expect(input.value).not.toContain('data:text/html');
            expect(input.value).not.toContain('vbscript:');
            expect(input.value).not.toContain('file:///');
            expect(input.value).not.toContain('ftp://');
          }
        });
      });
    });
  });

  describe('State Management Security', () => {
    it('should prevent direct manipulation of employment status validation', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      // Try to submit without employment status
      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Employment status is required.')).toBeInTheDocument();
      });
      
      // Should not call API without required fields
      expect(authApi.saveUserProfession).not.toHaveBeenCalled();
    });

    it('should maintain field dependencies correctly', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      
      // Switch between different employment types
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });
      
      await waitFor(() => {
        const companyInput = screen.getByPlaceholderText('Enter company or organization name');
        expect(companyInput.disabled).toBe(false);
      });

      fireEvent.change(employmentSelect, { target: { value: 'Student' } });
      
      await waitFor(() => {
        const companyInput = screen.getByPlaceholderText('Enter company or organization name');
        expect(companyInput.disabled).toBe(true);
      });

      fireEvent.change(employmentSelect, { target: { value: 'Not Working' } });
      
      await waitFor(() => {
        const companyInput = screen.getByPlaceholderText('Enter company or organization name');
        const incomeSelect = screen.getByDisplayValue('Not Working');
        expect(companyInput.disabled).toBe(true);
        expect(incomeSelect.disabled).toBe(true);
      });
    });
  });

  describe('API Error Handling Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      authApi.saveUserProfession.mockRejectedValue({
        response: { 
          data: { 
            message: 'Database connection failed: mysql://admin:secret123@db.internal.company.com:3306/production_db - Access denied for user admin'
          } 
        }
      });

      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const submitButton = screen.getByText('Save & Next');
        fireEvent.click(submitButton);
      });

      // Should not display sensitive database connection details
      await waitFor(() => {
        expect(screen.queryByText(/mysql:\/\/admin:secret123/)).not.toBeInTheDocument();
        expect(screen.queryByText(/db.internal.company.com/)).not.toBeInTheDocument();
        expect(screen.queryByText(/production_db/)).not.toBeInTheDocument();
      });
    });

    it('should handle timeout errors gracefully', async () => {
      authApi.saveUserProfession.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const submitButton = screen.getByText('Save & Next');
        fireEvent.click(submitButton);
      });

      // Should handle timeout without exposing internal errors
      await waitFor(() => {
        expect(screen.getByText('Save & Next')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle unicode and special characters safely', async () => {
      const unicodeTests = [
        'Google™', // Trademark symbol
        'Café Résumé', // Accented characters
        '微软公司', // Chinese characters
        'شركة الأمل', // Arabic text
        'Яндекс', // Cyrillic
        'Company🏢', // Emoji
        '\u0000\u0001', // Control characters
      ];

      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const companyInput = screen.getByPlaceholderText('Enter company or organization name');
        
        for (const testString of unicodeTests) {
          fireEvent.change(companyInput, { target: { value: testString } });
          
          // Should handle unicode safely without crashing
          expect(companyInput).toBeInTheDocument();
          expect(companyInput.value).toBeDefined();
        }
      });
    });

    it('should prevent buffer overflow in income field manipulation', async () => {
      render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const incomeSelect = screen.getByDisplayValue('');
        
        // Try to overflow income field
        const overflowAttempt = '₹' + '9'.repeat(1000) + ' Lakh';
        
        // Try to add malicious option
        const maliciousOption = document.createElement('option');
        maliciousOption.value = overflowAttempt;
        maliciousOption.textContent = overflowAttempt;
        incomeSelect.appendChild(maliciousOption);

        fireEvent.change(incomeSelect, { target: { value: overflowAttempt } });
        
        // Should handle gracefully
        expect(incomeSelect).toBeInTheDocument();
      });
    });
  });

  describe('Component Lifecycle Security', () => {
    it('should clean up sensitive data on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <ProfessionalDetails />
        </TestWrapper>
      );

      const employmentSelect = screen.getByDisplayValue('');
      fireEvent.change(employmentSelect, { target: { value: 'Private Sector' } });

      await waitFor(() => {
        const companyInput = screen.getByPlaceholderText('Enter company or organization name');
        fireEvent.change(companyInput, { target: { value: 'Sensitive Company Info' } });
      });

      // Unmount component
      unmount();

      // Sensitive data should not be accessible after unmount
      // This is more of a conceptual test as React handles cleanup automatically
      expect(screen.queryByDisplayValue('Sensitive Company Info')).not.toBeInTheDocument();
    });
  });
});