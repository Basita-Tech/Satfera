# Satfera E2E Testing Framework

Comprehensive End-to-End testing suite for the Satfera matrimonial application using Playwright.

## Overview

This E2E testing framework provides complete coverage of user journeys across the Satfera application, including:

- **Complete User Registration Flow** - Signup, OTP verification, profile completion
- **Authentication Workflows** - Login, logout, password reset, security features
- **Profile Management** - Multi-step profile creation, editing, validation
- **Photo Upload System** - File uploads, validation, gallery management
- **Matchmaking Features** - Search, browse, interest expression, communication
- **Security Boundary Testing** - Authentication bypass, injection attacks, session security
- **Performance Testing** - Load times, API response times, resource optimization
- **Error Handling** - Network failures, server errors, graceful degradation

## Directory Structure

```
e2e/
├── auth/                     # Authentication states
├── pages/                    # Page Object Models
│   ├── BasePage.ts          # Base page class
│   ├── HomePage.ts          # Home page model
│   └── AuthPages.ts         # Authentication page models
├── tests/                    # E2E test specifications
│   ├── user-registration.spec.ts
│   ├── authentication.spec.ts
│   ├── profile-workflow.spec.ts
│   ├── photo-upload.spec.ts
│   ├── security-boundary.spec.ts
│   ├── performance.spec.ts
│   ├── error-handling.spec.ts
│   └── matchmaking-workflow.spec.ts
├── utils/                    # Utilities and helpers
│   ├── test-data.ts         # Test data generators
│   └── helpers.ts           # Test helper functions
├── test-assets/             # Test files and assets
├── playwright.config.ts     # Playwright configuration
├── global-setup.ts         # Global test setup
├── global-teardown.ts      # Global test cleanup
├── package.json            # Dependencies and scripts
└── .env.example            # Environment variables template
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd e2e
npm install
```

### 2. Install Playwright Browsers

```bash
npm run install-browsers
```

### 3. Environment Configuration

Copy the environment template and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Test Database
TEST_MONGODB_URL=mongodb://localhost:27017/satfera_e2e_test
TEST_REDIS_URL=redis://localhost:6379/1

# Test Credentials
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=TestPassword123!
```

### 4. Start Application Services

Ensure both frontend and backend services are running:

```bash
# Frontend (from frontend directory)
npm run dev

# Backend (from backend directory)
npm run dev
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Categories
```bash
# Authentication tests
npm run test:auth

# Registration flow tests
npm run test:registration

# Profile management tests
npm run test:profile

# Security tests
npm run test:security

# Performance tests
npm run test:performance
```

### Test Modes
```bash
# Headless mode (default)
npm test

# Headed mode (visible browser)
npm run test:headed

# Debug mode
npm run test:debug

# UI mode (interactive)
npm run test:ui
```

### Specific Browser Testing
```bash
# Chrome
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# Safari
npx playwright test --project=webkit

# Mobile
npx playwright test --project=mobile-chrome
```

## Test Organization

### Test Categories

1. **Smoke Tests** (`@smoke`)
   - Critical user journeys
   - Basic functionality verification

2. **Regression Tests** (`@regression`)
   - Complete feature coverage
   - Cross-browser compatibility

3. **Security Tests** (`@security`)
   - Authentication bypass attempts
   - Injection attacks
   - Session security

4. **Performance Tests** (`@performance`)
   - Page load times
   - API response times
   - Resource optimization

### Page Object Model

Tests use the Page Object Model pattern for maintainability:

```typescript
// Example usage
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login(testUser);
```

### Test Data Generation

Realistic test data is generated using Faker.js:

```typescript
const testUser = TestDataGenerator.generateTestUser();
const profileData = TestDataGenerator.generateProfileData();
```

## Test Configuration

### Playwright Configuration

Key configuration options in `playwright.config.ts`:

- **Multiple browsers** - Chrome, Firefox, Safari, Mobile
- **Parallel execution** - Configurable workers
- **Retry logic** - Automatic retries on failure
- **Screenshots/Videos** - On failure capture
- **Network conditions** - Throttling simulation

### Global Setup/Teardown

- **Global Setup**: Database initialization, test data creation, authentication states
- **Global Teardown**: Database cleanup, file cleanup, resource cleanup

## Test Data Management

### Test Users

Pre-configured test users with different states:
- `complete.user@test.com` - Fully completed profile
- `incomplete.user@test.com` - Partial profile
- `unverified.user@test.com` - Unverified account

### Test Data Generation

```typescript
// Generate user data
const user = TestDataGenerator.generateTestUser({
  email: 'custom@test.com',
  age: 28
});

// Generate profile data
const profile = TestDataGenerator.generateProfileData();

// Generate invalid data for testing
const invalidData = TestDataGenerator.generateInvalidUserData();
```

### Security Test Payloads

Built-in security test payloads:
```typescript
const xssPayloads = TestDataGenerator.getXSSPayloads();
const sqlPayloads = TestDataGenerator.getSQLInjectionPayloads();
```

## Reporting

### Test Reports

Multiple report formats are generated:

1. **HTML Report** - Interactive test results
2. **JSON Report** - Machine-readable results
3. **JUnit Report** - CI/CD integration

```bash
# View HTML report
npm run test:report
```

### Screenshots and Videos

- **Screenshots** - Captured on test failure
- **Videos** - Recorded for failing tests
- **Traces** - Full browser interaction traces

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Docker Support

Run tests in Docker containers:

```bash
# Build test image
docker build -t satfera-e2e .

# Run tests
docker run satfera-e2e npm test
```

## Best Practices

### Test Writing Guidelines

1. **Use Page Object Model** - Encapsulate page interactions
2. **Generate Realistic Data** - Use test data generators
3. **Test Error Conditions** - Include negative test cases
4. **Check Accessibility** - Verify accessibility compliance
5. **Performance Aware** - Monitor load times and resource usage

### Debugging Tests

```bash
# Run in debug mode
npm run test:debug

# Specific test file
npx playwright test user-registration.spec.ts --debug

# Use codegen for recording
npm run test:codegen
```

### Maintenance

1. **Regular Updates** - Keep dependencies updated
2. **Test Data Refresh** - Clean and refresh test data
3. **Performance Monitoring** - Track test execution times
4. **Cross-browser Testing** - Regular testing across browsers

## Security Considerations

### Test Isolation

- **Separate Test Database** - Isolated test environment
- **Test User Cleanup** - Automatic cleanup after tests
- **No Production Data** - Never test against production

### Sensitive Data

- **Environment Variables** - Secure credential storage
- **No Hardcoded Secrets** - Use environment configuration
- **Test Data Anonymization** - Use fake data generators

## Performance Thresholds

### Default Performance Expectations

| Metric | Threshold |
|--------|-----------|
| Page Load Time | < 5 seconds |
| API Response Time | < 2 seconds |
| First Contentful Paint | < 2 seconds |
| Largest Contentful Paint | < 4 seconds |
| Bundle Size | < 2MB (JS), < 500KB (CSS) |

### Monitoring

Performance metrics are automatically collected and reported:

```typescript
const metrics = await PerformanceTestHelper.getPerformanceMetrics(page);
console.log('Performance Metrics:', metrics);
```

## Troubleshooting

### Common Issues

1. **Services Not Running**
   ```bash
   # Check if frontend/backend are accessible
   curl http://localhost:3000
   curl http://localhost:5000/api/health
   ```

2. **Database Connection**
   ```bash
   # Verify test database is accessible
   mongosh mongodb://localhost:27017/satfera_e2e_test
   ```

3. **Browser Installation**
   ```bash
   # Reinstall browsers
   npx playwright install --force
   ```

4. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :5000
   ```

### Debug Helpers

```typescript
// Take screenshot during test
await TestHelpers.takeScreenshot(page, 'debug-screenshot');

// Check console errors
const errors = await TestHelpers.checkConsoleErrors(page);

// Monitor network requests
const { requests, responses } = await TestHelpers.monitorNetworkRequests(page);
```

## Contributing

### Adding New Tests

1. **Create Test File** - Follow naming convention: `feature-name.spec.ts`
2. **Use Page Objects** - Create page models in `/pages` directory
3. **Add Test Data** - Extend generators in `/utils/test-data.ts`
4. **Update Documentation** - Document new test scenarios

### Test Categories

Tag tests appropriately:
- `@smoke` - Critical functionality
- `@regression` - Full feature coverage
- `@security` - Security testing
- `@performance` - Performance testing
- `@accessibility` - Accessibility testing

### Code Review Checklist

- [ ] Tests follow Page Object Model
- [ ] Proper error handling
- [ ] Accessibility checks included
- [ ] Performance assertions
- [ ] Cross-browser compatibility
- [ ] Documentation updated

## Support

### Getting Help

1. **Check Documentation** - Review this README and inline comments
2. **Debug Mode** - Use `--debug` flag for interactive debugging
3. **Verbose Logging** - Enable detailed logging in configuration
4. **Community** - Check Playwright documentation and community

### Reporting Issues

When reporting test failures:

1. **Test Environment** - Specify browser, OS, Node version
2. **Error Messages** - Include full error output
3. **Screenshots** - Attach failure screenshots
4. **Reproduction Steps** - Detailed steps to reproduce
5. **Expected vs Actual** - What should happen vs what happened

## License

This testing framework is part of the Satfera project and follows the same licensing terms.