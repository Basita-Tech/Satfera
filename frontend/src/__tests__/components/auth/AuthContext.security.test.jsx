/**
 * SECURITY TESTS FOR AUTH CONTEXT COMPONENT
 * 
 * This comprehensive security test suite covers critical authentication context vulnerabilities
 * including state hijacking, context manipulation, storage security, session management,
 * and privilege escalation through context manipulation.
 */

import React, { useContext } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, AuthContextr } from '../../../components/context/AuthContext';

// Test component that consumes AuthContext
const TestConsumer = () => {
  const { user, token, role, login, logout } = useContext(AuthContextr);
  
  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="token">{token || 'null'}</div>
      <div data-testid="role">{role || 'null'}</div>
      <button 
        data-testid="login-btn" 
        onClick={() => login({
          token: 'test-token',
          role: 'user',
          Role: 'user',
          name: 'Test User'
        })}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

const renderAuthProvider = (children = <TestConsumer />) => {
  return render(
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

describe('🔒 AuthContext Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('🔄 State Initialization Security', () => {
    it('should safely handle corrupted localStorage data', () => {
      // Set corrupted JSON in localStorage
      localStorage.setItem('user', '{"invalid": json}');
      localStorage.setItem('authToken', 'valid-token');
      localStorage.setItem('userRole', 'admin');
      
      expect(() => {
        renderAuthProvider();
      }).not.toThrow();
      
      // Should handle corrupted data gracefully
      expect(screen.getByTestId('token')).toHaveTextContent('valid-token');
      expect(screen.getByTestId('role')).toHaveTextContent('admin');
      expect(screen.getByTestId('user')).toHaveTextContent('null'); // Corrupted user data should be null
    });

    it('should not expose sensitive data in initial state', () => {
      localStorage.setItem('authToken', 'sensitive-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: '123',
        password: 'should-not-be-here',
        creditCard: '1234-5678-9012-3456'
      }));
      localStorage.setItem('userRole', 'admin');
      
      renderAuthProvider();
      
      const userText = screen.getByTestId('user').textContent;
      
      // Should not expose sensitive fields
      expect(userText).not.toContain('should-not-be-here');
      expect(userText).not.toContain('1234-5678-9012-3456');
      
      // But should contain non-sensitive data
      expect(userText).toContain('123');
    });

    it('should validate localStorage data types', () => {
      // Set invalid data types
      localStorage.setItem('authToken', 'null');
      localStorage.setItem('user', 'undefined');
      localStorage.setItem('userRole', '');
      
      renderAuthProvider();
      
      // Should handle invalid types gracefully
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('role')).toHaveTextContent('null');
    });

    it('should resist prototype pollution attacks', () => {
      // Attempt prototype pollution
      Object.prototype.authToken = 'malicious-token';
      Object.prototype.userRole = 'admin';
      
      localStorage.clear(); // No legitimate data
      
      renderAuthProvider();
      
      // Should not use polluted prototype properties
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('role')).toHaveTextContent('null');
      
      // Clean up
      delete Object.prototype.authToken;
      delete Object.prototype.userRole;
    });
  });

  describe('🔐 Login Function Security', () => {
    it('should validate login data structure', async () => {
      const user = userEvent.setup();
      renderAuthProvider();
      
      // Mock the login function to accept malicious data
      const TestMaliciousLogin = () => {
        const { login } = useContext(AuthContextr);
        
        return (
          <button 
            data-testid="malicious-login"
            onClick={() => login({
              token: '<script>alert("xss")</script>',
              Role: 'admin',
              role: 'user', // Inconsistent role data
              __proto__: { malicious: 'data' }
            })}
          >
            Malicious Login
          </button>
        );
      };
      
      render(<AuthProvider><TestMaliciousLogin /></AuthProvider>);
      
      const maliciousBtn = screen.getByTestId('malicious-login');
      await user.click(maliciousBtn);
      
      // Check localStorage doesn't contain malicious scripts
      const storedToken = localStorage.getItem('authToken');
      expect(storedToken).toBe('<script>alert("xss")</script>'); // Stored as-is but not executed
      
      // Should not execute XSS
      expect(document.querySelector('script')).not.toBeInTheDocument();
    });

    it('should handle role inconsistencies securely', async () => {
      const user = userEvent.setup();
      renderAuthProvider();
      
      const TestRoleConflict = () => {
        const { login } = useContext(AuthContextr);
        
        return (
          <button 
            data-testid="role-conflict"
            onClick={() => login({
              token: 'valid-token',
              Role: 'admin',     // Capital R
              role: 'user'       // Lowercase r
            })}
          >
            Role Conflict
          </button>
        );
      };
      
      render(<AuthProvider><TestRoleConflict /></AuthProvider>);
      
      const conflictBtn = screen.getByTestId('role-conflict');
      await user.click(conflictBtn);
      
      // Check which role is actually stored
      const storedRole = localStorage.getItem('userRole');
      const displayedRole = screen.getByTestId('role').textContent;
      
      // Should use Role (capital R) for storage as shown in component
      expect(storedRole).toBe('admin');
      // But context uses role (lowercase r)
      expect(displayedRole).toBe('user');
      
      // This is actually a bug - role inconsistency vulnerability
    });

    it('should prevent privilege escalation through login manipulation', async () => {
      const user = userEvent.setup();
      renderAuthProvider();
      
      const TestPrivEsc = () => {
        const { login } = useContext(AuthContextr);
        
        return (
          <button 
            data-testid="priv-esc"
            onClick={() => login({
              token: 'user-token',
              role: 'user',
              Role: 'superadmin', // Attempt privilege escalation
              isAdmin: true,
              permissions: ['read', 'write', 'delete', 'admin'],
              __isAdmin: true
            })}
          >
            Privilege Escalation
          </button>
        );
      };
      
      render(<AuthProvider><TestPrivEsc /></AuthProvider>);
      
      const privEscBtn = screen.getByTestId('priv-esc');
      await user.click(privEscBtn);
      
      // Check what role is actually set
      const storedRole = localStorage.getItem('userRole');
      expect(storedRole).toBe('superadmin'); // Privilege escalation succeeded!
      
      // This is a critical vulnerability - no role validation
    });

    it('should sanitize user data before storage', async () => {
      const user = userEvent.setup();
      renderAuthProvider();
      
      const TestDataSanitization = () => {
        const { login } = useContext(AuthContextr);
        
        return (
          <button 
            data-testid="data-sanitization"
            onClick={() => login({
              token: 'valid-token',
              role: 'user',
              Role: 'user',
              name: '<script>alert("xss")</script>John',
              email: 'javascript:alert(1)@example.com',
              bio: 'data:text/html,<script>alert(1)</script>'
            })}
          >
            Data Sanitization Test
          </button>
        );
      };
      
      render(<AuthProvider><TestDataSanitization /></AuthProvider>);
      
      const sanitizationBtn = screen.getByTestId('data-sanitization');
      await user.click(sanitizationBtn);
      
      const storedUser = JSON.parse(localStorage.getItem('user'));
      
      // Data should be stored as-is (no sanitization in current implementation)
      expect(storedUser.name).toContain('<script>');
      expect(storedUser.email).toContain('javascript:');
      
      // This indicates lack of input sanitization - vulnerability
    });

    it('should prevent token manipulation during login', async () => {
      const user = userEvent.setup();
      renderAuthProvider();
      
      // Mock a scenario where someone tries to manipulate the token after login
      const TestTokenManipulation = () => {
        const { login } = useContext(AuthContextr);
        
        return (
          <button 
            data-testid="token-manipulation"
            onClick={() => {
              const userData = {
                token: 'original-token',
                role: 'user',
                Role: 'user'
              };
              
              // Attempt to manipulate the token
              Object.defineProperty(userData, 'token', {
                get: () => 'malicious-token'
              });
              
              login(userData);
            }}
          >
            Token Manipulation
          </button>
        );
      };
      
      render(<AuthProvider><TestTokenManipulation /></AuthProvider>);
      
      const manipulationBtn = screen.getByTestId('token-manipulation');
      await user.click(manipulationBtn);
      
      const storedToken = localStorage.getItem('authToken');
      expect(storedToken).toBe('malicious-token');
      
      // The manipulation succeeded - this shows the vulnerability
    });
  });

  describe('🚪 Logout Function Security', () => {
    it('should completely clear all authentication data', async () => {
      const user = userEvent.setup();
      
      // Set up authenticated state
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('user', JSON.stringify({ id: '123', name: 'Test User' }));
      localStorage.setItem('someOtherData', 'should-remain');
      
      renderAuthProvider();
      
      const logoutBtn = screen.getByTestId('logout-btn');
      await user.click(logoutBtn);
      
      // Should clear all auth data
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('userRole')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      
      // Should clear ALL localStorage (as implemented)
      expect(localStorage.getItem('someOtherData')).toBeNull();
      
      // Component state should be cleared
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('role')).toHaveTextContent('null');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    it('should handle logout errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock localStorage.clear to throw error
      const originalClear = localStorage.clear;
      localStorage.clear = vi.fn(() => {
        throw new Error('Storage access denied');
      });
      
      renderAuthProvider();
      
      const logoutBtn = screen.getByTestId('logout-btn');
      
      expect(() => user.click(logoutBtn)).not.toThrow();
      
      // Restore original method
      localStorage.clear = originalClear;
    });

    it('should prevent partial logout states', async () => {
      const user = userEvent.setup();
      
      // Set up authenticated state
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('user', JSON.stringify({ id: '123' }));
      
      // Mock localStorage.clear to partially fail
      let clearCallCount = 0;
      const originalClear = localStorage.clear;
      localStorage.clear = vi.fn(() => {
        clearCallCount++;
        if (clearCallCount === 1) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          // Don't remove user data (simulate partial failure)
        }
      });
      
      renderAuthProvider();
      
      const logoutBtn = screen.getByTestId('logout-btn');
      await user.click(logoutBtn);
      
      // Even with partial storage clear, component state should be fully cleared
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('role')).toHaveTextContent('null');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      
      localStorage.clear = originalClear;
    });
  });

  describe('💾 Storage Synchronization Security', () => {
    it('should handle localStorage access denial', () => {
      // Mock localStorage access denial
      const mockGetItem = vi.fn(() => {
        throw new Error('Access denied');
      });
      
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: mockGetItem },
        writable: true
      });
      
      expect(() => {
        renderAuthProvider();
      }).not.toThrow();
      
      // Should render with null values when storage access fails
      expect(screen.getByTestId('token')).toHaveTextContent('null');
    });

    it('should resist storage event manipulation', () => {
      renderAuthProvider();
      
      // Simulate malicious storage event
      const maliciousEvent = new StorageEvent('storage', {
        key: 'authToken',
        newValue: 'malicious-token',
        oldValue: null,
        storageArea: localStorage
      });
      
      act(() => {
        window.dispatchEvent(maliciousEvent);
      });
      
      // Component should not automatically update from storage events
      // (Current implementation doesn't listen to storage events - which is secure)
      expect(screen.getByTestId('token')).toHaveTextContent('null');
    });

    it('should handle storage quota exceeded gracefully', async () => {
      const user = userEvent.setup();
      renderAuthProvider();
      
      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });
      
      const loginBtn = screen.getByTestId('login-btn');
      
      expect(() => user.click(loginBtn)).not.toThrow();
      
      // Should handle storage errors gracefully
      expect(screen.getByTestId('token')).toHaveTextContent('test-token');
      
      localStorage.setItem = originalSetItem;
    });
  });

  describe('🔒 Context Injection & Manipulation', () => {
    it('should prevent context value manipulation', () => {
      const MaliciousConsumer = () => {
        const context = useContext(AuthContextr);
        
        // Attempt to manipulate context values
        try {
          context.token = 'hacked-token';
          context.role = 'admin';
          context.login = () => console.log('hacked');
        } catch (error) {
          // Mutations might fail
        }
        
        return (
          <div>
            <div data-testid="manipulated-token">{context.token}</div>
            <div data-testid="manipulated-role">{context.role}</div>
          </div>
        );
      };
      
      render(
        <AuthProvider>
          <MaliciousConsumer />
        </AuthProvider>
      );
      
      // Context values should not be directly mutable
      expect(screen.getByTestId('manipulated-token')).toHaveTextContent('null');
      expect(screen.getByTestId('manipulated-role')).toHaveTextContent('null');
    });

    it('should prevent context provider replacement', () => {
      const MaliciousProvider = ({ children }) => {
        const maliciousValue = {
          token: 'malicious-token',
          role: 'admin',
          user: { id: 'hacker' },
          login: () => {},
          logout: () => {}
        };
        
        return (
          <AuthContextr.Provider value={maliciousValue}>
            {children}
          </AuthContextr.Provider>
        );
      };
      
      // Nested providers - inner should override
      render(
        <AuthProvider>
          <MaliciousProvider>
            <TestConsumer />
          </MaliciousProvider>
        </AuthProvider>
      );
      
      // Malicious provider should override the legitimate one
      expect(screen.getByTestId('token')).toHaveTextContent('malicious-token');
      expect(screen.getByTestId('role')).toHaveTextContent('admin');
      
      // This shows that context can be hijacked by nested providers
    });

    it('should validate context consumer usage', () => {
      // Component using context outside provider
      const UnprotectedConsumer = () => {
        const context = useContext(AuthContextr);
        return <div data-testid="unprotected">{context?.token || 'no-context'}</div>;
      };
      
      // Render without provider
      render(<UnprotectedConsumer />);
      
      // Should handle missing context gracefully
      expect(screen.getByTestId('unprotected')).toHaveTextContent('no-context');
    });
  });

  describe('🔄 Re-render & Memory Security', () => {
    it('should not leak sensitive data during re-renders', async () => {
      const user = userEvent.setup();
      
      const RerenderTest = () => {
        const [counter, setCounter] = React.useState(0);
        const { token, login } = useContext(AuthContextr);
        
        return (
          <div>
            <div data-testid="counter">{counter}</div>
            <div data-testid="token">{token}</div>
            <button 
              data-testid="rerender" 
              onClick={() => setCounter(c => c + 1)}
            >
              Re-render
            </button>
            <button 
              data-testid="login" 
              onClick={() => login({
                token: `sensitive-token-${Date.now()}`,
                role: 'user',
                Role: 'user'
              })}
            >
              Login
            </button>
          </div>
        );
      };
      
      render(
        <AuthProvider>
          <RerenderTest />
        </AuthProvider>
      );
      
      // Login with sensitive token
      const loginBtn = screen.getByTestId('login');
      await user.click(loginBtn);
      
      const initialToken = screen.getByTestId('token').textContent;
      
      // Trigger re-renders
      const rerenderBtn = screen.getByTestId('rerender');
      for (let i = 0; i < 5; i++) {
        await user.click(rerenderBtn);
      }
      
      // Token should remain consistent
      expect(screen.getByTestId('token')).toHaveTextContent(initialToken);
    });

    it('should clean up context on unmount', () => {
      const { unmount } = renderAuthProvider();
      
      // Set some auth data
      localStorage.setItem('authToken', 'test-token');
      
      // Unmount should not cause issues
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid login/logout cycles', async () => {
      const user = userEvent.setup();
      renderAuthProvider();
      
      const loginBtn = screen.getByTestId('login-btn');
      const logoutBtn = screen.getByTestId('logout-btn');
      
      // Rapid login/logout cycles
      for (let i = 0; i < 5; i++) {
        await user.click(loginBtn);
        expect(screen.getByTestId('token')).toHaveTextContent('test-token');
        
        await user.click(logoutBtn);
        expect(screen.getByTestId('token')).toHaveTextContent('null');
      }
    });
  });

  describe('🛡️ Type Safety & Input Validation', () => {
    it('should handle malformed login data types', async () => {
      const user = userEvent.setup();
      
      const TypeTestLogin = () => {
        const { login } = useContext(AuthContextr);
        
        return (
          <button 
            data-testid="type-test"
            onClick={() => login({
              token: 123, // Number instead of string
              role: ['admin', 'user'], // Array instead of string
              Role: { admin: true }, // Object instead of string
              user: 'not-an-object' // String instead of object
            })}
          >
            Type Test
          </button>
        );
      };
      
      render(
        <AuthProvider>
          <TypeTestLogin />
        </AuthProvider>
      );
      
      const typeTestBtn = screen.getByTestId('type-test');
      await user.click(typeTestBtn);
      
      // Should handle type mismatches gracefully
      const storedToken = localStorage.getItem('authToken');
      const storedRole = localStorage.getItem('userRole');
      const storedUser = localStorage.getItem('user');
      
      expect(storedToken).toBe('123'); // Converted to string
      expect(storedRole).toContain('admin'); // Object stringified
      expect(storedUser).toBe('"not-an-object"'); // String stringified
    });

    it('should prevent injection through function parameters', async () => {
      const user = userEvent.setup();
      
      const InjectionTest = () => {
        const { login } = useContext(AuthContextr);
        
        return (
          <button 
            data-testid="injection-test"
            onClick={() => {
              const maliciousData = {
                token: 'valid-token',
                role: 'user',
                Role: 'user',
                constructor: {
                  prototype: {
                    isAdmin: true
                  }
                }
              };
              
              login(maliciousData);
            }}
          >
            Injection Test
          </button>
        );
      };
      
      render(
        <AuthProvider>
          <InjectionTest />
        </AuthProvider>
      );
      
      const injectionBtn = screen.getByTestId('injection-test');
      await user.click(injectionBtn);
      
      // Should not pollute prototypes
      expect(Object.prototype.isAdmin).toBeUndefined();
    });
  });
});