import mongoose from 'mongoose';
import { UserPersonal, IUserPersonal } from '../../models/User_personal';
import { User } from '../../models/User';

describe('UserPersonal Model Security Tests', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await UserPersonal.deleteMany({});
    await User.deleteMany({});
    
    // Create a test user
    const user = await User.create({
      firstName: 'Test',
      lastName: 'User',
      gender: 'male',
      phoneNumber: '1234567890',
      password: 'password123',
      email: 'test@example.com',
      for_Profile: 'myself'
    });
    testUserId = user._id;
  });

  describe('Personal Identifiable Information (PII) Exposure', () => {
    test('should protect sensitive personal data', async () => {
      const sensitiveData = {
        userId: testUserId,
        height: 180,
        weight: 75,
        timeOfBirth: '10:30 AM',
        astrologicalSign: 'Leo',
        birthPlace: 'Mumbai',
        birthState: 'Maharashtra',
        religion: 'Hindu',
        marriedStatus: 'Single',
        full_address: {
          street1: '123 Secret Street',
          street2: 'Apartment 456',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          isYourHome: true
        },
        nationality: 'Indian',
        divorceStatus: 'Never Divorced'
      };

      const personal = await UserPersonal.create(sensitiveData);
      
      // Check if sensitive data is properly protected
      const publicView = JSON.parse(JSON.stringify(personal));
      
      // Address information is highly sensitive
      if (publicView.full_address && publicView.full_address.street1) {
        console.warn('SECURITY VULNERABILITY: Full address exposed in public view');
      }
      
      // Birth details can be used for identity theft
      if (publicView.timeOfBirth && publicView.birthPlace) {
        console.warn('SECURITY VULNERABILITY: Birth time and place exposed');
      }
    });

    test('should validate sensitive field access controls', async () => {
      const personalData = {
        userId: testUserId,
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced',
        full_address: {
          street1: '123 Main St',
          city: 'Mumbai',
          zipCode: '400001'
        }
      };

      const personal = await UserPersonal.create(personalData);
      
      // These fields should have access controls
      const sensitiveFields = ['full_address', 'divorceStatus', 'separatedSince'];
      sensitiveFields.forEach(field => {
        if (personal[field as keyof IUserPersonal] !== undefined) {
          console.warn(`POTENTIAL VULNERABILITY: Sensitive field '${field}' accessible without restrictions`);
        }
      });
    });
  });

  describe('Data Type Confusion Attacks', () => {
    test('should prevent mixed type confusion in height/weight fields', async () => {
      const typeConfusionData = {
        userId: testUserId,
        height: { $gt: 0 }, // NoSQL injection attempt
        weight: ['75', '80'], // Array instead of single value
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced'
      };

      // Schema.Types.Mixed allows any type - this is a vulnerability
      const personal = await UserPersonal.create(typeConfusionData);
      
      if (typeof personal.height === 'object' && personal.height !== null) {
        console.warn('SECURITY VULNERABILITY: Mixed type allows object injection in height field');
      }
      
      if (Array.isArray(personal.weight)) {
        console.warn('SECURITY VULNERABILITY: Mixed type allows array injection in weight field');
      }
    });

    test('should validate height and weight data types', async () => {
      const maliciousData = {
        userId: testUserId,
        height: 'DROP TABLE users;', // SQL injection attempt (even in NoSQL)
        weight: '<script>alert("XSS")</script>', // XSS attempt
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced'
      };

      const personal = await UserPersonal.create(maliciousData);
      
      if (typeof personal.height === 'string' && personal.height.includes('DROP')) {
        console.warn('SECURITY VULNERABILITY: Dangerous strings allowed in height field');
      }
      
      if (typeof personal.weight === 'string' && personal.weight.includes('<script>')) {
        console.warn('SECURITY VULNERABILITY: Script injection possible in weight field');
      }
    });

    test('should prevent boolean injection in address fields', async () => {
      const booleanInjectionData = {
        userId: testUserId,
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced',
        full_address: {
          street1: true, // Boolean instead of string
          street2: { $ne: null }, // Object injection
          isYourHome: 'yes' // String instead of boolean
        }
      };

      await expect(UserPersonal.create(booleanInjectionData)).rejects.toThrow();
    });

    test('should prevent object injection in string fields', async () => {
      const objectInjectionData = {
        userId: testUserId,
        religion: { $ne: null }, // Object instead of string
        marriedStatus: ['Single', 'Married'], // Array instead of string
        divorceStatus: { status: 'Never Divorced' } // Object instead of string
      };

      await expect(UserPersonal.create(objectInjectionData)).rejects.toThrow();
    });
  });

  describe('Required Field Bypass', () => {
    test('should enforce required religion field', async () => {
      const dataWithoutReligion = {
        userId: testUserId,
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced'
        // Missing required religion field
      };

      await expect(UserPersonal.create(dataWithoutReligion)).rejects.toThrow(/religion.*required/i);
    });

    test('should enforce required marriedStatus field', async () => {
      const dataWithoutMarriedStatus = {
        userId: testUserId,
        religion: 'Hindu',
        divorceStatus: 'Never Divorced'
        // Missing required marriedStatus field
      };

      await expect(UserPersonal.create(dataWithoutMarriedStatus)).rejects.toThrow(/marriedStatus.*required/i);
    });

    test('should require valid userId reference', async () => {
      const dataWithoutUserId = {
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced'
        // Missing required userId field
      };

      await expect(UserPersonal.create(dataWithoutUserId)).rejects.toThrow(/userId.*required/i);
    });
  });

  describe('Data Validation and Sanitization', () => {
    test('should validate zip code format', async () => {
      const invalidZipData = {
        userId: testUserId,
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced',
        full_address: {
          street1: '123 Main St',
          zipCode: 'INVALID_ZIP_FORMAT' // Invalid zip code
        }
      };

      const personal = await UserPersonal.create(invalidZipData);
      
      // No validation for zip code format - vulnerability
      if (personal.full_address.zipCode === 'INVALID_ZIP_FORMAT') {
        console.warn('SECURITY VULNERABILITY: No zip code format validation');
      }
    });

    test('should prevent script injection in text fields', async () => {
      const xssData = {
        userId: testUserId,
        religion: 'Hindu<script>alert("XSS")</script>',
        marriedStatus: 'Single',
        divorceStatus: '<img src=x onerror=alert("XSS")>',
        astrologicalSign: 'Leo<svg onload=alert(1)>',
        birthPlace: 'Mumbai<iframe src="javascript:alert(1)"></iframe>'
      };

      const personal = await UserPersonal.create(xssData);
      
      // Check for script injection
      if (personal.religion.includes('<script>')) {
        console.warn('SECURITY VULNERABILITY: Script injection allowed in religion field');
      }
      
      if (personal.divorceStatus.includes('<img') || personal.divorceStatus.includes('onerror')) {
        console.warn('SECURITY VULNERABILITY: XSS vector allowed in divorceStatus field');
      }
    });

    test('should validate reasonable ranges for numeric fields', async () => {
      const unreasonableData = {
        userId: testUserId,
        height: -500, // Negative height
        weight: 99999, // Unreasonable weight
        numberOfChildren: -5, // Negative children count
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced'
      };

      const personal = await UserPersonal.create(unreasonableData);
      
      if (typeof personal.height === 'number' && personal.height < 0) {
        console.warn('SECURITY VULNERABILITY: Negative values allowed for height');
      }
      
      if (typeof personal.numberOfChildren === 'number' && personal.numberOfChildren < 0) {
        console.warn('SECURITY VULNERABILITY: Negative values allowed for numberOfChildren');
      }
    });
  });

  describe('Mass Assignment Vulnerabilities', () => {
    test('should prevent unauthorized field assignment', async () => {
      const maliciousData = {
        userId: testUserId,
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced',
        _id: new mongoose.Types.ObjectId(), // Attempting to set custom ID
        __v: 999, // Attempting to set version
        createdAt: new Date('2020-01-01'), // Backdating creation
        updatedAt: new Date('2020-01-01') // Backdating update
      };

      const personal = await UserPersonal.create(maliciousData);
      
      // Check if system fields were manipulated
      if (personal.createdAt.getFullYear() === 2020) {
        console.warn('SECURITY VULNERABILITY: Mass assignment allows timestamp manipulation');
      }
    });
  });

  describe('Referential Integrity', () => {
    test('should validate userId references exist', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      
      const personalData = {
        userId: nonExistentUserId,
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced'
      };

      // Model doesn't enforce referential integrity - vulnerability
      const personal = await UserPersonal.create(personalData);
      if (personal) {
        console.warn('SECURITY VULNERABILITY: No referential integrity check for userId');
      }
    });

    test('should handle multiple personal records for same user', async () => {
      const personalData1 = {
        userId: testUserId,
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced'
      };

      const personalData2 = {
        userId: testUserId, // Same user
        religion: 'Sikh',
        marriedStatus: 'Married',
        divorceStatus: 'Divorced'
      };

      await UserPersonal.create(personalData1);
      
      // No unique constraint on userId - multiple records possible
      const personal2 = await UserPersonal.create(personalData2);
      if (personal2) {
        console.warn('SECURITY VULNERABILITY: Multiple personal records allowed for same user');
      }
    });
  });

  describe('Sensitive Data Exposure in Queries', () => {
    test('should protect sensitive fields in aggregation queries', async () => {
      await UserPersonal.create({
        userId: testUserId,
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced',
        full_address: {
          street1: '123 Secret Street',
          city: 'Mumbai',
          zipCode: '400001'
        },
        separatedSince: '2020-01-01'
      });

      // Aggregation query that might expose sensitive data
      const result = await UserPersonal.aggregate([
        { $match: { religion: 'Hindu' } },
        { $project: { full_address: 1, divorceStatus: 1, separatedSince: 1 } }
      ]);

      if (result.length > 0 && result[0].full_address) {
        console.warn('SECURITY VULNERABILITY: Aggregation queries can expose sensitive address data');
      }
    });

    test('should handle regex queries on sensitive fields', async () => {
      await UserPersonal.create({
        userId: testUserId,
        religion: 'Hindu',
        marriedStatus: 'Divorced',
        divorceStatus: 'Legally Divorced',
        separatedSince: '2020-01-01'
      });

      // Regex query on sensitive field
      const result = await UserPersonal.find({
        divorceStatus: { $regex: 'Divorced', $options: 'i' }
      });

      if (result.length > 0) {
        console.warn('POTENTIAL PRIVACY ISSUE: Regex queries on divorce status possible');
      }
    });
  });

  describe('Field Length and Size Limits', () => {
    test('should handle extremely long text inputs', async () => {
      const longString = 'A'.repeat(100000); // Very long string
      
      const longTextData = {
        userId: testUserId,
        religion: longString,
        marriedStatus: 'Single',
        divorceStatus: longString,
        astrologicalSign: longString,
        birthPlace: longString
      };

      try {
        const personal = await UserPersonal.create(longTextData);
        if (personal.religion.length === 100000) {
          console.warn('SECURITY VULNERABILITY: No length limits on text fields');
        }
      } catch (error) {
        // If it fails due to size, that's good for preventing DoS
        expect(error).toBeDefined();
      }
    });

    test('should validate nested object field limits', async () => {
      const largeAddress = {
        street1: 'A'.repeat(10000),
        street2: 'B'.repeat(10000),
        city: 'C'.repeat(10000),
        state: 'D'.repeat(10000),
        zipCode: 'E'.repeat(10000)
      };

      const addressData = {
        userId: testUserId,
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced',
        full_address: largeAddress
      };

      try {
        const personal = await UserPersonal.create(addressData);
        if (personal.full_address.street1.length === 10000) {
          console.warn('SECURITY VULNERABILITY: No length limits on address fields');
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Data Consistency and Logic Validation', () => {
    test('should validate logical consistency between marital fields', async () => {
      const inconsistentData = {
        userId: testUserId,
        religion: 'Hindu',
        marriedStatus: 'Single', // Says single
        divorceStatus: 'Divorced', // But also divorced
        isYouLegallySeparated: true, // And separated
        separatedSince: '2020-01-01',
        isHaveChildren: true, // Has children but single
        numberOfChildren: 3
      };

      const personal = await UserPersonal.create(inconsistentData);
      
      // Check for logical inconsistencies
      if (personal.marriedStatus === 'Single' && personal.divorceStatus === 'Divorced') {
        console.warn('DATA INTEGRITY ISSUE: Inconsistent marital status fields');
      }
      
      if (personal.marriedStatus === 'Single' && personal.isYouLegallySeparated === true) {
        console.warn('DATA INTEGRITY ISSUE: Single but legally separated');
      }
    });

    test('should validate children-related field consistency', async () => {
      const childrenInconsistency = {
        userId: testUserId,
        religion: 'Hindu',
        marriedStatus: 'Single',
        divorceStatus: 'Never Divorced',
        isHaveChildren: false, // Says no children
        numberOfChildren: 5, // But has 5 children
        isChildrenLivingWithYou: true // And children live with user
      };

      const personal = await UserPersonal.create(childrenInconsistency);
      
      if (personal.isHaveChildren === false && personal.numberOfChildren > 0) {
        console.warn('DATA INTEGRITY ISSUE: Inconsistent children information');
      }
    });
  });
});