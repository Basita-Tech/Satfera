import request from 'supertest';
import express from 'express';
import { AuthController } from '../../controllers/authControllers';
import { createTestUser, generateTestToken } from '../helpers/testUtils';
import { User } from '../../models/User';

const app = express();
app.use(express.json());
app.post('/auth/google', AuthController.googleAuth);
app.post('/auth/login', AuthController.login);

describe('AuthController', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('POST /auth/google', () => {
    it('should return exists: false when user not found', async () => {
      const response = await request(app)
        .post('/auth/google')
        .send({
          email: 'nonexistent@example.com',
          name: 'Test User'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        exists: false
      });
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/auth/google')
        .send({
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Email is required'
      });
    });

    it('should return user data and token for verified user', async () => {
      const testUser = await createTestUser({
        email: 'test@example.com',
        isEmailVerified: true,
        isEmailLoginEnabled: true
      });

      const response = await request(app)
        .post('/auth/google')
        .send({
          email: 'test@example.com',
          name: 'Test User'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.exists).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return 403 when email login is disabled', async () => {
      await createTestUser({
        email: 'disabled@example.com',
        isEmailLoginEnabled: false
      });

      const response = await request(app)
        .post('/auth/google')
        .send({
          email: 'disabled@example.com',
          name: 'Test User'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email login is disabled for this user.');
    });

    it('should return 403 when email is not verified', async () => {
      await createTestUser({
        email: 'unverified@example.com',
        isEmailVerified: false,
        isEmailLoginEnabled: true
      });

      const response = await request(app)
        .post('/auth/google')
        .send({
          email: 'unverified@example.com',
          name: 'Test User'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email is not verified. Please verify your email before signing in.');
    });
  });

  describe('User Model', () => {
    it('should create a user with required fields', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'hashedpassword123',
        phoneNumber: '+1234567890',
        gender: 'male',
        for_Profile: 'myself'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.email).toBe(userData.email.toLowerCase());
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.role).toBe('user');
    });

    it('should not include password in toJSON output', async () => {
      const user = await createTestUser();
      const userJSON = user.toJSON();

      expect(userJSON.password).toBeUndefined();
      expect(userJSON.__v).toBeUndefined();
      expect(userJSON.welcomeSent).toBeUndefined();
    });

    it('should normalize email to lowercase', async () => {
      const user = await createTestUser({
        email: 'Test@EXAMPLE.COM'
      });

      expect(user.email).toBe('test@example.com');
    });
  });
});