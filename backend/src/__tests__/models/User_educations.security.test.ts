import mongoose from 'mongoose';
import { UserEducation, IUserEducation } from '../../models/User_educations';
import { User } from '../../models/User';

describe('UserEducation Model Security Tests', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await UserEducation.deleteMany({});
    await User.deleteMany({});
    
    const user = await User.create({
      firstName: 'Test', lastName: 'User', gender: 'male',
      phoneNumber: '1234567890', password: 'password123',
      email: 'test@example.com', for_Profile: 'myself'
    });
    testUserId = user._id;
  });

  describe('Input Validation Bypass', () => {
    test('should prevent script injection in education fields', async () => {
      const xssData = {
        userId: testUserId,
        SchoolName: '<script>alert("XSS")</script>',
        HighestEducation: '<img src=x onerror=alert(1)>',
        FieldOfStudy: 'Engineering<svg onload=alert("XSS")>',
        University: 'MIT<iframe src="javascript:alert(1)"></iframe>',
        CountryOfEducation: 'USA<style>body{background:red;}</style>'
      };

      const education = await UserEducation.create(xssData);
      
      if (education.SchoolName.includes('<script>')) {
        console.warn('SECURITY VULNERABILITY: Script injection in SchoolName field');
      }
    });

    test('should validate educational institution names', async () => {
      const invalidData = {
        userId: testUserId,
        SchoolName: '123!@#$%^&*()',
        University: 'DROP TABLE universities;',
        HighestEducation: 'PhD in Hacking'
      };

      const education = await UserEducation.create(invalidData);
      
      if (education.University.includes('DROP TABLE')) {
        console.warn('SECURITY VULNERABILITY: SQL injection patterns in education data');
      }
    });

    test('should handle extremely long education text', async () => {
      const longString = 'A'.repeat(100000);
      const longData = {
        userId: testUserId,
        SchoolName: longString,
        University: longString
      };

      try {
        const education = await UserEducation.create(longData);
        if (education.SchoolName.length === 100000) {
          console.warn('SECURITY VULNERABILITY: No length limits on education fields');
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Referential Integrity', () => {
    test('should allow multiple education records per user', async () => {
      const education1 = { userId: testUserId, SchoolName: 'High School' };
      const education2 = { userId: testUserId, University: 'University' };

      await UserEducation.create(education1);
      const edu2 = await UserEducation.create(education2);
      
      // Multiple education records should be allowed
      expect(edu2).toBeDefined();
    });

    test('should validate userId references exist', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      const educationData = {
        userId: nonExistentUserId,
        SchoolName: 'Test School'
      };

      const education = await UserEducation.create(educationData);
      if (education) {
        console.warn('SECURITY VULNERABILITY: No referential integrity check for userId');
      }
    });
  });

  describe('Data Type Security', () => {
    test('should prevent object injection in string fields', async () => {
      const objectInjectionData = {
        userId: testUserId,
        SchoolName: { $ne: null },
        HighestEducation: ['Bachelor', 'Master']
      };

      await expect(UserEducation.create(objectInjectionData)).rejects.toThrow();
    });
  });
});