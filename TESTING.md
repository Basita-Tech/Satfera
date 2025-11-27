# Testing Guide for Satfera

This document explains the testing setup and guidelines for the Satfera project.

## Testing Stack

### Backend Testing (Node.js/Express)
- **Framework**: Jest
- **API Testing**: Supertest
- **Database**: MongoDB Memory Server (in-memory testing)
- **Mocking**: Redis and email services are mocked

### Frontend Testing (React/Vite)
- **Framework**: Vitest (faster than Jest for Vite projects)
- **Component Testing**: React Testing Library
- **DOM Environment**: jsdom
- **User Interactions**: @testing-library/user-event

## Running Tests

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
```

### Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:ui            # Run tests with UI (interactive)
npm run test:coverage      # Run tests with coverage report
```

## Test Structure

### Backend Tests (`backend/src/__tests__/`)
```
backend/src/__tests__/
├── setup.ts                 # Test setup and mocks
├── helpers/
│   └── testUtils.ts         # Utility functions for tests
├── controllers/
│   └── authController.test.ts
└── services/
    └── authService.test.ts
```

### Frontend Tests (`frontend/src/__tests__/`)
```
frontend/src/__tests__/
├── setup.js                 # Test setup and global mocks
├── utils/
│   └── testUtils.jsx        # Custom render function with providers
├── components/
│   ├── ui/
│   │   └── Button.test.jsx
│   └── auth/
│       └── LoginForm.simple.test.jsx
└── lib/
    └── utils.test.js
```

## Writing Tests

### Backend Test Example
```javascript
import { createTestUser } from '../helpers/testUtils';
import { AuthService } from '../../services/authServices';

describe('AuthService', () => {
  it('should login user with valid credentials', async () => {
    const user = await createTestUser({ email: 'test@example.com' });
    const authService = new AuthService();
    
    const result = await authService.loginWithEmail('test@example.com', 'password');
    
    expect(result.user._id.toString()).toBe(user._id.toString());
    expect(result.token).toBeDefined();
  });
});
```

### Frontend Test Example
```javascript
import { render, screen } from '../utils/testUtils';
import { Button } from '../../components/ui/Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
});
```

## Testing Guidelines

### Backend
1. **Use in-memory databases** for tests to avoid side effects
2. **Mock external services** (Redis, email, Twilio) in setup.ts
3. **Create test utilities** for common operations (creating users, tokens)
4. **Test both success and error cases**
5. **Use descriptive test names** that explain the scenario

### Frontend
1. **Use custom render** from testUtils.jsx that includes providers
2. **Test user interactions** rather than implementation details
3. **Mock external dependencies** (APIs, browser APIs)
4. **Use semantic queries** (getByRole, getByLabelText) over generic ones
5. **Test accessibility** by ensuring proper labels and roles

## Mocked Dependencies

### Backend
- **Redis**: All Redis operations are mocked in setup.ts
- **Email services**: sendOtpEmail, sendWelcomeEmail, etc. are mocked
- **OTP Redis**: OTP generation and validation functions are mocked

### Frontend
- **React Router**: useNavigate and Link are mocked
- **API calls**: Auth API functions are mocked
- **Browser APIs**: IntersectionObserver, ResizeObserver, matchMedia
- **Google Sign-In**: Google APIs are mocked

## Environment Configuration

### Backend (.env.test)
```bash
NODE_ENV=test
JWT_SECRET=test-secret-key-with-sufficient-length-for-security-purposes
REDIS_URL=redis://localhost:6379
MONGODB_URI=memory://test
FRONTEND_URL=http://localhost:3000
```

### Frontend (vite.config.js)
```javascript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/__tests__/setup.js'],
  css: true,
}
```

## Coverage Reports

Both backend and frontend are configured to generate coverage reports:

```bash
# Backend coverage
npm run test:coverage
open coverage/lcov-report/index.html

# Frontend coverage  
npm run test:coverage
open coverage/index.html
```

## Common Issues and Solutions

1. **Import/Export errors**: Ensure correct import/export syntax
2. **Async operations**: Use waitFor() for async state changes
3. **DOM cleanup**: Tests clean up automatically via setup files
4. **Environment variables**: Mock in test setup, don't rely on .env

## Best Practices

1. **Write tests before fixing bugs** to prevent regressions
2. **Keep tests simple and focused** on one behavior
3. **Use data-testid sparingly** - prefer semantic selectors
4. **Mock at the boundary** - mock external services, not internal modules
5. **Test error states** - ensure proper error handling

## Adding New Tests

1. **Backend**: Create test file in appropriate `__tests__` subfolder
2. **Frontend**: Use the custom render function from testUtils.jsx
3. **Follow naming convention**: `ComponentName.test.jsx`
4. **Add to CI pipeline** if not automatically discovered