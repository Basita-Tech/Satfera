# Security Testing with OWASP ZAP

This guide covers how to run security tests against the Satfera API using OWASP ZAP.

## Overview

OWASP ZAP (Zed Attack Proxy) is a free, open-source security testing tool that helps identify vulnerabilities in web applications. We use it to test the API for common security issues.

## Prerequisites

### Option 1: Docker (Recommended)

Docker is the easiest way to run ZAP. Install Docker from [docker.com](https://www.docker.com/get-started).

```bash
# Pull the ZAP stable image
docker pull zaproxy/zap-stable
```

### Option 2: Local Installation

Download ZAP from [https://www.zaproxy.org/download/](https://www.zaproxy.org/download/)

## Running Security Tests

### Quick Baseline Scan

A baseline scan performs passive scanning only (no active attacks):

```bash
# From the backend directory
npm run test:security:baseline
```

Or manually:

```bash
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-baseline.py -t http://host.docker.internal:8000 \
  -r tests/security/reports/baseline-report.html
```

### Full API Scan

The full scan includes active scanning (safe for test environments only):

```bash
# From the backend directory
npm run test:security
```

Or manually:

```bash
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-api-scan.py -t http://host.docker.internal:8000/api-docs \
  -f openapi \
  -c tests/security/zap.yaml \
  -r tests/security/reports/zap-report.html
```

### Using the ZAP Configuration

The `zap.yaml` file contains our custom configuration:

```bash
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-api-scan.py -t http://host.docker.internal:8000/api-docs \
  -f openapi \
  -c tests/security/zap.yaml
```

## Configuration

### Environment Variables

Set these for authenticated scanning:

```bash
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="testpassword123"
```

### Customizing the Scan

Edit `tests/security/zap.yaml` to:

- Adjust scan duration and depth
- Add/remove endpoints from scanning
- Configure authentication
- Change report format and location

## Understanding Results

### Risk Levels

- **High**: Critical vulnerabilities requiring immediate attention
- **Medium**: Significant issues that should be addressed
- **Low**: Minor issues for consideration
- **Informational**: Best practice suggestions

### Common Findings

| Finding | Description | Action |
|---------|-------------|--------|
| Missing Security Headers | X-Content-Type-Options, etc. | Add via helmet middleware |
| CORS Misconfiguration | Overly permissive CORS | Restrict allowed origins |
| Cookie without flags | Missing Secure/HttpOnly | Configure cookie options |
| Information Disclosure | Version info in headers | Remove X-Powered-By |

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday
  workflow_dispatch:

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Start Application
        run: |
          npm install
          npm run dev &
          sleep 10
      
      - name: OWASP ZAP Scan
        uses: zaproxy/action-api-scan@v0.7.0
        with:
          target: 'http://localhost:8000/api-docs'
          format: openapi
          allow_issue_writing: false
      
      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: zap-report
          path: report_html.html
```

### GitLab CI

```yaml
security_scan:
  stage: test
  image: zaproxy/zap-stable
  script:
    - zap-api-scan.py -t $API_URL/api-docs -f openapi -r report.html
  artifacts:
    paths:
      - report.html
    when: always
```

## Reports

Reports are generated in `tests/security/reports/`:

- `zap-report.html` - Full scan report
- `baseline-report.html` - Baseline scan report

Review these reports after each scan and create issues for findings that need attention.

## Resources

- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [API Security Best Practices](https://owasp.org/www-project-api-security/)
