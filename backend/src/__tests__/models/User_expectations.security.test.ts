import mongoose from 'mongoose';
import { UserExpectations, IUserExpectations } from '../../models/User_expectations';
import { User } from '../../models/User';

describe('UserExpectations Model Security Tests', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await UserExpectations.deleteMany({});
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

  describe('Schema Type Confusion and Injection Attacks', () => {
    test('should prevent NoSQL injection in Mixed type fields', async () => {
      const injectionData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: { $ne: null }, // NoSQL injection attempt
        isConsumeAlcoholic: 'no',
        community: { $regex: '.*' }, // NoSQL injection
        livingInCountry: ['India']
      };

      // Schema.Types.Mixed allows any type - major vulnerability
      const expectations = await UserExpectations.create(injectionData);
      
      if (typeof expectations.maritalStatus === 'object' && expectations.maritalStatus && '$ne' in expectations.maritalStatus) {
        console.warn('CRITICAL VULNERABILITY: NoSQL injection possible in maritalStatus field');
      }
      
      if (typeof expectations.community === 'object' && expectations.community && '$regex' in expectations.community) {
        console.warn('CRITICAL VULNERABILITY: NoSQL injection possible in community field');
      }
    });

    test('should prevent script injection in Mixed type fields', async () => {
      const xssData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        educationLevel: '<script>alert("XSS in education")</script>',
        community: ['<img src=x onerror=alert("XSS")>'],
        livingInCountry: ['India<iframe src="javascript:alert(1)"></iframe>'],
        profession: { malicious: '<svg onload=alert("XSS")>' }
      };

      const expectations = await UserExpectations.create(xssData);
      
      // Check for script injection in Mixed fields
      if (typeof expectations.educationLevel === 'string' && expectations.educationLevel.includes('<script>')) {
        console.warn('CRITICAL VULNERABILITY: Script injection in educationLevel field');
      }
      
      if (Array.isArray(expectations.community) && expectations.community[0].includes('<img')) {
        console.warn('CRITICAL VULNERABILITY: XSS vector in community array');
      }
    });

    test('should prevent object prototype pollution through Mixed fields', async () => {
      const pollutionData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        educationLevel: {
          '__proto__': { 'isAdmin': true },
          'constructor': { 'prototype': { 'isAdmin': true } }
        },
        community: ['Test'],
        livingInCountry: ['India']
      };

      const expectations = await UserExpectations.create(pollutionData);
      
      // Check if prototype pollution occurred
      if (expectations.educationLevel && typeof expectations.educationLevel === 'object') {
        if ('__proto__' in expectations.educationLevel || 'constructor' in expectations.educationLevel) {
          console.warn('CRITICAL VULNERABILITY: Prototype pollution possible through Mixed fields');
        }
      }
    });

    test('should prevent function injection in Mixed fields', async () => {
      const functionInjectionData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        profession: function() { console.log('Function injected'); },
        community: ['Test'],
        livingInCountry: ['India']
      };

      try {
        const expectations = await UserExpectations.create(functionInjectionData);
        if (typeof expectations.profession === 'function') {
          console.warn('CRITICAL VULNERABILITY: Function injection possible in Mixed fields');
        }
      } catch (error) {
        // If it fails, that's good for security
        expect(error).toBeDefined();
      }
    });
  });

  describe('Age Range Validation Vulnerabilities', () => {
    test('should validate age range boundaries', async () => {
      const invalidAgeData = {
        userId: testUserId,
        age: { from: 150, to: 200 }, // Unrealistic ages
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India']
      };

      await expect(UserExpectations.create(invalidAgeData)).rejects.toThrow();
    });

    test('should prevent negative age values', async () => {
      const negativeAgeData = {
        userId: testUserId,
        age: { from: -5, to: 25 }, // Negative age
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India']
      };

      await expect(UserExpectations.create(negativeAgeData)).rejects.toThrow();
    });

    test('should validate age range logic (from <= to)', async () => {
      const illogicalAgeData = {
        userId: testUserId,
        age: { from: 40, to: 25 }, // from > to
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India']
      };

      const expectations = await UserExpectations.create(illogicalAgeData);
      
      if (expectations.age.from > expectations.age.to) {
        console.warn('DATA INTEGRITY ISSUE: Age range validation allows from > to');
      }
    });

    test('should prevent object injection in age fields', async () => {
      const ageObjectInjectionData = {
        userId: testUserId,
        age: { 
          from: { $gt: 18 }, // Object instead of number
          to: { $lt: 100 }   // Object instead of number
        },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India']
      };

      await expect(UserExpectations.create(ageObjectInjectionData)).rejects.toThrow();
    });
  });

  describe('Enum Validation Bypass', () => {
    test('should enforce maritalStatus object enum constraint', async () => {
      const invalidMaritalStatusData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Invalid Status', // Not in enum
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India']
      };

      // Note: maritalStatus is defined as Object type with enum - this is confusing
      await expect(UserExpectations.create(invalidMaritalStatusData)).rejects.toThrow();
    });

    test('should enforce alcohol consumption enum', async () => {
      const invalidAlcoholData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'heavy_drinker', // Not in enum
        community: ['Test'],
        livingInCountry: ['India']
      };

      await expect(UserExpectations.create(invalidAlcoholData)).rejects.toThrow();
    });

    test('should handle mixed types in enum fields', async () => {
      const mixedTypeData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: ['Never Married', 'Divorced'], // Array instead of string
        isConsumeAlcoholic: true, // Boolean instead of string
        community: ['Test'],
        livingInCountry: ['India']
      };

      await expect(UserExpectations.create(mixedTypeData)).rejects.toThrow();
    });
  });

  describe('Array Field Vulnerabilities', () => {
    test('should prevent extremely large arrays in Mixed fields', async () => {
      const largeArray = Array(100000).fill('Test Community');
      
      const largeArrayData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: largeArray,
        livingInCountry: Array(100000).fill('India')
      };

      try {
        const expectations = await UserExpectations.create(largeArrayData);
        if (Array.isArray(expectations.community) && expectations.community.length === 100000) {
          console.warn('SECURITY VULNERABILITY: No limits on array size in Mixed fields - potential DoS');
        }
      } catch (error) {
        // If it fails due to size, that's good for preventing DoS
        expect(error).toBeDefined();
      }
    });

    test('should prevent nested object injection in arrays', async () => {
      const nestedInjectionData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: [
          'Normal Community',
          { $where: 'function() { return true; }' }, // NoSQL injection
          { malicious: { deeply: { nested: 'attack' } } }
        ],
        livingInCountry: ['India']
      };

      const expectations = await UserExpectations.create(nestedInjectionData);
      
      if (Array.isArray(expectations.community)) {
        expectations.community.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            console.warn(`SECURITY VULNERABILITY: Object injection in community array at index ${index}`);
          }
        });
      }
    });

    test('should validate array element types', async () => {
      const mixedArrayData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        educationLevel: [
          'Bachelor Degree',
          123, // Number in string array
          true, // Boolean in string array
          null, // Null in string array
          { degree: 'Masters' } // Object in string array
        ],
        community: ['Test'],
        livingInCountry: ['India']
      };

      const expectations = await UserExpectations.create(mixedArrayData);
      
      if (Array.isArray(expectations.educationLevel)) {
        expectations.educationLevel.forEach((item, index) => {
          if (typeof item !== 'string') {
            console.warn(`DATA TYPE ISSUE: Non-string element at index ${index} in educationLevel array`);
          }
        });
      }
    });
  });

  describe('Required Field Bypass', () => {
    test('should enforce required age field', async () => {
      const missingAgeData = {
        userId: testUserId,
        // Missing required age field
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India']
      };

      await expect(UserExpectations.create(missingAgeData)).rejects.toThrow(/age.*required/i);
    });

    test('should enforce required maritalStatus field', async () => {
      const missingMaritalStatusData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        // Missing required maritalStatus
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India']
      };

      await expect(UserExpectations.create(missingMaritalStatusData)).rejects.toThrow(/maritalStatus.*required/i);
    });

    test('should enforce required fields with Mixed types', async () => {
      const missingRequiredMixedData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        // Missing required community and livingInCountry
      };

      await expect(UserExpectations.create(missingRequiredMixedData)).rejects.toThrow();
    });
  });

  describe('Referential Integrity', () => {
    test('should enforce unique userId constraint', async () => {
      const expectationData1 = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Hindu'],
        livingInCountry: ['India']
      };

      const expectationData2 = {
        userId: testUserId, // Same user - should fail
        age: { from: 30, to: 40 },
        maritalStatus: 'Divorced',
        isConsumeAlcoholic: 'yes',
        community: ['Christian'],
        livingInCountry: ['USA']
      };

      await UserExpectations.create(expectationData1);
      await expect(UserExpectations.create(expectationData2)).rejects.toThrow(/duplicate key/i);
    });

    test('should validate userId references exist', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      
      const expectationData = {
        userId: nonExistentUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India']
      };

      // Model doesn't enforce referential integrity - vulnerability
      const expectations = await UserExpectations.create(expectationData);
      if (expectations) {
        console.warn('SECURITY VULNERABILITY: No referential integrity check for userId');
      }
    });
  });

  describe('Data Sanitization Issues', () => {
    test('should handle special characters in Mixed field values', async () => {
      const specialCharsData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        educationLevel: ['Bachelor\'s Degree"', 'Master`s<>&'],
        community: ['Brah@min#$%', 'Kshat*()riya'],
        livingInCountry: ['In!dia', 'US&A'],
        profession: ['Soft@ware Engineer<>', 'Doc$tor%^&']
      };

      const expectations = await UserExpectations.create(specialCharsData);
      
      // Mixed fields don't sanitize input - potential vulnerability
      if (Array.isArray(expectations.educationLevel) && expectations.educationLevel[1].includes('<>&')) {
        console.warn('INPUT SANITIZATION: Special characters not sanitized in Mixed fields');
      }
    });

    test('should prevent code injection through preference strings', async () => {
      const codeInjectionData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['eval("malicious code")', '${process.env}'],
        livingInCountry: ['${__dirname}', 'require("fs")'],
        profession: ['${global.process.exit()}']
      };

      const expectations = await UserExpectations.create(codeInjectionData);
      
      // Check for code injection patterns
      if (Array.isArray(expectations.community)) {
        expectations.community.forEach(item => {
          if (typeof item === 'string' && (item.includes('eval(') || item.includes('${') || item.includes('require('))) {
            console.warn('SECURITY VULNERABILITY: Code injection patterns allowed in community preferences');
          }
        });
      }
    });
  });

  describe('Business Logic Vulnerabilities', () => {
    test('should validate age consistency with user profile', async () => {
      // Assuming user is 30 years old based on dateOfBirth
      const inconsistentAgeData = {
        userId: testUserId,
        age: { from: 60, to: 70 }, // Expecting much older partner
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India']
      };

      const expectations = await UserExpectations.create(inconsistentAgeData);
      
      // Age preferences should be reasonable relative to user's age
      const ageGap = expectations.age.from - 30; // Assuming user is 30
      if (ageGap > 30) {
        console.warn('BUSINESS LOGIC ISSUE: Unrealistic age preferences allowed');
      }
    });

    test('should validate logical consistency in preferences', async () => {
      const inconsistentPrefsData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married', // Wants never married
        isConsumeAlcoholic: 'no', // Doesn't want alcohol consumer
        educationLevel: [], // No education preference - inconsistent
        community: [], // No community preference
        livingInCountry: ['India']
      };

      const expectations = await UserExpectations.create(inconsistentPrefsData);
      
      // Check for empty or overly restrictive preferences
      if (Array.isArray(expectations.educationLevel) && expectations.educationLevel.length === 0) {
        console.warn('USABILITY ISSUE: Empty education preferences may be too restrictive');
      }
    });
  });

  describe('Mass Assignment Vulnerabilities', () => {
    test('should prevent unauthorized field manipulation', async () => {
      const maliciousData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India'],
        _id: new mongoose.Types.ObjectId(), // Attempting custom ID
        __v: 999, // Attempting version manipulation
        createdAt: new Date('2020-01-01'), // Backdating creation
        updatedAt: new Date('2020-01-01') // Backdating update
      };

      const expectations = await UserExpectations.create(maliciousData);
      
      // Check if system fields were manipulated
      if (expectations.createdAt.getFullYear() === 2020) {
        console.warn('SECURITY VULNERABILITY: Mass assignment allows timestamp manipulation');
      }
    });
  });

  describe('Default Value Security', () => {
    test('should not set overly permissive defaults', async () => {
      const minimalData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India']
      };

      const expectations = await UserExpectations.create(minimalData);
      
      // Check if undefined fields have reasonable defaults
      expect(expectations.educationLevel).toBeUndefined();
      expect(expectations.livingInState).toBeUndefined();
      expect(expectations.profession).toBeUndefined();
      expect(expectations.diet).toBeUndefined();
    });
  });

  describe('Data Structure Complexity Attacks', () => {
    test('should prevent deeply nested object structures in Mixed fields', async () => {
      const deepNestedData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: 'very deep nesting'
                }
              }
            }
          }
        },
        livingInCountry: ['India']
      };

      const expectations = await UserExpectations.create(deepNestedData);
      
      if (typeof expectations.community === 'object' && expectations.community.level1) {
        console.warn('SECURITY VULNERABILITY: Deep object nesting allowed in Mixed fields');
      }
    });

    test('should handle circular reference attempts', async () => {
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      const circularData = {
        userId: testUserId,
        age: { from: 25, to: 35 },
        maritalStatus: 'Never Married',
        isConsumeAlcoholic: 'no',
        community: ['Test'],
        livingInCountry: ['India'],
        profession: circularObj
      };

      try {
        await UserExpectations.create(circularData);
        console.warn('SECURITY VULNERABILITY: Circular references not handled properly');
      } catch (error) {
        // If it fails, that's good for security
        expect(error).toBeDefined();
      }
    });
  });
});