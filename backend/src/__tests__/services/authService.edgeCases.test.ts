import { AuthService } from '../../services/authServices';
import { createTestUser } from '../helpers/testUtils';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User';

describe('AuthService - Edge Cases & Security Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    process.env.JWT_SECRET = 'test-secret-key-with-sufficient-length-for-security';
  });

  describe('Security Vulnerabilities', () => {
    it('should prevent SQL injection in email field', async () => {
      const maliciousEmail = "'; DROP TABLE users; --";
      
      await expect(
        authService.loginWithEmail(maliciousEmail, 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should prevent NoSQL injection in email field', async () => {
      const maliciousEmail = { $ne: null } as any;
      
      await expect(
        authService.loginWithEmail(maliciousEmail, 'password')
      ).rejects.toThrow();
    });

    it('should handle extremely long email inputs', async () => {
      const longEmail = 'a'.repeat(10000) + '@example.com';
      
      await expect(
        authService.loginWithEmail(longEmail, 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should prevent timing attacks on password comparison', async () => {
      const user = await createTestUser({
        email: 'timing@test.com',
        password: await bcrypt.hash('correctpassword', 10)
      });

      const startWrong = Date.now();
      try {
        await authService.loginWithEmail('timing@test.com', 'wrongpassword');
      } catch {}
      const endWrong = Date.now();

      const startNonExistent = Date.now();
      try {
        await authService.loginWithEmail('nonexistent@test.com', 'password');
      } catch {}
      const endNonExistent = Date.now();

      // Time difference should be minimal to prevent user enumeration
      const wrongTime = endWrong - startWrong;
      const nonExistentTime = endNonExistent - startNonExistent;
      
      // This test might fail - showing a potential timing attack vulnerability
      expect(Math.abs(wrongTime - nonExistentTime)).toBeLessThan(50);
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      await expect(
        authService.loginWithEmail(null as any, 'password')
      ).rejects.toThrow();

      await expect(
        authService.loginWithEmail('test@example.com', null as any)
      ).rejects.toThrow();

      await expect(
        authService.loginWithEmail(undefined as any, undefined as any)
      ).rejects.toThrow();
    });

    it('should handle special characters in email', async () => {
      const specialEmails = [
        'test+tag@example.com',
        'test.with.dots@example.com',
        'test@subdomain.example.com',
        'weird!"#$%&\'email@example.com'
      ];

      for (const email of specialEmails) {
        await expect(
          authService.loginWithEmail(email, 'password')
        ).rejects.toThrow('Invalid credentials');
      }
    });

    it('should handle Unicode and internationalized emails', async () => {
      const unicodeEmails = [
        'tést@example.com',
        'ñoño@example.com',
        '测试@example.com',
        'тест@example.com'
      ];

      for (const email of unicodeEmails) {
        await expect(
          authService.loginWithEmail(email, 'password')
        ).rejects.toThrow('Invalid credentials');
      }
    });
  });

  describe('Rate Limiting & Brute Force Protection', () => {
    it('should NOT have brute force protection (vulnerability)', async () => {
      const user = await createTestUser({
        email: 'bruteforce@test.com',
        password: await bcrypt.hash('correctpassword', 10)
      });

      // Try 100 failed attempts - should fail all without being blocked
      const promises = Array.from({ length: 100 }, () => 
        authService.loginWithEmail('bruteforce@test.com', 'wrongpassword')
          .catch(() => 'failed')
      );

      const results = await Promise.all(promises);
      
      // All should fail, but there's NO rate limiting implemented
      expect(results.every(result => result === 'failed')).toBe(true);
      // This test passes, but shows the vulnerability - no rate limiting!
    });
  });

  describe('JWT Token Security', () => {
    it('should create different tokens for same user', async () => {
      const user = await createTestUser({
        email: 'token@test.com',
        password: await bcrypt.hash('password', 10),
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      const login1 = await authService.loginWithEmail('token@test.com', 'password');
      const login2 = await authService.loginWithEmail('token@test.com', 'password');

      // Tokens should be different (they include timestamp)
      expect(login1.token).not.toBe(login2.token);
    });

    it('should fail with weak JWT secret', async () => {
      process.env.JWT_SECRET = 'weak';
      
      const user = await createTestUser({
        email: 'weak@test.com',
        password: await bcrypt.hash('password', 10)
      });

      await expect(
        authService.loginWithEmail('weak@test.com', 'password')
      ).rejects.toThrow('JWT_SECRET must be at least 32 characters long');
    });
  });

  describe('Database Connection Issues', () => {
    it('should handle database connection failures', async () => {
      // Mock mongoose to simulate connection failure
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(
        authService.loginWithEmail('test@example.com', 'password')
      ).rejects.toThrow('Database connection failed');

      User.findOne = originalFindOne;
    });
  });

  describe('Memory & Performance Issues', () => {
    it('should handle concurrent login attempts', async () => {
      const user = await createTestUser({
        email: 'concurrent@test.com',
        password: await bcrypt.hash('password', 10),
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      // 50 concurrent login attempts
      const promises = Array.from({ length: 50 }, () => 
        authService.loginWithEmail('concurrent@test.com', 'password')
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled');
      
      // All should succeed, but this could expose race conditions
      expect(successful.length).toBe(50);
    });
  });

  describe('Real-world Attack Scenarios', () => {
    it('should handle password with null bytes', async () => {
      const passwordWithNull = 'password\0afternull';
      
      await expect(
        authService.loginWithEmail('test@example.com', passwordWithNull)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should handle extremely long passwords', async () => {
      const longPassword = 'a'.repeat(1000000); // 1MB password
      
      await expect(
        authService.loginWithEmail('test@example.com', longPassword)
      ).rejects.toThrow();
    });

    it('should handle password with special characters', async () => {
      const specialPasswords = [
        'pass"word',
        "pass'word",
        'pass\\word',
        'pass\nword',
        'pass\tword',
        'pass word',
        '密码'
      ];

      for (const password of specialPasswords) {
        await expect(
          authService.loginWithEmail('test@example.com', password)
        ).rejects.toThrow('Invalid credentials');
      }
    });
  });
});