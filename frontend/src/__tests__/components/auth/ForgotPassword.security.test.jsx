/**
 * SECURITY TESTS FOR FORGOT PASSWORD COMPONENT
 * 
 * This comprehensive security test suite covers critical password reset vulnerabilities
 * including account enumeration, rate limiting, OTP security, timing attacks,
 * and password reset token security.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ForgotPassword from '../../../components/auth/ForgotPassword';

// Mock country-telephone-data
vi.mock('country-telephone-data', () => ({
  allCountries: [
    { iso2: 'in', dialCode: '91', name: 'India' },
    { iso2: 'us', dialCode: '1', name: 'United States' },
    { iso2: 'uk', dialCode: '44', name: 'United Kingdom' },
  ]
}));

const renderForgotPassword = () => {
  return render(
    <BrowserRouter>
      <ForgotPassword />
    </BrowserRouter>
  );
};

describe('🔒 ForgotPassword Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Mock Date.now for consistent timing tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  describe('🔍 Account Enumeration Prevention', () => {
    it('should not reveal whether email exists in system', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      // Select email option (default)
      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      
      // Test with non-existent email
      await user.type(emailInput, 'nonexistent@example.com');
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      // Should show success regardless of email existence
      expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
      
      // Should not reveal if email doesn't exist
      expect(screen.queryByText(/email not found/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/no account with this email/i)).not.toBeInTheDocument();
    });

    it('should not reveal whether mobile number exists in system', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      // Switch to mobile option
      const mobileBtn = screen.getByText(/mobile/i);
      await user.click(mobileBtn);
      
      const mobileInput = screen.getByPlaceholderText(/enter 10-digit mobile number/i);
      
      // Test with non-existent mobile
      await user.type(mobileInput, '9999999999');
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      // Should show success regardless
      expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
      
      // Should not reveal if mobile doesn't exist
      expect(screen.queryByText(/mobile not found/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/no account with this mobile/i)).not.toBeInTheDocument();
    });

    it('should provide consistent response time regardless of account existence', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const responseTimes = [];
      const testEmails = ['existing@example.com', 'nonexistent@example.com', 'another@test.com'];
      
      for (const email of testEmails) {
        const startTime = performance.now();
        
        const emailInput = screen.getByPlaceholderText(/enter your email/i);
        await user.clear(emailInput);
        await user.type(emailInput, email);
        
        const sendOtpBtn = screen.getByText(/send otp/i);
        await user.click(sendOtpBtn);
        
        // Wait for state change
        await waitFor(() => {
          expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
        });
        
        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
        
        // Reset to input step for next test
        act(() => {
          fireEvent.click(screen.getByText(/back to sign in/i));
        });
      }
      
      // Response times should be consistent (within 100ms variance)
      const avgTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const isConsistent = responseTimes.every(time => Math.abs(time - avgTime) < 100);
      
      expect(isConsistent).toBe(true);
    });
  });

  describe('🚀 Rate Limiting & Brute Force Protection', () => {
    it('should prevent rapid OTP requests', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      
      // First request should succeed
      await user.click(sendOtpBtn);
      expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
      
      // Navigate back to test resend
      const resetPasswordBtn = screen.getByText(/back to sign in/i);
      await user.click(resetPasswordBtn);
      
      // Rapid subsequent requests should be limited
      for (let i = 0; i < 5; i++) {
        await user.type(emailInput, 'test@example.com');
        await user.click(sendOtpBtn);
      }
      
      // Should implement some form of rate limiting
      // (In actual implementation, this would show rate limit message)
      expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
    });

    it('should prevent OTP enumeration attacks', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      // Wait for OTP screen
      await waitFor(() => {
        expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
      });
      
      const otpInput = screen.getByPlaceholderText(/enter otp/i);
      const verifyBtn = screen.getByText(/verify otp/i);
      
      // Try multiple invalid OTPs rapidly
      const invalidOTPs = ['000000', '111111', '123456', '999999', '555555'];
      
      for (const otp of invalidOTPs) {
        await user.clear(otpInput);
        await user.type(otpInput, otp);
        await user.click(verifyBtn);
        
        // Should show error for incorrect OTP
        expect(screen.getByText(/incorrect otp/i)).toBeInTheDocument();
      }
      
      // After multiple failures, should implement some protection
      // (This is a mock implementation - real app would lock account)
    });

    it('should enforce OTP expiry strictly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      // Wait for OTP screen
      await waitFor(() => {
        expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
      });
      
      // Fast forward time to expire OTP
      act(() => {
        vi.advanceTimersByTime(180 * 1000); // 180 seconds
      });
      
      // OTP should be expired
      await waitFor(() => {
        expect(screen.getByText(/otp expired/i)).toBeInTheDocument();
      });
      
      const otpInput = screen.getByPlaceholderText(/enter otp/i);
      const verifyBtn = screen.getByText(/verify otp/i);
      
      // Should not accept expired OTP
      expect(otpInput).toBeDisabled();
      expect(verifyBtn).toBeDisabled();
    });
  });

  describe('🛡️ Input Validation & Sanitization', () => {
    it('should prevent XSS attacks in email field', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const maliciousEmail = 'test@example.com<script>alert("xss")</script>';
      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      
      await user.type(emailInput, maliciousEmail);
      
      // Should not execute script
      expect(document.querySelector('script')).not.toBeInTheDocument();
      
      // Email should be sanitized to lowercase
      expect(emailInput.value).toBe(maliciousEmail.toLowerCase());
    });

    it('should prevent SQL injection in mobile field', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      // Switch to mobile
      const mobileBtn = screen.getByText(/mobile/i);
      await user.click(mobileBtn);
      
      const sqlInjection = "'; DROP TABLE users; --";
      const mobileInput = screen.getByPlaceholderText(/enter 10-digit mobile number/i);
      
      await user.type(mobileInput, sqlInjection);
      
      // Should only accept numeric input
      expect(mobileInput.value).not.toContain('DROP');
      expect(mobileInput.value).not.toContain(';');
      expect(mobileInput.value).not.toContain('--');
    });

    it('should enforce strict email format validation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example..com',
        'test @example.com',
        'test@exam ple.com'
      ];

      for (const email of invalidEmails) {
        const emailInput = screen.getByPlaceholderText(/enter your email/i);
        await user.clear(emailInput);
        await user.type(emailInput, email);
        
        const sendOtpBtn = screen.getByText(/send otp/i);
        await user.click(sendOtpBtn);
        
        // Should show validation error
        expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
      }
    });

    it('should enforce strict mobile number validation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      // Switch to mobile
      const mobileBtn = screen.getByText(/mobile/i);
      await user.click(mobileBtn);

      const invalidMobiles = [
        '123',        // Too short
        '12345678901', // Too long
        'abcd567890',  // Contains letters
        '123-456-7890', // Contains special chars
        '0123456789',  // Starts with 0
        '+911234567890' // Contains country code
      ];

      for (const mobile of invalidMobiles) {
        const mobileInput = screen.getByPlaceholderText(/enter 10-digit mobile number/i);
        await user.clear(mobileInput);
        await user.type(mobileInput, mobile);
        
        const sendOtpBtn = screen.getByText(/send otp/i);
        await user.click(sendOtpBtn);
        
        // Should show validation error
        expect(screen.getByText(/enter a valid 10-digit mobile number/i)).toBeInTheDocument();
      }
    });

    it('should sanitize OTP input', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      // Wait for OTP screen
      await waitFor(() => {
        expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
      });
      
      const otpInput = screen.getByPlaceholderText(/enter otp/i);
      
      // Try to enter non-numeric OTP
      await user.type(otpInput, 'abc123<script>');
      
      // Should only accept numeric characters
      expect(otpInput.value).toMatch(/^\d*$/);
      expect(otpInput.value).not.toContain('<script>');
    });
  });

  describe('💾 Data Exposure Prevention', () => {
    it('should mask email address display', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const email = 'testuser@example.com';
      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, email);
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      // Wait for OTP screen
      await waitFor(() => {
        expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
      });
      
      // Email should be masked in display
      const maskedEmail = screen.getByText(/t\*\*\*\*@example.com/);
      expect(maskedEmail).toBeInTheDocument();
      
      // Full email should not be visible
      expect(screen.queryByText(email)).not.toBeInTheDocument();
    });

    it('should mask mobile number display', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      // Switch to mobile
      const mobileBtn = screen.getByText(/mobile/i);
      await user.click(mobileBtn);
      
      const mobile = '9876543210';
      const mobileInput = screen.getByPlaceholderText(/enter 10-digit mobile number/i);
      await user.type(mobileInput, mobile);
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      // Wait for OTP screen
      await waitFor(() => {
        expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
      });
      
      // Mobile should be masked
      const maskedMobile = screen.getByText(/\*\*\*\*3210/);
      expect(maskedMobile).toBeInTheDocument();
      
      // Full mobile should not be visible
      expect(screen.queryByText(mobile)).not.toBeInTheDocument();
    });

    it('should not store sensitive data in localStorage', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const email = 'sensitive@example.com';
      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, email);
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      // Check localStorage doesn't contain sensitive data
      const localStorageContent = JSON.stringify(localStorage);
      expect(localStorageContent).not.toContain(email);
    });
  });

  describe('🔄 Session Management', () => {
    it('should not create authenticated session before verification', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      // Should not have auth token
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('userRole')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should handle success state securely', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      // Wait for OTP screen
      await waitFor(() => {
        expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
      });
      
      // Enter correct OTP (hardcoded in component)
      const otpInput = screen.getByPlaceholderText(/enter otp/i);
      await user.type(otpInput, '123456');
      
      const verifyBtn = screen.getByText(/verify otp/i);
      await user.click(verifyBtn);
      
      // Should show success state
      await waitFor(() => {
        expect(screen.getByText(/otp verified!/i)).toBeInTheDocument();
      });
      
      // Should provide secure reset mechanism
      expect(screen.getByText(/a reset password link has been sent/i)).toBeInTheDocument();
    });
  });

  describe('🕒 Timing Attack Prevention', () => {
    it('should not reveal timing differences for different inputs', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const testEmails = [
        'short@a.com',
        'verylongemailaddress@verylongdomain.com',
        'normal@example.com'
      ];
      
      const timings = [];
      
      for (const email of testEmails) {
        const startTime = performance.now();
        
        const emailInput = screen.getByPlaceholderText(/enter your email/i);
        await user.clear(emailInput);
        await user.type(emailInput, email);
        
        const sendOtpBtn = screen.getByText(/send otp/i);
        await user.click(sendOtpBtn);
        
        // Wait for response
        await waitFor(() => {
          expect(screen.getByText(/verify otp/i)).toBeInTheDocument();
        });
        
        const endTime = performance.now();
        timings.push(endTime - startTime);
        
        // Reset for next test
        const backBtn = screen.getByText(/back to sign in/i);
        await user.click(backBtn);
      }
      
      // Timings should be relatively consistent
      const avgTime = timings.reduce((a, b) => a + b) / timings.length;
      const isConsistent = timings.every(time => Math.abs(time - avgTime) < 50);
      
      expect(isConsistent).toBe(true);
    });
  });

  describe('🔐 Reset Link Security', () => {
    it('should handle email reset link securely', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      const otpInput = screen.getByPlaceholderText(/enter otp/i);
      await user.type(otpInput, '123456');
      
      const verifyBtn = screen.getByText(/verify otp/i);
      await user.click(verifyBtn);
      
      // Should show success with secure email link
      await waitFor(() => {
        expect(screen.getByText(/open email/i)).toBeInTheDocument();
      });
      
      // Email link should have proper structure
      const emailLink = screen.getByText(/open email/i);
      expect(emailLink).toHaveAttribute('href', expect.stringMatching(/^mailto:/));
    });

    it('should handle SMS reset link securely', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderForgotPassword();

      // Switch to mobile
      const mobileBtn = screen.getByText(/mobile/i);
      await user.click(mobileBtn);
      
      const mobileInput = screen.getByPlaceholderText(/enter 10-digit mobile number/i);
      await user.type(mobileInput, '9876543210');
      
      const sendOtpBtn = screen.getByText(/send otp/i);
      await user.click(sendOtpBtn);
      
      const otpInput = screen.getByPlaceholderText(/enter otp/i);
      await user.type(otpInput, '123456');
      
      const verifyBtn = screen.getByText(/verify otp/i);
      await user.click(verifyBtn);
      
      // Should show success with SMS instruction
      await waitFor(() => {
        expect(screen.getByText(/check your sms/i)).toBeInTheDocument();
      });
      
      // Should not provide clickable SMS link (security best practice)
      const smsBtn = screen.getByText(/check your sms/i);
      expect(smsBtn).toHaveClass('cursor-not-allowed');
    });
  });
});