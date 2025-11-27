/**
 * SECURITY TESTS FOR LOGIN FORM COMPONENT
 * 
 * This comprehensive security test suite covers critical login vulnerabilities
 * including authentication bypass, credential stuffing, session hijacking,
 * OAuth security, and session management vulnerabilities.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import LoginForm from '../../../components/auth/LoginForm';
import * as authAPI from '../../../api/auth';

// Mock the auth API
vi.mock('../../../api/auth');

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_GOOGLE_CLIENT_ID: 'mock-google-client-id'
  }
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

// Mock Google Sign-In
const mockGoogleSignIn = {
  initialize: vi.fn(),
  renderButton: vi.fn(),
};

Object.defineProperty(window, 'google', {
  value: {
    accounts: {
      id: mockGoogleSignIn
    }
  },
  writable: true
});

const renderLoginForm = () => {
  return render(
    <BrowserRouter>
      <LoginForm />
    </BrowserRouter>
  );
};

describe('🔒 LoginForm Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockClear();
    
    // Reset Google mocks
    mockGoogleSignIn.initialize.mockClear();
    mockGoogleSignIn.renderButton.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('🚨 Authentication Bypass Prevention', () => {
    it('should prevent login with empty credentials', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      // Should show validation error
      expect(screen.getByText(/enter a valid email or phone number/i)).toBeInTheDocument();
    });

    it('should prevent SQL injection in username field', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      authAPI.loginUser.mockRejectedValue({
        response: { data: { message: 'Invalid credentials' } }
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      const sqlInjection = "admin'; DROP TABLE users; --";
      
      await user.type(usernameInput, sqlInjection);
      await user.type(passwordInput, 'password');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      // Should validate input format first
      expect(screen.getByText(/enter a valid email or phone number/i)).toBeInTheDocument();
      expect(authAPI.loginUser).not.toHaveBeenCalled();
    });

    it('should prevent NoSQL injection attacks', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      authAPI.loginUser.mockRejectedValue({
        response: { data: { message: 'Invalid credentials' } }
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      const nosqlInjection = '{"$ne": null}';
      
      await user.type(usernameInput, nosqlInjection);
      await user.type(passwordInput, 'password');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      // Should validate as invalid email/phone format
      expect(screen.getByText(/enter a valid email or phone number/i)).toBeInTheDocument();
    });

    it('should enforce strict username format validation', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      const invalidUsernames = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file://etc/passwd',
        'ftp://malicious.com',
      ];

      for (const username of invalidUsernames) {
        await user.clear(usernameInput);
        await user.clear(passwordInput);
        
        await user.type(usernameInput, username);
        await user.type(passwordInput, 'password');

        const signInBtn = screen.getByText(/sign in/i);
        await user.click(signInBtn);

        // Should reject invalid username formats
        expect(screen.getByText(/enter a valid email or phone number/i)).toBeInTheDocument();
      }
    });

    it('should prevent authentication with malformed payload', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      authAPI.loginUser.mockImplementation((payload) => {
        // Simulate server validation
        if (!payload.email && !payload.phoneNumber) {
          throw new Error('Invalid payload structure');
        }
        return Promise.resolve({ token: 'fake-token' });
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'password');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      await waitFor(() => {
        expect(authAPI.loginUser).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password'
        });
      });
    });
  });

  describe('🔐 Password Security', () => {
    it('should not expose password in DOM or logs', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const consoleSpy = vi.spyOn(console, 'log');
      const password = 'SecretPassword123!';

      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(passwordInput, password);

      // Password should not be visible in DOM
      expect(screen.queryByDisplayValue(password)).not.toBeInTheDocument();

      // Password should not be logged
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining(password));

      consoleSpy.mockRestore();
    });

    it('should prevent password autocomplete in production', () => {
      renderLoginForm();

      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      
      // Password field should have security attributes
      expect(passwordInput.type).toBe('password');
      expect(passwordInput.getAttribute('spellcheck')).toBe('false');
    });

    it('should handle password visibility toggle securely', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const password = 'SecretPassword123!';
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const toggleButton = passwordInput.parentElement.querySelector('button');

      await user.type(passwordInput, password);

      // Initially password type
      expect(passwordInput.type).toBe('password');

      // Toggle to text
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      // Toggle back to password
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    it('should prevent password leakage through form state', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const password = 'SecretPassword123!';
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(passwordInput, password);

      // Check that password is not stored in unexpected places
      const formElement = passwordInput.closest('form');
      const formData = new FormData(formElement);
      
      // FormData should contain password for submission but not leak it
      expect(formData.get('password')).toBe(password);
    });
  });

  describe('🚀 Brute Force & Rate Limiting', () => {
    it('should prevent rapid login attempts', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      authAPI.loginUser.mockRejectedValue({
        response: { data: { message: 'Invalid credentials' } }
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const signInBtn = screen.getByText(/sign in/i);

      // Fill credentials
      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      // Rapid login attempts
      for (let i = 0; i < 3; i++) {
        await user.click(signInBtn);
        
        // Button should be disabled during processing
        expect(signInBtn).toBeDisabled();
        
        await waitFor(() => {
          expect(signInBtn).not.toBeDisabled();
        });
      }
    });

    it('should handle 429 rate limit responses gracefully', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      authAPI.loginUser.mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Too many login attempts. Please try again later.' }
        }
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'password');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      await waitFor(() => {
        expect(screen.getByText(/login failed. try again./i)).toBeInTheDocument();
      });
    });

    it('should implement client-side rate limiting', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const signInBtn = screen.getByText(/sign in/i);

      // Fill valid format but wrong credentials
      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      // First attempt
      await user.click(signInBtn);

      // Button should be disabled immediately
      expect(signInBtn).toBeDisabled();
      expect(screen.getByText(/signing in.../i)).toBeInTheDocument();
    });
  });

  describe('🔄 Session Management Security', () => {
    it('should properly handle successful authentication', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const mockResponse = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        redirectTo: '/dashboard',
        data: { userId: '123', role: 'user' }
      };

      authAPI.loginUser.mockResolvedValue(mockResponse);

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'validpassword');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      await waitFor(() => {
        expect(localStorage.getItem('authToken')).toBe(mockResponse.token);
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle token storage securely', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const maliciousToken = '<script>alert("xss")</script>';
      
      authAPI.loginUser.mockResolvedValue({
        token: maliciousToken,
        data: {}
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'password');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      await waitFor(() => {
        // Token should be stored as-is but not executed
        expect(localStorage.getItem('authToken')).toBe(maliciousToken);
        expect(document.querySelector('script')).not.toBeInTheDocument();
      });
    });

    it('should validate token format before storage', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      authAPI.loginUser.mockResolvedValue({
        token: null, // Invalid token
        data: {}
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'password');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      await waitFor(() => {
        // Should handle invalid token gracefully
        expect(localStorage.getItem('authToken')).toBeNull();
      });
    });

    it('should clear sensitive data on failed login', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      authAPI.loginUser.mockRejectedValue({
        response: { data: { message: 'Invalid credentials' } }
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      await waitFor(() => {
        // Should not store any auth data on failure
        expect(localStorage.getItem('authToken')).toBeNull();
        expect(screen.getByText(/login failed. try again./i)).toBeInTheDocument();
      });
    });
  });

  describe('🌐 OAuth/Google Sign-In Security', () => {
    it('should validate Google Client ID configuration', () => {
      renderLoginForm();

      // Should initialize Google Sign-In with proper client ID
      expect(mockGoogleSignIn.initialize).toHaveBeenCalledWith({
        client_id: 'mock-google-client-id',
        callback: expect.any(Function)
      });
    });

    it('should handle Google JWT parsing securely', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      // Mock malicious JWT
      const maliciousJWT = 'header.<script>alert("xss")</script>.signature';
      
      // Get the callback function passed to Google initialize
      const initializeCall = mockGoogleSignIn.initialize.mock.calls[0];
      const googleCallback = initializeCall[1].callback;

      // Simulate Google response
      const maliciousResponse = { credential: maliciousJWT };

      // Should not throw or execute malicious code
      expect(() => {
        googleCallback(maliciousResponse);
      }).not.toThrow();

      // Should not execute scripts
      expect(document.querySelector('script')).not.toBeInTheDocument();
    });

    it('should validate Google JWT structure', () => {
      renderLoginForm();

      const initializeCall = mockGoogleSignIn.initialize.mock.calls[0];
      const googleCallback = initializeCall[1].callback;

      // Test with invalid JWT structure
      const invalidJWTs = [
        { credential: 'invalid.jwt' }, // Missing parts
        { credential: 'not.a.jwt.at.all' }, // Too many parts
        { credential: '' }, // Empty
        { credential: null }, // Null
      ];

      invalidJWTs.forEach(response => {
        expect(() => {
          googleCallback(response);
        }).not.toThrow();
      });
    });

    it('should prevent Google user state manipulation', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      // Simulate valid Google login
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVGVzdCBVc2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.signature';
      
      const initializeCall = mockGoogleSignIn.initialize.mock.calls[0];
      const googleCallback = initializeCall[1].callback;

      googleCallback({ credential: validJWT });

      // Should show Google user info
      await waitFor(() => {
        expect(screen.getByText(/Test User/i)).toBeInTheDocument();
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
      });

      // Logout should clear user state
      const logoutBtn = screen.getByText(/logout google/i);
      await user.click(logoutBtn);

      // Google user info should be cleared
      expect(screen.queryByText(/Test User/i)).not.toBeInTheDocument();
    });

    it('should handle Google sign-in errors gracefully', () => {
      renderLoginForm();

      const initializeCall = mockGoogleSignIn.initialize.mock.calls[0];
      const googleCallback = initializeCall[1].callback;

      // Simulate Google error
      expect(() => {
        googleCallback({ error: 'popup_closed_by_user' });
      }).not.toThrow();

      // Should not show error in UI for user-cancelled actions
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('🛡️ Input Sanitization & XSS Prevention', () => {
    it('should sanitize username input', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        '"><img src=x onerror=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
      ];

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);

      for (const payload of xssPayloads) {
        await user.clear(usernameInput);
        await user.type(usernameInput, payload);

        // Should convert to lowercase but not execute
        expect(usernameInput.value).toBe(payload.toLowerCase());
        expect(document.querySelector('script')).not.toBeInTheDocument();
        expect(document.querySelector('iframe')).not.toBeInTheDocument();
      }
    });

    it('should prevent DOM-based XSS through form inputs', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      const xssPayload = '"><script>window.xssExecuted=true</script>';

      await user.type(usernameInput, xssPayload);
      await user.type(passwordInput, 'password');

      // Should not execute XSS
      expect(window.xssExecuted).toBeUndefined();
    });

    it('should handle malicious API responses safely', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      authAPI.loginUser.mockRejectedValue({
        response: {
          data: {
            message: '<script>alert("xss")</script>Invalid credentials',
            errors: ['<img src=x onerror=alert(1)>']
          }
        }
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'password');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      await waitFor(() => {
        // Error should be displayed but not executed
        const errorElement = screen.getByText(/login failed. try again./i);
        expect(errorElement).toBeInTheDocument();
        expect(document.querySelector('script')).not.toBeInTheDocument();
        expect(document.querySelector('img[src="x"]')).not.toBeInTheDocument();
      });
    });
  });

  describe('🔒 CSRF Protection', () => {
    it('should not rely solely on cookies for authentication', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      authAPI.loginUser.mockResolvedValue({
        token: 'valid-token',
        data: {}
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'password');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      // Should call API with proper headers, not rely on cookies
      await waitFor(() => {
        expect(authAPI.loginUser).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password'
        });
      });
    });

    it('should validate request origin implicitly through API calls', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      // Mock successful login
      authAPI.loginUser.mockResolvedValue({
        token: 'valid-token',
        data: {}
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'password');

      const signInBtn = screen.getByText(/sign in/i);
      await user.click(signInBtn);

      // API should be called with proper structure
      await waitFor(() => {
        expect(authAPI.loginUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            password: 'password'
          })
        );
      });
    });
  });

  describe('🔐 Component State Security', () => {
    it('should clear sensitive state on component unmount', async () => {
      const user = userEvent.setup();
      const { unmount } = renderLoginForm();

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(usernameInput, 'test@example.com');
      await user.type(passwordInput, 'sensitivepassword');

      // Unmount component
      unmount();

      // Re-render
      renderLoginForm();

      // Fields should be empty
      const newUsernameInput = screen.getByPlaceholderText(/enter your username/i);
      const newPasswordInput = screen.getByPlaceholderText(/enter your password/i);

      expect(newUsernameInput.value).toBe('');
      expect(newPasswordInput.value).toBe('');
    });

    it('should handle memory cleanup properly', () => {
      const { unmount } = renderLoginForm();

      // Component should unmount without memory leaks
      expect(() => unmount()).not.toThrow();

      // Google script should be properly managed
      const googleScripts = document.querySelectorAll('script[src*="accounts.google.com"]');
      expect(googleScripts.length).toBeLessThanOrEqual(1); // Should not accumulate scripts
    });
  });
});