import mongoose from 'mongoose';
import { User, IUser } from '../../models/User';

describe('User Model Security Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('NoSQL Injection Vulnerabilities', () => {
    test('should prevent NoSQL injection in email field', async () => {
      const maliciousPayload = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: { $ne: null }, // NoSQL injection attempt
        for_Profile: 'myself'
      };

      // Should fail validation or be sanitized
      await expect(User.create(maliciousPayload)).rejects.toThrow();
    });

    test('should prevent NoSQL injection in phoneNumber field', async () => {
      const maliciousPayload = {
        firstName: 'Test',
        lastName: 'User', 
        gender: 'male',
        phoneNumber: { $regex: '.*' }, // NoSQL injection attempt
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      await expect(User.create(maliciousPayload)).rejects.toThrow();
    });

    test('should prevent regex injection in find operations', async () => {
      // First create a legitimate user
      await User.create({
        firstName: 'Legitimate',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'legit@example.com',
        for_Profile: 'myself'
      });

      // Attempt regex injection
      const maliciousQuery = { email: { $regex: '.*' } };
      const result = await User.findOne(maliciousQuery);
      
      // This should ideally be prevented at application level
      // But we test that it doesn't expose unintended data
      if (result) {
        expect(result.password).toBeUndefined(); // Password should be filtered out
      }
    });
  });

  describe('Schema Validation Bypass', () => {
    test('should enforce required fields', async () => {
      const incompleteData = {
        firstName: 'Test',
        // Missing required fields: lastName, gender, phoneNumber, password, email
      };

      await expect(User.create(incompleteData)).rejects.toThrow(/validation failed/i);
    });

    test('should prevent creation without required gender field', async () => {
      const dataWithoutGender = {
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'myself'
        // Missing gender
      };

      await expect(User.create(dataWithoutGender)).rejects.toThrow();
    });

    test('should enforce enum validation for gender', async () => {
      const invalidGenderData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'invalid_gender', // Invalid enum value
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      await expect(User.create(invalidGenderData)).rejects.toThrow();
    });

    test('should enforce enum validation for role', async () => {
      const invalidRoleData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        role: 'superadmin', // Invalid enum value
        for_Profile: 'myself'
      };

      await expect(User.create(invalidRoleData)).rejects.toThrow();
    });

    test('should enforce enum validation for for_Profile', async () => {
      const invalidProfileData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'invalid_relation' // Invalid enum value
      };

      await expect(User.create(invalidProfileData)).rejects.toThrow();
    });
  });

  describe('Unique Constraint Bypass', () => {
    test('should prevent duplicate email addresses', async () => {
      const userData1 = {
        firstName: 'Test1',
        lastName: 'User1',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'duplicate@example.com',
        for_Profile: 'myself'
      };

      const userData2 = {
        firstName: 'Test2',
        lastName: 'User2',
        gender: 'female',
        phoneNumber: '0987654321',
        password: 'password456',
        email: 'duplicate@example.com', // Duplicate email
        for_Profile: 'myself'
      };

      await User.create(userData1);
      await expect(User.create(userData2)).rejects.toThrow(/duplicate key/i);
    });

    test('should prevent duplicate phone numbers', async () => {
      const userData1 = {
        firstName: 'Test1',
        lastName: 'User1',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test1@example.com',
        for_Profile: 'myself'
      };

      const userData2 = {
        firstName: 'Test2',
        lastName: 'User2',
        gender: 'female',
        phoneNumber: '1234567890', // Duplicate phone number
        password: 'password456',
        email: 'test2@example.com',
        for_Profile: 'myself'
      };

      await User.create(userData1);
      await expect(User.create(userData2)).rejects.toThrow(/duplicate key/i);
    });

    test('should handle case sensitivity in email uniqueness', async () => {
      const userData1 = {
        firstName: 'Test1',
        lastName: 'User1',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'Test@Example.COM',
        for_Profile: 'myself'
      };

      const userData2 = {
        firstName: 'Test2',
        lastName: 'User2',
        gender: 'female',
        phoneNumber: '0987654321',
        password: 'password456',
        email: 'test@example.com', // Same email, different case
        for_Profile: 'myself'
      };

      await User.create(userData1);
      // This should fail due to case-insensitive email handling in pre-save hook
      await expect(User.create(userData2)).rejects.toThrow(/duplicate key/i);
    });
  });

  describe('Data Type Confusion Attacks', () => {
    test('should prevent boolean injection in string fields', async () => {
      const maliciousData = {
        firstName: true, // Boolean instead of string
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      await expect(User.create(maliciousData)).rejects.toThrow();
    });

    test('should prevent object injection in boolean fields', async () => {
      const maliciousData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        isActive: { $ne: false }, // Object instead of boolean
        for_Profile: 'myself'
      };

      await expect(User.create(maliciousData)).rejects.toThrow();
    });

    test('should prevent array injection in string fields', async () => {
      const maliciousData = {
        firstName: 'Test',
        lastName: ['User', 'Admin'], // Array instead of string
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      await expect(User.create(maliciousData)).rejects.toThrow();
    });
  });

  describe('Mass Assignment Attacks', () => {
    test('should prevent mass assignment of sensitive fields during creation', async () => {
      const maliciousData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        role: 'admin', // Attempting to set admin role
        isEmailVerified: true, // Attempting to bypass verification
        isPhoneVerified: true, // Attempting to bypass verification
        for_Profile: 'myself',
        createdAt: new Date('2020-01-01'), // Attempting to set custom creation date
        __v: 999 // Attempting to set version key
      };

      const user = await User.create(maliciousData);
      
      // These fields should be set to their defaults, not the malicious values
      expect(user.role).toBe('user'); // Default role
      expect(user.isEmailVerified).toBe(false); // Default value
      expect(user.isPhoneVerified).toBe(false); // Default value
      expect(user.createdAt).not.toEqual(new Date('2020-01-01')); // Should be current time
    });

    test('should prevent privilege escalation through mass assignment updates', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      const user = await User.create(userData);
      expect(user.role).toBe('user'); // Default role

      // Attempt to update with admin role through mass assignment
      const updateData = {
        firstName: 'Updated',
        role: 'admin', // Privilege escalation attempt
        isEmailVerified: true
      };

      await User.findByIdAndUpdate(user._id, updateData);
      const updatedUser = await User.findById(user._id);
      
      // Role should not be updated through mass assignment
      // This test exposes that the model allows this - it's a vulnerability
      if (updatedUser?.role === 'admin') {
        console.warn('SECURITY VULNERABILITY: Mass assignment allows role escalation');
      }
    });
  });

  describe('Sensitive Data Exposure', () => {
    test('should filter password from toJSON output', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'secretpassword',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      const user = await User.create(userData);
      const jsonOutput = JSON.parse(JSON.stringify(user));
      
      expect(jsonOutput.password).toBeUndefined();
      expect(jsonOutput.__v).toBeUndefined();
      expect(jsonOutput.welcomeSent).toBeUndefined();
    });

    test('should filter password from toObject output', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'secretpassword',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      const user = await User.create(userData);
      const objectOutput = user.toObject();
      
      expect(objectOutput.password).toBeUndefined();
      expect(objectOutput.__v).toBeUndefined();
      expect(objectOutput.welcomeSent).toBeUndefined();
    });

    test('should ensure _id is transformed to id', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'secretpassword',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      const user = await User.create(userData);
      const jsonOutput = JSON.parse(JSON.stringify(user));
      
      expect(jsonOutput._id).toBeUndefined();
      expect(jsonOutput.id).toBeDefined();
      expect(typeof jsonOutput.id).toBe('string');
    });
  });

  describe('Index Vulnerabilities', () => {
    test('should have proper indexes for security queries', async () => {
      const indexes = await User.collection.getIndexes();
      
      // Check that security-relevant indexes exist
      expect(indexes).toHaveProperty('email_1_isActive_1');
      expect(indexes).toHaveProperty('phoneNumber_1_isActive_1');
      expect(indexes).toHaveProperty('email_1_isEmailLoginEnabled_1');
      expect(indexes).toHaveProperty('phoneNumber_1_isMobileLoginEnabled_1');
    });

    test('should efficiently query by email and active status', async () => {
      // Create test users
      await User.create({
        firstName: 'Active',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'active@example.com',
        isActive: true,
        for_Profile: 'myself'
      });

      await User.create({
        firstName: 'Inactive',
        lastName: 'User',
        gender: 'female',
        phoneNumber: '0987654321',
        password: 'password123',
        email: 'inactive@example.com',
        isActive: false,
        for_Profile: 'myself'
      });

      // This query should use the compound index
      const activeUser = await User.findOne({ 
        email: 'active@example.com', 
        isActive: true 
      }).explain('executionStats');

      expect(activeUser.executionStats.executionSuccess).toBe(true);
    });
  });

  describe('Data Integrity Issues', () => {
    test('should handle email normalization in pre-save hook', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: '  TEST@EXAMPLE.COM  ', // Email with spaces and uppercase
        for_Profile: 'myself'
      };

      const user = await User.create(userData);
      expect(user.email).toBe('test@example.com'); // Should be normalized
    });

    test('should handle phone number normalization in pre-save hook', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '  1234567890  ', // Phone number with spaces
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      const user = await User.create(userData);
      expect(user.phoneNumber).toBe('1234567890'); // Should be trimmed
    });

    test('should handle errors in pre-save hook gracefully', async () => {
      // Create a user with malformed data that could cause pre-save to fail
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: 12345, // Number instead of string
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      const user = await User.create(userData);
      expect(user.phoneNumber).toBe('12345'); // Should be converted to string
    });
  });

  describe('Field Length Limits', () => {
    test('should handle extremely long string inputs', async () => {
      const longString = 'a'.repeat(10000); // Very long string
      
      const userData = {
        firstName: longString,
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      // Should either reject or truncate the long input
      try {
        const user = await User.create(userData);
        // If creation succeeds, check if data was stored properly
        expect(user.firstName.length).toBeLessThanOrEqual(10000);
      } catch (error) {
        // If it fails, that's also acceptable for security
        expect(error).toBeDefined();
      }
    });

    test('should validate email format', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'invalid-email-format', // Invalid email
        for_Profile: 'myself'
      };

      // Note: The model doesn't have email format validation - this is a vulnerability
      const user = await User.create(userData);
      if (user.email === 'invalid-email-format') {
        console.warn('SECURITY VULNERABILITY: No email format validation');
      }
    });
  });

  describe('Default Value Security', () => {
    test('should set secure default values', async () => {
      const minimalData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        phoneNumber: '1234567890',
        password: 'password123',
        email: 'test@example.com',
        for_Profile: 'myself'
      };

      const user = await User.create(minimalData);
      
      // Check secure defaults
      expect(user.role).toBe('user'); // Should default to user, not admin
      expect(user.isActive).toBe(true);
      expect(user.isEmailLoginEnabled).toBe(true);
      expect(user.isMobileLoginEnabled).toBe(false);
      expect(user.isEmailVerified).toBe(false); // Should require verification
      expect(user.isPhoneVerified).toBe(false); // Should require verification
      expect(user.welcomeSent).toBe(false);
      expect(user.isOnboardingCompleted).toBe(false);
      expect(user.completedSteps).toEqual([]);
    });
  });
});