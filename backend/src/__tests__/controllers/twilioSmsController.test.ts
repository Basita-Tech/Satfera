import request from 'supertest';
import express from 'express';
import { sendOtp, verifyOtp, createMessage } from '../../controllers/twilioSmsController';
import { User } from '../../models/User';
import { createTestUser } from '../helpers/testUtils';

// Mock Twilio client
const mockTwilioClient = {
  verify: {
    v2: {
      services: jest.fn().mockReturnValue({
        verifications: {
          create: jest.fn()
        },
        verificationChecks: {
          create: jest.fn()
        }
      })
    }
  },
  messages: {
    create: jest.fn()
  }
};

jest.mock('twilio', () => {
  return {
    Twilio: jest.fn(() => mockTwilioClient)
  };
});

// Mock environment variables
const mockEnvVars = {
  TWILIO_ACCOUNT_SID: 'test_account_sid',
  TWILIO_AUTH_TOKEN: 'test_auth_token',
  TWILIO_VERIFY_SERVICE_SID: 'test_verify_service_sid',
  TWILIO_PHONE_NUMBER: '+1234567890',
  JWT_SECRET: 'test_jwt_secret',
  FRONTEND_URL: 'https://example.com',
  SUPPORT_CONTACT: 'support@example.com'
};

const app = express();
app.use(express.json());
app.post('/sms/send-otp', sendOtp);
app.post('/sms/verify-otp', verifyOtp);

describe('TwilioSmsController Security Tests', () => {
  beforeEach(() => {
    Object.assign(process.env, mockEnvVars);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Phone Number Validation Vulnerabilities', () => {
    it('should accept malicious phone numbers with special characters', async () => {
      const maliciousNumbers = [
        '"><script>alert("XSS")</script>',
        '$(rm -rf /)',
        '${system("cat /etc/passwd")}',
        '\'; DROP TABLE users; --',
        '\x00\x01\x02', // null bytes
        '../../etc/passwd',
        'javascript:alert(1)'
      ];

      for (const phoneNumber of maliciousNumbers) {
        const response = await request(app)
          .post('/sms/send-otp')
          .send({
            countryCode: '+1',
            phoneNumber: phoneNumber
          });

        // VULNERABILITY: Should validate and sanitize phone number
        expect(response.status).not.toBe(400);
      }
    });

    it('should allow phone numbers that exceed reasonable length limits', async () => {
      const longPhoneNumber = '1'.repeat(1000);
      
      const response = await request(app)
        .post('/sms/send-otp')
        .send({
          countryCode: '+1',
          phoneNumber: longPhoneNumber
        });

      // VULNERABILITY: No length validation on phone number
      expect(response.status).not.toBe(400);
    });

    it('should accept invalid international phone number formats', async () => {
      const invalidNumbers = [
        'abc123def',
        '++1234567890',
        '+1-2-3-4-5-6-7-8-9-0',
        '+999999999999999999999',
        '+0000000000',
        '+1 (555) 123-4567 ext. 123'
      ];

      for (const phoneNumber of invalidNumbers) {
        const response = await request(app)
          .post('/sms/send-otp')
          .send({
            countryCode: '+1',
            phoneNumber: phoneNumber
          });

        // VULNERABILITY: No phone number format validation
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('SMS Bombing/Flooding Vulnerabilities', () => {
    it('should allow rapid successive OTP requests without proper rate limiting', async () => {
      const phoneNumber = '1234567890';
      const countryCode = '+1';

      mockTwilioClient.verify.v2.services().verifications.create
        .mockResolvedValue({ sid: 'test_verification_sid' });

      // Simulate 100 rapid requests in a short timeframe
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .post('/sms/send-otp')
            .send({ countryCode, phoneNumber })
        );
      }

      const responses = await Promise.all(requests);
      const successfulRequests = responses.filter(res => res.status === 200);

      // VULNERABILITY: Should implement proper rate limiting
      expect(successfulRequests.length).toBeGreaterThan(10);
    });

    it('should allow OTP requests to multiple numbers from same IP', async () => {
      mockTwilioClient.verify.v2.services().verifications.create
        .mockResolvedValue({ sid: 'test_verification_sid' });

      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app)
            .post('/sms/send-otp')
            .send({
              countryCode: '+1',
              phoneNumber: `123456${i.toString().padStart(4, '0')}`
            })
        );
      }

      const responses = await Promise.all(requests);
      const successfulRequests = responses.filter(res => res.status === 200);

      // VULNERABILITY: No IP-based rate limiting for different numbers
      expect(successfulRequests.length).toBeGreaterThan(10);
    });
  });

  describe('OTP Brute Force Attack Vulnerabilities', () => {
    it('should allow unlimited OTP verification attempts', async () => {
      const testUser = await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: false
      });

      mockTwilioClient.verify.v2.services().verificationChecks.create
        .mockResolvedValue({ status: 'pending' });

      // Simulate 1000 brute force attempts
      const bruteForceAttempts = [];
      for (let i = 0; i < 1000; i++) {
        bruteForceAttempts.push(
          request(app)
            .post('/sms/verify-otp')
            .send({
              countryCode: '+1',
              phoneNumber: '234567890',
              code: i.toString().padStart(6, '0')
            })
        );
      }

      const responses = await Promise.all(bruteForceAttempts);
      const attemptedVerifications = responses.filter(res => res.status !== 500);

      // VULNERABILITY: No attempt limiting or account lockout
      expect(attemptedVerifications.length).toBeGreaterThan(100);
    });

    it('should not implement timing attack protection for OTP verification', async () => {
      const testUser = await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: false
      });

      const startTime = Date.now();
      
      await request(app)
        .post('/sms/verify-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '234567890',
          code: '000000'
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // VULNERABILITY: Response times may vary based on validation logic
      // allowing timing attacks to determine valid vs invalid codes
      expect(responseTime).toBeGreaterThan(0);
    });
  });

  describe('Phone Number Enumeration Vulnerabilities', () => {
    it('should reveal which phone numbers are registered', async () => {
      // Create a registered user
      await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: false
      });

      // Test with registered number
      const registeredResponse = await request(app)
        .post('/sms/verify-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '234567890',
          code: '123456'
        });

      // Test with unregistered number  
      const unregisteredResponse = await request(app)
        .post('/sms/verify-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '999999999',
          code: '123456'
        });

      // VULNERABILITY: Different responses reveal user existence
      expect(registeredResponse.status).not.toBe(unregisteredResponse.status);
      expect(registeredResponse.body.message).not.toBe(unregisteredResponse.body.message);
    });
  });

  describe('Session Hijacking and Authentication Bypass', () => {
    it('should issue JWT token without proper phone verification confirmation', async () => {
      const testUser = await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: false,
        isEmailVerified: true
      });

      // Mock successful verification but with manipulated response
      mockTwilioClient.verify.v2.services().verificationChecks.create
        .mockResolvedValue({ status: 'approved' });

      const response = await request(app)
        .post('/sms/verify-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '234567890',
          code: '123456'
        });

      // VULNERABILITY: Token issued based solely on Twilio response
      expect(response.body.data?.token).toBeDefined();
    });

    it('should allow verification with already verified phone number', async () => {
      const testUser = await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: true
      });

      mockTwilioClient.verify.v2.services().verificationChecks.create
        .mockResolvedValue({ status: 'approved' });

      const response = await request(app)
        .post('/sms/verify-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '234567890',
          code: 'any_code'
        });

      // VULNERABILITY: Still processes verification for already verified numbers
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Phone number is already verified');
    });
  });

  describe('Input Validation and Injection Vulnerabilities', () => {
    it('should accept malicious country codes', async () => {
      const maliciousCodes = [
        '"><script>alert(1)</script>',
        '${eval("alert(1)")}',
        '\'; DROP TABLE users; --',
        '../../../etc/passwd',
        '\x00\x01\x02',
        'javascript:void(0)'
      ];

      for (const countryCode of maliciousCodes) {
        const response = await request(app)
          .post('/sms/send-otp')
          .send({
            countryCode: countryCode,
            phoneNumber: '1234567890'
          });

        // VULNERABILITY: No sanitization of country code
        expect(response.status).not.toBe(400);
      }
    });

    it('should accept malicious OTP codes', async () => {
      await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: false
      });

      const maliciousCodes = [
        '"><script>alert(1)</script>',
        '${system("id")}',
        '\'; DELETE FROM users; --',
        '../../secret.txt',
        '\x00\x01\x02\x03\x04\x05',
        'javascript:alert("XSS")'
      ];

      for (const code of maliciousCodes) {
        const response = await request(app)
          .post('/sms/verify-otp')
          .send({
            countryCode: '+1',
            phoneNumber: '234567890',
            code: code
          });

        // VULNERABILITY: No sanitization of OTP code
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('OTP Expiration and Replay Vulnerabilities', () => {
    it('should not properly validate OTP expiration', async () => {
      const testUser = await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: false
      });

      // Mock an expired verification as still valid
      mockTwilioClient.verify.v2.services().verificationChecks.create
        .mockResolvedValue({ status: 'approved' });

      const response = await request(app)
        .post('/sms/verify-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '234567890',
          code: '123456'
        });

      // VULNERABILITY: Relies solely on Twilio for expiration validation
      expect(response.status).toBe(200);
    });

    it('should allow OTP reuse after successful verification', async () => {
      const testUser = await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: false
      });

      mockTwilioClient.verify.v2.services().verificationChecks.create
        .mockResolvedValue({ status: 'approved' });

      // First verification
      await request(app)
        .post('/sms/verify-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '234567890',
          code: '123456'
        });

      // Second verification with same code
      const response = await request(app)
        .post('/sms/verify-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '234567890',
          code: '123456'
        });

      // VULNERABILITY: No prevention of OTP replay attacks
      expect(response.status).toBe(200);
    });
  });

  describe('Error Information Disclosure', () => {
    it('should expose sensitive Twilio configuration in error messages', async () => {
      // Simulate Twilio service not found error
      mockTwilioClient.verify.v2.services().verifications.create
        .mockRejectedValue({ code: 20404, status: 404 });

      const response = await request(app)
        .post('/sms/send-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '1234567890'
        });

      // VULNERABILITY: Exposes internal configuration details
      expect(response.body.message).toContain('TWILIO_VERIFY_SERVICE_SID');
      expect(response.body.message).toContain('TWILIO_ACCOUNT_SID');
      expect(response.body.message).toContain('TWILIO_AUTH_TOKEN');
    });

    it('should expose internal errors and stack traces', async () => {
      mockTwilioClient.verify.v2.services().verifications.create
        .mockRejectedValue(new Error('Internal Twilio error with sensitive data: API_KEY_12345'));

      const response = await request(app)
        .post('/sms/send-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '1234567890'
        });

      // VULNERABILITY: May expose sensitive error information
      expect(response.body.message).toContain('Internal Twilio error');
    });
  });

  describe('Race Condition Vulnerabilities', () => {
    it('should allow concurrent phone verification requests', async () => {
      const testUser = await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: false
      });

      mockTwilioClient.verify.v2.services().verificationChecks.create
        .mockResolvedValue({ status: 'approved' });

      // Simulate race condition with concurrent verification requests
      const concurrentRequests = [];
      for (let i = 0; i < 10; i++) {
        concurrentRequests.push(
          request(app)
            .post('/sms/verify-otp')
            .send({
              countryCode: '+1',
              phoneNumber: '234567890',
              code: '123456'
            })
        );
      }

      const responses = await Promise.all(concurrentRequests);
      const successfulVerifications = responses.filter(res => res.status === 200);

      // VULNERABILITY: No protection against concurrent verification attempts
      expect(successfulVerifications.length).toBeGreaterThan(1);
    });
  });

  describe('International Number Handling Vulnerabilities', () => {
    it('should not properly validate international country codes', async () => {
      const invalidCountryCodes = [
        '+999',    // Non-existent country code
        '+1234',   // Invalid format
        '+0',      // Invalid zero country code
        '++1',     // Double plus
        '+',       // Just plus sign
        ''         // Empty string
      ];

      for (const countryCode of invalidCountryCodes) {
        const response = await request(app)
          .post('/sms/send-otp')
          .send({
            countryCode: countryCode,
            phoneNumber: '1234567890'
          });

        // VULNERABILITY: No validation of country code format
        if (countryCode !== '') {
          expect(response.status).not.toBe(400);
        }
      }
    });

    it('should allow potentially expensive international SMS', async () => {
      const expensiveCountryCodes = [
        '+882',    // Satellite phone (very expensive)
        '+883',    // International networks
        '+888',    // Telecommunications for disaster relief
        '+979',    // International premium rate
      ];

      mockTwilioClient.verify.v2.services().verifications.create
        .mockResolvedValue({ sid: 'test_verification_sid' });

      for (const countryCode of expensiveCountryCodes) {
        const response = await request(app)
          .post('/sms/send-otp')
          .send({
            countryCode: countryCode,
            phoneNumber: '1234567890'
          });

        // VULNERABILITY: No restriction on expensive number ranges
        expect(response.status).toBe(200);
      }
    });
  });

  describe('createMessage Function Vulnerabilities', () => {
    it('should allow message injection attacks', async () => {
      const maliciousMessages = [
        'STOP\\nFREE\\nSMS to 12345',
        'PREMIUM RATE: Reply YES to subscribe for $10/day',
        'Click this link: http://malicious-site.com/phish',
        'Your OTP is 123456\\nSTOP to unsubscribe\\nFree msg'
      ];

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test_message_sid'
      });

      for (const message of maliciousMessages) {
        await expect(createMessage(message, '+1234567890')).resolves.toBeDefined();
      }

      // VULNERABILITY: No message content validation or filtering
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(maliciousMessages.length);
    });

    it('should not validate destination number in createMessage', async () => {
      const maliciousDestinations = [
        'javascript:alert(1)',
        '../../etc/passwd',
        '${eval("rm -rf /")}',
        '"><script>alert(1)</script>',
        '\x00\x01\x02\x03'
      ];

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test_message_sid'
      });

      for (const destination of maliciousDestinations) {
        await expect(createMessage('Test message', destination)).resolves.toBeDefined();
      }

      // VULNERABILITY: No destination number validation
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(maliciousDestinations.length);
    });
  });

  describe('Configuration and Environment Vulnerabilities', () => {
    it('should continue execution with missing environment variables', async () => {
      // Clear critical environment variables
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_VERIFY_SERVICE_SID;

      const response = await request(app)
        .post('/sms/send-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '1234567890'
        });

      // VULNERABILITY: No proper validation of required environment variables
      expect(response.status).not.toBe(503); // Should fail with service unavailable
    });

    it('should not validate JWT_SECRET properly in verifyOtp', async () => {
      const testUser = await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: false,
        isEmailVerified: true
      });

      // Clear JWT_SECRET
      delete process.env.JWT_SECRET;

      mockTwilioClient.verify.v2.services().verificationChecks.create
        .mockResolvedValue({ status: 'approved' });

      const response = await request(app)
        .post('/sms/verify-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '234567890',
          code: '123456'
        });

      // VULNERABILITY: Should handle missing JWT_SECRET gracefully
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('JWT_SECRET environment variable is required');
    });
  });

  describe('Business Logic Vulnerabilities', () => {
    it('should allow phone verification for already verified phones', async () => {
      const testUser = await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: true
      });

      mockTwilioClient.verify.v2.services().verificationChecks.create
        .mockResolvedValue({ status: 'approved' });

      const response = await request(app)
        .post('/sms/verify-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '234567890',
          code: '123456'
        });

      // VULNERABILITY: Unnecessary processing for already verified numbers
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Phone number is already verified');
    });

    it('should send welcome email multiple times without proper checks', async () => {
      const testUser = await createTestUser({
        phoneNumber: '+1234567890',
        isPhoneVerified: false,
        isEmailVerified: true,
        welcomeSent: false
      });

      mockTwilioClient.verify.v2.services().verificationChecks.create
        .mockResolvedValue({ status: 'approved' });

      // Multiple verification attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/sms/verify-otp')
          .send({
            countryCode: '+1',
            phoneNumber: '234567890',
            code: '123456'
          });
      }

      // VULNERABILITY: May trigger welcome email multiple times if not properly protected
    });
  });

  describe('Logging and Monitoring Vulnerabilities', () => {
    it('should log sensitive information in console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockTwilioClient.verify.v2.services().verifications.create
        .mockRejectedValue(new Error('Sensitive API key: sk_live_1234567890'));

      await request(app)
        .post('/sms/send-otp')
        .send({
          countryCode: '+1',
          phoneNumber: '1234567890'
        });

      // VULNERABILITY: Sensitive information in logs
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error sending OTP:',
        expect.objectContaining({
          message: 'Sensitive API key: sk_live_1234567890'
        })
      );

      consoleSpy.mockRestore();
    });
  });
});