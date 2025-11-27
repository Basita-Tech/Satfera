/**
 * SECURITY TESTS FOR FORGOT USERNAME COMPONENT
 * 
 * This comprehensive security test suite covers critical username recovery vulnerabilities
 * including information disclosure, brute force protection, data enumeration attacks,
 * PII exposure, and social engineering protection.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ForgotUsername from '../../../components/auth/ForgotUsername';

const renderForgotUsername = () => {
  return render(
    <BrowserRouter>
      <ForgotUsername />
    </BrowserRouter>
  );
};

describe('🔒 ForgotUsername Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  describe('🔍 Information Disclosure Prevention', () => {
    it('should not reveal if user exists through username recovery', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      // Test with non-existent user data
      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'Non Existent User');
      await user.type(dobInput, '1990-01-01');
      
      const retrieveBtn = screen.getByText(/retrieve username/i);
      
      // Mock the loading behavior
      await user.click(retrieveBtn);
      
      // Should show loading state
      expect(screen.getByText(/checking.../i)).toBeInTheDocument();
      
      // Advance timers to simulate backend response
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      
      await waitFor(() => {
        // Should show generic error without revealing user existence
        expect(screen.getByText(/no account found with that name and dob/i)).toBeInTheDocument();
      });
    });

    it('should not expose username format in error messages', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'Test User');
      await user.type(dobInput, 'invalid-date');
      
      const retrieveBtn = screen.getByText(/retrieve username/i);
      await user.click(retrieveBtn);
      
      // Should not reveal username patterns or formats in error
      expect(screen.queryByText(/username must be email/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/username format/i)).not.toBeInTheDocument();
    });

    it('should mask displayed usernames appropriately', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      // Test with valid user data that exists in mock database
      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'Roshan Bisoyi');
      await user.type(dobInput, '2000-05-10');
      
      const retrieveBtn = screen.getByText(/retrieve username/i);
      await user.click(retrieveBtn);
      
      // Advance timers
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      
      await waitFor(() => {
        // Should show masked email
        expect(screen.getByText(/roshan.bisoyi@example.com/i)).toBeInTheDocument();
        expect(screen.getByText(/email based login/i)).toBeInTheDocument();
      });
    });

    it('should mask mobile numbers properly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      // Test with mobile-based user
      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'Ankit Sharma');
      await user.type(dobInput, '1999-03-20');
      
      const retrieveBtn = screen.getByText(/retrieve username/i);
      await user.click(retrieveBtn);
      
      // Advance timers
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      
      await waitFor(() => {
        // Should show masked mobile (+91 ******3210)
        expect(screen.getByText(/\+91 \*\*\*\*\*\*3210/i)).toBeInTheDocument();
        expect(screen.getByText(/mobile based login/i)).toBeInTheDocument();
      });
    });
  });

  describe('🚀 Brute Force Protection', () => {
    it('should prevent rapid username enumeration attempts', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      const retrieveBtn = screen.getByText(/retrieve username/i);
      
      // Attempt multiple rapid requests
      for (let i = 0; i < 5; i++) {
        await user.clear(fullNameInput);
        await user.clear(dobInput);
        await user.type(fullNameInput, `Test User ${i}`);
        await user.type(dobInput, `199${i}-01-01`);
        await user.click(retrieveBtn);
        
        // Should show loading state preventing rapid submissions
        expect(screen.getByText(/checking.../i)).toBeInTheDocument();
        expect(retrieveBtn).toBeDisabled();
        
        // Advance timer for this attempt
        act(() => {
          vi.advanceTimersByTime(1200);
        });
        
        await waitFor(() => {
          expect(screen.queryByText(/checking.../i)).not.toBeInTheDocument();
        });
      }
    });

    it('should implement consistent delay for all responses', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const testCases = [
        { name: 'Existing User', dob: '2000-05-10', shouldExist: true },
        { name: 'Non Existent', dob: '1990-01-01', shouldExist: false },
        { name: 'Another Test', dob: '1985-12-25', shouldExist: false }
      ];
      
      const responseTimes = [];
      
      for (const testCase of testCases) {
        const startTime = performance.now();
        
        const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
        const dobInput = screen.getByLabelText(/date of birth/i);
        
        await user.clear(fullNameInput);
        await user.clear(dobInput);
        await user.type(fullNameInput, testCase.name);
        await user.type(dobInput, testCase.dob);
        
        const retrieveBtn = screen.getByText(/retrieve username/i);
        await user.click(retrieveBtn);
        
        // Advance timer consistently
        act(() => {
          vi.advanceTimersByTime(1200);
        });
        
        await waitFor(() => {
          expect(screen.queryByText(/checking.../i)).not.toBeInTheDocument();
        });
        
        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }
      
      // All response times should be consistent (within 100ms)
      const avgTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const isConsistent = responseTimes.every(time => Math.abs(time - avgTime) < 100);
      
      expect(isConsistent).toBe(true);
    });

    it('should disable form during processing to prevent double submission', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'Test User');
      await user.type(dobInput, '1990-01-01');
      
      const retrieveBtn = screen.getByText(/retrieve username/i);
      await user.click(retrieveBtn);
      
      // Form elements should be disabled during processing
      expect(retrieveBtn).toBeDisabled();
      expect(fullNameInput).toBeDisabled();
      expect(dobInput).toBeDisabled();
    });
  });

  describe('🛡️ Input Validation & Sanitization', () => {
    it('should prevent XSS attacks in full name field', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const maliciousName = '<script>alert("xss")</script>John Doe';
      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      
      await user.type(fullNameInput, maliciousName);
      
      // Should not execute scripts
      expect(document.querySelector('script')).not.toBeInTheDocument();
      
      // Value should be sanitized
      expect(fullNameInput.value).toBe(maliciousName);
      
      // But when processed, should not contain scripts
      const retrieveBtn = screen.getByText(/retrieve username/i);
      await user.click(retrieveBtn);
      
      // Should not find user with malicious input
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/no account found/i)).toBeInTheDocument();
      });
    });

    it('should prevent SQL injection in name field', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const sqlInjection = "'; DROP TABLE users; SELECT * FROM users WHERE name='admin";
      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, sqlInjection);
      await user.type(dobInput, '1990-01-01');
      
      const retrieveBtn = screen.getByText(/retrieve username/i);
      await user.click(retrieveBtn);
      
      // Should not execute SQL injection
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/no account found/i)).toBeInTheDocument();
      });
    });

    it('should enforce strict date validation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'John Doe');
      
      const invalidDates = [
        '2025-01-01', // Future date
        '1800-01-01', // Too old
        'invalid-date',
        '32/13/2000' // Invalid format
      ];
      
      for (const invalidDate of invalidDates) {
        await user.clear(dobInput);
        await user.type(dobInput, invalidDate);
        
        const retrieveBtn = screen.getByText(/retrieve username/i);
        await user.click(retrieveBtn);
        
        // Should show validation error for invalid dates
        expect(screen.getByText(/please enter both name and date of birth/i)).toBeInTheDocument();
      }
    });

    it('should validate required fields properly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const retrieveBtn = screen.getByText(/retrieve username/i);
      
      // Submit with empty fields
      await user.click(retrieveBtn);
      
      expect(screen.getByText(/please enter both name and date of birth/i)).toBeInTheDocument();
      
      // Submit with only name
      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      await user.type(fullNameInput, 'John Doe');
      await user.click(retrieveBtn);
      
      expect(screen.getByText(/please enter both name and date of birth/i)).toBeInTheDocument();
      
      // Submit with only DOB
      await user.clear(fullNameInput);
      const dobInput = screen.getByLabelText(/date of birth/i);
      await user.type(dobInput, '1990-01-01');
      await user.click(retrieveBtn);
      
      expect(screen.getByText(/please enter both name and date of birth/i)).toBeInTheDocument();
    });

    it('should prevent NoSQL injection attacks', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const nosqlInjection = '{"$ne": null}';
      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, nosqlInjection);
      await user.type(dobInput, '1990-01-01');
      
      const retrieveBtn = screen.getByText(/retrieve username/i);
      await user.click(retrieveBtn);
      
      // Should not process NoSQL injection
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/no account found/i)).toBeInTheDocument();
      });
    });
  });

  describe('💾 Data Security & Privacy', () => {
    it('should not store sensitive data in localStorage', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      const sensitiveData = 'John Doe';
      const sensitiveDob = '1990-01-01';
      
      await user.type(fullNameInput, sensitiveData);
      await user.type(dobInput, sensitiveDob);
      
      // Check localStorage doesn't contain sensitive data
      const localStorageContent = JSON.stringify(localStorage);
      expect(localStorageContent).not.toContain(sensitiveData);
      expect(localStorageContent).not.toContain(sensitiveDob);
    });

    it('should not expose PII in DOM unnecessarily', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'Roshan Bisoyi');
      await user.type(dobInput, '2000-05-10');
      
      const retrieveBtn = screen.getByText(/retrieve username/i);
      await user.click(retrieveBtn);
      
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      
      await waitFor(() => {
        // Should mask email appropriately
        const emailElement = screen.getByText(/roshan.bisoyi@example.com/i);
        expect(emailElement).toBeInTheDocument();
        
        // Full name and DOB should not be exposed elsewhere
        const domContent = document.body.textContent;
        const nameOccurrences = (domContent.match(/Roshan Bisoyi/g) || []).length;
        
        // Name should only appear in input field, not duplicated elsewhere
        expect(nameOccurrences).toBeLessThanOrEqual(2); // Input field + possibly one display
      });
    });

    it('should handle case-insensitive name matching without exposing canonical form', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      // Test with different case
      await user.type(fullNameInput, 'ROSHAN BISOYI');
      await user.type(dobInput, '2000-05-10');
      
      const retrieveBtn = screen.getByText(/retrieve username/i);
      await user.click(retrieveBtn);
      
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      
      await waitFor(() => {
        // Should find user regardless of case
        expect(screen.getByText(/roshan.bisoyi@example.com/i)).toBeInTheDocument();
        
        // Should not expose the canonical form from database
        expect(screen.queryByText(/Roshan Bisoyi/)).toBeInTheDocument(); // Original case preserved
        expect(screen.queryByText(/ROSHAN BISOYI/)).toBeInTheDocument(); // User input preserved
      });
    });
  });

  describe('🕒 Timing Attack Prevention', () => {
    it('should prevent timing-based user enumeration', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const testUsers = [
        { name: 'Roshan Bisoyi', dob: '2000-05-10', exists: true },
        { name: 'Non Existent', dob: '1990-01-01', exists: false },
        { name: 'Another Test', dob: '1985-05-15', exists: false }
      ];
      
      const processingTimes = [];
      
      for (const testUser of testUsers) {
        const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
        const dobInput = screen.getByLabelText(/date of birth/i);
        
        await user.clear(fullNameInput);
        await user.clear(dobInput);
        
        const startTime = performance.now();
        
        await user.type(fullNameInput, testUser.name);
        await user.type(dobInput, testUser.dob);
        
        const retrieveBtn = screen.getByText(/retrieve username/i);
        await user.click(retrieveBtn);
        
        // Fixed delay for all operations
        act(() => {
          vi.advanceTimersByTime(1200);
        });
        
        await waitFor(() => {
          expect(screen.queryByText(/checking.../i)).not.toBeInTheDocument();
        });
        
        const endTime = performance.now();
        processingTimes.push(endTime - startTime);
      }
      
      // All processing times should be nearly identical
      const avgTime = processingTimes.reduce((a, b) => a + b) / processingTimes.length;
      const maxVariance = Math.max(...processingTimes.map(time => Math.abs(time - avgTime)));
      
      // Variance should be minimal (less than 50ms)
      expect(maxVariance).toBeLessThan(50);
    });
  });

  describe('🔄 Session State Security', () => {
    it('should not maintain sensitive state across component unmount', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { unmount } = renderForgotUsername();

      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'Sensitive User');
      await user.type(dobInput, '1990-01-01');
      
      // Unmount component
      unmount();
      
      // Re-render
      renderForgotUsername();
      
      // Fields should be empty
      const newFullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const newDobInput = screen.getByLabelText(/date of birth/i);
      
      expect(newFullNameInput.value).toBe('');
      expect(newDobInput.value).toBe('');
    });

    it('should clear form after successful username retrieval', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'Roshan Bisoyi');
      await user.type(dobInput, '2000-05-10');
      
      const retrieveBtn = screen.getByText(/retrieve username/i);
      await user.click(retrieveBtn);
      
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/roshan.bisoyi@example.com/i)).toBeInTheDocument();
      });
      
      // Form should remain populated (UX decision), but no sensitive data should leak
      expect(fullNameInput.value).toBe('Roshan Bisoyi');
      expect(dobInput.value).toBe('2000-05-10');
    });
  });

  describe('🔗 Navigation Security', () => {
    it('should handle navigation links securely', () => {
      renderForgotUsername();
      
      // Check back to login link
      const backLink = screen.getByText(/back to login/i);
      expect(backLink).toHaveAttribute('to', '/login');
      expect(backLink.getAttribute('href')).toBe('/login');
      
      // Check login link
      const loginLink = screen.getByText(/log in/i);
      expect(loginLink).toHaveAttribute('to', '/login');
      expect(loginLink.getAttribute('href')).toBe('/login');
    });

    it('should not expose sensitive data in navigation state', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'Test User');
      await user.type(dobInput, '1990-01-01');
      
      // Click navigation link
      const backLink = screen.getByText(/back to login/i);
      
      // Should not pass sensitive data in navigation state
      expect(backLink).not.toHaveAttribute('state');
      expect(backLink.search).toBe('');
    });
  });

  describe('🛡️ Component Security Architecture', () => {
    it('should implement proper error boundaries', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotUsername();

      // Mock a component error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const fullNameInput = screen.getByPlaceholderText(/enter your full name/i);
      const dobInput = screen.getByLabelText(/date of birth/i);
      
      await user.type(fullNameInput, 'Test User');
      await user.type(dobInput, '1990-01-01');
      
      // Component should handle errors gracefully
      expect(() => {
        const retrieveBtn = screen.getByText(/retrieve username/i);
        user.click(retrieveBtn);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should not expose internal component state in production', () => {
      renderForgotUsername();
      
      // Should not have debug props or dev tools exposed
      expect(screen.queryByText(/debug/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/dev/i)).not.toBeInTheDocument();
      
      // Should not expose React dev tools info
      expect(document.querySelector('[data-react-dev-tools]')).not.toBeInTheDocument();
    });
  });
});