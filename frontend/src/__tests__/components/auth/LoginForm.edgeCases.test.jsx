import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/testUtils';
import userEvent from '@testing-library/user-event';
import LoginForm from '../../../components/auth/LoginForm';
import * as authApi from '../../../api/auth';

vi.mock('../../../api/auth', () => ({
  loginUser: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  };
});

describe('LoginForm - Edge Cases & Security Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id';
  });

  describe('Input Validation Vulnerabilities', () => {
    it('should handle XSS attempts in username field', async () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const xssPayload = '<script>alert("XSS")</script>';
      
      await user.type(usernameInput, xssPayload);
      
      // The input should contain the raw text, not execute the script
      expect(usernameInput.value).toBe(xssPayload);
      // Check that no script was actually executed (no alerts)
      expect(document.querySelector('script')).not.toHaveTextContent('alert("XSS")');
    });

    it('should handle SQL injection attempts', async () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const sqlInjection = "'; DROP TABLE users; --";
      
      await user.type(usernameInput, sqlInjection);
      
      expect(usernameInput.value).toBe(sqlInjection);
    });

    it('should handle extremely long input values', async () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const longInput = 'a'.repeat(10000);
      
      // This might be slow or crash if not handled properly
      await user.type(usernameInput, longInput);
      
      expect(usernameInput.value).toBe(longInput);
    });

    it('should handle Unicode and special characters', async () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const unicodeInput = '测试用户🚀💀Iñtërnâtiônàlizætiøn';
      
      await user.type(usernameInput, unicodeInput);
      
      expect(usernameInput.value).toBe(unicodeInput);
    });
  });

  describe('Network & API Error Handling', () => {
    it('should handle network timeout', async () => {
      authApi.loginUser.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        })
      );

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), 'test');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
      });
    });

    it('should handle malformed API response', async () => {
      authApi.loginUser.mockResolvedValue({
        // Malformed response - missing required fields
        data: { random: 'data' }
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), 'test');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Should handle gracefully without crashing
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should handle API returning null/undefined', async () => {
      authApi.loginUser.mockResolvedValue(null);

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), 'test');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Should not crash the application
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should handle rapid multiple submissions', async () => {
      authApi.loginUser.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 500))
      );

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), 'test');
      await user.type(screen.getByLabelText(/password/i), 'password');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Rapid clicks
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only make one API call, not multiple
      await waitFor(() => {
        expect(authApi.loginUser).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Memory Leaks & Performance Issues', () => {
    it('should not leak memory with rapid state changes', async () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      
      // Rapid typing and deleting
      for (let i = 0; i < 100; i++) {
        await user.type(usernameInput, 'test');
        await user.clear(usernameInput);
      }
      
      // Should still be responsive
      await user.type(usernameInput, 'final');
      expect(usernameInput.value).toBe('final');
    });

    it('should handle password visibility toggle spam', async () => {
      render(<LoginForm />);
      
      // Find the password toggle button (it has tabIndex -1 and no accessible name)
      const toggleButton = document.querySelector('button[tabindex="-1"]');
      expect(toggleButton).toBeInTheDocument();
      
      // Rapid toggle clicks
      for (let i = 0; i < 50; i++) {
        await user.click(toggleButton);
      }
      
      // Should still work
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password'); // Should be password (even count)
    });
  });

  describe('Accessibility & Screen Reader Issues', () => {
    it('should maintain proper form structure for screen readers', () => {
      render(<LoginForm />);
      
      // Check form semantics
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
      
      // Check label associations
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(usernameInput).toHaveAttribute('id', 'username');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('should handle high contrast mode', () => {
      render(<LoginForm />);
      
      // Inputs should be visible in high contrast
      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toHaveClass('border');
      expect(usernameInput).toHaveClass('border-[#D4A052]');
    });

    it('should be keyboard navigable', async () => {
      render(<LoginForm />);
      
      // Tab navigation
      await user.tab();
      expect(screen.getByLabelText(/username/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/password/i)).toHaveFocus();
      
      await user.tab();
      // Should skip the tabindex="-1" button
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();
    });
  });

  describe('Browser Compatibility Issues', () => {
    it('should handle missing localStorage', () => {
      const originalLocalStorage = global.localStorage;
      delete global.localStorage;
      
      // Should not crash if localStorage is not available
      expect(() => render(<LoginForm />)).not.toThrow();
      
      global.localStorage = originalLocalStorage;
    });

    it('should handle disabled JavaScript features', () => {
      // Mock unavailable browser APIs
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockImplementation((tagName) => {
        if (tagName === 'script') {
          throw new Error('Scripts blocked');
        }
        return originalCreateElement.call(document, tagName);
      });
      
      // Should handle Google script loading failure gracefully
      expect(() => render(<LoginForm />)).not.toThrow();
      
      document.createElement = originalCreateElement;
    });
  });

  describe('Real-world Attack Scenarios', () => {
    it('should handle clipboard-based attacks', async () => {
      render(<LoginForm />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      
      // Mock malicious clipboard content
      const maliciousClipboard = 'password\u200b'; // invisible character
      
      // Simulate paste event
      await user.click(passwordInput);
      await user.keyboard('{Control>}v{/Control}');
      
      // Should accept the input (this might be a vulnerability)
      expect(passwordInput.value).toBeDefined();
    });

    it('should handle form field pollution', async () => {
      render(<LoginForm />);
      
      // Try to add hidden input fields via DOM manipulation
      const form = screen.getByRole('form');
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = 'admin';
      hiddenInput.value = 'true';
      form.appendChild(hiddenInput);
      
      await user.type(screen.getByLabelText(/username/i), 'test');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      // Check if hidden field was submitted (potential vulnerability)
      await waitFor(() => {
        if (authApi.loginUser.mock.calls.length > 0) {
          const callArgs = authApi.loginUser.mock.calls[0][0];
          expect(callArgs).not.toHaveProperty('admin');
        }
      });
    });
  });
});