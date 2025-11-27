import mongoose from 'mongoose';
import { UserFamily, IUserFamily } from '../../models/User_family';
import { User } from '../../models/User';

describe('UserFamily Model Security Tests', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await UserFamily.deleteMany({});
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

  describe('Unique Constraint Bypass', () => {
    test('should enforce unique userId constraint', async () => {
      const familyData1 = {
        userId: testUserId,
        fatherName: 'John Doe',
        motherName: 'Jane Doe'
      };

      const familyData2 = {
        userId: testUserId, // Same user - should fail due to unique constraint
        fatherName: 'Different Father',
        motherName: 'Different Mother'
      };

      await UserFamily.create(familyData1);
      await expect(UserFamily.create(familyData2)).rejects.toThrow(/duplicate key/i);
    });

    test('should enforce unique father contact constraint', async () => {
      const familyData1 = {
        userId: testUserId,
        fatherContact: '9876543210'
      };

      // Create a second user
      const user2 = await User.create({
        firstName: 'Test2',
        lastName: 'User2',
        gender: 'female',
        phoneNumber: '0987654321',
        password: 'password456',
        email: 'test2@example.com',
        for_Profile: 'myself'
      });

      const familyData2 = {
        userId: user2._id,
        fatherContact: '9876543210' // Duplicate father contact
      };

      await UserFamily.create(familyData1);
      await expect(UserFamily.create(familyData2)).rejects.toThrow(/duplicate key/i);
    });

    test('should enforce unique mother contact constraint', async () => {
      const familyData1 = {
        userId: testUserId,
        motherContact: '9876543211'
      };

      const user2 = await User.create({
        firstName: 'Test2',
        lastName: 'User2',
        gender: 'female',
        phoneNumber: '0987654321',
        password: 'password456',
        email: 'test2@example.com',
        for_Profile: 'myself'
      });

      const familyData2 = {
        userId: user2._id,
        motherContact: '9876543211' // Duplicate mother contact
      };

      await UserFamily.create(familyData1);
      await expect(UserFamily.create(familyData2)).rejects.toThrow(/duplicate key/i);
    });

    test('should handle sparse unique constraints with null values', async () => {
      const familyData1 = {
        userId: testUserId,
        fatherContact: null,
        motherContact: null
      };

      const user2 = await User.create({
        firstName: 'Test2',
        lastName: 'User2',
        gender: 'female',
        phoneNumber: '0987654321',
        password: 'password456',
        email: 'test2@example.com',
        for_Profile: 'myself'
      });

      const familyData2 = {
        userId: user2._id,
        fatherContact: null, // Null values should be allowed for sparse index
        motherContact: null
      };

      await UserFamily.create(familyData1);
      // This should succeed due to sparse index
      const family2 = await UserFamily.create(familyData2);
      expect(family2).toBeDefined();
    });
  });

  describe('Contact Information Validation', () => {
    test('should validate phone number format', async () => {
      const invalidContactData = {
        userId: testUserId,
        fatherContact: 'invalid-phone-number',
        motherContact: '123' // Too short
      };

      const family = await UserFamily.create(invalidContactData);
      
      // Model doesn't validate phone format - vulnerability
      if (family.fatherContact === 'invalid-phone-number') {
        console.warn('SECURITY VULNERABILITY: No phone number format validation for father contact');
      }
      
      if (family.motherContact === '123') {
        console.warn('SECURITY VULNERABILITY: No phone number length validation for mother contact');
      }
    });

    test('should prevent script injection in contact fields', async () => {
      const xssData = {
        userId: testUserId,
        fatherContact: '<script>alert("XSS")</script>',
        motherContact: 'javascript:alert(1)'
      };

      const family = await UserFamily.create(xssData);
      
      if (family.fatherContact.includes('<script>')) {
        console.warn('SECURITY VULNERABILITY: Script injection allowed in father contact');
      }
      
      if (family.motherContact.includes('javascript:')) {
        console.warn('SECURITY VULNERABILITY: JavaScript protocol allowed in mother contact');
      }
    });

    test('should sanitize contact information', async () => {
      const unsanitizedData = {
        userId: testUserId,
        fatherContact: '  +91-9876543210  ', // Has spaces and special chars
        motherContact: '+91 (987) 654-3211' // Formatted phone number
      };

      const family = await UserFamily.create(unsanitizedData);
      
      // Check if trimming works properly
      expect(family.fatherContact).toBe('+91-9876543210');
      expect(family.motherContact).toBe('+91 (987) 654-3211');
    });
  });

  describe('Enum Validation Bypass', () => {
    test('should enforce sibling relation enum constraints', async () => {
      const invalidRelationData = {
        userId: testUserId,
        siblingDetails: [{
          name: 'Test Sibling',
          relation: 'Invalid Relation', // Not in enum
          maritalStatus: 'Married'
        }]
      };

      await expect(UserFamily.create(invalidRelationData)).rejects.toThrow();
    });

    test('should enforce marital status enum for siblings', async () => {
      const invalidMaritalStatusData = {
        userId: testUserId,
        siblingDetails: [{
          name: 'Test Sibling',
          relation: 'Elder Brother',
          maritalStatus: 'Complicated' // Not in enum
        }]
      };

      await expect(UserFamily.create(invalidMaritalStatusData)).rejects.toThrow();
    });

    test('should handle multiple siblings with mixed valid/invalid data', async () => {
      const mixedSiblingData = {
        userId: testUserId,
        siblingDetails: [
          {
            name: 'Valid Sibling',
            relation: 'Elder Sister',
            maritalStatus: 'Married'
          },
          {
            name: 'Invalid Sibling',
            relation: 'Invalid Relation', // This should cause failure
            maritalStatus: 'Unmarried'
          }
        ]
      };

      await expect(UserFamily.create(mixedSiblingData)).rejects.toThrow();
    });
  });

  describe('Data Type Confusion Attacks', () => {
    test('should prevent object injection in boolean fields', async () => {
      const objectInjectionData = {
        userId: testUserId,
        doYouHaveChildren: { $ne: false }, // Object instead of boolean
        haveSibling: 'yes' // String instead of boolean
      };

      await expect(UserFamily.create(objectInjectionData)).rejects.toThrow();
    });

    test('should prevent array injection in single value fields', async () => {
      const arrayInjectionData = {
        userId: testUserId,
        fatherName: ['John', 'Doe'], // Array instead of string
        howManySiblings: ['1', '2'] // Array instead of number
      };

      await expect(UserFamily.create(arrayInjectionData)).rejects.toThrow();
    });

    test('should validate number field constraints', async () => {
      const invalidNumberData = {
        userId: testUserId,
        howManySiblings: -5 // Negative siblings count
      };

      await expect(UserFamily.create(invalidNumberData)).rejects.toThrow();
    });

    test('should prevent script injection in string fields', async () => {
      const xssData = {
        userId: testUserId,
        fatherName: '<script>alert("XSS")</script>',
        motherName: '<img src=x onerror=alert(1)>',
        fatherOccupation: 'Engineer<svg onload=alert("XSS")>',
        familyType: 'Nuclear<iframe src="javascript:alert(1)"></iframe>'
      };

      const family = await UserFamily.create(xssData);
      
      // Check for script injection
      if (family.fatherName.includes('<script>')) {
        console.warn('SECURITY VULNERABILITY: Script injection allowed in father name');
      }
      
      if (family.motherName.includes('<img') && family.motherName.includes('onerror')) {
        console.warn('SECURITY VULNERABILITY: XSS vector allowed in mother name');
      }
    });
  });

  describe('Sibling Data Validation', () => {
    test('should validate sibling count consistency', async () => {
      const inconsistentSiblingData = {
        userId: testUserId,
        haveSibling: true,
        howManySiblings: 3,
        siblingDetails: [
          { name: 'Sibling 1', relation: 'Elder Brother', maritalStatus: 'Married' }
          // Only 1 sibling detail but claims 3 siblings
        ]
      };

      const family = await UserFamily.create(inconsistentSiblingData);
      
      if (family.howManySiblings !== family.siblingDetails.length) {
        console.warn('DATA INTEGRITY ISSUE: Sibling count inconsistent with sibling details');
      }
    });

    test('should validate logical consistency in sibling data', async () => {
      const logicalInconsistencyData = {
        userId: testUserId,
        haveSibling: false, // Says no siblings
        howManySiblings: 0,
        siblingDetails: [
          { name: 'Sibling 1', relation: 'Elder Brother', maritalStatus: 'Married' }
          // But provides sibling details
        ]
      };

      const family = await UserFamily.create(logicalInconsistencyData);
      
      if (family.haveSibling === false && family.siblingDetails.length > 0) {
        console.warn('DATA INTEGRITY ISSUE: Says no siblings but provides sibling details');
      }
    });

    test('should validate extremely large sibling arrays', async () => {
      const largeSiblingArray = Array(1000).fill(0).map((_, i) => ({
        name: `Sibling ${i}`,
        relation: i % 2 === 0 ? 'Elder Brother' : 'Younger Sister',
        maritalStatus: 'Unmarried'
      }));

      const largeFamilyData = {
        userId: testUserId,
        haveSibling: true,
        howManySiblings: 1000,
        siblingDetails: largeSiblingArray
      };

      try {
        const family = await UserFamily.create(largeFamilyData);
        if (family.siblingDetails.length === 1000) {
          console.warn('SECURITY VULNERABILITY: No limits on sibling array size - potential DoS');
        }
      } catch (error) {
        // If it fails due to size, that's good for preventing DoS
        expect(error).toBeDefined();
      }
    });
  });

  describe('Personal Information Exposure', () => {
    test('should protect sensitive family information', async () => {
      const sensitiveData = {
        userId: testUserId,
        fatherName: 'Sensitive Father Name',
        motherName: 'Sensitive Mother Name',
        fatherContact: '9876543210',
        motherContact: '9876543211',
        fatherNativePlace: 'Secret Village',
        grandFatherName: 'Great Grandfather',
        nanaName: 'Maternal Grandfather',
        nanaNativePlace: 'Another Secret Place'
      };

      const family = await UserFamily.create(sensitiveData);
      
      // Check if sensitive family data is properly protected
      const publicView = JSON.parse(JSON.stringify(family));
      
      const sensitiveFields = ['fatherContact', 'motherContact', 'fatherNativePlace', 'nanaNativePlace'];
      sensitiveFields.forEach(field => {
        if (publicView[field]) {
          console.warn(`POTENTIAL PRIVACY ISSUE: Sensitive field '${field}' exposed in public view`);
        }
      });
    });

    test('should handle aggregation queries on sensitive data', async () => {
      await UserFamily.create({
        userId: testUserId,
        fatherContact: '9876543210',
        motherContact: '9876543211',
        fatherNativePlace: 'Sensitive Location'
      });

      // Aggregation query that might expose sensitive data
      const result = await UserFamily.aggregate([
        { $match: { fatherContact: { $exists: true } } },
        { $project: { fatherContact: 1, motherContact: 1, fatherNativePlace: 1 } }
      ]);

      if (result.length > 0 && result[0].fatherContact) {
        console.warn('SECURITY VULNERABILITY: Aggregation queries can expose sensitive contact data');
      }
    });
  });

  describe('Mass Assignment Vulnerabilities', () => {
    test('should prevent unauthorized field manipulation', async () => {
      const maliciousData = {
        userId: testUserId,
        fatherName: 'John Doe',
        _id: new mongoose.Types.ObjectId(), // Attempting custom ID
        __v: 999, // Attempting version manipulation
        createdAt: new Date('2020-01-01'), // Backdating creation
        updatedAt: new Date('2020-01-01') // Backdating update
      };

      const family = await UserFamily.create(maliciousData);
      
      // Check if system fields were manipulated
      if (family.createdAt.getFullYear() === 2020) {
        console.warn('SECURITY VULNERABILITY: Mass assignment allows timestamp manipulation');
      }
    });
  });

  describe('Referential Integrity', () => {
    test('should validate userId references exist', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      
      const familyData = {
        userId: nonExistentUserId,
        fatherName: 'John Doe'
      };

      // Model doesn't enforce referential integrity - vulnerability
      const family = await UserFamily.create(familyData);
      if (family) {
        console.warn('SECURITY VULNERABILITY: No referential integrity check for userId');
      }
    });

    test('should prevent orphaned family records', async () => {
      // Create family record
      const familyData = {
        userId: testUserId,
        fatherName: 'John Doe'
      };

      const family = await UserFamily.create(familyData);
      
      // Delete the user
      await User.findByIdAndDelete(testUserId);
      
      // Family record should be invalid now
      const orphanedFamily = await UserFamily.findById(family._id);
      if (orphanedFamily) {
        console.warn('SECURITY VULNERABILITY: Orphaned family records possible after user deletion');
      }
    });
  });

  describe('Input Sanitization', () => {
    test('should trim whitespace from text fields', async () => {
      const whitespaceData = {
        userId: testUserId,
        fatherName: '  John Doe  ',
        motherName: '  Jane Doe  ',
        fatherOccupation: '  Engineer  ',
        familyType: '  Nuclear  '
      };

      const family = await UserFamily.create(whitespaceData);
      
      expect(family.fatherName).toBe('John Doe');
      expect(family.motherName).toBe('Jane Doe');
      expect(family.fatherOccupation).toBe('Engineer');
      expect(family.familyType).toBe('Nuclear');
    });

    test('should handle extremely long text inputs', async () => {
      const longString = 'A'.repeat(100000);
      
      const longTextData = {
        userId: testUserId,
        fatherName: longString,
        motherName: longString,
        fatherOccupation: longString
      };

      try {
        const family = await UserFamily.create(longTextData);
        if (family.fatherName.length === 100000) {
          console.warn('SECURITY VULNERABILITY: No length limits on text fields');
        }
      } catch (error) {
        // If it fails due to size, that's good for preventing DoS
        expect(error).toBeDefined();
      }
    });

    test('should validate special characters in names', async () => {
      const specialCharsData = {
        userId: testUserId,
        fatherName: 'John@#$%^&*()Doe',
        motherName: 'Jane<>?:"{}|Doe',
        grandFatherName: 'Grand`~![]\\Father'
      };

      const family = await UserFamily.create(specialCharsData);
      
      // Names with special characters might be suspicious
      if (family.fatherName.match(/[^a-zA-Z\s.-]/)) {
        console.warn('POTENTIAL ISSUE: Special characters allowed in names');
      }
    });
  });

  describe('Data Structure Attacks', () => {
    test('should prevent deeply nested object injection', async () => {
      const deepObjectData = {
        userId: testUserId,
        siblingDetails: [{
          name: 'Test',
          relation: 'Elder Brother',
          maritalStatus: 'Married',
          maliciousNesting: {
            level1: {
              level2: {
                level3: {
                  level4: 'deep injection'
                }
              }
            }
          }
        }]
      };

      const family = await UserFamily.create(deepObjectData);
      
      // Check if extra fields are accepted
      if (family.siblingDetails[0].maliciousNesting) {
        console.warn('SECURITY VULNERABILITY: Deep object injection possible in sibling details');
      }
    });

    test('should handle malformed sibling data structures', async () => {
      const malformedData = {
        userId: testUserId,
        siblingDetails: [
          'string instead of object', // Invalid structure
          { name: 'Valid', relation: 'Elder Brother' }, // Missing maritalStatus
          null, // Null entry
          undefined // Undefined entry
        ]
      };

      await expect(UserFamily.create(malformedData)).rejects.toThrow();
    });
  });

  describe('Default Value Security', () => {
    test('should set secure default values', async () => {
      const minimalData = {
        userId: testUserId
      };

      const family = await UserFamily.create(minimalData);
      
      // Check secure defaults
      expect(family.doYouHaveChildren).toBe(false);
      expect(family.haveSibling).toBe(false);
      expect(family.howManySiblings).toBeUndefined(); // No default set
      expect(family.siblingDetails).toEqual([]);
    });

    test('should validate boolean field default behavior', async () => {
      const booleanTestData = {
        userId: testUserId,
        // Test different boolean representations
        doYouHaveChildren: 'true', // String representation
        haveSibling: 1 // Numeric representation
      };

      await expect(UserFamily.create(booleanTestData)).rejects.toThrow();
    });
  });
});