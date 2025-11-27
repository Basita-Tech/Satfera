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

describe('API Versioning and Information Disclosure Security Tests', () => {
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

  describe('API Version Information Disclosure', () => {
    test('should not expose API version in response headers', async () => {
      const endpoints = [
        { method: 'post', path: '/auth/login' },
        { method: 'get', path: '/user-personal' },
        { method: 'post', path: '/auth/signup' },
      ];

      const versionHeaders = [
        'x-api-version',
        'api-version',
        'version',
        'x-version',
        'x-app-version',
        'x-service-version',
        'server-version',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', endpoint.path.includes('/user-personal') ? `Bearer ${validToken}` : '')
          .send(endpoint.method === 'post' ? { 
            email: 'test@example.com', 
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            phoneNumber: '+1234567890',
            gender: 'male',
            dateOfBirth: '01-01-1990',
            for_Profile: 'myself'
          } : undefined);

        for (const header of versionHeaders) {
          expect(response.headers[header]).toBeUndefined();
        }
      }
    });

    test('should not expose version information in response body', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.body).not.toHaveProperty('version');
      expect(response.body).not.toHaveProperty('apiVersion');
      expect(response.body).not.toHaveProperty('buildNumber');
      expect(response.body).not.toHaveProperty('build');
      expect(response.body).not.toHaveProperty('release');
    });

    test('should not reveal version through Accept-Version header manipulation', async () => {
      const versionAttempts = [
        'application/json;version=2',
        'application/vnd.api+json;version=admin',
        'application/json;v=999',
        'text/html;version=debug',
      ];

      for (const acceptHeader of versionAttempts) {
        const response = await request(app)
          .get('/user-personal')
          .set('Authorization', `Bearer ${validToken}`)
          .set('Accept', acceptHeader);

        expect(response.body).not.toHaveProperty('version');
        expect(response.headers).not.toHaveProperty('x-api-version');
      }
    });

    test('should handle version spoofing through custom headers', async () => {
      const versionHeaders = {
        'X-API-Version': 'admin',
        'API-Version': '999.999.999',
        'Version': 'debug',
        'X-Version': 'internal',
        'Accept-Version': 'latest',
        'X-Requested-Version': 'v2',
      };

      for (const [header, value] of Object.entries(versionHeaders)) {
        const response = await request(app)
          .post('/auth/login')
          .set(header, value)
          .send({ email: 'test@example.com', password: 'password123' });

        expect(response.status).not.toBe(200); // Should not authenticate with wrong credentials
        expect(response.body).not.toHaveProperty('version');
        expect(response.headers['x-api-version']).toBeUndefined();
      }
    });
  });

  describe('System Information Disclosure', () => {
    test('should not expose server technology stack', async () => {
      const response = await request(app)
        .get('/user-personal')
        .set('Authorization', `Bearer ${validToken}`);

      const sensitiveHeaders = [
        'x-powered-by',
        'server',
        'x-aspnet-version',
        'x-framework',
        'x-runtime',
        'x-language',
        'x-platform',
      ];

      for (const header of sensitiveHeaders) {
        expect(response.headers[header]).toBeUndefined();
      }
    });

    test('should not leak environment information in error responses', async () => {
      const response = await request(app)
        .post('/user-personal')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ invalid: 'data structure that will cause validation error' });

      if (response.body.message) {
        expect(response.body.message).not.toContain('NODE_ENV');
        expect(response.body.message).not.toContain('development');
        expect(response.body.message).not.toContain('production');
        expect(response.body.message).not.toContain('staging');
        expect(response.body.message).not.toContain('process.env');
      }

      expect(response.body).not.toHaveProperty('env');
      expect(response.body).not.toHaveProperty('environment');
      expect(response.body).not.toHaveProperty('config');
    });

    test('should not expose database information', async () => {
      const response = await request(app)
        .get('/user-personal/family')
        .set('Authorization', `Bearer ${validToken}`);

      if (response.body.message) {
        expect(response.body.message).not.toContain('mongodb');
        expect(response.body.message).not.toContain('mongoose');
        expect(response.body.message).not.toContain('collection');
        expect(response.body.message).not.toContain('database');
        expect(response.body.message).not.toContain('db');
        expect(response.body.message).not.toContain('mongo');
      }

      expect(response.body).not.toHaveProperty('dbQuery');
      expect(response.body).not.toHaveProperty('mongoQuery');
      expect(response.body).not.toHaveProperty('sql');
    });

    test('should not leak file system paths', async () => {
      const response = await request(app)
        .post('/user-personal/upload/photos')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('invalid file content'), 'test.txt');

      if (response.body.message) {
        expect(response.body.message).not.toMatch(/[A-Z]:\\/); // Windows paths
        expect(response.body.message).not.toMatch(/\/usr\//); // Unix paths
        expect(response.body.message).not.toMatch(/\/etc\//);
        expect(response.body.message).not.toMatch(/\/var\//);
        expect(response.body.message).not.toMatch(/\/home\//);
        expect(response.body.message).not.toContain('node_modules');
        expect(response.body.message).not.toContain('src/');
        expect(response.body.message).not.toContain('backend/');
      }
    });

    test('should not expose internal service information', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      if (response.body.message) {
        expect(response.body.message).not.toContain('redis');
        expect(response.body.message).not.toContain('localhost');
        expect(response.body.message).not.toContain('127.0.0.1');
        expect(response.body.message).not.toContain(':3000');
        expect(response.body.message).not.toContain(':5000');
        expect(response.body.message).not.toContain('internal');
        expect(response.body.message).not.toContain('docker');
        expect(response.body.message).not.toContain('container');
      }
    });
  });

  describe('Debug Information Disclosure', () => {
    test('should not expose debug information through headers', async () => {
      const debugHeaders = [
        'X-Debug',
        'X-Trace',
        'X-Profile',
        'Debug',
        'Trace',
        'X-Debug-Mode',
      ];

      for (const header of debugHeaders) {
        const response = await request(app)
          .get('/user-personal')
          .set('Authorization', `Bearer ${validToken}`)
          .set(header, 'true');

        expect(response.headers['x-debug']).toBeUndefined();
        expect(response.headers['x-trace']).toBeUndefined();
        expect(response.body).not.toHaveProperty('debug');
        expect(response.body).not.toHaveProperty('trace');
      }
    });

    test('should not leak stack traces in error responses', async () => {
      const response = await request(app)
        .post('/user-personal/expectations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ 
          userId: 'invalid-object-id',
          age: { from: 'invalid', to: 'invalid' },
          invalidField: 'trigger error'
        });

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('stackTrace');
      expect(response.body).not.toHaveProperty('trace');
      
      if (response.body.message) {
        expect(response.body.message).not.toContain('at ');
        expect(response.body.message).not.toContain('.js:');
        expect(response.body.message).not.toContain('Error:');
        expect(response.body.message).not.toContain('TypeError:');
        expect(response.body.message).not.toContain('ReferenceError:');
      }
    });

    test('should not expose performance metrics', async () => {
      const response = await request(app)
        .get('/user-personal/health')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Performance', 'true');

      const performanceHeaders = [
        'x-response-time',
        'x-query-time',
        'x-process-time',
        'x-cpu-usage',
        'x-memory-usage',
        'x-db-queries',
        'x-cache-hits',
      ];

      for (const header of performanceHeaders) {
        expect(response.headers[header]).toBeUndefined();
      }

      expect(response.body).not.toHaveProperty('queryTime');
      expect(response.body).not.toHaveProperty('responseTime');
      expect(response.body).not.toHaveProperty('metrics');
    });
  });

  describe('Documentation Disclosure', () => {
    test('should not expose API documentation endpoints', async () => {
      const docEndpoints = [
        '/docs',
        '/api-docs',
        '/swagger',
        '/swagger-ui',
        '/openapi',
        '/graphql',
        '/playground',
        '/api/docs',
        '/v1/docs',
      ];

      for (const endpoint of docEndpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(404);
      }
    });

    test('should not leak schema information', async () => {
      const response = await request(app)
        .get('/user-personal')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Accept', 'application/schema+json');

      expect(response.body).not.toHaveProperty('schema');
      expect(response.body).not.toHaveProperty('$schema');
      expect(response.body).not.toHaveProperty('definitions');
      expect(response.body).not.toHaveProperty('properties');
    });

    test('should not expose API endpoints through OPTIONS requests', async () => {
      const response = await request(app)
        .options('/auth')
        .set('Access-Control-Request-Method', 'GET');

      // Should not reveal all available endpoints
      expect(response.text).not.toContain('/admin');
      expect(response.text).not.toContain('/internal');
      expect(response.text).not.toContain('/debug');
    });
  });

  describe('Error Message Information Disclosure', () => {
    test('should not leak sensitive information in validation errors', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'weak',
          // Missing required fields
        });

      if (response.body.errors) {
        const errorMessages = JSON.stringify(response.body.errors);
        expect(errorMessages).not.toContain('SELECT');
        expect(errorMessages).not.toContain('INSERT');
        expect(errorMessages).not.toContain('UPDATE');
        expect(errorMessages).not.toContain('DELETE');
        expect(errorMessages).not.toContain('mongoose');
        expect(errorMessages).not.toContain('mongodb');
      }
    });

    test('should sanitize error messages from external services', async () => {
      const response = await request(app)
        .post('/auth/send-email-otp')
        .send({ email: 'invalid-email-format' });

      if (response.body.message) {
        expect(response.body.message).not.toContain('SMTP');
        expect(response.body.message).not.toContain('mail server');
        expect(response.body.message).not.toContain('connection refused');
        expect(response.body.message).not.toContain('timeout');
        expect(response.body.message).not.toContain('DNS');
      }
    });

    test('should handle database constraint errors gracefully', async () => {
      // Try to create duplicate user
      await createTestUser({ email: 'duplicate@test.com' });
      
      const response = await request(app)
        .post('/auth/signup')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'duplicate@test.com',
          password: 'Password123!',
          phoneNumber: '+1234567891',
          gender: 'male',
          dateOfBirth: '01-01-1990',
          for_Profile: 'myself',
        });

      expect(response.status).toBe(400);
      if (response.body.message) {
        expect(response.body.message).not.toContain('E11000');
        expect(response.body.message).not.toContain('duplicate key');
        expect(response.body.message).not.toContain('index');
        expect(response.body.message).not.toContain('collection');
      }
    });
  });

  describe('Headers Information Disclosure', () => {
    test('should not expose internal routing information', async () => {
      const response = await request(app)
        .get('/user-personal/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);

      const routingHeaders = [
        'x-route-handler',
        'x-controller',
        'x-action',
        'x-middleware',
        'x-router',
      ];

      for (const header of routingHeaders) {
        expect(response.headers[header]).toBeUndefined();
      }
    });

    test('should not leak request processing information', async () => {
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
        });

      const processingHeaders = [
        'x-request-id',
        'x-correlation-id',
        'x-session-id',
        'x-user-agent-id',
        'x-fingerprint',
      ];

      for (const header of processingHeaders) {
        expect(response.headers[header]).toBeUndefined();
      }
    });
  });

  describe('Third-Party Service Information Disclosure', () => {
    test('should not expose third-party service errors', async () => {
      const response = await request(app)
        .post('/auth/send-sms-otp')
        .send({ phoneNumber: 'invalid-phone' });

      if (response.body.message) {
        expect(response.body.message).not.toContain('Twilio');
        expect(response.body.message).not.toContain('AWS');
        expect(response.body.message).not.toContain('SES');
        expect(response.body.message).not.toContain('S3');
        expect(response.body.message).not.toContain('API key');
        expect(response.body.message).not.toContain('credential');
      }
    });

    test('should not leak service configuration', async () => {
      const response = await request(app)
        .post('/user-personal/upload/photos')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test'), 'test.jpg');

      if (response.body.message) {
        expect(response.body.message).not.toContain('bucket');
        expect(response.body.message).not.toContain('region');
        expect(response.body.message).not.toContain('endpoint');
        expect(response.body.message).not.toContain('access key');
      }
    });
  });

  describe('Business Logic Information Disclosure', () => {
    test('should not expose internal business rules', async () => {
      const response = await request(app)
        .post('/user-personal/expectations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          userId: testUser._id.toString(),
          age: { from: 999, to: 1 }, // Invalid range
          maritalStatus: { "Never Married": true },
          isConsumeAlcoholic: 'no',
          educationLevel: 'Graduate',
          community: ['Test'],
          livingInCountry: 'India',
          livingInState: 'Maharashtra',
          profession: ['Engineer'],
          diet: ['Vegetarian'],
        });

      if (response.body.message) {
        expect(response.body.message).not.toContain('business rule');
        expect(response.body.message).not.toContain('algorithm');
        expect(response.body.message).not.toContain('pricing');
        expect(response.body.message).not.toContain('calculation');
      }
    });

    test('should not leak user enumeration information', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      // Should not reveal whether user exists or not
      expect(response.status).toBe(400);
      if (response.body.message) {
        expect(response.body.message).not.toContain('user not found');
        expect(response.body.message).not.toContain('user exists');
        expect(response.body.message).not.toContain('invalid user');
      }
    });
  });

  describe('Session and Authentication Information Disclosure', () => {
    test('should not expose session internals', async () => {
      const response = await request(app)
        .get('/user-personal')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.body).not.toHaveProperty('sessionId');
      expect(response.body).not.toHaveProperty('session');
      expect(response.body).not.toHaveProperty('csrf');
      expect(response.body).not.toHaveProperty('token');
    });

    test('should not leak JWT information in responses', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.body).not.toHaveProperty('jwt');
      expect(response.body).not.toHaveProperty('payload');
      expect(response.body).not.toHaveProperty('header');
      expect(response.body).not.toHaveProperty('signature');
    });
  });
});