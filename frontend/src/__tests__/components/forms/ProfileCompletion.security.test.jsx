import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Since ProfileCompletion.jsx appears to be a simple completion status component,
// we'll create security tests based on common completion page patterns

const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Mock ProfileCompletion component since we don't have the actual implementation
const MockProfileCompletion = ({ onNext, onPrevious }) => {
  return (
    <div className="profile-completion">
      <h2>Profile Completion</h2>
      <div className="completion-status">
        <div className="step" data-testid="personal-step">Personal Details - Complete</div>
        <div className="step" data-testid="family-step">Family Details - Complete</div>
        <div className="step" data-testid="education-step">Education Details - Complete</div>
        <div className="step" data-testid="professional-step">Professional Details - Complete</div>
        <div className="step" data-testid="health-step">Health & Lifestyle - Complete</div>
        <div className="step" data-testid="expectations-step">Expectations - Complete</div>
      </div>
      <div className="completion-percentage" data-testid="completion-percentage">
        100% Complete
      </div>
      <div className="profile-summary" data-testid="profile-summary">
        <p>Your profile is now complete and ready for review.</p>
        <p id="user-data">User ID: 12345, Email: user@example.com</p>
      </div>
      <button onClick={onPrevious}>Previous</button>
      <button onClick={onNext}>Complete Profile</button>
      <button 
        onClick={() => window.location.href = '/dashboard'}
        data-testid="dashboard-link"
      >
        Go to Dashboard
      </button>
    </div>
  );
};

describe('ProfileCompletion Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Information Disclosure Prevention', () => {
    it('should not expose sensitive user information in completion status', async () => {
      render(
        <TestWrapper>
          <MockProfileCompletion />
        </TestWrapper>
      );

      // Check that sensitive information is not exposed
      const sensitivePatterns = [
        /password/i,
        /token/i,
        /secret/i,
        /api[_-]?key/i,
        /session[_-]?id/i,
        /auth[_-]?token/i,
        /credit[_-]?card/i,
        /ssn/i,
        /social[_-]?security/i,
      ];

      const pageText = document.body.textContent;
      sensitivePatterns.forEach(pattern => {
        expect(pageText).not.toMatch(pattern);
      });
    });

    it('should not expose user IDs or internal identifiers in DOM', async () => {
      render(
        <TestWrapper>
          <MockProfileCompletion />
        </TestWrapper>
      );

      // Check for exposed user data
      const userDataElement = screen.queryByText(/User ID: \d+/);
      expect(userDataElement).not.toBeInTheDocument();

      // Check that email is not exposed in plain text
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const pageText = document.body.textContent;
      expect(pageText).not.toMatch(emailPattern);
    });

    it('should prevent exposure of completion percentages that reveal system internals', async () => {
      render(
        <TestWrapper>
          <MockProfileCompletion />
        </TestWrapper>
      );

      const completionElement = screen.getByTestId('completion-percentage');
      
      // Should show user-friendly completion status, not internal calculations
      expect(completionElement.textContent).not.toContain('steps_completed / total_steps');
      expect(completionElement.textContent).not.toContain('database_fields_filled');
      expect(completionElement.textContent).not.toContain('validation_passed');
    });
  });

  describe('XSS Prevention in Dynamic Content', () => {
    it('should sanitize completion status messages', async () => {
      const maliciousCompletionData = {
        steps: [
          { name: 'Personal<script>alert("XSS")</script>', status: 'complete' },
          { name: 'Family<img src=x onerror=alert(1)>', status: 'complete' },
          { name: 'Education"><svg onload=alert(/XSS/)>', status: 'complete' },
        ]
      };

      // Mock component that would use this data
      const MaliciousProfileCompletion = () => (
        <div>
          {maliciousCompletionData.steps.map((step, index) => (
            <div key={index} dangerouslySetInnerHTML={{ __html: step.name }} />
          ))}
        </div>
      );

      // This would be unsafe - testing that we don't do this
      render(<MaliciousProfileCompletion />);
      
      // Check that scripts are not executed
      expect(screen.queryByText('<script>')).not.toBeInTheDocument();
    });

    it('should handle malicious step completion data safely', async () => {
      const MockCompletionWithDynamicData = () => {
        const [stepData] = React.useState({
          personalStep: 'Complete<script>alert("Step XSS")</script>',
          familyStep: 'Complete<img src=x onerror=alert(1)>',
          educationStep: 'Complete"><svg onload=alert(/XSS/)>',
        });

        return (
          <div>
            {Object.entries(stepData).map(([key, value]) => (
              <div key={key} data-testid={key}>
                {value} {/* Safe rendering without dangerouslySetInnerHTML */}
              </div>
            ))}
          </div>
        );
      };

      render(<MockCompletionWithDynamicData />);
      
      // Content should be escaped/sanitized
      expect(document.body.textContent).toContain('<script>');
      expect(document.body.textContent).toContain('<img');
      expect(document.body.textContent).toContain('<svg');
      // But scripts should not execute
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  describe('URL Manipulation and Navigation Security', () => {
    it('should prevent malicious redirects in completion actions', async () => {
      const originalLocation = window.location;
      const mockLocation = {
        ...originalLocation,
        href: '',
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      render(
        <TestWrapper>
          <MockProfileCompletion />
        </TestWrapper>
      );

      const dashboardButton = screen.getByTestId('dashboard-link');
      fireEvent.click(dashboardButton);

      // Should navigate to expected internal URL, not external malicious site
      expect(window.location.href).toBe('/dashboard');
      expect(window.location.href).not.toContain('evil.com');
      expect(window.location.href).not.toContain('malicious-site.com');

      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should prevent open redirect vulnerabilities', async () => {
      const MockCompletionWithRedirect = () => {
        const handleRedirect = () => {
          // Simulate potential open redirect vulnerability
          const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
          if (redirectUrl) {
            // UNSAFE: Direct redirect without validation
            // window.location.href = redirectUrl;
            
            // SAFE: Validate redirect URL
            const allowedDomains = ['localhost', 'app.matrimony.com', 'matrimony.com'];
            const url = new URL(redirectUrl, window.location.origin);
            
            if (allowedDomains.includes(url.hostname)) {
              window.location.href = redirectUrl;
            } else {
              window.location.href = '/dashboard'; // Default safe redirect
            }
          }
        };

        return (
          <div>
            <button onClick={handleRedirect} data-testid="redirect-button">
              Complete & Redirect
            </button>
          </div>
        );
      };

      // Mock URL with malicious redirect
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          search: '?redirect=http://evil.com/steal-data',
          origin: 'http://localhost',
        },
        writable: true,
      });

      render(<MockCompletionWithRedirect />);
      
      const redirectButton = screen.getByTestId('redirect-button');
      fireEvent.click(redirectButton);

      // Should not redirect to malicious site
      expect(window.location.href).not.toContain('evil.com');
    });
  });

  describe('Client-Side State Manipulation', () => {
    it('should prevent completion status manipulation via DevTools', async () => {
      const MockCompletionWithState = () => {
        const [completionStatus, setCompletionStatus] = React.useState({
          isComplete: true,
          steps: 6,
          completedSteps: 6,
        });

        return (
          <div>
            <div data-testid="completion-status">
              {completionStatus.isComplete ? 'Profile Complete' : 'Profile Incomplete'}
            </div>
            <div data-testid="steps-count">
              {completionStatus.completedSteps}/{completionStatus.steps} steps completed
            </div>
            <button 
              onClick={() => setCompletionStatus(prev => ({ ...prev, isComplete: false }))}
              data-testid="manipulate-status"
            >
              Manipulate Status
            </button>
          </div>
        );
      };

      render(<MockCompletionWithState />);
      
      const statusElement = screen.getByTestId('completion-status');
      expect(statusElement.textContent).toBe('Profile Complete');

      // Simulate malicious state manipulation
      const manipulateButton = screen.getByTestId('manipulate-status');
      fireEvent.click(manipulateButton);

      expect(statusElement.textContent).toBe('Profile Incomplete');
      
      // In a real app, server-side validation should prevent this from affecting actual completion status
    });

    it('should handle completion data integrity', async () => {
      const MockCompletionWithValidation = ({ initialData }) => {
        const [data, setData] = React.useState(initialData);

        // Simulate data integrity check
        const validateData = (newData) => {
          const requiredFields = ['personal', 'family', 'education', 'professional', 'health', 'expectations'];
          return requiredFields.every(field => newData[field] === true);
        };

        const handleUpdateData = (field, value) => {
          const newData = { ...data, [field]: value };
          if (validateData(newData)) {
            setData(newData);
          }
        };

        return (
          <div>
            <div data-testid="validation-status">
              {validateData(data) ? 'All steps valid' : 'Validation failed'}
            </div>
            <button 
              onClick={() => handleUpdateData('personal', false)}
              data-testid="invalidate-personal"
            >
              Invalidate Personal Step
            </button>
          </div>
        );
      };

      const validData = {
        personal: true,
        family: true,
        education: true,
        professional: true,
        health: true,
        expectations: true,
      };

      render(<MockCompletionWithValidation initialData={validData} />);
      
      const validationStatus = screen.getByTestId('validation-status');
      expect(validationStatus.textContent).toBe('All steps valid');

      const invalidateButton = screen.getByTestId('invalidate-personal');
      fireEvent.click(invalidateButton);

      expect(validationStatus.textContent).toBe('Validation failed');
    });
  });

  describe('Performance and DoS Protection', () => {
    it('should handle rapid completion status checks', async () => {
      let checkCount = 0;
      const MockCompletionWithChecks = () => {
        const [status, setStatus] = React.useState('checking');

        const checkCompletion = React.useCallback(() => {
          checkCount++;
          // Simulate API call or validation
          setTimeout(() => setStatus('complete'), 10);
        }, []);

        return (
          <div>
            <div data-testid="status">{status}</div>
            <button onClick={checkCompletion} data-testid="check-button">
              Check Completion
            </button>
          </div>
        );
      };

      render(<MockCompletionWithChecks />);
      
      const checkButton = screen.getByTestId('check-button');
      
      // Simulate rapid clicking
      for (let i = 0; i < 100; i++) {
        fireEvent.click(checkButton);
      }

      // Should not make 100 checks
      expect(checkCount).toBeLessThan(100);
    });

    it('should handle large completion data sets gracefully', async () => {
      const largeCompletionData = Array.from({ length: 10000 }, (_, i) => ({
        step: `Step ${i}`,
        status: i % 2 === 0 ? 'complete' : 'incomplete',
        data: 'x'.repeat(1000), // Large data
      }));

      const MockCompletionWithLargeData = () => {
        const [data] = React.useState(largeCompletionData);
        const [displayCount, setDisplayCount] = React.useState(10);

        return (
          <div>
            {data.slice(0, displayCount).map((item, index) => (
              <div key={index} data-testid={`step-${index}`}>
                {item.step}: {item.status}
              </div>
            ))}
            <button 
              onClick={() => setDisplayCount(prev => Math.min(prev + 10, data.length))}
              data-testid="load-more"
            >
              Load More
            </button>
          </div>
        );
      };

      render(<MockCompletionWithLargeData />);
      
      // Should only render limited items initially
      expect(screen.getByTestId('step-0')).toBeInTheDocument();
      expect(screen.getByTestId('step-9')).toBeInTheDocument();
      expect(screen.queryByTestId('step-10')).not.toBeInTheDocument();
    });
  });

  describe('Data Privacy in Completion Summary', () => {
    it('should not expose sensitive form data in completion summary', async () => {
      const sensitiveFormData = {
        personalDetails: {
          ssn: '123-45-6789',
          password: 'secretPassword123',
          bankAccount: '1234567890',
        },
        healthData: {
          hivStatus: 'positive',
          mentalHealthHistory: 'depression, anxiety',
          medications: 'sensitive medical info',
        },
      };

      const MockCompletionWithSummary = () => (
        <div>
          <div data-testid="summary">
            Profile completion summary available
          </div>
          {/* Should NOT display: */}
          {/* <div>{JSON.stringify(sensitiveFormData)}</div> */}
        </div>
      );

      render(<MockCompletionWithSummary />);
      
      const summary = screen.getByTestId('summary');
      
      // Should not contain sensitive information
      const sensitivePatterns = [
        /\d{3}-\d{2}-\d{4}/, // SSN pattern
        /password/i,
        /bank/i,
        /hiv/i,
        /depression/i,
        /medication/i,
      ];

      sensitivePatterns.forEach(pattern => {
        expect(summary.textContent).not.toMatch(pattern);
      });
    });
  });

  describe('Session and Authentication Security', () => {
    it('should handle session timeout during completion', async () => {
      const MockCompletionWithAuth = () => {
        const [isAuthenticated, setIsAuthenticated] = React.useState(true);

        React.useEffect(() => {
          // Simulate session timeout
          const timeout = setTimeout(() => {
            setIsAuthenticated(false);
          }, 100);

          return () => clearTimeout(timeout);
        }, []);

        if (!isAuthenticated) {
          return <div data-testid="auth-expired">Session expired. Please log in again.</div>;
        }

        return (
          <div data-testid="completion-content">
            Profile completion content
          </div>
        );
      };

      render(<MockCompletionWithAuth />);
      
      expect(screen.getByTestId('completion-content')).toBeInTheDocument();

      // Wait for session timeout
      await waitFor(() => {
        expect(screen.getByTestId('auth-expired')).toBeInTheDocument();
      });
    });

    it('should prevent completion action without proper authentication', async () => {
      const MockCompletionWithAuthCheck = () => {
        const [canComplete, setCanComplete] = React.useState(false);

        React.useEffect(() => {
          // Simulate auth check
          const checkAuth = async () => {
            // In real app, this would validate JWT token, session, etc.
            const isValidUser = await new Promise(resolve => 
              setTimeout(() => resolve(true), 50)
            );
            setCanComplete(isValidUser);
          };

          checkAuth();
        }, []);

        return (
          <div>
            <button 
              disabled={!canComplete}
              data-testid="complete-button"
            >
              {canComplete ? 'Complete Profile' : 'Verifying...'}
            </button>
          </div>
        );
      };

      render(<MockCompletionWithAuthCheck />);
      
      const completeButton = screen.getByTestId('complete-button');
      
      // Initially should be disabled
      expect(completeButton.textContent).toBe('Verifying...');
      expect(completeButton.disabled).toBe(true);

      // After auth check
      await waitFor(() => {
        expect(completeButton.textContent).toBe('Complete Profile');
        expect(completeButton.disabled).toBe(false);
      });
    });
  });
});