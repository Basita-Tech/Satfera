import request from 'supertest';
import express from 'express';
import authRouter from '../../routes/authRouter';
import userPersonalRouter from '../../routes/userPersonal';
import { createTestUser } from '../helpers/testUtils';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/auth', authRouter);
app.use('/user-personal', userPersonalRouter);

describe('API Parameter Pollution Security Tests', () => {
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

  describe('Query Parameter Pollution', () => {
    test('should handle duplicate query parameters safely', async () => {
      const pollutedQueries = [
        '?userId=123&userId=456',
        '?userId=legitimate&userId=../../../etc/passwd',
        '?userId=normal&userId[]=%3Cscript%3Ealert%281%29%3C/script%3E',
        '?userId=123&userId={"$ne":null}',
        '?limit=10&limit=999999',
        '?sort=name&sort=--drop-table',
      ];

      for (const query of pollutedQueries) {
        const response = await request(app)
          .get(`/user-personal/family${query}`)
          .set('Authorization', `Bearer ${validToken}`);
        
        // Should handle pollution gracefully
        expect(response.status).not.toBe(500);
      }
    });

    test('should prevent array injection through query parameters', async () => {
      const response = await request(app)
        .get('/user-personal/education')
        .set('Authorization', `Bearer ${validToken}`)
        .query({
          userId: ['123', '456', { $ne: null }],
          filter: ['normal', '<script>alert(1)</script>'],
          page: [1, 999999],
        });
      
      expect(response.status).not.toBe(500);
    });

    test('should handle nested parameter pollution in objects', async () => {
      const response = await request(app)
        .get('/user-personal/expectations')
        .set('Authorization', `Bearer ${validToken}`)
        .query({
          'age.from': ['18', '999'],
          'age.to': ['25', '1'],
          'filter.city': ['normal', '../../../etc/passwd'],
          'sort.field': ['name', '--drop-database'],
        });
      
      expect(response.status).not.toBe(500);
    });
  });

  describe('Body Parameter Pollution - JSON', () => {
    test('should handle duplicate keys in JSON payload', async () => {
      // Simulate JSON with duplicate keys
      const duplicateKeyPayload = `{
        "email": "legitimate@example.com",
        "email": "malicious@example.com",
        "password": "legitimate_password",
        "password": "malicious_password",
        "role": "user",
        "role": "admin"
      }`;

      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send(duplicateKeyPayload);
      
      expect(response.status).toBe(400);
    });

    test('should handle array manipulation in signup data', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          firstName: ['John', 'Admin'],
          lastName: ['Doe', 'Root'],
          email: ['user@test.com', 'admin@test.com'],
          password: ['Password123!', 'AdminPass123!'],
          phoneNumber: ['+1234567890', '+9999999999'],
          gender: ['male', 'admin'],
          dateOfBirth: ['01-01-1990', '01-01-1900'],
          for_Profile: ['myself', 'admin'],
        });
      
      expect(response.status).toBe(400);
    });

    test('should prevent nested object pollution in user personal data', async () => {
      const response = await request(app)
        .post('/user-personal')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          height: '180cm',
          weight: '70kg',
          astrologicalSign: 'Leo',
          birthPlace: 'Test City',
          religion: 'Test Religion',
          marriedStatus: 'Never Married',
          nationality: 'Test Nation',
          full_address: [
            {
              city: 'Legitimate City',
              state: 'Legitimate State',
            },
            {
              city: '../../../etc/passwd',
              state: '<script>alert(1)</script>',
              isYourHome: { $ne: null },
            }
          ]
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Form-Encoded Parameter Pollution', () => {
    test('should handle form-encoded duplicate parameters', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('email=test@example.com&email=admin@example.com&password=test123&password=admin123&role=user&role=admin');
      
      expect(response.status).toBe(400);
    });

    test('should prevent parameter pollution in password reset', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('email=user@test.com&email=admin@test.com&token=legitimate&token=malicious');
      
      expect(response.status).toBe(400);
    });

    test('should handle complex nested form pollution', async () => {
      const complexForm = [
        'full_address.city=Normal City',
        'full_address.city=../../../etc/passwd',
        'full_address.state=Normal State',
        'full_address.state=<script>alert(1)</script>',
        'full_address.zipCode=12345',
        'full_address.zipCode=99999',
        'height=180cm',
        'height=admin',
        'weight=70kg',
        'weight=999kg',
      ].join('&');

      const response = await request(app)
        .put('/user-personal')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(complexForm);
      
      expect(response.status).not.toBe(500);
    });
  });

  describe('Route Parameter Pollution', () => {
    test('should handle malicious photo IDs with pollution techniques', async () => {
      const maliciousPhotoIds = [
        '../../../admin/../photos/123',
        'normal%2f%2e%2e%2f%2e%2e%2fadmin',
        '123;DROP TABLE photos;--',
        '123&userId=456',
        '123?admin=true',
        '123#admin',
      ];

      for (const photoId of maliciousPhotoIds) {
        const response = await request(app)
          .delete(`/user-personal/upload/photos/${encodeURIComponent(photoId)}`)
          .set('Authorization', `Bearer ${validToken}`);
        
        expect(response.status).toBe(400);
      }
    });

    test('should prevent pollution in reset password token', async () => {
      const pollutedTokens = [
        'token123&admin=true',
        'token123;userId=admin',
        'token123?override=true',
        'token123/../../../admin',
        'token123%26admin%3Dtrue',
      ];

      for (const token of pollutedTokens) {
        const response = await request(app)
          .post(`/auth/reset-password/${encodeURIComponent(token)}`)
          .send({ password: 'NewPassword123!' });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Header Parameter Pollution', () => {
    test('should handle duplicate authorization headers', async () => {
      const response = await request(app)
        .get('/user-personal')
        .set('Authorization', `Bearer ${validToken}`)
        .set('authorization', 'Bearer malicious_token')  // Duplicate with different case
        .send();
      
      // Should handle gracefully, not cause security bypass
      expect(response.status).not.toBe(500);
    });

    test('should prevent header injection through pollution', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .set('content-type', 'text/html')  // Duplicate with different case
        .set('X-Forwarded-For', '127.0.0.1, evil.com')
        .set('X-Real-IP', ['127.0.0.1', 'evil.com'])
        .send({ email: 'test@example.com', password: 'password123' });
      
      expect(response.status).not.toBe(500);
    });

    test('should handle polluted custom headers', async () => {
      const response = await request(app)
        .get('/user-personal/health')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-User-ID', testUser._id.toString())
        .set('x-user-id', 'malicious_user_id')
        .set('X-Role', 'user')
        .set('x-role', 'admin')
        .send();
      
      expect(response.status).not.toBe(500);
    });
  });

  describe('Mixed Parameter Pollution Attacks', () => {
    test('should handle pollution across multiple parameter sources', async () => {
      const response = await request(app)
        .post('/user-personal/expectations?userId=query_user')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-User-ID', 'header_user')
        .send({
          userId: 'body_user',
          age: { from: 25, to: 35 },
          maritalStatus: { "Never Married": true },
          isConsumeAlcoholic: 'no',
          educationLevel: 'Graduate',
          community: ['Test'],
          livingInCountry: 'India',
          livingInState: 'Maharashtra',
          profession: ['Engineer'],
          diet: ['Vegetarian'],
        });
      
      // Should handle conflicting user IDs appropriately
      expect(response.status).not.toBe(500);
    });

    test('should prevent privilege escalation through pollution', async () => {
      const response = await request(app)
        .put('/user-personal?role=admin')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Admin', 'true')
        .send({
          height: '180cm',
          weight: '70kg',
          astrologicalSign: 'Leo',
          birthPlace: 'Test City',
          religion: 'Test Religion',
          marriedStatus: 'Never Married',
          nationality: 'Test Nation',
          role: 'admin',
          admin: true,
          isAdmin: true,
        });
      
      expect(response.status).not.toBe(200);
    });
  });

  describe('Array Parameter Pollution', () => {
    test('should handle polluted array parameters in expectations', async () => {
      const response = await request(app)
        .post('/user-personal/expectations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          userId: testUser._id.toString(),
          age: { from: 25, to: 35 },
          maritalStatus: { "Never Married": true },
          isConsumeAlcoholic: 'no',
          educationLevel: 'Graduate',
          community: [
            'Hindu',
            '../../../etc/passwd',
            { $ne: null },
            '<script>alert(1)</script>',
          ],
          livingInCountry: 'India',
          livingInState: 'Maharashtra',
          profession: [
            'Engineer',
            'Admin',
            { $regex: '.*admin.*' },
            '; DROP TABLE users; --',
          ],
          diet: [
            'Vegetarian',
            'Non-Vegetarian',
            { $where: 'this.role === "admin"' },
            '<iframe src=javascript:alert(1)></iframe>',
          ],
        });
      
      expect(response.status).toBe(400);
    });

    test('should handle array manipulation in family details', async () => {
      const response = await request(app)
        .post('/user-personal/family')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          fatherName: ['John Doe', 'Admin User'],
          motherName: ['Jane Doe', '<script>alert(1)</script>'],
          siblingDetails: [
            {
              name: 'Normal Sibling',
              isElder: true,
            },
            {
              name: '../../../etc/passwd',
              isElder: { $ne: null },
            },
            {
              name: 'Evil Sibling',
              isElder: 'true; DROP TABLE siblings; --',
            }
          ],
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Encoding-based Parameter Pollution', () => {
    test('should handle URL-encoded pollution attempts', async () => {
      const encodedAttacks = [
        'email=test%40example.com&email=admin%40example.com',
        'password=test123&password=%3Cscript%3Ealert%281%29%3C/script%3E',
        'role=user&role=%2E%2E%2F%2E%2E%2Fadmin',
        'userId=123&userId=%7B%22%24ne%22%3Anull%7D',
      ];

      for (const encoded of encodedAttacks) {
        const response = await request(app)
          .post('/auth/login')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(encoded);
        
        expect(response.status).toBe(400);
      }
    });

    test('should handle double-encoded pollution', async () => {
      const doubleEncoded = [
        'userId=%2E%252E%252F%2E%252E%252Fadmin',  // ../../admin double encoded
        'email=%253Cscript%253Ealert%25281%2529%253C%252Fscript%253E',  // <script> double encoded
        'password=%2527%253B%2520DROP%2520TABLE%2520users%253B%2520--',  // SQL injection double encoded
      ];

      for (const encoded of doubleEncoded) {
        const response = await request(app)
          .post('/auth/login')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(encoded);
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('JSON Parameter Pollution Edge Cases', () => {
    test('should handle JSON with prototype pollution attempts', async () => {
      const prototypePayload = {
        height: '180cm',
        weight: '70kg',
        astrologicalSign: 'Leo',
        birthPlace: 'Test City',
        religion: 'Test Religion',
        marriedStatus: 'Never Married',
        nationality: 'Test Nation',
        '__proto__': { isAdmin: true },
        'constructor': { prototype: { isAdmin: true } },
        'prototype': { isAdmin: true },
      };

      const response = await request(app)
        .post('/user-personal')
        .set('Authorization', `Bearer ${validToken}`)
        .send(prototypePayload);
      
      expect(response.status).toBe(400);
    });

    test('should handle deeply nested pollution attempts', async () => {
      const deepNested = {
        height: '180cm',
        weight: '70kg',
        astrologicalSign: 'Leo',
        birthPlace: 'Test City',
        religion: 'Test Religion',
        marriedStatus: 'Never Married',
        nationality: 'Test Nation',
        full_address: {
          city: 'Normal',
          state: 'Normal',
          nested: {
            deeper: {
              evil: '../../../etc/passwd',
              admin: true,
              userId: { $ne: null },
            }
          }
        }
      };

      const response = await request(app)
        .post('/user-personal')
        .set('Authorization', `Bearer ${validToken}`)
        .send(deepNested);
      
      expect(response.status).toBe(400);
    });
  });
});