import { faker } from '@faker-js/faker';

/**
 * Test data generators and utilities for E2E tests
 * 
 * This module provides realistic test data generation for comprehensive E2E testing
 */

export interface TestUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  religion: string;
  caste: string;
  motherTongue: string;
  country: string;
  state: string;
  city: string;
}

export interface ProfileData {
  personal: PersonalDetails;
  family: FamilyDetails;
  education: EducationDetails;
  professional: ProfessionalDetails;
  health: HealthDetails;
  expectations: ExpectationDetails;
}

export interface PersonalDetails {
  height: string;
  weight: string;
  bodyType: string;
  complexion: string;
  disability: string;
  bloodGroup: string;
  diet: string;
  smoke: string;
  drink: string;
  maritalStatus: string;
  numberOfChildren?: string;
  childrenLivingStatus?: string;
}

export interface FamilyDetails {
  fatherName: string;
  fatherOccupation: string;
  motherName: string;
  motherOccupation: string;
  familyType: string;
  familyStatus: string;
  familyValues: string;
  brothers: number;
  marriedBrothers: number;
  sisters: number;
  marriedSisters: number;
  familyLocation: string;
  nativePlace: string;
}

export interface EducationDetails {
  highestEducation: string;
  educationDetails: string;
  specialization: string;
  university: string;
  additionalQualifications: string[];
}

export interface ProfessionalDetails {
  occupation: string;
  designation: string;
  companyName: string;
  workLocation: string;
  experience: string;
  annualIncome: string;
  workingWith: string;
}

export interface HealthDetails {
  physicalStatus: string;
  mentalHealth: string;
  allergies: string;
  medications: string;
  exerciseHabits: string;
  healthIssues: string;
}

export interface ExpectationDetails {
  partnerAgeFrom: number;
  partnerAgeTo: number;
  partnerHeightFrom: string;
  partnerHeightTo: string;
  partnerMaritalStatus: string[];
  partnerReligion: string[];
  partnerCaste: string[];
  partnerEducation: string[];
  partnerOccupation: string[];
  partnerLocation: string[];
  partnerIncome: string;
  partnerFamilyType: string[];
  additionalRequirements: string;
}

export class TestDataGenerator {
  /**
   * Generate a complete test user with all required fields
   */
  static generateTestUser(overrides?: Partial<TestUser>): TestUser {
    const user: TestUser = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      password: 'TestPassword123!',
      phone: this.generateIndianPhoneNumber(),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 45, mode: 'age' }).toISOString().split('T')[0],
      gender: faker.helpers.arrayElement(['male', 'female']),
      religion: faker.helpers.arrayElement(['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain']),
      caste: faker.helpers.arrayElement(['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'Other']),
      motherTongue: faker.helpers.arrayElement(['Hindi', 'English', 'Bengali', 'Tamil', 'Telugu', 'Marathi']),
      country: 'India',
      state: faker.helpers.arrayElement(['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Delhi']),
      city: faker.location.city(),
    };

    return { ...user, ...overrides };
  }

  /**
   * Generate complete profile data for a user
   */
  static generateProfileData(): ProfileData {
    return {
      personal: this.generatePersonalDetails(),
      family: this.generateFamilyDetails(),
      education: this.generateEducationDetails(),
      professional: this.generateProfessionalDetails(),
      health: this.generateHealthDetails(),
      expectations: this.generateExpectationDetails(),
    };
  }

  static generatePersonalDetails(): PersonalDetails {
    return {
      height: faker.helpers.arrayElement(['5\'2"', '5\'4"', '5\'6"', '5\'8"', '5\'10"', '6\'0"']),
      weight: `${faker.number.int({ min: 50, max: 90 })} kg`,
      bodyType: faker.helpers.arrayElement(['Slim', 'Average', 'Athletic', 'Heavy']),
      complexion: faker.helpers.arrayElement(['Very Fair', 'Fair', 'Wheatish', 'Dark', 'Very Dark']),
      disability: faker.helpers.arrayElement(['None', 'Physical Disability', 'Visual Impairment']),
      bloodGroup: faker.helpers.arrayElement(['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-']),
      diet: faker.helpers.arrayElement(['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan']),
      smoke: faker.helpers.arrayElement(['No', 'Occasionally', 'Yes']),
      drink: faker.helpers.arrayElement(['No', 'Occasionally', 'Yes']),
      maritalStatus: faker.helpers.arrayElement(['Never Married', 'Divorced', 'Widowed']),
    };
  }

  static generateFamilyDetails(): FamilyDetails {
    const fatherName = faker.person.fullName({ sex: 'male' });
    const motherName = faker.person.fullName({ sex: 'female' });
    
    return {
      fatherName,
      fatherOccupation: faker.helpers.arrayElement(['Business', 'Service', 'Government Employee', 'Retired']),
      motherName,
      motherOccupation: faker.helpers.arrayElement(['Housewife', 'Service', 'Business', 'Teacher']),
      familyType: faker.helpers.arrayElement(['Nuclear Family', 'Joint Family']),
      familyStatus: faker.helpers.arrayElement(['Middle Class', 'Upper Middle Class', 'High Class']),
      familyValues: faker.helpers.arrayElement(['Orthodox', 'Traditional', 'Moderate', 'Liberal']),
      brothers: faker.number.int({ min: 0, max: 3 }),
      marriedBrothers: faker.number.int({ min: 0, max: 2 }),
      sisters: faker.number.int({ min: 0, max: 3 }),
      marriedSisters: faker.number.int({ min: 0, max: 2 }),
      familyLocation: faker.location.city(),
      nativePlace: faker.location.city(),
    };
  }

  static generateEducationDetails(): EducationDetails {
    return {
      highestEducation: faker.helpers.arrayElement([
        'Graduate - Bachelor Degree',
        'Post Graduate - Master Degree',
        'Doctorate/PhD',
        'Professional Degree'
      ]),
      educationDetails: faker.helpers.arrayElement([
        'Engineering/Technology',
        'Medicine',
        'Arts/Science/Commerce',
        'Management',
        'Law'
      ]),
      specialization: faker.helpers.arrayElement([
        'Computer Science',
        'Mechanical Engineering',
        'MBA',
        'Medicine',
        'Law'
      ]),
      university: faker.company.name() + ' University',
      additionalQualifications: faker.helpers.arrayElements([
        'CFA', 'CA', 'CS', 'CMA', 'ACCA', 'PMP'
      ], { min: 0, max: 2 }),
    };
  }

  static generateProfessionalDetails(): ProfessionalDetails {
    return {
      occupation: faker.helpers.arrayElement([
        'Software Engineer',
        'Doctor',
        'Business Owner',
        'Teacher',
        'Consultant',
        'Manager'
      ]),
      designation: faker.person.jobTitle(),
      companyName: faker.company.name(),
      workLocation: faker.location.city(),
      experience: `${faker.number.int({ min: 1, max: 15 })} years`,
      annualIncome: faker.helpers.arrayElement([
        '3-5 Lakhs',
        '5-10 Lakhs',
        '10-15 Lakhs',
        '15-20 Lakhs',
        '20+ Lakhs'
      ]),
      workingWith: faker.helpers.arrayElement([
        'Private Company',
        'Government/Public Sector',
        'Business/Self Employed',
        'Not Working'
      ]),
    };
  }

  static generateHealthDetails(): HealthDetails {
    return {
      physicalStatus: faker.helpers.arrayElement(['Normal', 'Physically Challenged']),
      mentalHealth: faker.helpers.arrayElement(['Excellent', 'Good', 'Fair']),
      allergies: faker.helpers.arrayElement(['None', 'Food Allergies', 'Drug Allergies', 'Environmental']),
      medications: faker.helpers.arrayElement(['None', 'Regular Medications', 'As Required']),
      exerciseHabits: faker.helpers.arrayElement(['Daily', 'Regular', 'Occasionally', 'Never']),
      healthIssues: faker.helpers.arrayElement(['None', 'Minor Issues', 'Under Treatment']),
    };
  }

  static generateExpectationDetails(): ExpectationDetails {
    return {
      partnerAgeFrom: faker.number.int({ min: 21, max: 35 }),
      partnerAgeTo: faker.number.int({ min: 25, max: 45 }),
      partnerHeightFrom: '5\'0"',
      partnerHeightTo: '6\'0"',
      partnerMaritalStatus: ['Never Married'],
      partnerReligion: ['Hindu', 'Christian'],
      partnerCaste: ['Any'],
      partnerEducation: ['Graduate', 'Post Graduate'],
      partnerOccupation: ['Any'],
      partnerLocation: ['India'],
      partnerIncome: '5-10 Lakhs',
      partnerFamilyType: ['Nuclear Family', 'Joint Family'],
      additionalRequirements: faker.lorem.paragraph(),
    };
  }

  /**
   * Generate Indian phone number
   */
  static generateIndianPhoneNumber(): string {
    const prefixes = ['90', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
    const prefix = faker.helpers.arrayElement(prefixes);
    const suffix = faker.string.numeric(8);
    return `+91${prefix}${suffix}`;
  }

  /**
   * Generate test file data for uploads
   */
  static generateTestImageBase64(): string {
    // Simple 1x1 PNG in base64
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  /**
   * Generate invalid test data for negative testing
   */
  static generateInvalidUserData(): Partial<TestUser> {
    return {
      email: 'invalid-email',
      password: '123', // Too weak
      phone: '123', // Invalid format
      dateOfBirth: '2025-01-01', // Future date
    };
  }

  /**
   * Generate XSS payloads for security testing
   */
  static getXSSPayloads(): string[] {
    return [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "'><script>alert('XSS')</script>",
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">',
      '{{constructor.constructor("alert(\\"XSS\\")")()}}',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    ];
  }

  /**
   * Generate SQL injection payloads for security testing
   */
  static getSQLInjectionPayloads(): string[] {
    return [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1 --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
    ];
  }
}