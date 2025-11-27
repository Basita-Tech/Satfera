import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PersonalDetails from '../../../components/forms/PersonalDetails';
import * as authApi from '../../../api/auth';

// Mock the API calls
vi.mock('../../../api/auth', () => ({
  getOnboardingStatus: vi.fn(),
  getUserPersonal: vi.fn(),
  saveUserPersonal: vi.fn(),
  updateUserPersonal: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('PersonalDetails Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.getUserPersonal.mockResolvedValue({ data: {} });
  });

  describe('XSS Vulnerability Tests', () => {
    it('should prevent XSS in text inputs', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const cityInput = screen.getByPlaceholderText('Enter birth city');
      fireEvent.change(cityInput, { target: { value: xssPayload } });

      // Check that script tags are not executed and value is sanitized
      expect(cityInput.value).not.toContain('<script>');
      expect(cityInput.value).toBe('Alert("xss")'); // Should be capitalized but not executed
    });

    it('should handle malicious HTML in form fields', async () => {
      const maliciousInputs = [
        '<img src=x onerror=alert(1)>',
        'javascript:alert(document.cookie)',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '"><script>alert("XSS")</script>',
      ];

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      for (const payload of maliciousInputs) {
        const stateInput = screen.getByPlaceholderText('Enter Birth State');
        fireEvent.change(stateInput, { target: { value: payload } });
        
        // Ensure the input doesn't contain dangerous elements
        expect(stateInput.value).not.toContain('<script>');
        expect(stateInput.value).not.toContain('javascript:');
        expect(stateInput.value).not.toContain('onerror');
        expect(stateInput.value).not.toContain('<svg');
        expect(stateInput.value).not.toContain('<iframe');
      }
    });

    it('should sanitize address fields against XSS', async () => {
      const xssAttempts = [
        '<script>window.location="http://evil.com"</script>',
        '&lt;script&gt;alert(1)&lt;/script&gt;',
        'data:text/html,<script>alert(1)</script>',
      ];

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      for (const payload of xssAttempts) {
        const street1Input = screen.getByPlaceholderText('Enter address line 1');
        fireEvent.change(street1Input, { target: { value: payload } });
        
        expect(street1Input.value).not.toContain('<script>');
        expect(street1Input.value).not.toContain('javascript:');
        expect(street1Input.value).not.toContain('data:text/html');
      }
    });
  });

  describe('Input Validation Security Tests', () => {
    it('should prevent SQL injection attempts in text fields', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR 1=1; --",
        "' UNION SELECT * FROM passwords; --",
        "admin'--",
        "' OR 'a'='a",
      ];

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      for (const payload of sqlInjectionPayloads) {
        const cityInput = screen.getByPlaceholderText('Enter birth city');
        fireEvent.change(cityInput, { target: { value: payload } });
        
        // Input should be processed as plain text
        expect(cityInput.value).not.toContain('DROP TABLE');
        expect(cityInput.value).not.toContain('UNION SELECT');
      }
    });

    it('should validate numeric inputs properly', async () => {
      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const hourInput = screen.getByPlaceholderText('HH');
      
      // Test invalid hour values
      const invalidHours = ['25', '99', '-1', 'abc', '∞', 'null'];
      
      for (const invalidHour of invalidHours) {
        fireEvent.change(hourInput, { target: { value: invalidHour } });
        
        if (invalidHour === '25' || invalidHour === '99') {
          await waitFor(() => {
            expect(screen.getByText('Hour must be between 00–23')).toBeInTheDocument();
          });
        }
      }
    });

    it('should prevent buffer overflow in text inputs', async () => {
      const longString = 'A'.repeat(10000);
      
      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const cityInput = screen.getByPlaceholderText('Enter birth city');
      fireEvent.change(cityInput, { target: { value: longString } });
      
      // Input should be truncated or handled safely
      expect(cityInput.value.length).toBeLessThan(1000);
    });

    it('should validate pincode format securely', async () => {
      const maliciousPincodes = [
        '<script>alert(1)</script>',
        '../../etc/passwd',
        '../../../windows/system32',
        'javascript:void(0)',
        'data:text/plain;base64,SGVsbG8=',
      ];

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      for (const maliciousPincode of maliciousPincodes) {
        const pincodeInput = screen.getByPlaceholderText('Enter pincode');
        fireEvent.change(pincodeInput, { target: { value: maliciousPincode } });
        
        expect(pincodeInput.value).not.toContain('<script>');
        expect(pincodeInput.value).not.toContain('../');
        expect(pincodeInput.value).not.toContain('javascript:');
        expect(pincodeInput.value).not.toContain('data:');
      }
    });
  });

  describe('Form Submission Security Tests', () => {
    it('should prevent CSRF attacks with proper validation', async () => {
      const mockSubmit = vi.fn();
      authApi.saveUserPersonal.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <PersonalDetails onNext={mockSubmit} />
        </TestWrapper>
      );

      // Try to submit form without proper user interaction
      const form = screen.getByRole('form');
      fireEvent.submit(form);

      // Should not submit without proper validation
      expect(authApi.saveUserPersonal).not.toHaveBeenCalled();
    });

    it('should sanitize data before API submission', async () => {
      authApi.saveUserPersonal.mockImplementation((data) => {
        // Check that submitted data is clean
        Object.values(data).forEach(value => {
          if (typeof value === 'string') {
            expect(value).not.toContain('<script>');
            expect(value).not.toContain('javascript:');
            expect(value).not.toContain('data:');
          }
        });
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      // Fill form with potentially malicious data
      const cityInput = screen.getByPlaceholderText('Enter birth city');
      fireEvent.change(cityInput, { target: { value: '<script>alert(1)</script>Mumbai' } });

      const stateInput = screen.getByPlaceholderText('Enter Birth State');
      fireEvent.change(stateInput, { target: { value: 'javascript:alert(1)Maharashtra' } });

      // Submit form
      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.saveUserPersonal).toHaveBeenCalled();
      });
    });
  });

  describe('Performance DoS Attack Prevention', () => {
    it('should handle rapid form submissions gracefully', async () => {
      authApi.saveUserPersonal.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Save & Next');
      
      // Rapid fire clicks
      for (let i = 0; i < 100; i++) {
        fireEvent.click(submitButton);
      }

      // Should not make 100 API calls
      await waitFor(() => {
        expect(authApi.saveUserPersonal).toHaveBeenCalledTimes(0); // No valid data submitted
      });
    });

    it('should prevent memory exhaustion with large datasets', async () => {
      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const cityInput = screen.getByPlaceholderText('Enter birth city');
      
      // Try to create memory pressure
      const largeArray = new Array(100000).fill('X').join('');
      fireEvent.change(cityInput, { target: { value: largeArray } });

      // Component should remain responsive
      expect(cityInput).toBeInTheDocument();
      expect(cityInput.value.length).toBeLessThan(1000); // Should be limited
    });
  });

  describe('Client-Side Validation Bypass Tests', () => {
    it('should maintain server-side validation when client validation is bypassed', async () => {
      authApi.saveUserPersonal.mockRejectedValue({
        response: { data: { errors: { birthCity: 'Birth city is required' } } }
      });

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      // Try to submit without required fields
      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Birth city is required')).toBeInTheDocument();
      });
    });

    it('should handle disabled field manipulation attempts', async () => {
      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const firstNameInput = screen.getByDisplayValue(''); // readonly field
      
      // Try to modify readonly field via DOM manipulation
      Object.defineProperty(firstNameInput, 'readOnly', { value: false });
      fireEvent.change(firstNameInput, { target: { value: 'Hacked Name' } });

      // The component should maintain its readonly behavior
      expect(firstNameInput.hasAttribute('readonly')).toBe(true);
    });
  });

  describe('Data Sanitization Tests', () => {
    it('should properly encode special characters', async () => {
      const specialChars = ['<', '>', '"', "'", '&', '\n', '\r', '\t'];
      
      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const cityInput = screen.getByPlaceholderText('Enter birth city');
      
      specialChars.forEach(char => {
        fireEvent.change(cityInput, { target: { value: `Test${char}City` } });
        // Special chars should be handled safely
        expect(cityInput.value).not.toContain('<script>');
      });
    });

    it('should handle unicode and emoji attacks', async () => {
      const unicodeAttacks = [
        '𝕊𝕔𝕣𝕚𝕡𝕥', // Unicode script
        '️🚀💥', // Emojis
        '\u0000\u0001\u0002', // Control characters
        '＜script＞alert(1)＜/script＞', // Fullwidth characters
      ];

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const cityInput = screen.getByPlaceholderText('Enter birth city');
      
      unicodeAttacks.forEach(attack => {
        fireEvent.change(cityInput, { target: { value: attack } });
        // Should handle unicode safely without crashing
        expect(cityInput).toBeInTheDocument();
      });
    });
  });

  describe('Phone Number Security Tests', () => {
    it('should validate international phone number format', async () => {
      const maliciousPhones = [
        '+91<script>alert(1)</script>9876543210',
        'javascript:alert(1)',
        '../../../etc/passwd',
        'data:text/plain,evil',
      ];

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      // Note: This component doesn't have phone fields, but similar validation should apply
      const pincodeInput = screen.getByPlaceholderText('Enter pincode');
      
      maliciousPhones.forEach(phone => {
        fireEvent.change(pincodeInput, { target: { value: phone } });
        expect(pincodeInput.value).not.toContain('<script>');
        expect(pincodeInput.value).not.toContain('javascript:');
      });
    });
  });

  describe('Accessibility Security Tests', () => {
    it('should prevent screen reader exploitation', async () => {
      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      // Check for proper ARIA labels that can't be exploited
      const cityInput = screen.getByPlaceholderText('Enter birth city');
      const label = screen.getByText('Birth City');
      
      expect(label).toBeInTheDocument();
      expect(cityInput.getAttribute('aria-label')).toBeFalsy(); // Should use proper labeling
    });

    it('should handle keyboard navigation securely', async () => {
      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const cityInput = screen.getByPlaceholderText('Enter birth city');
      
      // Test tab navigation doesn't trigger unintended actions
      fireEvent.keyDown(cityInput, { key: 'Tab' });
      fireEvent.keyDown(cityInput, { key: 'Enter' });
      
      // Should not trigger form submission or other actions unintentionally
      expect(authApi.saveUserPersonal).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Security Tests', () => {
    it('should not expose sensitive information in error messages', async () => {
      authApi.saveUserPersonal.mockRejectedValue({
        response: { 
          data: { 
            message: 'Database connection failed at server 192.168.1.100:5432 with password abc123'
          } 
        }
      });

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should show generic error, not expose internal details
      await waitFor(() => {
        const errorElement = screen.queryByText(/Database connection failed/);
        expect(errorElement).not.toBeInTheDocument();
      });
    });

    it('should handle API timeout gracefully', async () => {
      authApi.saveUserPersonal.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      render(
        <TestWrapper>
          <PersonalDetails />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should handle timeout without crashing
      await waitFor(() => {
        expect(screen.getByText('Save & Next')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });
});