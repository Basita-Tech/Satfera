import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User } from '../../models/User';

export const createTestUser = async (overrides: any = {}) => {
  const userData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    password: 'hashedpassword123',
    phoneNumber: '+1234567890',
    gender: 'male',
    for_Profile: 'myself',
    isEmailVerified: true,
    isPhoneVerified: true,
    ...overrides
  };

  const user = new User(userData);
  await user.save();
  return user;
};

export const generateTestToken = (userId: string) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

export const createObjectId = () => new Types.ObjectId();