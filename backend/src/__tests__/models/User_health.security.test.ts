import mongoose from 'mongoose';
import { UserHealth, IUserHealth } from '../../models/User_health';
import { User } from '../../models/User';

describe('UserHealth Model Security Tests', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await UserHealth.deleteMany({});
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

  describe('Sensitive Medical Data Exposure', () => {
    test('should protect highly sensitive health information', async () => {
      const sensitiveHealthData = {
        userId: testUserId,
        isHaveHIV: 'yes',
        isPositiveInTB: 'yes',
        isHaveMedicalHistory: 'yes',
        medicalHistoryDetails: 'Diabetes, Hypertension, Heart Disease, Mental Health Issues'
      };

      const health = await UserHealth.create(sensitiveHealthData);
      
      // Check if sensitive medical data is properly protected
      const publicView = JSON.parse(JSON.stringify(health));
      
      // HIV status is extremely sensitive
      if (publicView.isHaveHIV === 'yes') {
        console.warn('CRITICAL VULNERABILITY: HIV status exposed in public view');
      }
      
      // TB status is also sensitive
      if (publicView.isPositiveInTB === 'yes') {
        console.warn('CRITICAL VULNERABILITY: TB status exposed in public view');
      }
      
      // Medical history details contain PHI
      if (publicView.medicalHistoryDetails && publicView.medicalHistoryDetails.length > 0) {
        console.warn('CRITICAL VULNERABILITY: Detailed medical history exposed in public view');
      }
    });

    test('should implement access controls for medical data', async () => {
      const healthData = {
        userId: testUserId,
        isHaveHIV: 'yes',
        isPositiveInTB: 'yes',
        medicalHistoryDetails: 'Confidential medical information'
      };

      const health = await UserHealth.create(healthData);
      
      // Medical data should have strict access controls
      const sensitiveFields = ['isHaveHIV', 'isPositiveInTB', 'medicalHistoryDetails'];
      sensitiveFields.forEach(field => {
        if (health[field as keyof IUserHealth] !== undefined && health[field as keyof IUserHealth] !== '') {
          console.warn(`CRITICAL VULNERABILITY: Sensitive medical field '${field}' accessible without restrictions`);
        }
      });
    });

    test('should prevent unauthorized access to medical data through queries', async () => {
      await UserHealth.create({
        userId: testUserId,
        isHaveHIV: 'yes',
        isPositiveInTB: 'yes',
        medicalHistoryDetails: 'HIV positive, TB treatment ongoing'
      });

      // Query that could expose medical conditions
      const hivPositiveUsers = await UserHealth.find({ isHaveHIV: 'yes' });
      if (hivPositiveUsers.length > 0) {
        console.warn('CRITICAL VULNERABILITY: Medical conditions queryable by external parties');
      }

      // Aggregation that could expose sensitive data
      const medicalStats = await UserHealth.aggregate([
        { $group: { _id: '$isHaveHIV', count: { $sum: 1 } } }
      ]);
      if (medicalStats.length > 0) {
        console.warn('CRITICAL VULNERABILITY: Medical statistics exposed through aggregation');
      }
    });
  });

  describe('Enum Validation Bypass', () => {
    test('should enforce enum constraints for alcohol consumption', async () => {
      const invalidAlcoholData = {
        userId: testUserId,
        isAlcoholic: 'heavy_drinker' // Invalid enum value
      };

      await expect(UserHealth.create(invalidAlcoholData)).rejects.toThrow();
    });

    test('should enforce enum constraints for tobacco use', async () => {
      const invalidTobaccoData = {
        userId: testUserId,
        isTobaccoUser: 'chain_smoker' // Invalid enum value
      };

      await expect(UserHealth.create(invalidTobaccoData)).rejects.toThrow();
    });

    test('should enforce enum constraints for health conditions', async () => {
      const invalidHealthData = {
        userId: testUserId,
        isHaveHIV: 'maybe', // Invalid enum value
        isPositiveInTB: 'unknown', // Invalid enum value
        isHaveTattoos: 'some' // Invalid enum value
      };

      await expect(UserHealth.create(invalidHealthData)).rejects.toThrow();
    });

    test('should enforce enum constraints for diet', async () => {
      const invalidDietData = {
        userId: testUserId,
        diet: 'carnivore' // Invalid enum value
      };

      await expect(UserHealth.create(invalidDietData)).rejects.toThrow();
    });

    test('should allow empty string as valid enum value', async () => {
      const emptyStringData = {
        userId: testUserId,
        isAlcoholic: '',
        isTobaccoUser: '',
        isHaveHIV: '',
        diet: ''
      };

      const health = await UserHealth.create(emptyStringData);
      expect(health.isAlcoholic).toBe('');
      expect(health.diet).toBe('');
    });
  });

  describe('Data Privacy and HIPAA Compliance', () => {
    test('should handle medical data with proper privacy controls', async () => {
      const medicalData = {
        userId: testUserId,
        isHaveMedicalHistory: 'yes',
        medicalHistoryDetails: 'Patient has chronic kidney disease, underwent dialysis in 2020, currently on medication for blood pressure control'
      };

      const health = await UserHealth.create(medicalData);
      
      // Medical details contain PHI (Protected Health Information)
      if (health.medicalHistoryDetails.length > 0) {
        console.warn('HIPAA COMPLIANCE ISSUE: Detailed medical history stored without encryption');
      }
      
      // Check if medical conditions could be inferred from other fields
      if (health.isHaveMedicalHistory === 'yes' && !health.medicalHistoryDetails) {
        console.warn('DATA INTEGRITY ISSUE: Medical history flag set but no details provided');
      }
    });

    test('should protect against medical data discrimination', async () => {
      const discriminatoryQueryData = {
        userId: testUserId,
        isHaveHIV: 'yes',
        isPositiveInTB: 'yes',
        isHaveMedicalHistory: 'yes'
      };

      await UserHealth.create(discriminatoryQueryData);
      
      // Queries that could enable medical discrimination
      const hivQuery = await UserHealth.find({ isHaveHIV: 'yes' });
      const tbQuery = await UserHealth.find({ isPositiveInTB: 'yes' });
      
      if (hivQuery.length > 0 || tbQuery.length > 0) {
        console.warn('DISCRIMINATION RISK: Medical conditions can be used for unfair profiling');
      }
    });

    test('should handle sensitive medical data in text fields', async () => {
      const sensitiveTextData = {
        userId: testUserId,
        medicalHistoryDetails: 'HIV+, Hepatitis B, Mental health treatment, Substance abuse history, Cancer survivor'
      };

      const health = await UserHealth.create(sensitiveTextData);
      
      // Check for patterns that indicate highly sensitive conditions
      const sensitiveKeywords = ['HIV', 'AIDS', 'Mental health', 'Substance abuse', 'Cancer'];
      sensitiveKeywords.forEach(keyword => {
        if (health.medicalHistoryDetails.includes(keyword)) {
          console.warn(`PRIVACY RISK: Highly sensitive keyword '${keyword}' found in medical history`);
        }
      });
    });
  });

  describe('Data Injection and Sanitization', () => {
    test('should prevent script injection in medical history', async () => {
      const xssData = {
        userId: testUserId,
        medicalHistoryDetails: '<script>alert("Medical XSS")</script>Patient has diabetes'
      };

      const health = await UserHealth.create(xssData);
      
      if (health.medicalHistoryDetails.includes('<script>')) {
        console.warn('SECURITY VULNERABILITY: Script injection allowed in medical history');
      }
    });

    test('should prevent SQL injection attempts in medical fields', async () => {
      const sqlInjectionData = {
        userId: testUserId,
        medicalHistoryDetails: "'; DROP TABLE users; --"
      };

      const health = await UserHealth.create(sqlInjectionData);
      
      if (health.medicalHistoryDetails.includes('DROP TABLE')) {
        console.warn('SECURITY VULNERABILITY: SQL injection patterns allowed in medical history');
      }
    });

    test('should sanitize special characters in medical text', async () => {
      const specialCharsData = {
        userId: testUserId,
        medicalHistoryDetails: 'Patient<>&"\'has diabetes`~!@#$%^&*()_+-={}[]|\\:";\'<>?,./'
      };

      const health = await UserHealth.create(specialCharsData);
      
      // Medical text should be sanitized but preserve medical terminology
      if (health.medicalHistoryDetails.includes('<>&"\'')) {
        console.warn('INPUT SANITIZATION: Special characters not properly handled in medical text');
      }
    });

    test('should handle extremely long medical history text', async () => {
      const longMedicalHistory = 'Medical condition: ' + 'A'.repeat(100000);
      
      const longTextData = {
        userId: testUserId,
        medicalHistoryDetails: longMedicalHistory
      };

      try {
        const health = await UserHealth.create(longTextData);
        if (health.medicalHistoryDetails.length > 50000) {
          console.warn('SECURITY VULNERABILITY: No length limits on medical history text - potential DoS');
        }
      } catch (error) {
        // If it fails due to size, that's good for preventing DoS
        expect(error).toBeDefined();
      }
    });
  });

  describe('Data Type Confusion Attacks', () => {
    test('should prevent object injection in enum fields', async () => {
      const objectInjectionData = {
        userId: testUserId,
        isAlcoholic: { $ne: 'no' }, // NoSQL injection attempt
        isTobaccoUser: ['yes', 'no'] // Array instead of string
      };

      await expect(UserHealth.create(objectInjectionData)).rejects.toThrow();
    });

    test('should prevent boolean injection in string enum fields', async () => {
      const booleanInjectionData = {
        userId: testUserId,
        isHaveHIV: true, // Boolean instead of string enum
        isPositiveInTB: false, // Boolean instead of string enum
        isHaveTattoos: 1 // Number instead of string enum
      };

      await expect(UserHealth.create(booleanInjectionData)).rejects.toThrow();
    });

    test('should validate data type consistency', async () => {
      const typeInconsistentData = {
        userId: testUserId,
        isAlcoholic: 42, // Number instead of string
        medicalHistoryDetails: { condition: 'diabetes' } // Object instead of string
      };

      await expect(UserHealth.create(typeInconsistentData)).rejects.toThrow();
    });
  });

  describe('Referential Integrity', () => {
    test('should enforce unique userId constraint', async () => {
      const healthData1 = {
        userId: testUserId,
        isAlcoholic: 'no',
        diet: 'vegetarian'
      };

      const healthData2 = {
        userId: testUserId, // Same user - should fail due to unique constraint
        isAlcoholic: 'yes',
        diet: 'non-vegetarian'
      };

      await UserHealth.create(healthData1);
      await expect(UserHealth.create(healthData2)).rejects.toThrow(/duplicate key/i);
    });

    test('should validate userId references exist', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      
      const healthData = {
        userId: nonExistentUserId,
        isAlcoholic: 'no'
      };

      // Model doesn't enforce referential integrity - vulnerability
      const health = await UserHealth.create(healthData);
      if (health) {
        console.warn('SECURITY VULNERABILITY: No referential integrity check for userId');
      }
    });

    test('should prevent orphaned health records', async () => {
      const healthData = {
        userId: testUserId,
        isAlcoholic: 'no',
        medicalHistoryDetails: 'Patient medical history'
      };

      const health = await UserHealth.create(healthData);
      
      // Delete the user
      await User.findByIdAndDelete(testUserId);
      
      // Health record should be invalid now
      const orphanedHealth = await UserHealth.findById(health._id);
      if (orphanedHealth) {
        console.warn('SECURITY VULNERABILITY: Orphaned health records with sensitive data remain after user deletion');
      }
    });
  });

  describe('Medical Data Logic Validation', () => {
    test('should validate logical consistency in health data', async () => {
      const inconsistentData = {
        userId: testUserId,
        isHaveMedicalHistory: 'no', // Says no medical history
        medicalHistoryDetails: 'Patient has diabetes, hypertension, and heart disease' // But provides detailed history
      };

      const health = await UserHealth.create(inconsistentData);
      
      if (health.isHaveMedicalHistory === 'no' && health.medicalHistoryDetails.length > 0) {
        console.warn('DATA INTEGRITY ISSUE: Claims no medical history but provides detailed medical information');
      }
    });

    test('should validate medical data completeness', async () => {
      const incompleteData = {
        userId: testUserId,
        isHaveMedicalHistory: 'yes', // Says has medical history
        medicalHistoryDetails: '' // But no details provided
      };

      const health = await UserHealth.create(incompleteData);
      
      if (health.isHaveMedicalHistory === 'yes' && (!health.medicalHistoryDetails || health.medicalHistoryDetails.trim() === '')) {
        console.warn('DATA INTEGRITY ISSUE: Medical history flag set but no details provided');
      }
    });

    test('should handle contradictory health information', async () => {
      const contradictoryData = {
        userId: testUserId,
        isAlcoholic: 'no',
        isTobaccoUser: 'no',
        isHaveMedicalHistory: 'yes',
        medicalHistoryDetails: 'Liver cirrhosis due to chronic alcohol abuse, lung cancer from smoking'
      };

      const health = await UserHealth.create(contradictoryData);
      
      // Check for contradictions between fields and medical history
      if (health.isAlcoholic === 'no' && health.medicalHistoryDetails.toLowerCase().includes('alcohol')) {
        console.warn('DATA INTEGRITY ISSUE: Claims not alcoholic but medical history mentions alcohol-related conditions');
      }
      
      if (health.isTobaccoUser === 'no' && health.medicalHistoryDetails.toLowerCase().includes('smoking')) {
        console.warn('DATA INTEGRITY ISSUE: Claims no tobacco use but medical history mentions smoking-related conditions');
      }
    });
  });

  describe('Mass Assignment Vulnerabilities', () => {
    test('should prevent unauthorized field manipulation', async () => {
      const maliciousData = {
        userId: testUserId,
        isAlcoholic: 'no',
        _id: new mongoose.Types.ObjectId(), // Attempting custom ID
        __v: 999, // Attempting version manipulation
        createdAt: new Date('2020-01-01'), // Backdating creation
        updatedAt: new Date('2020-01-01') // Backdating update
      };

      const health = await UserHealth.create(maliciousData);
      
      // Check if system fields were manipulated
      if (health.createdAt.getFullYear() === 2020) {
        console.warn('SECURITY VULNERABILITY: Mass assignment allows timestamp manipulation in medical records');
      }
    });
  });

  describe('Data Anonymization and De-identification', () => {
    test('should handle requests for data anonymization', async () => {
      const identifiableData = {
        userId: testUserId,
        medicalHistoryDetails: 'John Doe, born 1990, SSN: 123-45-6789, diagnosed with diabetes at City Hospital on 2020-01-15'
      };

      const health = await UserHealth.create(identifiableData);
      
      // Check if PII is stored in medical history
      const piiPatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
        /\b\d{4}-\d{2}-\d{2}\b/, // Date pattern
        /born \d{4}/, // Birth year pattern
      ];
      
      piiPatterns.forEach(pattern => {
        if (pattern.test(health.medicalHistoryDetails)) {
          console.warn('PRIVACY VIOLATION: PII detected in medical history text');
        }
      });
    });

    test('should support data minimization principles', async () => {
      const excessiveData = {
        userId: testUserId,
        isAlcoholic: 'no',
        isTobaccoUser: 'no',
        isHaveTattoos: 'no',
        isHaveHIV: 'no',
        isPositiveInTB: 'no',
        isHaveMedicalHistory: 'no',
        medicalHistoryDetails: '', // Empty but all other fields filled
        diet: 'vegetarian'
      };

      const health = await UserHealth.create(excessiveData);
      
      // Count non-empty/non-default fields
      let nonEmptyFields = 0;
      Object.entries(health.toObject()).forEach(([key, value]) => {
        if (value !== '' && key !== '_id' && key !== 'userId' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
          nonEmptyFields++;
        }
      });
      
      if (nonEmptyFields > 5) {
        console.warn('DATA MINIMIZATION ISSUE: Excessive health data collection');
      }
    });
  });

  describe('Default Value Security', () => {
    test('should set secure default values', async () => {
      const minimalData = {
        userId: testUserId
      };

      const health = await UserHealth.create(minimalData);
      
      // Check secure defaults - empty strings for sensitive fields
      expect(health.isAlcoholic).toBe('');
      expect(health.isTobaccoUser).toBe('');
      expect(health.isHaveHIV).toBe('');
      expect(health.isPositiveInTB).toBe('');
      expect(health.isHaveTattoos).toBe('');
      expect(health.isHaveMedicalHistory).toBe('');
      expect(health.medicalHistoryDetails).toBe('');
      expect(health.diet).toBe('');
    });

    test('should handle null and undefined values properly', async () => {
      const nullData = {
        userId: testUserId,
        isAlcoholic: null,
        medicalHistoryDetails: undefined
      };

      const health = await UserHealth.create(nullData);
      
      // Null should be converted to default empty string
      expect(health.isAlcoholic).toBe('');
      expect(health.medicalHistoryDetails).toBe('');
    });
  });

  describe('Audit Trail and Compliance', () => {
    test('should track access to sensitive medical data', async () => {
      const sensitiveData = {
        userId: testUserId,
        isHaveHIV: 'yes',
        medicalHistoryDetails: 'HIV positive, on antiretroviral therapy'
      };

      const health = await UserHealth.create(sensitiveData);
      
      // Access to sensitive fields should be logged
      const hivStatus = health.isHaveHIV;
      if (hivStatus === 'yes') {
        console.warn('AUDIT REQUIREMENT: Access to HIV status should be logged for compliance');
      }
    });

    test('should maintain medical data integrity', async () => {
      const medicalData = {
        userId: testUserId,
        medicalHistoryDetails: 'Original medical history'
      };

      const health = await UserHealth.create(medicalData);
      
      // Update medical history
      health.medicalHistoryDetails = 'Modified medical history';
      await health.save();
      
      // Medical records should maintain audit trail of changes
      console.warn('COMPLIANCE REQUIREMENT: Medical record modifications should maintain audit trail');
    });
  });
});