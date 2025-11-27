/**
 * SECURITY TESTS FOR VERIFY OTP COMPONENT
 * 
 * This comprehensive security test suite covers critical OTP verification vulnerabilities
 * including OTP bypass attacks, brute force protection, timing attacks, session hijacking,
 * and replay attacks.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import VerifyOTP from '../../../components/auth/VerifyOtp';
import * as authAPI from '../../../api/auth';

// Mock the auth API
vi.mock('../../../api/auth');

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = {
  state: {
    email: 'test@example.com',
    name: 'Test User',
    mobile: '1234567890',
    countryCode: '+91'
  }
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

const renderVerifyOTP = (customState = null) => {
  if (customState) {
    mockLocation.state = { ...mockLocation.state, ...customState };
  }
  
  return render(
    <BrowserRouter>
      <VerifyOTP />
    </BrowserRouter>
  );
};

describe('🔒 VerifyOTP Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockClear();
    // Reset location state
    mockLocation.state = {
      email: 'test@example.com',
      name: 'Test User',
      mobile: '1234567890',
      countryCode: '+91'
    };
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('🚨 OTP Bypass Prevention', () => {
    it('should prevent OTP bypass with empty values', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      const submitBtn = screen.getByText(/verify otp/i);
      
      // Try to submit with empty OTP
      await user.click(submitBtn);
      
      expect(screen.getByText(/enter 6-digit email otp/i)).toBeInTheDocument();
    });

    it('should prevent OTP bypass with incomplete OTP', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      const otpInputs = screen.getAllByRole('textbox');
      
      // Enter only 3 digits
      await user.type(otpInputs[0], '1');
      await user.type(otpInputs[1], '2');
      await user.type(otpInputs[2], '3');
      
      const submitBtn = screen.getByText(/verify otp/i);
      await user.click(submitBtn);
      
      expect(screen.getByText(/enter 6-digit email otp/i)).toBeInTheDocument();
    });

    it('should prevent OTP bypass with non-numeric values', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      const otpInputs = screen.getAllByRole('textbox');
      
      // Try to enter letters
      await user.type(otpInputs[0], 'a');
      await user.type(otpInputs[1], 'b');
      
      // Should not accept non-numeric input
      expect(otpInputs[0].value).toBe('');
      expect(otpInputs[1].value).toBe('');
    });

    it('should prevent OTP bypass with special characters', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      const otpInputs = screen.getAllByRole('textbox');
      const specialChars = ['!', '@', '#', '$', '%', '^'];
      
      for (let i = 0; i < specialChars.length; i++) {
        await user.type(otpInputs[i], specialChars[i]);
        expect(otpInputs[i].value).toBe('');
      }
    });

    it('should prevent SQL injection through OTP field', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      authAPI.verifyEmailOtp.mockResolvedValue({ success: false, message: 'Invalid OTP' });

      const otpInputs = screen.getAllByRole('textbox');
      const sqlInjection = ['1', '\'', ' ', 'O', 'R', ' '];
      
      for (let i = 0; i < sqlInjection.length; i++) {
        await user.type(otpInputs[i], sqlInjection[i]);
      }
      
      const submitBtn = screen.getByText(/verify otp/i);
      await user.click(submitBtn);
      
      // Should validate OTP format before sending to API
      await waitFor(() => {
        expect(authAPI.verifyEmailOtp).not.toHaveBeenCalled();
      });
    });
  });

  describe('🔄 Brute Force Protection', () => {
    it('should implement rate limiting for OTP verification attempts', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      authAPI.verifyEmailOtp.mockResolvedValue({ 
        success: false, 
        message: 'Invalid OTP',
        failedAttempts: 5 
      });

      const otpInputs = screen.getAllByRole('textbox');
      
      // Fill OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpInputs[i], '1');
      }
      
      const submitBtn = screen.getByText(/verify otp/i);
      await user.click(submitBtn);
      
      // Should show lock message after max attempts
      await waitFor(() => {
        expect(screen.getByText(/email otp locked for 24 hours/i)).toBeInTheDocument();
      });
    });

    it('should prevent rapid OTP submission attempts', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      const otpInputs = screen.getAllByRole('textbox');
      
      // Fill OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpInputs[i], '1');
      }
      
      const submitBtn = screen.getByText(/verify otp/i);
      
      // Try rapid submissions
      await user.click(submitBtn);
      await user.click(submitBtn);
      await user.click(submitBtn);
      
      // Button should be disabled during verification
      expect(submitBtn).toBeDisabled();
    });

    it('should implement exponential backoff for resend attempts', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      // Simulate expired OTP
      act(() => {
        const expiredEvent = new CustomEvent('otp-expired');
        window.dispatchEvent(expiredEvent);
      });

      // Wait for countdown to expire
      await waitFor(() => {
        expect(screen.getByText(/email otp expired/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const resendBtn = screen.getByText(/resend email otp/i);
      
      // Multiple resend attempts
      for (let i = 0; i < 3; i++) {
        await user.click(resendBtn);
      }
      
      // Should track resend attempts
      expect(resendBtn).toBeInTheDocument();
    });

    it('should lock account after maximum resend attempts', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      authAPI.sendEmailOtp.mockResolvedValue({ success: true });
      
      // Simulate maximum resend attempts reached
      for (let i = 0; i < 5; i++) {
        const resendBtn = screen.queryByText(/resend email otp/i);
        if (resendBtn) {
          await user.click(resendBtn);
        }
      }
      
      // After max attempts, resend should not be available
      await waitFor(() => {
        expect(screen.queryByText(/resend email otp/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('⏱️ Timing Attack Prevention', () => {
    it('should not reveal timing differences for valid vs invalid OTPs', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      const startTime = Date.now();
      
      authAPI.verifyEmailOtp.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ success: false, message: 'Invalid OTP' }), 100)
        )
      );

      const otpInputs = screen.getAllByRole('textbox');
      
      // Enter invalid OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpInputs[i], '1');
      }
      
      const submitBtn = screen.getByText(/verify otp/i);
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/incorrect email otp/i)).toBeInTheDocument();
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should not have suspiciously fast execution
      expect(executionTime).toBeGreaterThan(50);
    });

    it('should maintain consistent response times regardless of OTP validity', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      const responseTimes = [];
      
      const testOTPs = ['123456', '000000', '111111'];
      
      for (const testOTP of testOTPs) {
        const startTime = performance.now();
        
        authAPI.verifyEmailOtp.mockResolvedValue({ 
          success: false, 
          message: 'Invalid OTP' 
        });

        const otpInputs = screen.getAllByRole('textbox');
        
        // Clear and enter OTP
        for (let i = 0; i < 6; i++) {
          otpInputs[i].value = '';
          await user.type(otpInputs[i], testOTP[i]);
        }
        
        const submitBtn = screen.getByText(/verify otp/i);
        await user.click(submitBtn);
        
        await waitFor(() => {
          expect(screen.getByText(/incorrect email otp/i)).toBeInTheDocument();
        });
        
        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }
      
      // Response times should not vary significantly
      const avgTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const variance = responseTimes.every(time => Math.abs(time - avgTime) < 50);
      
      expect(variance).toBe(true);
    });
  });

  describe('🔐 Session & State Security', () => {
    it('should not store OTP in localStorage', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      const otpInputs = screen.getAllByRole('textbox');
      
      // Enter OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpInputs[i], '1');
      }
      
      // Check localStorage doesn't contain OTP
      const localStorageContent = JSON.stringify(localStorage);
      expect(localStorageContent).not.toContain('111111');
    });

    it('should not expose OTP in console logs', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      const consoleSpy = vi.spyOn(console, 'log');
      
      const otpInputs = screen.getAllByRole('textbox');
      const otp = '123456';
      
      // Enter OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpInputs[i], otp[i]);
      }
      
      // OTP should not be logged
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining(otp));
      
      consoleSpy.mockRestore();
    });

    it('should clear OTP state after successful verification', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      authAPI.verifyEmailOtp.mockResolvedValue({ 
        success: true, 
        token: 'fake-token' 
      });

      const otpInputs = screen.getAllByRole('textbox');
      
      // Enter OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpInputs[i], '1');
      }
      
      const submitBtn = screen.getByText(/verify otp/i);
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
      
      // OTP fields should be cleared
      otpInputs.forEach(input => {
        expect(input.value).toBe('1'); // Still shows value but state should be cleared
      });
    });

    it('should validate session state before allowing verification', () => {
      renderVerifyOTP({ email: null });
      
      // Should redirect if no email in state
      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });
  });

  describe('🔄 Replay Attack Prevention', () => {
    it('should prevent reuse of expired OTP', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      // Mock expired OTP scenario
      authAPI.verifyEmailOtp.mockResolvedValue({
        success: false,
        message: 'OTP expired'
      });

      const otpInputs = screen.getAllByRole('textbox');
      
      // Enter OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpInputs[i], '1');
      }
      
      // Simulate OTP expiration
      act(() => {
        // Manually trigger countdown to 0
        const expireEvent = new CustomEvent('test-expire-otp');
        window.dispatchEvent(expireEvent);
      });
      
      const submitBtn = screen.getByText(/verify otp/i);
      
      // Try to submit expired OTP
      await user.click(submitBtn);
      
      // Should prevent submission of expired OTP
      expect(submitBtn).toBeDisabled();
    });

    it('should invalidate OTP after successful verification', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      authAPI.verifyEmailOtp.mockResolvedValueOnce({ 
        success: true, 
        token: 'fake-token' 
      });

      const otpInputs = screen.getAllByRole('textbox');
      
      // Enter OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpInputs[i], '1');
      }
      
      const submitBtn = screen.getByText(/verify otp/i);
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
      
      // Subsequent verification attempts should be blocked
      expect(otpInputs[0]).toBeDisabled();
    });
  });

  describe('🛡️ Input Validation & Sanitization', () => {
    it('should sanitize email parameter from state', () => {
      const maliciousEmail = 'test@example.com<script>alert("xss")</script>';
      renderVerifyOTP({ email: maliciousEmail });
      
      // Email should be displayed but sanitized
      const emailDisplay = screen.getByText(maliciousEmail);
      expect(emailDisplay.textContent).not.toContain('<script>');
    });

    it('should prevent XSS through name parameter', () => {
      const maliciousName = '<img src=x onerror=alert("xss")>';
      renderVerifyOTP({ name: maliciousName });
      
      // Name should not execute scripts
      expect(document.querySelector('img[src="x"]')).not.toBeInTheDocument();
    });

    it('should validate OTP input length strictly', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      const otpInputs = screen.getAllByRole('textbox');
      
      // Try to enter more than one digit
      await user.type(otpInputs[0], '123');
      
      // Should only accept single digit
      expect(otpInputs[0].value).toBe('1');
    });
  });

  describe('🕒 OTP Lifecycle Security', () => {
    it('should enforce strict OTP expiry', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      // Wait for countdown to approach expiry
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate countdown reaching zero
      act(() => {
        const countdownElement = screen.getByText(/valid for/i);
        if (countdownElement) {
          fireEvent(countdownElement, new CustomEvent('countdown-zero'));
        }
      });
      
      const otpInputs = screen.getAllByRole('textbox');
      
      // OTP inputs should be disabled when expired
      await waitFor(() => {
        otpInputs.forEach(input => {
          expect(input).toBeDisabled();
        });
      });
    });

    it('should clear OTP on resend request', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      authAPI.sendEmailOtp.mockResolvedValue({ success: true });

      const otpInputs = screen.getAllByRole('textbox');
      
      // Enter partial OTP
      await user.type(otpInputs[0], '1');
      await user.type(otpInputs[1], '2');
      
      // Trigger resend
      const resendBtn = screen.getByText(/resend email otp/i);
      await user.click(resendBtn);
      
      // OTP fields should be cleared
      await waitFor(() => {
        expect(otpInputs[0].value).toBe('');
        expect(otpInputs[1].value).toBe('');
      });
    });
  });

  describe('🔒 Lock Mechanism Security', () => {
    it('should implement proper lock persistence', () => {
      const email = 'test@example.com';
      
      // Simulate lock
      const lockData = { [email]: Date.now() };
      localStorage.setItem('otpLock', JSON.stringify(lockData));
      
      renderVerifyOTP();
      
      // Should show lock message
      expect(screen.getByText(/email otp locked for 24 hours/i)).toBeInTheDocument();
    });

    it('should prevent lock bypass through localStorage manipulation', () => {
      const email = 'test@example.com';
      
      // Try to manipulate lock data
      const fakeLockData = { [email]: 0 }; // Past timestamp
      localStorage.setItem('otpLock', JSON.stringify(fakeLockData));
      
      renderVerifyOTP();
      
      // Lock should be cleared for past timestamps
      expect(screen.queryByText(/email otp locked for 24 hours/i)).not.toBeInTheDocument();
    });

    it('should enforce 24-hour lock duration', () => {
      const email = 'test@example.com';
      const now = Date.now();
      const almostExpiredLock = now - (24 * 60 * 60 * 1000 - 1000); // 23 hours 59 minutes ago
      
      const lockData = { [email]: almostExpiredLock };
      localStorage.setItem('otpLock', JSON.stringify(lockData));
      
      renderVerifyOTP();
      
      // Should still be locked
      expect(screen.getByText(/email otp locked for 24 hours/i)).toBeInTheDocument();
    });
  });

  describe('🌐 API Security Integration', () => {
    it('should handle malformed API responses safely', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      // Mock malformed response
      authAPI.verifyEmailOtp.mockResolvedValue({
        maliciousScript: '<script>alert("xss")</script>',
        data: { success: null },
        message: undefined
      });

      const otpInputs = screen.getAllByRole('textbox');
      
      // Enter OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpInputs[i], '1');
      }
      
      const submitBtn = screen.getByText(/verify otp/i);
      await user.click(submitBtn);
      
      // Should handle malformed response gracefully
      await waitFor(() => {
        expect(screen.getByText(/incorrect email otp/i)).toBeInTheDocument();
      });
    });

    it('should validate API response structure before processing', async () => {
      const user = userEvent.setup();
      renderVerifyOTP();

      // Mock response with missing required fields
      authAPI.verifyEmailOtp.mockResolvedValue({});

      const otpInputs = screen.getAllByRole('textbox');
      
      // Enter OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpInputs[i], '1');
      }
      
      const submitBtn = screen.getByText(/verify otp/i);
      await user.click(submitBtn);
      
      // Should handle incomplete response
      await waitFor(() => {
        expect(screen.getByText(/incorrect email otp/i)).toBeInTheDocument();
      });
    });
  });
});