import { AuthService } from '../../services/authServices';
import { createTestUser } from '../helpers/testUtils';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    process.env.JWT_SECRET = 'test-secret-key-with-sufficient-length-for-security';
  });

  describe('loginWithEmail', () => {
    it('should successfully login with valid credentials', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await createTestUser({
        email: 'test@example.com',
        password: hashedPassword,
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      const result = await authService.loginWithEmail('test@example.com', password);

      expect(result.user._id.toString()).toBe(user._id.toString());
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should throw error for invalid email', async () => {
      await expect(
        authService.loginWithEmail('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for unverified email', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await createTestUser({
        email: 'unverified@example.com',
        password: hashedPassword,
        isEmailVerified: false,
        isEmailLoginEnabled: true
      });

      await expect(
        authService.loginWithEmail('unverified@example.com', password)
      ).rejects.toThrow('Please verify your email before logging in.');
    });

    it('should throw error for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      
      await createTestUser({
        email: 'test@example.com',
        password: hashedPassword,
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      await expect(
        authService.loginWithEmail('test@example.com', 'wrongPassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when email login is disabled', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await createTestUser({
        email: 'disabled@example.com',
        password: hashedPassword,
        isEmailVerified: true,
        isEmailLoginEnabled: false
      });

      await expect(
        authService.loginWithEmail('disabled@example.com', password)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for missing email or password', async () => {
      await expect(
        authService.loginWithEmail('', 'password')
      ).rejects.toThrow('Email and password are required');

      await expect(
        authService.loginWithEmail('test@example.com', '')
      ).rejects.toThrow('Email and password are required');
    });
  });

  describe('loginWithPhone', () => {
    it('should successfully login with valid phone credentials', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await createTestUser({
        phoneNumber: '+1234567890',
        password: hashedPassword,
        isMobileLoginEnabled: true
      });

      const result = await authService.loginWithPhone('+1234567890', password);

      expect(result.user._id.toString()).toBe(user._id.toString());
      expect(result.token).toBeDefined();
    });

    it('should throw error for invalid phone number', async () => {
      await expect(
        authService.loginWithPhone('+9876543210', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for disabled mobile login', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await createTestUser({
        phoneNumber: '+1234567890',
        password: hashedPassword,
        isMobileLoginEnabled: false
      });

      await expect(
        authService.loginWithPhone('+1234567890', password)
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('JWT Secret validation', () => {
    it('should throw error when JWT_SECRET is missing', async () => {
      delete process.env.JWT_SECRET;
      
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await createTestUser({
        email: 'test@example.com',
        password: hashedPassword,
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      await expect(
        authService.loginWithEmail('test@example.com', password)
      ).rejects.toThrow('JWT_SECRET environment variable is required');
    });

    it('should throw error when JWT_SECRET is too short', async () => {
      process.env.JWT_SECRET = 'short';
      
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await createTestUser({
        email: 'test@example.com',
        password: hashedPassword,
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      await expect(
        authService.loginWithEmail('test@example.com', password)
      ).rejects.toThrow('JWT_SECRET must be at least 32 characters long');
    });
  });
});