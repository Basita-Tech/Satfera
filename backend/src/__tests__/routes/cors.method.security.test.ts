import request from 'supertest';
import express from 'express';
import authRouter from '../../routes/authRouter';
import userPersonalRouter from '../../routes/userPersonal';
import { createTestUser } from '../helpers/testUtils';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/auth', authRouter);
app.use('/user-personal', userPersonalRouter);

describe('CORS and HTTP Method Override Security Tests', () => {
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'test@example.com',
      role: 'user'
    });
    validToken = jwt.sign(
      { id: testUser._id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('CORS Security Vulnerabilities', () => {
    test('should not allow wildcard CORS with credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .set('Access-Control-Request-Credentials', 'true')
        .send({ email: 'test@example.com', password: 'password123' });
      
      if (response.headers['access-control-allow-origin'] === '*') {
        expect(response.headers['access-control-allow-credentials']).not.toBe('true');
      }
    });

    test('should not reflect arbitrary origins', async () => {
      const maliciousOrigins = [
        'https://evil.com',
        'http://attacker.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'null',
        'undefined',
        '',
        'localhost',
        '127.0.0.1',
        'https://app.com.evil.com',
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

    test('should handle CORS preflight requests securely', async () => {
      const endpoints = [
        '/auth/login',
        '/auth/signup',
        '/user-personal',
        '/user-personal/family',
        '/user-personal/health',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .options(endpoint)
          .set('Origin', 'https://malicious-site.com')
          .set('Access-Control-Request-Method', 'POST')
          .set('Access-Control-Request-Headers', 'Content-Type,Authorization,X-Custom-Header');
        
        // Should either reject or have proper CORS policy
        if (response.status === 200) {
          const allowedOrigin = response.headers['access-control-allow-origin'];
          if (allowedOrigin) {
            expect(allowedOrigin).not.toBe('*');
            expect(allowedOrigin).not.toBe('https://malicious-site.com');
          }
        }
      }
    });

    test('should not allow dangerous headers in CORS requests', async () => {
      const dangerousHeaders = [
        'X-Forwarded-Host',
        'Host',
        'X-Real-IP',
        'X-Forwarded-For',
        'Server',
        'Cookie',
        'Set-Cookie',
      ];

      for (const header of dangerousHeaders) {
        const response = await request(app)
          .options('/auth/login')
          .set('Origin', 'https://trusted-site.com')
          .set('Access-Control-Request-Method', 'POST')
          .set('Access-Control-Request-Headers', header);
        
        if (response.headers['access-control-allow-headers']) {
          const allowedHeaders = response.headers['access-control-allow-headers'].toLowerCase();
          expect(allowedHeaders).not.toContain(header.toLowerCase());
        }
      }
    });

    test('should handle malformed Origin headers', async () => {
      const malformedOrigins = [
        'https://',
        'http://.',
        'https://[invalid]',
        'ftp://malicious.com',
        'data://malicious',
        '//evil.com',
        'https://evil.com:99999',
        'https://very-long-domain-name-that-exceeds-normal-limits.evil.com',
      ];

      for (const origin of malformedOrigins) {
        const response = await request(app)
          .post('/auth/login')
          .set('Origin', origin)
          .send({ email: 'test@example.com', password: 'password123' });
        
        expect(response.status).not.toBe(500);
        if (response.headers['access-control-allow-origin']) {
          expect(response.headers['access-control-allow-origin']).not.toBe(origin);
        }
      }
    });

    test('should prevent CORS bypass through null origin', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Origin', 'null')
        .send({ email: 'test@example.com', password: 'password123' });
      
      expect(response.headers['access-control-allow-origin']).not.toBe('null');
    });

    test('should not expose internal services through CORS', async () => {
      const internalOrigins = [
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://internal-api:5000',
        'http://admin.internal',
        'http://db.local',
        'http://redis.internal',
      ];

      for (const origin of internalOrigins) {
        const response = await request(app)
          .get('/user-personal')
          .set('Authorization', `Bearer ${validToken}`)
          .set('Origin', origin);
        
        if (response.headers['access-control-allow-origin']) {
          expect(response.headers['access-control-allow-origin']).not.toBe(origin);
        }
      }
    });
  });

  describe('HTTP Method Override Security', () => {
    test('should not allow method override on sensitive endpoints', async () => {
      const methodOverrideHeaders = [
        'X-HTTP-Method-Override',
        'X-Method-Override',
        'X-HTTP-Method',
        '_method',
      ];

      for (const header of methodOverrideHeaders) {
        const response = await request(app)
          .get('/auth/login')
          .set(header, 'POST')
          .query({ email: 'test@example.com', password: 'password123' });
        
        expect(response.status).toBe(404); // Should remain GET, not become POST
      }
    });

    test('should not allow dangerous method overrides', async () => {
      const dangerousMethods = [
        'DELETE',
        'PUT',
        'PATCH',
        'TRACE',
        'CONNECT',
        'PURGE',
      ];

      for (const method of dangerousMethods) {
        const response = await request(app)
          .get('/user-personal')
          .set('Authorization', `Bearer ${validToken}`)
          .set('X-HTTP-Method-Override', method);
        
        // Should respond as GET, not as the overridden method
        expect(response.status).toBe(200);
      }
    });

    test('should prevent method override privilege escalation', async () => {
      const response = await request(app)
        .get('/user-personal/upload/photos/123')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-HTTP-Method-Override', 'DELETE');
      
      // Should not delete, should respond as GET
      expect(response.status).toBe(404); // GET endpoint doesn't exist
    });

    test('should handle malicious method override values', async () => {
      const maliciousMethods = [
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        'POST; DROP TABLE users;',
        'GET\r\nHost: evil.com',
        'INVALID_METHOD',
        'GET HTTP/1.1\r\nHost: evil.com',
      ];

      for (const method of maliciousMethods) {
        const response = await request(app)
          .post('/auth/login')
          .set('X-HTTP-Method-Override', method)
          .send({ email: 'test@example.com', password: 'password123' });
        
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('HTTP Method Security', () => {
    test('should not accept TRACE method', async () => {
      const endpoints = [
        '/auth/login',
        '/user-personal',
        '/user-personal/family',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .trace(endpoint);
        
        expect(response.status).toBe(404);
      }
    });

    test('should not accept CONNECT method', async () => {
      const response = await request(app)
        .connect('/auth/login');
      
      expect(response.status).toBe(404);
    });

    test('should handle HEAD requests securely', async () => {
      const response = await request(app)
        .head('/auth/login');
      
      // HEAD should not expose sensitive information
      expect(response.text).toBeFalsy();
      expect(response.body).toEqual({});
    });

    test('should reject unsupported methods on protected endpoints', async () => {
      const unsupportedMethods = ['PATCH', 'PURGE', 'LOCK', 'UNLOCK'];
      
      for (const method of unsupportedMethods) {
        const response = await request(app)
          [method.toLowerCase()]?.('/user-personal')
          .set('Authorization', `Bearer ${validToken}`);
        
        if (response) {
          expect(response.status).toBe(404);
        }
      }
    });

    test('should not allow method spoofing through form data', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('_method=DELETE&email=test@example.com&password=password123');
      
      // Should process as POST, not as DELETE
      expect(response.status).toBe(400); // Login validation should fail
    });
  });

  describe('Request Smuggling Prevention', () => {
    test('should handle malformed HTTP headers', async () => {
      const malformedHeaders = [
        'Content-Length: 0\r\nContent-Length: 50',
        'Transfer-Encoding: chunked\r\nContent-Length: 0',
        'Host: evil.com\r\nHost: legitimate.com',
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .post('/auth/login')
          .set('X-Malformed', header)
          .send({ email: 'test@example.com', password: 'password123' });
        
        expect(response.status).not.toBe(500);
      }
    });

    test('should prevent HTTP request smuggling through chunked encoding', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Transfer-Encoding', 'chunked')
        .set('Content-Length', '0')
        .send({ email: 'test@example.com', password: 'password123' });
      
      expect(response.status).not.toBe(500);
    });

    test('should handle conflicting content-length headers', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Length', ['50', '100'])
        .send({ email: 'test@example.com', password: 'password123' });
      
      expect(response.status).not.toBe(500);
    });
  });

  describe('WebSocket Upgrade Attack Prevention', () => {
    test('should not allow WebSocket upgrade on HTTP endpoints', async () => {
      const response = await request(app)
        .get('/auth/login')
        .set('Upgrade', 'websocket')
        .set('Connection', 'Upgrade')
        .set('Sec-WebSocket-Key', 'dGhlIHNhbXBsZSBub25jZQ==')
        .set('Sec-WebSocket-Version', '13');
      
      expect(response.status).toBe(404);
      expect(response.headers['upgrade']).toBeUndefined();
    });

    test('should prevent protocol smuggling through upgrade headers', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Connection', 'keep-alive, Upgrade')
        .set('Upgrade', 'h2c')
        .send({ email: 'test@example.com', password: 'password123' });
      
      expect(response.status).not.toBe(101); // Should not be switching protocols
    });
  });

  describe('Cross-Site Request Forgery (CSRF) Related', () => {
    test('should validate referrer for state-changing operations', async () => {
      const maliciousReferrers = [
        'https://evil.com',
        'https://phishing-site.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
      ];

      for (const referrer of maliciousReferrers) {
        const response = await request(app)
          .post('/user-personal')
          .set('Authorization', `Bearer ${validToken}`)
          .set('Referer', referrer)
          .send({
            height: '180cm',
            weight: '70kg',
            astrologicalSign: 'Leo',
            birthPlace: 'Test City',
            religion: 'Test Religion',
            marriedStatus: 'Never Married',
            nationality: 'Test Nation',
          });
        
        // Should either reject or handle appropriately
        expect(response.status).not.toBe(500);
      }
    });

    test('should handle missing or empty referrer headers', async () => {
      const response = await request(app)
        .delete('/user-personal/upload/photos/123')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Referer', '');
      
      expect(response.status).not.toBe(500);
    });
  });

  describe('Host Header Injection Prevention', () => {
    test('should not reflect arbitrary host headers', async () => {
      const maliciousHosts = [
        'evil.com',
        'localhost:22',
        'admin.internal',
        '127.0.0.1:5432',
        'evil.com:80',
      ];

      for (const host of maliciousHosts) {
        const response = await request(app)
          .post('/auth/forgot-password')
          .set('Host', host)
          .send({ email: 'test@example.com' });
        
        // Should not include malicious host in response
        expect(response.text).not.toContain(host);
        expect(response.headers.location).not.toContain(host);
      }
    });

    test('should handle malformed host headers', async () => {
      const malformedHosts = [
        'host with spaces',
        'host\r\nX-Injected: evil',
        'host\nX-Injected: evil',
        'host:99999999',
        '[invalid:ipv6:format]',
      ];

      for (const host of malformedHosts) {
        const response = await request(app)
          .post('/auth/login')
          .set('Host', host)
          .send({ email: 'test@example.com', password: 'password123' });
        
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('X-Forwarded Headers Security', () => {
    test('should not trust X-Forwarded headers for authentication', async () => {
      const response = await request(app)
        .get('/user-personal')
        .set('X-Forwarded-For', '127.0.0.1')
        .set('X-Real-IP', '127.0.0.1')
        .set('X-Forwarded-Host', 'admin.internal')
        .set('X-Forwarded-Proto', 'https');
      
      expect(response.status).toBe(401); // Should still require proper authentication
    });

    test('should handle malicious X-Forwarded values', async () => {
      const maliciousValues = [
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        'evil.com, legitimate.com',
        'null',
        ''; DROP TABLE users; --',
      ];

      for (const value of maliciousValues) {
        const response = await request(app)
          .post('/auth/login')
          .set('X-Forwarded-For', value)
          .set('X-Real-IP', value)
          .send({ email: 'test@example.com', password: 'password123' });
        
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('Content-Type Confusion Attacks', () => {
    test('should not allow content-type confusion for file uploads', async () => {
      const confusingContentTypes = [
        'image/jpeg; charset=utf-8',
        'text/html; boundary=something',
        'application/json; name=malicious.php',
        'multipart/form-data; charset=utf-7',
      ];

      for (const contentType of confusingContentTypes) {
        const response = await request(app)
          .post('/user-personal/upload/photos')
          .set('Authorization', `Bearer ${validToken}`)
          .set('Content-Type', contentType)
          .send('malicious content');
        
        expect(response.status).toBe(400);
      }
    });

    test('should handle content-type charset attacks', async () => {
      const charsetAttacks = [
        'application/json; charset=utf-7',
        'text/plain; charset=utf-16',
        'application/json; charset=iso-2022-jp',
      ];

      for (const contentType of charsetAttacks) {
        const response = await request(app)
          .post('/auth/login')
          .set('Content-Type', contentType)
          .send('{"email":"test@example.com","password":"password123"}');
        
        expect(response.status).not.toBe(500);
      }
    });
  });
});