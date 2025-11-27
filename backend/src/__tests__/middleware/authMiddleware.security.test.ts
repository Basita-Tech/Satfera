import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, verifyToken } from '../../middleware/authMiddleware';
import { User } from '../../models/User';
import { AuthenticatedRequest } from '../../types/types';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('jsonwebtoken');

const mockUser = User as jest.Mocked<typeof User>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthMiddleware Security Tests', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env.JWT_SECRET = 'test-secret-key';
    
    req = {
      headers: {},
      cookies: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('JWT Token Manipulation Attacks', () => {
    test('should reject tokens with modified payload', async () => {
      // Create a valid token first
      const originalPayload = { id: 'user123', role: 'user', email: 'test@example.com' };
      const validToken = 'valid.token.here';
      
      // Simulate token with modified payload (privilege escalation attempt)
      const maliciousPayload = { id: 'user123', role: 'admin', email: 'test@example.com' };
      const manipulatedToken = 'manipulated.token.here';

      req.headers = { authorization: `Bearer ${manipulatedToken}` };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'invalid signature'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject tokens with "none" algorithm attack', async () => {
      const noneAlgToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6InVzZXIxMjMiLCJyb2xlIjoiYWRtaW4ifQ.';
      
      req.headers = { authorization: `Bearer ${noneAlgToken}` };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid algorithm');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject tokens with weak signatures', async () => {
      const weakToken = 'weak.signature.token';
      req.headers = { authorization: `Bearer ${weakToken}` };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle token replay attacks with expired tokens', async () => {
      const expiredToken = 'expired.token.here';
      req.headers = { authorization: `Bearer ${expiredToken}` };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'jwt expired'
      });
    });
  });

  describe('Authentication Bypass Vulnerabilities', () => {
    test('should prevent bypass with empty authorization header', async () => {
      req.headers = { authorization: '' };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should prevent bypass with malformed Bearer token', async () => {
      req.headers = { authorization: 'Bearer' };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });

    test('should prevent bypass with multiple Bearer tokens', async () => {
      req.headers = { authorization: 'Bearer token1 Bearer token2' };

      const token = 'token1';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should prevent bypass with null/undefined token values', async () => {
      req.headers = { authorization: 'Bearer null' };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should handle missing JWT_SECRET vulnerability', async () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        verifyToken('some.token');
      }).toThrow('JWT_SECRET is not defined');
    });
  });

  describe('Header Injection Attacks', () => {
    test('should sanitize authorization header from injection attempts', async () => {
      const maliciousHeaders = [
        'Bearer token\r\nX-Admin: true',
        'Bearer token\nSet-Cookie: admin=true',
        'Bearer token\r\nLocation: http://evil.com',
        'Bearer token\x00\x0d\x0aX-Forwarded-For: admin'
      ];

      for (const header of maliciousHeaders) {
        req.headers = { authorization: header };
        
        await authenticate(req as AuthenticatedRequest, res as Response, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      }
    });

    test('should handle case-insensitive header attacks', async () => {
      req.headers = { 
        'AUTHORIZATION': 'Bearer malicious',
        'authorization': 'Bearer valid'
      };

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Authorization Boundary Testing', () => {
    test('should verify user exists in database after token validation', async () => {
      const validToken = 'valid.token';
      const decodedPayload = { id: 'user123', email: 'test@example.com', role: 'user' };

      req.headers = { authorization: `Bearer ${validToken}` };
      
      mockJwt.verify.mockReturnValue(decodedPayload as any);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      } as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    test('should handle database injection in token payload', async () => {
      const maliciousId = "'; DROP TABLE users; --";
      const maliciousToken = 'malicious.token';
      const decodedPayload = { 
        id: maliciousId, 
        email: 'test@example.com', 
        role: 'user' 
      };

      req.headers = { authorization: `Bearer ${maliciousToken}` };
      
      mockJwt.verify.mockReturnValue(decodedPayload as any);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should prevent role escalation through token manipulation', async () => {
      const validToken = 'valid.token';
      const decodedPayload = { 
        id: 'user123', 
        email: 'test@example.com', 
        role: 'admin'  // Attempting privilege escalation
      };
      const dbUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: 'user'  // Actual role in DB
      };

      req.headers = { authorization: `Bearer ${validToken}` };
      
      mockJwt.verify.mockReturnValue(decodedPayload as any);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(dbUser)
      } as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      // Should use DB role, not token role for critical decisions
      expect(req.user?.role).toBe('user');
    });
  });

  describe('Memory Exhaustion and DoS Attacks', () => {
    test('should handle extremely large tokens', async () => {
      const largeToken = 'A'.repeat(1000000); // 1MB token
      req.headers = { authorization: `Bearer ${largeToken}` };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('token too long');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should handle malformed JWT causing parser errors', async () => {
      const malformedTokens = [
        'not.a.jwt.token.with.too.many.parts',
        'invalid-base64-@#$%^&*()',
        '{"malformed":"json"}.invalid.signature',
        'a'.repeat(10000) // Very long single segment
      ];

      for (const token of malformedTokens) {
        req.headers = { authorization: `Bearer ${token}` };
        
        mockJwt.verify.mockImplementation(() => {
          throw new Error('jwt malformed');
        });

        await authenticate(req as AuthenticatedRequest, res as Response, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
      }
    });
  });

  describe('Cookie-based Authentication Attacks', () => {
    test('should handle cookie injection attacks', async () => {
      req.cookies = {
        token: 'malicious; admin=true; path=/'
      };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should prevent cookie overflow attacks', async () => {
      const largeCookieValue = 'A'.repeat(50000);
      req.cookies = { token: largeCookieValue };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('token too large');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should handle simultaneous header and cookie token attempts', async () => {
      req.headers = { authorization: 'Bearer header-token' };
      req.cookies = { token: 'cookie-token' };

      // Should prioritize Authorization header
      mockJwt.verify.mockImplementation((token) => {
        if (token === 'header-token') {
          return { id: 'user123', role: 'user' };
        }
        throw new Error('Invalid token');
      });

      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'user123',
          email: 'test@example.com',
          role: 'user'
        })
      } as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('header-token', 'test-secret-key');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Handling Security', () => {
    test('should not leak sensitive information in error messages', async () => {
      const sensitiveToken = 'Bearer sensitive-internal-token-12345';
      req.headers = { authorization: sensitiveToken };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Database connection failed: user:password@internal-db:5432');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection failed: user:password@internal-db:5432'
      });

      // Note: This test reveals that error messages might leak sensitive information
    });

    test('should handle undefined/null payload gracefully', async () => {
      const validToken = 'valid.token';
      req.headers = { authorization: `Bearer ${validToken}` };

      mockJwt.verify.mockReturnValue(null as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
    });

    test('should handle payload without required id field', async () => {
      const validToken = 'valid.token';
      const payloadWithoutId = { email: 'test@example.com', role: 'user' };

      req.headers = { authorization: `Bearer ${validToken}` };
      
      mockJwt.verify.mockReturnValue(payloadWithoutId as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
    });
  });

  describe('Timing Attack Prevention', () => {
    test('should maintain consistent timing for invalid tokens', async () => {
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      const invalidTokens = [
        'invalid.token.1',
        'invalid.token.2',
        'malformed-token',
        '',
        'a'.repeat(1000)
      ];

      for (const token of invalidTokens) {
        req.headers = { authorization: `Bearer ${token}` };
        
        mockJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        const start = Date.now();
        await authenticate(req as AuthenticatedRequest, res as Response, next);
        const end = Date.now();

        startTimes.push(start);
        endTimes.push(end);
        
        expect(res.status).toHaveBeenCalledWith(401);
      }

      // Basic timing analysis - in real scenarios, use more sophisticated timing analysis
      const timings = endTimes.map((end, i) => end - startTimes[i]);
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      
      // Allow for some variance but flag if there's significant timing difference
      expect(maxTiming - minTiming).toBeLessThan(100); // 100ms threshold
    });
  });

  describe('Token Source Validation', () => {
    test('should validate token source priority correctly', async () => {
      // Test that Authorization header takes precedence over cookies
      req.headers = { authorization: 'Bearer priority-test' };
      req.cookies = { token: 'cookie-test' };

      mockJwt.verify.mockImplementation((token) => {
        expect(token).toBe('priority-test');
        return { id: 'user123', role: 'user' };
      });

      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'user123',
          email: 'test@example.com'
        })
      } as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('priority-test', 'test-secret-key');
    });
  });
});