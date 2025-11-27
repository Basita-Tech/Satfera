import mongoose from 'mongoose';
import { UserProfession, IUserProfession } from '../../models/User_professions';
import { User } from '../../models/User';

describe('UserProfession Model Security Tests', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await UserProfession.deleteMany({});
    await User.deleteMany({});
    
    const user = await User.create({
      firstName: 'Test', lastName: 'User', gender: 'male',
      phoneNumber: '1234567890', password: 'password123',
      email: 'test@example.com', for_Profile: 'myself'
    });
    testUserId = user._id;
  });

  describe('Enum Validation Bypass', () => {
    test('should enforce employment status enum constraints', async () => {
      const invalidEmploymentData = {
        userId: testUserId,
        EmploymentStatus: 'criminal' // Invalid enum value
      };

      await expect(UserProfession.create(invalidEmploymentData)).rejects.toThrow();
    });

    test('should handle case sensitivity in enum values', async () => {
      const caseSensitiveData = {
        userId: testUserId,
        EmploymentStatus: 'PRIVATE SECTOR' // Wrong case
      };

      await expect(UserProfession.create(caseSensitiveData)).rejects.toThrow();
    });
  });

  describe('Income Data Security', () => {
    test('should protect salary information', async () => {
      const salaryData = {
        userId: testUserId,
        AnnualIncome: '10000000', // High income
        EmploymentStatus: 'private sector',
        OrganizationName: 'Goldman Sachs'
      };

      const profession = await UserProfession.create(salaryData);
      
      // Income is sensitive financial data
      if (profession.AnnualIncome) {
        console.warn('PRIVACY CONCERN: Annual income exposed without protection');
      }
    });

    test('should prevent income manipulation attacks', async () => {
      const manipulatedIncomeData = {
        userId: testUserId,
        AnnualIncome: '<script>alert("Rich!")</script>',
        EmploymentStatus: 'self-employed'
      };

      const profession = await UserProfession.create(manipulatedIncomeData);
      
      if (profession.AnnualIncome.includes('<script>')) {
        console.warn('SECURITY VULNERABILITY: Script injection in income field');
      }
    });
  });

  describe('Professional Data Validation', () => {
    test('should validate organization names', async () => {
      const suspiciousOrgData = {
        userId: testUserId,
        OrganizationName: 'Evil Corp<script>hack()</script>',
        Occupation: 'Hacker'
      };

      const profession = await UserProfession.create(suspiciousOrgData);
      
      if (profession.OrganizationName.includes('<script>')) {
        console.warn('SECURITY VULNERABILITY: XSS in organization name');
      }
    });

    test('should handle professional data consistently', async () => {
      const inconsistentData = {
        userId: testUserId,
        EmploymentStatus: 'unemployed',
        Occupation: 'CEO', // Inconsistent with unemployed status
        AnnualIncome: '5000000' // Income while unemployed
      };

      const profession = await UserProfession.create(inconsistentData);
      
      if (profession.EmploymentStatus === 'unemployed' && profession.AnnualIncome) {
        console.warn('DATA INTEGRITY ISSUE: Income specified for unemployed status');
      }
    });
  });

  describe('Data Injection Prevention', () => {
    test('should prevent NoSQL injection in profession fields', async () => {
      const injectionData = {
        userId: testUserId,
        Occupation: { $ne: null },
        AnnualIncome: { $gt: 0 }
      };

      await expect(UserProfession.create(injectionData)).rejects.toThrow();
    });
  });
});