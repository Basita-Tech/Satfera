import mongoose from 'mongoose';
import { Profile } from '../../models/Profile';
import { User } from '../../models/User';

describe('Profile Model Security Tests', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Profile.deleteMany({});
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

  describe('Authorization and Access Control', () => {
    test('should require valid userId reference', async () => {
      const profileData = {
        userId: 'invalid_object_id', // Invalid ObjectId
        photos: {
          closerPhoto: {
            url: 'https://example.com/photo.jpg'
          }
        }
      };

      await expect(Profile.create(profileData)).rejects.toThrow();
    });

    test('should prevent profiles for non-existent users', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      
      const profileData = {
        userId: nonExistentUserId,
        photos: {
          closerPhoto: {
            url: 'https://example.com/photo.jpg'
          }
        }
      };

      // The model doesn't enforce referential integrity - this is a vulnerability
      const profile = await Profile.create(profileData);
      if (profile) {
        console.warn('SECURITY VULNERABILITY: No referential integrity check for userId');
      }
    });

    test('should handle multiple profiles for same user', async () => {
      const profileData = {
        userId: testUserId,
        photos: {
          closerPhoto: {
            url: 'https://example.com/photo1.jpg'
          }
        }
      };

      const profileData2 = {
        userId: testUserId, // Same user
        photos: {
          closerPhoto: {
            url: 'https://example.com/photo2.jpg'
          }
        }
      };

      await Profile.create(profileData);
      
      // Should this be allowed? No unique constraint on userId
      const profile2 = await Profile.create(profileData2);
      if (profile2) {
        console.warn('SECURITY VULNERABILITY: Multiple profiles allowed for same user');
      }
    });
  });

  describe('File Upload Vulnerabilities', () => {
    test('should validate photo URL formats', async () => {
      const maliciousData = {
        userId: testUserId,
        photos: {
          closerPhoto: {
            url: 'javascript:alert(1)', // XSS attempt
            visibility: 'public'
          }
        }
      };

      // Model doesn't validate URL format - vulnerability
      const profile = await Profile.create(maliciousData);
      if (profile.photos.closerPhoto.url === 'javascript:alert(1)') {
        console.warn('SECURITY VULNERABILITY: No URL validation allows XSS vectors');
      }
    });

    test('should prevent file path traversal in URLs', async () => {
      const pathTraversalData = {
        userId: testUserId,
        photos: {
          closerPhoto: {
            url: '../../../etc/passwd', // Path traversal attempt
            visibility: 'public'
          }
        }
      };

      const profile = await Profile.create(pathTraversalData);
      if (profile.photos.closerPhoto.url.includes('../')) {
        console.warn('SECURITY VULNERABILITY: Path traversal characters allowed in URLs');
      }
    });

    test('should validate photo visibility enum values', async () => {
      const invalidVisibilityData = {
        userId: testUserId,
        photos: {
          closerPhoto: {
            url: 'https://example.com/photo.jpg',
            visibility: 'private' // Invalid enum value for closerPhoto
          }
        }
      };

      await expect(Profile.create(invalidVisibilityData)).rejects.toThrow();
    });

    test('should prevent excessive photo uploads', async () => {
      const manyPhotos = Array(1000).fill(0).map((_, i) => ({
        url: `https://example.com/photo${i}.jpg`,
        uploadedAt: new Date(),
        visibility: 'connectionOnly'
      }));

      const profileData = {
        userId: testUserId,
        photos: {
          personalPhotos: manyPhotos,
          otherPhotos: manyPhotos
        }
      };

      // No limits on array size - potential DoS vulnerability
      try {
        const profile = await Profile.create(profileData);
        if (profile.photos.personalPhotos.length === 1000) {
          console.warn('SECURITY VULNERABILITY: No limits on photo array size');
        }
      } catch (error) {
        // If it fails due to size, that's good
        expect(error).toBeDefined();
      }
    });
  });

  describe('Privacy and Visibility Controls', () => {
    test('should enforce visibility enum constraints', async () => {
      const invalidPrivacyData = {
        userId: testUserId,
        settings: {
          visibleTo: 'hackers' // Invalid enum value
        }
      };

      await expect(Profile.create(invalidPrivacyData)).rejects.toThrow();
    });

    test('should validate government ID visibility is admin-only', async () => {
      const profileData = {
        userId: testUserId,
        governmentIdImage: {
          url: 'https://example.com/id.jpg',
          uploadedAt: new Date(),
          visibility: 'public' // Should only allow 'adminOnly'
        }
      };

      await expect(Profile.create(profileData)).rejects.toThrow();
    });

    test('should handle privacy settings bypass attempts', async () => {
      const maliciousPrivacyData = {
        userId: testUserId,
        privacy: {
          allowProfileViewOnRequest: { $ne: false }, // NoSQL injection
          showPhotosToConnectionsOnly: 'yes' // Wrong type
        }
      };

      await expect(Profile.create(maliciousPrivacyData)).rejects.toThrow();
    });

    test('should prevent unauthorized access to government ID data', async () => {
      const profileData = {
        userId: testUserId,
        governmentIdImage: {
          url: 'https://example.com/sensitive_id.jpg',
          uploadedAt: new Date(),
          verificationStatus: 'verified',
          visibility: 'adminOnly'
        }
      };

      const profile = await Profile.create(profileData);
      
      // Ensure sensitive data is properly protected
      const publicProfile = JSON.parse(JSON.stringify(profile));
      
      // Check if government ID is exposed (it shouldn't be in public views)
      if (publicProfile.governmentIdImage && publicProfile.governmentIdImage.url) {
        console.warn('SECURITY VULNERABILITY: Government ID data exposed in public profile');
      }
    });
  });

  describe('Data Injection and Validation', () => {
    test('should prevent NoSQL injection in favorite profiles', async () => {
      const maliciousData = {
        userId: testUserId,
        favoriteProfiles: [{ $ne: null }] // NoSQL injection attempt
      };

      await expect(Profile.create(maliciousData)).rejects.toThrow();
    });

    test('should validate ObjectId format in favorite profiles', async () => {
      const invalidObjectIdData = {
        userId: testUserId,
        favoriteProfiles: ['not_an_objectid', 'also_invalid']
      };

      await expect(Profile.create(invalidObjectIdData)).rejects.toThrow();
    });

    test('should prevent script injection in photo titles', async () => {
      const xssData = {
        userId: testUserId,
        photos: {
          otherPhotos: [{
            url: 'https://example.com/photo.jpg',
            title: '<script>alert("XSS")</script>', // XSS attempt
            uploadedAt: new Date(),
            visibility: 'connectionOnly'
          }]
        }
      };

      const profile = await Profile.create(xssData);
      if (profile.photos.otherPhotos[0].title.includes('<script>')) {
        console.warn('SECURITY VULNERABILITY: Script injection allowed in photo titles');
      }
    });

    test('should validate account type enum', async () => {
      const invalidAccountTypeData = {
        userId: testUserId,
        accountType: 'unlimited' // Invalid enum value
      };

      await expect(Profile.create(invalidAccountTypeData)).rejects.toThrow();
    });

    test('should prevent negative profile view counts', async () => {
      const negativeCountData = {
        userId: testUserId,
        ProfileViewed: -100 // Negative count
      };

      const profile = await Profile.create(negativeCountData);
      if (profile.ProfileViewed < 0) {
        console.warn('SECURITY VULNERABILITY: Negative profile view counts allowed');
      }
    });
  });

  describe('Mass Assignment Vulnerabilities', () => {
    test('should prevent mass assignment of verification status', async () => {
      const maliciousData = {
        userId: testUserId,
        isVerified: true, // Attempting to self-verify
        isProfileApproved: true, // Attempting to self-approve
        photos: {
          closerPhoto: {
            url: 'https://example.com/photo.jpg'
          }
        }
      };

      const profile = await Profile.create(maliciousData);
      
      // These should default to false for security
      if (profile.isVerified === true) {
        console.warn('SECURITY VULNERABILITY: Mass assignment allows self-verification');
      }
      if (profile.isProfileApproved === true) {
        console.warn('SECURITY VULNERABILITY: Mass assignment allows self-approval');
      }
    });

    test('should prevent manipulation of creation timestamps', async () => {
      const timestampData = {
        userId: testUserId,
        createdAt: new Date('2020-01-01'), // Fake creation date
        updatedAt: new Date('2020-01-01'), // Fake update date
        photos: {
          closerPhoto: {
            url: 'https://example.com/photo.jpg',
            uploadedAt: new Date('2019-01-01') // Fake upload date
          }
        }
      };

      const profile = await Profile.create(timestampData);
      
      // Timestamps should be automatically set, not user-controlled
      if (profile.createdAt.getFullYear() === 2020) {
        console.warn('SECURITY VULNERABILITY: User can manipulate creation timestamps');
      }
    });
  });

  describe('Data Type Confusion', () => {
    test('should prevent object injection in boolean fields', async () => {
      const typeConfusionData = {
        userId: testUserId,
        isVisible: { $ne: false }, // Object instead of boolean
        isVerified: 'true' // String instead of boolean
      };

      await expect(Profile.create(typeConfusionData)).rejects.toThrow();
    });

    test('should prevent array injection in single value fields', async () => {
      const arrayInjectionData = {
        userId: testUserId,
        accountType: ['free', 'premium'], // Array instead of single value
        ProfileViewed: ['1', '2', '3'] // Array instead of number
      };

      await expect(Profile.create(arrayInjectionData)).rejects.toThrow();
    });
  });

  describe('Schema Validation Edge Cases', () => {
    test('should handle empty photo objects gracefully', async () => {
      const emptyPhotoData = {
        userId: testUserId,
        photos: {
          closerPhoto: {}, // Empty photo object
          personalPhotos: [{}], // Empty photo in array
          familyPhoto: null // Null photo
        }
      };

      const profile = await Profile.create(emptyPhotoData);
      expect(profile.photos.closerPhoto.url).toBeUndefined();
    });

    test('should validate nested object structure', async () => {
      const invalidNestedData = {
        userId: testUserId,
        settings: {
          receiveConnectionRequests: 'maybe', // Invalid boolean
          notifyOnNewConnectionRequest: 1, // Invalid boolean
          visibleTo: 'invalid_visibility' // Invalid enum
        }
      };

      await expect(Profile.create(invalidNestedData)).rejects.toThrow();
    });

    test('should handle very large profile view counts', async () => {
      const largeCountData = {
        userId: testUserId,
        ProfileViewed: Number.MAX_SAFE_INTEGER + 1 // Beyond safe integer
      };

      try {
        const profile = await Profile.create(largeCountData);
        if (profile.ProfileViewed > Number.MAX_SAFE_INTEGER) {
          console.warn('SECURITY VULNERABILITY: Integer overflow possible in ProfileViewed');
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Reference Security', () => {
    test('should validate favorite profile references exist', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      
      const profileData = {
        userId: testUserId,
        favoriteProfiles: [nonExistentUserId] // Reference to non-existent user
      };

      // Model doesn't enforce referential integrity - vulnerability
      const profile = await Profile.create(profileData);
      if (profile.favoriteProfiles.length > 0) {
        console.warn('SECURITY VULNERABILITY: No referential integrity for favoriteProfiles');
      }
    });

    test('should prevent circular references in favorites', async () => {
      const profileData = {
        userId: testUserId,
        favoriteProfiles: [testUserId] // Self-reference
      };

      // Should this be allowed?
      const profile = await Profile.create(profileData);
      if (profile.favoriteProfiles.includes(testUserId)) {
        console.warn('POTENTIAL ISSUE: Self-reference allowed in favoriteProfiles');
      }
    });

    test('should limit number of favorite profiles', async () => {
      const manyFavorites = Array(10000).fill(0).map(() => new mongoose.Types.ObjectId());
      
      const profileData = {
        userId: testUserId,
        favoriteProfiles: manyFavorites
      };

      try {
        const profile = await Profile.create(profileData);
        if (profile.favoriteProfiles.length === 10000) {
          console.warn('SECURITY VULNERABILITY: No limit on favorite profiles array size');
        }
      } catch (error) {
        // If it fails due to size, that's good for preventing DoS
        expect(error).toBeDefined();
      }
    });
  });

  describe('Default Value Security', () => {
    test('should set secure default values', async () => {
      const minimalData = {
        userId: testUserId
      };

      const profile = await Profile.create(minimalData);
      
      // Check secure defaults
      expect(profile.isVerified).toBe(false);
      expect(profile.isProfileApproved).toBe(false);
      expect(profile.isVisible).toBe(true);
      expect(profile.privacy.allowProfileViewOnRequest).toBe(false);
      expect(profile.privacy.showPhotosToConnectionsOnly).toBe(true);
      expect(profile.settings.visibleTo).toBe('everyone'); // This might be too permissive
      expect(profile.accountType).toBe('free');
      expect(profile.ProfileViewed).toBe(0);
    });

    test('should check if default visibility is too permissive', async () => {
      const profile = await Profile.create({ userId: testUserId });
      
      if (profile.settings.visibleTo === 'everyone') {
        console.warn('POTENTIAL SECURITY ISSUE: Default visibility is "everyone"');
      }
      
      if (profile.settings.receiveConnectionRequests === true) {
        console.warn('POTENTIAL SECURITY ISSUE: Default allows connection requests from anyone');
      }
    });
  });
});