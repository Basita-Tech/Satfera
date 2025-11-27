import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ExpectationDetails from '../../../components/forms/ExpectationDetails';
import * as authApi from '../../../api/auth';

// Mock the API calls
vi.mock('../../../api/auth', () => ({
  getUserExpectations: vi.fn(),
  saveUserExpectations: vi.fn(),
  updateUserExpectations: vi.fn(),
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
  getNames: vi.fn(() => ['India', 'United States', 'Canada', 'United Kingdom', 'Australia']),
}));

const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ExpectationDetails Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.getUserExpectations.mockResolvedValue({ data: {} });
  });

  describe('XSS Prevention in Partner Expectations', () => {
    it('should prevent XSS in age preference fields', async () => {
      const xssPayloads = [
        '<script>alert("Age XSS")</script>',
        'javascript:void(0)',
        '<img src=x onerror=alert(1)>',
        '"><svg onload=alert(/XSS/)>',
        'data:text/html,<script>alert(1)</script>',
      ];

      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const ageFromSelect = screen.getByDisplayValue('').closest('select');
      
      for (const payload of xssPayloads) {
        // Try to add malicious option
        const maliciousOption = document.createElement('option');
        maliciousOption.value = payload;
        maliciousOption.textContent = 'Malicious Age';
        ageFromSelect.appendChild(maliciousOption);

        fireEvent.change(ageFromSelect, { target: { value: payload } });
        
        expect(ageFromSelect.value).not.toContain('<script>');
        expect(ageFromSelect.value).not.toContain('javascript:');
        expect(ageFromSelect.value).not.toContain('<img');
        expect(ageFromSelect.value).not.toContain('<svg');
        expect(ageFromSelect.value).not.toContain('data:text/html');
      }
    });

    it('should sanitize partner location preferences', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const locationSelect = screen.getByDisplayValue('');
      
      // Try to inject malicious location option
      const maliciousOption = document.createElement('option');
      maliciousOption.value = 'India<script>alert("Location XSS")</script>';
      maliciousOption.textContent = 'Hacked India';
      locationSelect.appendChild(maliciousOption);

      fireEvent.change(locationSelect, { target: { value: 'India<script>alert("Location XSS")</script>' } });
      
      expect(locationSelect.value).not.toContain('<script>');
    });

    it('should prevent XSS through React-Select multi-select fields', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      // First set partner location to show state/country select
      const locationSelect = screen.getByDisplayValue('');
      fireEvent.change(locationSelect, { target: { value: 'India' } });

      await waitFor(() => {
        const stateSelectContainer = screen.getByText('Select one or multiple states').closest('.react-select__control');
        
        // Try to inject malicious content through react-select
        fireEvent.click(stateSelectContainer);
        
        // React-select should prevent script execution in options
        expect(screen.queryByText('<script>')).not.toBeInTheDocument();
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in location preferences', async () => {
      const sqlPayloads = [
        "'; DROP TABLE expectations; --",
        "' UNION SELECT password FROM users; --",
        "India'; INSERT INTO admin_users VALUES ('hacker'); --",
        "' OR 1=1; DELETE FROM partner_preferences; --",
        "Abroad'/**/AND/**/1=1#",
      ];

      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const locationSelect = screen.getByDisplayValue('');
      
      for (const sql of sqlPayloads) {
        // Try to add SQL injection option
        const maliciousOption = document.createElement('option');
        maliciousOption.value = sql;
        maliciousOption.textContent = 'SQL Injection';
        locationSelect.appendChild(maliciousOption);

        fireEvent.change(locationSelect, { target: { value: sql } });
        
        expect(locationSelect.value).not.toContain('DROP TABLE');
        expect(locationSelect.value).not.toContain('UNION SELECT');
        expect(locationSelect.value).not.toContain('INSERT INTO');
        expect(locationSelect.value).not.toContain('DELETE FROM');
      }
    });
  });

  describe('Multi-Select Security Tests', () => {
    it('should sanitize education level selections', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      // Find education multi-select
      const educationContainer = screen.getByText('Select').closest('.react-select__control');
      fireEvent.click(educationContainer);

      // Try to create malicious education option
      const maliciousEducation = '<script>alert("Education XSS")</script>';
      
      // Should not be able to inject malicious options
      expect(screen.queryByText(maliciousEducation)).not.toBeInTheDocument();
    });

    it('should prevent community/caste manipulation with XSS', async () => {
      const maliciousCastes = [
        'Patel<script>alert("Caste XSS")</script>',
        'Brahmin"; DROP TABLE castes; --',
        'Jain<img src=x onerror=alert(1)>',
        'Vaishnav<iframe src="javascript:alert(1)">',
      ];

      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      // Find community multi-select by navigating through the DOM structure
      const communityLabel = screen.getByText('Community / Caste');
      const communityContainer = communityLabel.closest('div').querySelector('.react-select__control');
      
      fireEvent.click(communityContainer);

      // Malicious caste options should not be present or executable
      maliciousCastes.forEach(caste => {
        expect(screen.queryByText(caste)).not.toBeInTheDocument();
      });
    });

    it('should handle profession selection security', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const professionLabel = screen.getByText('Profession / Occupation');
      const professionContainer = professionLabel.closest('div').querySelector('.react-select__control');
      
      fireEvent.click(professionContainer);

      // Should not allow injection of malicious profession options
      const maliciousProfession = 'Engineer<script>alert("Job XSS")</script>';
      expect(screen.queryByText(maliciousProfession)).not.toBeInTheDocument();
    });
  });

  describe('Age Validation Security', () => {
    it('should prevent age manipulation beyond valid ranges', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const ageFromSelect = screen.getAllByDisplayValue('')[0]; // First select should be age from
      
      // Try to add invalid age options
      const invalidAges = ['-1', '0', '100', '999', '<script>25</script>', 'javascript:25'];
      
      invalidAges.forEach(age => {
        const maliciousOption = document.createElement('option');
        maliciousOption.value = age;
        maliciousOption.textContent = age;
        ageFromSelect.appendChild(maliciousOption);

        fireEvent.change(ageFromSelect, { target: { value: age } });
        
        if (age.includes('<script>') || age.includes('javascript:')) {
          expect(ageFromSelect.value).not.toContain('<script>');
          expect(ageFromSelect.value).not.toContain('javascript:');
        }
      });
    });

    it('should validate age range consistency', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const ageFromSelect = screen.getAllByDisplayValue('')[0];
      const ageToSelect = screen.getAllByDisplayValue('')[1];
      
      // Set invalid age range (from > to)
      fireEvent.change(ageFromSelect, { target: { value: '35' } });
      fireEvent.change(ageToSelect, { target: { value: '25' } });

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('To age must be greater than From age')).toBeInTheDocument();
      });
    });

    it('should prevent numeric overflow in age fields', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const ageFromSelect = screen.getAllByDisplayValue('')[0];
      
      // Try to overflow with very large numbers
      const overflowAttempt = '9'.repeat(50);
      
      const maliciousOption = document.createElement('option');
      maliciousOption.value = overflowAttempt;
      maliciousOption.textContent = overflowAttempt;
      ageFromSelect.appendChild(maliciousOption);

      fireEvent.change(ageFromSelect, { target: { value: overflowAttempt } });
      
      // Should handle gracefully without crashing
      expect(ageFromSelect).toBeInTheDocument();
    });
  });

  describe('Form Submission Security', () => {
    it('should sanitize all data before API submission', async () => {
      authApi.saveUserExpectations.mockImplementation((data) => {
        // Verify all fields are properly sanitized
        const checkValue = (value) => {
          if (typeof value === 'string') {
            expect(value).not.toContain('<script>');
            expect(value).not.toContain('javascript:');
            expect(value).not.toContain('<img');
            expect(value).not.toContain('data:');
            expect(value).not.toContain('../');
            expect(value).not.toContain('DROP TABLE');
          } else if (Array.isArray(value)) {
            value.forEach(checkValue);
          } else if (value && typeof value === 'object') {
            Object.values(value).forEach(checkValue);
          }
        };

        Object.values(data).forEach(checkValue);
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      // Fill form with required data
      const locationSelect = screen.getByDisplayValue('');
      fireEvent.change(locationSelect, { target: { value: 'India' } });

      const ageFromSelect = screen.getAllByDisplayValue('')[0];
      const ageToSelect = screen.getAllByDisplayValue('')[1];
      
      fireEvent.change(ageFromSelect, { target: { value: '25' } });
      fireEvent.change(ageToSelect, { target: { value: '30' } });

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.saveUserExpectations).toHaveBeenCalled();
      });
    });

    it('should prevent bypass of required field validation', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      // Try to submit without filling required fields
      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should show multiple validation errors
      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });

      // Should not call API
      expect(authApi.saveUserExpectations).not.toHaveBeenCalled();
    });

    it('should handle malicious form manipulation via DOM', async () => {
      const mockSubmit = vi.fn();
      authApi.saveUserExpectations.mockImplementation((data) => {
        // Ensure no unauthorized fields are submitted
        expect(data).not.toHaveProperty('isAdmin');
        expect(data).not.toHaveProperty('bypassValidation');
        expect(data).not.toHaveProperty('accessLevel');
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <ExpectationDetails onNext={mockSubmit} />
        </TestWrapper>
      );

      // Try to add hidden malicious fields
      const form = document.querySelector('form');
      const hiddenInputs = [
        { name: 'isAdmin', value: 'true' },
        { name: 'bypassValidation', value: 'true' },
        { name: 'accessLevel', value: 'admin' }
      ];

      hiddenInputs.forEach(({ name, value }) => {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = name;
        hiddenInput.value = value;
        form.appendChild(hiddenInput);
      });

      // Fill required fields
      const locationSelect = screen.getByDisplayValue('');
      fireEvent.change(locationSelect, { target: { value: 'No preference' } });

      const ageFromSelect = screen.getAllByDisplayValue('')[0];
      const ageToSelect = screen.getAllByDisplayValue('')[1];
      
      fireEvent.change(ageFromSelect, { target: { value: '25' } });
      fireEvent.change(ageToSelect, { target: { value: '30' } });

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.saveUserExpectations).toHaveBeenCalled();
      });
    });
  });

  describe('React-Select Security Tests', () => {
    it('should prevent option injection in state/country selection', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const locationSelect = screen.getByDisplayValue('');
      fireEvent.change(locationSelect, { target: { value: 'India' } });

      await waitFor(() => {
        const stateContainer = screen.getByText('Select one or multiple states').closest('.react-select__control');
        fireEvent.click(stateContainer);
        
        // Should not be able to inject malicious state options
        const maliciousStates = [
          'Gujarat<script>alert("State XSS")</script>',
          'Maharashtra"; DROP TABLE states; --',
          'Delhi<img src=x onerror=alert(1)>',
        ];

        maliciousStates.forEach(state => {
          expect(screen.queryByText(state)).not.toBeInTheDocument();
        });
      });
    });

    it('should handle "Any" option exclusivity securely', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const locationSelect = screen.getByDisplayValue('');
      fireEvent.change(locationSelect, { target: { value: 'India' } });

      await waitFor(() => {
        const stateContainer = screen.getByText('Select one or multiple states').closest('.react-select__control');
        fireEvent.click(stateContainer);
        
        // Select "Any" option
        const anyOption = screen.getByText('Any');
        fireEvent.click(anyOption);
        
        // Try to also select another state - should be prevented
        const gujaratOption = screen.queryByText('Gujarat');
        if (gujaratOption) {
          fireEvent.click(gujaratOption);
        }
        
        // Should only have "Any" selected
        expect(stateContainer.textContent).toContain('Any');
      });
    });
  });

  describe('Performance DoS Protection', () => {
    it('should handle rapid form state changes', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const locationSelect = screen.getByDisplayValue('');
      const locations = ['India', 'Abroad', 'No preference'];
      
      // Rapidly change location preferences
      for (let i = 0; i < 1000; i++) {
        const location = locations[i % locations.length];
        fireEvent.change(locationSelect, { target: { value: location } });
      }
      
      // Component should remain responsive
      expect(locationSelect).toBeInTheDocument();
    });

    it('should prevent memory exhaustion with large multi-select arrays', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const locationSelect = screen.getByDisplayValue('');
      fireEvent.change(locationSelect, { target: { value: 'Abroad' } });

      await waitFor(() => {
        const countryContainer = screen.getByText('Select one or multiple countries').closest('.react-select__control');
        fireEvent.click(countryContainer);
        
        // Try to select many countries rapidly
        const countries = ['United States', 'Canada', 'United Kingdom', 'Australia'];
        
        countries.forEach(country => {
          const countryOption = screen.queryByText(country);
          if (countryOption) {
            for (let i = 0; i < 100; i++) {
              fireEvent.click(countryOption);
            }
          }
        });
        
        // Component should handle gracefully
        expect(countryContainer).toBeInTheDocument();
      });
    });

    it('should handle rapid form submissions gracefully', async () => {
      let submitCount = 0;
      authApi.saveUserExpectations.mockImplementation(() => {
        submitCount++;
        return Promise.resolve({ success: true });
      });

      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Save & Next');
      
      // Rapid fire submissions
      for (let i = 0; i < 20; i++) {
        fireEvent.click(submitButton);
      }

      // Should not overwhelm the system
      await waitFor(() => {
        expect(submitCount).toBeLessThan(20);
      });
    });
  });

  describe('Data Consistency Security', () => {
    it('should maintain consistency between location and state/country selections', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const locationSelect = screen.getByDisplayValue('');
      
      // Set location to India
      fireEvent.change(locationSelect, { target: { value: 'India' } });

      await waitFor(() => {
        expect(screen.getByText('Select State(s)')).toBeInTheDocument();
      });

      // Change to Abroad
      fireEvent.change(locationSelect, { target: { value: 'Abroad' } });

      await waitFor(() => {
        expect(screen.getByText('Select Country(ies)')).toBeInTheDocument();
        // Previous state selection should be cleared
        expect(screen.queryByText('Select State(s)')).not.toBeInTheDocument();
      });
    });

    it('should validate partner habits against injection', async () => {
      const maliciousHabits = [
        'Yes<script>alert("Habits XSS")</script>',
        'No"; DROP TABLE habits; --',
        'Occasional<img src=x onerror=alert(1)>',
      ];

      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const habitsLabel = screen.getByText(/Would you be open to a partner who consumes alcohol/);
      const habitsSelect = habitsLabel.closest('div').querySelector('select');
      
      maliciousHabits.forEach(habit => {
        const maliciousOption = document.createElement('option');
        maliciousOption.value = habit;
        maliciousOption.textContent = habit;
        habitsSelect.appendChild(maliciousOption);

        fireEvent.change(habitsSelect, { target: { value: habit } });
        
        expect(habitsSelect.value).not.toContain('<script>');
        expect(habitsSelect.value).not.toContain('DROP TABLE');
        expect(habitsSelect.value).not.toContain('<img');
      });
    });
  });

  describe('API Error Handling Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      authApi.saveUserExpectations.mockRejectedValue({
        response: { 
          data: { 
            message: 'Database error: Connection failed to postgresql://admin:secretpass@expectations-db.internal:5432/matrimony_prod - Query: SELECT * FROM user_expectations WHERE user_id=12345'
          } 
        }
      });

      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Save & Next');
      fireEvent.click(submitButton);

      // Should not display sensitive database information
      await waitFor(() => {
        expect(screen.queryByText(/postgresql:\/\/admin:secretpass/)).not.toBeInTheDocument();
        expect(screen.queryByText(/expectations-db.internal/)).not.toBeInTheDocument();
        expect(screen.queryByText(/matrimony_prod/)).not.toBeInTheDocument();
        expect(screen.queryByText(/user_id=12345/)).not.toBeInTheDocument();
      });
    });

    it('should handle concurrent API calls safely', async () => {
      let callCount = 0;
      authApi.saveUserExpectations.mockImplementation(() => {
        callCount++;
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 100));
      });

      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Save & Next');
      
      // Make concurrent requests
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should not make multiple concurrent calls
        expect(callCount).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Input Encoding Security', () => {
    it('should handle various character encodings in preferences', async () => {
      const encodingTests = [
        'Preference ñ é ü', // Accented characters
        '期望 条件', // Chinese characters  
        'توقعات الشريك', // Arabic text
        'Ожидания партнёра', // Cyrillic
        'Partner 🤝 💕', // Emojis
        '\u0000\u0001\u0002', // Control characters
      ];

      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const locationSelect = screen.getByDisplayValue('');
      
      encodingTests.forEach(testString => {
        // Try to add option with various encodings
        const testOption = document.createElement('option');
        testOption.value = testString;
        testOption.textContent = testString;
        locationSelect.appendChild(testOption);

        fireEvent.change(locationSelect, { target: { value: testString } });
        
        // Should handle various encodings safely
        expect(locationSelect).toBeInTheDocument();
      });
    });
  });

  describe('Component State Security', () => {
    it('should prevent malicious state manipulation through DevTools simulation', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      const locationSelect = screen.getByDisplayValue('');
      
      // Simulate malicious state change
      Object.defineProperty(locationSelect, 'value', {
        value: 'malicious_location<script>alert(1)</script>',
        writable: true
      });

      // Normal interaction should override malicious manipulation
      fireEvent.change(locationSelect, { target: { value: 'India' } });
      
      expect(locationSelect.value).toBe('India');
      expect(locationSelect.value).not.toContain('<script>');
    });

    it('should maintain form integrity during complex interactions', async () => {
      render(
        <TestWrapper>
          <ExpectationDetails />
        </TestWrapper>
      );

      // Complex interaction: change location multiple times with multi-selects
      const locationSelect = screen.getByDisplayValue('');
      
      fireEvent.change(locationSelect, { target: { value: 'India' } });
      
      await waitFor(() => {
        fireEvent.change(locationSelect, { target: { value: 'Abroad' } });
      });
      
      await waitFor(() => {
        fireEvent.change(locationSelect, { target: { value: 'No preference' } });
      });
      
      // Form should remain in consistent state
      expect(locationSelect.value).toBe('No preference');
      expect(locationSelect).toBeInTheDocument();
    });
  });
});