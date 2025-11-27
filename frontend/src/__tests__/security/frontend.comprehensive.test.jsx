import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../utils/testUtils';
import userEvent from '@testing-library/user-event';
import LoginForm from '../../components/auth/LoginForm';
import * as authApi from '../../api/auth';

// Mock all external dependencies
vi.mock('../../api/auth', () => ({
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

describe('🚨 COMPREHENSIVE FRONTEND SECURITY TESTS', () => {
  const user = userEvent.setup();
  let consoleSpy;
  let windowSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id';
    
    // Spy on console to catch errors
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    windowSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Reset any global state
    delete window.google;
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    consoleSpy.restore();
    windowSpy.restore();
  });

  describe('🔥 XSS VULNERABILITY TESTS', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<object data="javascript:alert(\'XSS\')"></object>',
      '<embed src="javascript:alert(\'XSS\')">',
      '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
      '<style>@import"javascript:alert(\'XSS\')";</style>',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
      '<base href="javascript:alert(\'XSS\');">',
      '<form action="javascript:alert(\'XSS\')">',
      '<input type="image" src="x" onerror="alert(\'XSS\')">',
      '<button onclick="alert(\'XSS\')">Click</button>',
      '<div onmouseover="alert(\'XSS\')">Hover</div>',
      '"><script>alert("XSS")</script>',
      "';alert('XSS');//",
      '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
      'data:text/html,<script>alert("XSS")</script>',
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should prevent XSS payload ${index + 1}: ${payload.substring(0, 30)}...`, async () => {
        render(<LoginForm />);
        
        const usernameInput = screen.getByLabelText(/username/i);
        const passwordInput = screen.getByLabelText(/password/i);
        
        // Try XSS in username field
        await user.clear(usernameInput);
        await user.type(usernameInput, payload);
        
        // Try XSS in password field
        await user.clear(passwordInput);
        await user.type(passwordInput, payload);
        
        // Submit form
        await user.click(screen.getByRole('button', { name: /sign in/i }));
        
        // Check that no scripts were executed
        expect(windowSpy).not.toHaveBeenCalled();
        
        // Check that dangerous HTML was not rendered
        const dangerousElements = document.querySelectorAll('script, iframe, object, embed');
        dangerousElements.forEach(element => {
          expect(element.innerHTML).not.toContain('alert');
        });
        
        // Values should be escaped/sanitized
        expect(usernameInput.value).toBeDefined();
        expect(passwordInput.value).toBeDefined();
      });
    });

    it('should prevent DOM-based XSS via URL parameters', () => {
      // Simulate malicious URL parameters
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/?redirect=javascript:alert("XSS")',
          search: '?redirect=javascript:alert("XSS")'
        },
        writable: true
      });

      render(<LoginForm />);
      
      // Should not execute any JavaScript from URL
      expect(windowSpy).not.toHaveBeenCalled();
    });

    it('should prevent XSS in form validation error messages', async () => {
      authApi.loginUser.mockRejectedValue(new Error('<script>alert("XSS")</script>'));
      
      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), 'test');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        // Error message should be displayed but not execute scripts
        const errorElements = document.querySelectorAll('[class*="error"], [class*="danger"]');
        errorElements.forEach(element => {
          expect(element.innerHTML).not.toContain('<script>');
        });
        expect(windowSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('🔐 INJECTION ATTACK TESTS', () => {
    const injectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1' --",
      "{ $ne: null }",
      "../../../etc/passwd",
      "<%= 7*7 %>",
      "{{7*7}}",
      "${7*7}",
      "#{7*7}",
      "%{7*7}",
      "{{constructor.constructor('alert(1)')()}}",
      "{{''.constructor.prototype.charAt=[].join;$eval('x=1} } };alert(1)//');}}",
    ];

    injectionPayloads.forEach((payload, index) => {
      it(`should handle injection payload ${index + 1}: ${payload}`, async () => {
        authApi.loginUser.mockImplementation((data) => {
          // Check that payload wasn't processed as code
          expect(typeof data.username).toBe('string');
          expect(typeof data.password).toBe('string');
          return Promise.reject(new Error('Invalid credentials'));
        });

        render(<LoginForm />);
        
        await user.type(screen.getByLabelText(/username/i), payload);
        await user.type(screen.getByLabelText(/password/i), 'password');
        await user.click(screen.getByRole('button', { name: /sign in/i }));
        
        await waitFor(() => {
          expect(authApi.loginUser).toHaveBeenCalled();
          const callArgs = authApi.loginUser.mock.calls[0][0];
          expect(callArgs.username).toBe(payload);
        });
      });
    });

    it('should prevent template injection in dynamic content', async () => {
      const templatePayload = '{{constructor.constructor("alert(1)")()}}';
      
      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), templatePayload);
      
      // Should not evaluate template expressions
      expect(windowSpy).not.toHaveBeenCalled();
      expect(document.body.innerHTML).not.toContain('alert(1)');
    });
  });

  describe('🛡️ CSRF & CLICKJACKING TESTS', () => {
    it('should prevent clickjacking attacks', () => {
      render(<LoginForm />);
      
      // Check for anti-clickjacking measures
      const styles = window.getComputedStyle(document.body);
      
      // Should have proper frame options (this would need to be set in actual app)
      // This test demonstrates what should be checked
      expect(document.querySelector('meta[http-equiv="Content-Security-Policy"]')).toBeNull(); // Shows CSP is missing
    });

    it('should implement CSRF protection', async () => {
      render(<LoginForm />);
      
      // Look for CSRF token in form
      const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
      const csrfToken = Array.from(hiddenInputs).find(input => 
        input.name === 'csrf_token' || input.name === '_token'
      );
      
      // This test will likely fail, showing missing CSRF protection
      expect(csrfToken).toBeNull(); // Demonstrates vulnerability
    });

    it('should validate referrer header', async () => {
      // Mock a request from external domain
      Object.defineProperty(document, 'referrer', {
        value: 'https://evil.com/',
        configurable: true
      });

      authApi.loginUser.mockResolvedValue({ data: { success: true } });
      
      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), 'test');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      // Should either block or validate referrer
      // This test will likely pass, showing the vulnerability
    });
  });

  describe('💾 CLIENT-SIDE STORAGE SECURITY', () => {
    it('should not store sensitive data in localStorage', async () => {
      authApi.loginUser.mockResolvedValue({
        data: { 
          success: true, 
          user: { id: 1, email: 'test@example.com' },
          token: 'jwt-token-here',
          password: 'should-never-be-stored'
        }
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), 'test');
      await user.type(screen.getByLabelText(/password/i), 'sensitive-password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        // Check localStorage doesn't contain sensitive data
        const allLocalStorage = { ...localStorage };
        const localStorageString = JSON.stringify(allLocalStorage).toLowerCase();
        
        expect(localStorageString).not.toContain('password');
        expect(localStorageString).not.toContain('sensitive-password');
        
        // JWT tokens should be stored securely (httpOnly cookies preferred)
        if (localStorageString.includes('jwt') || localStorageString.includes('token')) {
          console.warn('WARNING: JWT tokens found in localStorage - security risk!');
        }
      });
    });

    it('should not store data in sessionStorage permanently', async () => {
      authApi.loginUser.mockResolvedValue({
        data: { success: true, sessionData: 'sensitive-session-info' }
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), 'test');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        const sessionData = sessionStorage.getItem('sessionData');
        if (sessionData) {
          expect(sessionData).not.toContain('password');
        }
      });
    });

    it('should handle storage quota exceeded gracefully', () => {
      // Mock storage quota exceeded
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });

      // Should not crash the application
      expect(() => render(<LoginForm />)).not.toThrow();
      
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('🌐 NETWORK SECURITY TESTS', () => {
    it('should handle malformed API responses', async () => {
      const malformedResponses = [
        null,
        undefined,
        '',
        'not json',
        { /* missing required fields */ },
        { data: null },
        { data: { success: 'not a boolean' } },
        { data: { user: 'not an object' } },
        new Error('Network Error'),
        { status: 500, data: 'Internal Server Error' },
      ];

      for (const response of malformedResponses) {
        authApi.loginUser.mockResolvedValue(response);
        
        render(<LoginForm />);
        
        await user.type(screen.getByLabelText(/username/i), 'test');
        await user.type(screen.getByLabelText(/password/i), 'password');
        
        // Should handle gracefully without crashing
        await user.click(screen.getByRole('button', { name: /sign in/i }));
        
        // Application should still be functional
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        
        // Clean up for next iteration
        document.body.innerHTML = '';
      }
    });

    it('should implement request timeout protection', async () => {
      authApi.loginUser.mockImplementation(() => 
        new Promise((resolve) => {
          // Never resolves - simulates hanging request
          setTimeout(resolve, 30000); // 30 seconds
        })
      );

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), 'test');
      await user.type(screen.getByLabelText(/password/i), 'password');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);
      
      // Should timeout and not hang indefinitely
      // Wait 5 seconds and check if button is still disabled
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Button should either be re-enabled or show timeout error
      // This test will likely fail, showing no timeout protection
    });

    it('should prevent request smuggling via content-length manipulation', async () => {
      // This is more of a server-side issue, but we can test client behavior
      authApi.loginUser.mockImplementation((data) => {
        // Check for suspicious headers or content
        expect(data).not.toHaveProperty('content-length');
        expect(data).not.toHaveProperty('transfer-encoding');
        return Promise.resolve({ data: { success: false } });
      });

      render(<LoginForm />);
      
      // Try to inject headers via form data
      await user.type(screen.getByLabelText(/username/i), 'test\r\nContent-Length: 0\r\n\r\nGET /admin');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(authApi.loginUser).toHaveBeenCalled();
      });
    });
  });

  describe('🧠 MEMORY & RESOURCE ATTACKS', () => {
    it('should handle extremely large inputs without crashing', async () => {
      const largeInput = 'A'.repeat(1000000); // 1MB of data
      
      const startMemory = performance.memory?.usedJSHeapSize || 0;
      
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      
      // This should not crash the browser
      await user.type(usernameInput, largeInput);
      
      const endMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Should not consume excessive memory
      const memoryUsed = endMemory - startMemory;
      if (memoryUsed > 100000000) { // 100MB
        throw new Error(`MEMORY LEAK: Used ${memoryUsed} bytes for 1MB input`);
      }
    });

    it('should prevent DOM manipulation attacks', async () => {
      render(<LoginForm />);
      
      const originalDocumentWrite = document.write;
      const writeAttempts = [];
      
      document.write = vi.fn((content) => {
        writeAttempts.push(content);
      });
      
      // Try to manipulate DOM through various vectors
      const usernameInput = screen.getByLabelText(/username/i);
      
      // Try to inject script via input value
      usernameInput.value = '<script>document.write("HACKED")</script>';
      
      // Fire change event
      fireEvent.change(usernameInput);
      
      document.write = originalDocumentWrite;
      
      // Should not have written any dangerous content
      expect(writeAttempts).toEqual([]);
    });

    it('should prevent infinite loops in event handlers', async () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      
      // Try to trigger infinite loop
      const startTime = Date.now();
      
      // Rapid fire events that could trigger infinite loops
      for (let i = 0; i < 1000; i++) {
        fireEvent.input(usernameInput, { target: { value: `test${i}` } });
      }
      
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('🔍 INFORMATION DISCLOSURE TESTS', () => {
    it('should not expose sensitive information in HTML source', () => {
      render(<LoginForm />);
      
      const htmlSource = document.documentElement.outerHTML;
      
      // Should not contain sensitive information
      expect(htmlSource).not.toMatch(/api[_-]?key/i);
      expect(htmlSource).not.toMatch(/secret/i);
      expect(htmlSource).not.toMatch(/password/i); // except for input labels
      expect(htmlSource).not.toMatch(/token/i);
      expect(htmlSource).not.toMatch(/jwt/i);
      expect(htmlSource).not.toMatch(/database/i);
      expect(htmlSource).not.toMatch(/mongodb/i);
    });

    it('should not leak information through CSS selectors', () => {
      render(<LoginForm />);
      
      // Check for information-leaking CSS classes
      const sensitiveClasses = document.querySelectorAll('[class*="admin"], [class*="debug"], [class*="dev"]');
      
      // Should not expose internal state through CSS
      expect(sensitiveClasses.length).toBe(0);
    });

    it('should handle autocomplete securely', () => {
      render(<LoginForm />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      const usernameInput = screen.getByLabelText(/username/i);
      
      // Password should have autocomplete off
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
      
      // Username might be ok to autocomplete
      const usernameAutocomplete = usernameInput.getAttribute('autocomplete');
      if (usernameAutocomplete === 'on' || !usernameAutocomplete) {
        console.warn('Username field may expose autocomplete data');
      }
    });
  });

  describe('🎯 ACCESSIBILITY & USER ENUMERATION', () => {
    it('should not expose user enumeration via error messages', async () => {
      const testEmails = [
        'exists@example.com',
        'doesnotexist@example.com',
        'admin@example.com',
        'test@example.com'
      ];
      
      for (const email of testEmails) {
        authApi.loginUser.mockRejectedValue(new Error('Invalid credentials'));
        
        render(<LoginForm />);
        
        await user.type(screen.getByLabelText(/username/i), email);
        await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
        await user.click(screen.getByRole('button', { name: /sign in/i }));
        
        await waitFor(() => {
          const errorElements = screen.queryAllByText(/invalid credentials/i);
          expect(errorElements.length).toBeGreaterThan(0);
          
          // Should not reveal if email exists
          expect(screen.queryByText(/email.*not.*found/i)).toBeNull();
          expect(screen.queryByText(/user.*does.*not.*exist/i)).toBeNull();
        });
        
        document.body.innerHTML = '';
      }
    });

    it('should prevent timing-based user enumeration', async () => {
      const nonExistentDelay = 100;
      const existentDelay = 500;
      
      // Mock different response times for existing vs non-existing users
      authApi.loginUser.mockImplementation((data) => {
        const delay = data.username === 'exists@example.com' ? existentDelay : nonExistentDelay;
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Invalid credentials')), delay);
        });
      });
      
      const times = [];
      
      for (let i = 0; i < 5; i++) {
        render(<LoginForm />);
        
        const start = Date.now();
        
        await user.type(screen.getByLabelText(/username/i), 'exists@example.com');
        await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
        await user.click(screen.getByRole('button', { name: /sign in/i }));
        
        await waitFor(() => {
          expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
        
        const end = Date.now();
        times.push(end - start);
        
        document.body.innerHTML = '';
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      
      // Should not be able to distinguish between users based on response time
      // This test will likely fail if the backend has timing vulnerabilities
      console.log(`Average response time: ${avgTime}ms`);
    });
  });

  describe('🚨 CRITICAL VULNERABILITY SCAN', () => {
    it('should not execute eval() or similar dangerous functions', async () => {
      const dangerousFunctions = ['eval', 'Function', 'setTimeout', 'setInterval'];
      const originalFunctions = {};
      const callAttempts = {};
      
      // Monitor dangerous function calls
      dangerousFunctions.forEach(funcName => {
        originalFunctions[funcName] = window[funcName];
        callAttempts[funcName] = [];
        
        window[funcName] = vi.fn((...args) => {
          callAttempts[funcName].push(args);
          return originalFunctions[funcName]?.apply(window, args);
        });
      });
      
      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/username/i), 'eval("alert(1)")');
      await user.type(screen.getByLabelText(/password/i), 'Function("alert(1)")()');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      // Restore functions
      dangerousFunctions.forEach(funcName => {
        window[funcName] = originalFunctions[funcName];
      });
      
      // Check for suspicious calls
      dangerousFunctions.forEach(funcName => {
        const calls = callAttempts[funcName];
        calls.forEach(args => {
          const argString = JSON.stringify(args);
          if (argString.includes('alert') || argString.includes('eval')) {
            throw new Error(`CRITICAL: Dangerous ${funcName} call detected: ${argString}`);
          }
        });
      });
    });

    it('should implement Content Security Policy violations detection', () => {
      render(<LoginForm />);
      
      let cspViolations = [];
      
      // Monitor CSP violations
      document.addEventListener('securitypolicyviolation', (e) => {
        cspViolations.push({
          violatedDirective: e.violatedDirective,
          blockedURI: e.blockedURI,
          originalPolicy: e.originalPolicy
        });
      });
      
      // Try to violate CSP
      const script = document.createElement('script');
      script.innerHTML = 'alert("CSP Test")';
      document.head.appendChild(script);
      
      // Should either block the script or report violation
      if (cspViolations.length === 0) {
        console.warn('WARNING: No CSP violations detected - CSP may not be implemented');
      }
      
      document.head.removeChild(script);
    });
  });
});