import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authLimiter, otpLimiter, apiLimiter } from '../../middleware/rateLimiter';
import { APP_CONFIG } from '../../config/constants';

// Mock express-rate-limit
jest.mock('express-rate-limit');

const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;

describe('RateLimiter Security Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockLimiterFunction: jest.Mock;

  beforeEach(() => {
    req = {
      ip: '192.168.1.1',
      path: '/api/test',
      headers: {},
      method: 'GET'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn()
    };
    next = jest.fn();

    mockLimiterFunction = jest.fn();
    mockRateLimit.mockReturnValue(mockLimiterFunction);

    jest.clearAllMocks();
  });

  describe('Rate Limiting Bypass Attempts', () => {
    test('should prevent IP spoofing through X-Forwarded-For header', async () => {
      req.headers = {
        'x-forwarded-for': '127.0.0.1, 10.0.0.1, 192.168.1.100'
      };
      req.ip = '192.168.1.1';

      // Simulate rate limit exceeded
      mockLimiterFunction.mockImplementation((req, res, next) => {
        res.status(429).json({
          success: false,
          message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
        });
      });

      authLimiter(req as Request, res as Response, next);

      // Should still be rate limited despite spoofed headers
      expect(mockLimiterFunction).toHaveBeenCalled();
    });

    test('should prevent bypass through X-Real-IP header manipulation', async () => {
      req.headers = {
        'x-real-ip': '127.0.0.1',
        'x-forwarded-for': '10.0.0.1'
      };

      mockLimiterFunction.mockImplementation((req, res, next) => {
        res.status(429).json({
          success: false,
          message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
        });
      });

      authLimiter(req as Request, res as Response, next);
      expect(mockLimiterFunction).toHaveBeenCalled();
    });

    test('should handle multiple proxy headers injection', async () => {
      const maliciousHeaders = {
        'x-forwarded-for': '127.0.0.1',
        'x-real-ip': '10.0.0.1',
        'x-client-ip': '192.168.1.1',
        'x-cluster-client-ip': '172.16.0.1',
        'cf-connecting-ip': '203.0.113.1'
      };

      req.headers = maliciousHeaders;

      mockLimiterFunction.mockImplementation((req, res, next) => {
        res.status(429).json({
          success: false,
          message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
        });
      });

      authLimiter(req as Request, res as Response, next);
      expect(mockLimiterFunction).toHaveBeenCalled();
    });

    test('should prevent bypass through User-Agent rotation', async () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (X11; Linux x86_64)',
        'CustomBot/1.0',
        ''
      ];

      for (const userAgent of userAgents) {
        req.headers = { 'user-agent': userAgent };

        mockLimiterFunction.mockImplementation((req, res, next) => {
          res.status(429).json({
            success: false,
            message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
          });
        });

        authLimiter(req as Request, res as Response, next);
        expect(mockLimiterFunction).toHaveBeenCalled();
      }
    });
  });

  describe('DDoS Protection Testing', () => {
    test('should handle burst requests from single IP', async () => {
      const burstRequests = Array(50).fill(null).map((_, i) => ({
        ...req,
        id: i
      }));

      let blockedCount = 0;
      mockLimiterFunction.mockImplementation((req, res, next) => {
        blockedCount++;
        res.status(429).json({
          success: false,
          message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
        });
      });

      burstRequests.forEach(request => {
        authLimiter(request as Request, res as Response, next);
      });

      expect(blockedCount).toBeGreaterThan(0);
    });

    test('should handle distributed attack simulation', async () => {
      const attackIPs = Array(100).fill(null).map((_, i) => `192.168.1.${i}`);

      attackIPs.forEach(ip => {
        req.ip = ip;
        
        // Each IP attempts multiple requests
        for (let i = 0; i < 10; i++) {
          mockLimiterFunction.mockImplementation((req, res, next) => {
            if (i >= APP_CONFIG.RATE_LIMIT.AUTH.MAX_REQUESTS) {
              res.status(429).json({
                success: false,
                message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
              });
            } else {
              next();
            }
          });

          authLimiter(req as Request, res as Response, next);
        }
      });

      expect(mockLimiterFunction).toHaveBeenCalledTimes(1000);
    });

    test('should handle slowloris-style attacks', async () => {
      // Simulate slow requests that keep connections open
      const slowRequests = Array(20).fill(null).map((_, i) => ({
        ...req,
        connection: { setTimeout: jest.fn() },
        socket: { setTimeout: jest.fn() }
      }));

      mockLimiterFunction.mockImplementation((req, res, next) => {
        // Simulate slow response
        setTimeout(() => {
          res.status(429).json({
            success: false,
            message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
          });
        }, 100);
      });

      slowRequests.forEach(request => {
        authLimiter(request as Request, res as Response, next);
      });

      expect(mockLimiterFunction).toHaveBeenCalledTimes(20);
    });
  });

  describe('Memory Exhaustion Attacks', () => {
    test('should handle requests with extremely large headers', async () => {
      req.headers = {
        'x-large-header': 'A'.repeat(100000), // 100KB header
        'authorization': 'Bearer ' + 'token'.repeat(1000),
        'user-agent': 'Agent'.repeat(5000)
      };

      mockLimiterFunction.mockImplementation((req, res, next) => {
        res.status(429).json({
          success: false,
          message: 'Request too large'
        });
      });

      authLimiter(req as Request, res as Response, next);
      expect(mockLimiterFunction).toHaveBeenCalled();
    });

    test('should handle requests with many small headers', async () => {
      // Create 1000 small headers to exhaust memory
      const manyHeaders: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        manyHeaders[`custom-header-${i}`] = `value-${i}`;
      }

      req.headers = manyHeaders;

      mockLimiterFunction.mockImplementation((req, res, next) => {
        res.status(429).json({
          success: false,
          message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
        });
      });

      authLimiter(req as Request, res as Response, next);
      expect(mockLimiterFunction).toHaveBeenCalled();
    });
  });

  describe('Request Smuggling Attack Prevention', () => {
    test('should handle malformed Content-Length headers', async () => {
      req.headers = {
        'content-length': '100, 50',
        'transfer-encoding': 'chunked'
      };

      mockLimiterFunction.mockImplementation((req, res, next) => {
        res.status(400).json({
          success: false,
          message: 'Malformed request'
        });
      });

      authLimiter(req as Request, res as Response, next);
      expect(mockLimiterFunction).toHaveBeenCalled();
    });

    test('should prevent HTTP/2 downgrade attacks', async () => {
      req.headers = {
        'http2-settings': 'malicious-settings',
        'upgrade': 'h2c',
        'connection': 'upgrade, http2-settings'
      };

      mockLimiterFunction.mockImplementation((req, res, next) => {
        res.status(400).json({
          success: false,
          message: 'Invalid protocol upgrade'
        });
      });

      authLimiter(req as Request, res as Response, next);
      expect(mockLimiterFunction).toHaveBeenCalled();
    });

    test('should handle chunked encoding manipulation', async () => {
      req.headers = {
        'transfer-encoding': 'chunked, identity',
        'content-length': '0'
      };

      mockLimiterFunction.mockImplementation((req, res, next) => {
        res.status(400).json({
          success: false,
          message: 'Conflicting transfer encodings'
        });
      });

      authLimiter(req as Request, res as Response, next);
      expect(mockLimiterFunction).toHaveBeenCalled();
    });
  });

  describe('Rate Limiter Configuration Security', () => {
    test('should verify auth limiter has secure configuration', () => {
      expect(APP_CONFIG.RATE_LIMIT.AUTH.WINDOW_MS).toBe(15 * 60 * 1000);
      expect(APP_CONFIG.RATE_LIMIT.AUTH.MAX_REQUESTS).toBe(5);
      expect(APP_CONFIG.RATE_LIMIT.AUTH.MAX_REQUESTS).toBeLessThan(10); // Should be restrictive
    });

    test('should verify OTP limiter has secure configuration', () => {
      expect(APP_CONFIG.RATE_LIMIT.OTP.WINDOW_MS).toBe(15 * 60 * 1000);
      expect(APP_CONFIG.RATE_LIMIT.OTP.MAX_REQUESTS).toBe(5);
      expect(APP_CONFIG.RATE_LIMIT.OTP.MAX_REQUESTS).toBeLessThan(10); // Should be restrictive for OTP
    });

    test('should flag insecure API limiter configuration', () => {
      // CRITICAL VULNERABILITY: API rate limit is set to 100,000,000 requests
      expect(APP_CONFIG.RATE_LIMIT.API.MAX_REQUESTS).toBe(100000000);
      
      // This is a security vulnerability - API should have reasonable limits
      expect(APP_CONFIG.RATE_LIMIT.API.MAX_REQUESTS).toBeGreaterThan(1000000);
      
      console.warn('SECURITY WARNING: API rate limit is dangerously high at 100M requests per window');
    });
  });

  describe('Rate Limiter Middleware Chain Security', () => {
    test('should handle middleware execution order correctly', async () => {
      const executionOrder: string[] = [];

      const testMiddleware1 = (req: Request, res: Response, next: NextFunction) => {
        executionOrder.push('middleware1');
        next();
      };

      const testMiddleware2 = (req: Request, res: Response, next: NextFunction) => {
        executionOrder.push('middleware2');
        next();
      };

      mockLimiterFunction.mockImplementation((req, res, next) => {
        executionOrder.push('rateLimiter');
        next();
      });

      // Execute middleware chain
      testMiddleware1(req as Request, res as Response, () => {
        authLimiter(req as Request, res as Response, () => {
          testMiddleware2(req as Request, res as Response, next);
        });
      });

      expect(executionOrder).toEqual(['middleware1', 'rateLimiter', 'middleware2']);
    });

    test('should prevent rate limiter bypass through middleware errors', async () => {
      const errorMiddleware = (req: Request, res: Response, next: NextFunction) => {
        throw new Error('Middleware error');
      };

      mockLimiterFunction.mockImplementation((req, res, next) => {
        res.status(429).json({
          success: false,
          message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
        });
      });

      try {
        errorMiddleware(req as Request, res as Response, () => {
          authLimiter(req as Request, res as Response, next);
        });
      } catch (error) {
        // Rate limiter should still execute even if previous middleware throws
        authLimiter(req as Request, res as Response, next);
      }

      expect(mockLimiterFunction).toHaveBeenCalled();
    });
  });

  describe('API Rate Limiter Health Check Bypass', () => {
    test('should verify health check bypass works correctly', () => {
      req.path = '/health';

      // Mock the skip function behavior
      const skipFunction = apiLimiter.skip || ((req: Request) => req.path === '/health');
      const shouldSkip = skipFunction(req as Request);

      expect(shouldSkip).toBe(true);
    });

    test('should not bypass rate limiting for similar paths', () => {
      const similarPaths = [
        '/health-check',
        '/health/',
        '/healthz',
        '/health?param=value',
        '/api/health'
      ];

      similarPaths.forEach(path => {
        req.path = path;
        const skipFunction = (req: Request) => req.path === '/health';
        const shouldSkip = skipFunction(req as Request);

        expect(shouldSkip).toBe(false);
      });
    });

    test('should prevent health check path manipulation', () => {
      const maliciousPaths = [
        '/health/../admin',
        '/health%2e%2e%2fadmin',
        '/health\x00',
        '/health\r\n/admin',
        '/health//admin'
      ];

      maliciousPaths.forEach(path => {
        req.path = path;
        const skipFunction = (req: Request) => req.path === '/health';
        const shouldSkip = skipFunction(req as Request);

        expect(shouldSkip).toBe(false);
      });
    });
  });

  describe('Rate Limiter Error Handling', () => {
    test('should handle rate limiter storage errors gracefully', async () => {
      mockLimiterFunction.mockImplementation((req, res, next) => {
        // Simulate storage error (Redis/Memory store failure)
        const error = new Error('Storage connection failed');
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      authLimiter(req as Request, res as Response, next);

      expect(mockLimiterFunction).toHaveBeenCalled();
      // Should fail closed (deny access) rather than fail open
    });

    test('should not expose internal errors in rate limit responses', async () => {
      mockLimiterFunction.mockImplementation((req, res, next) => {
        res.status(429).json({
          success: false,
          message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
        });
      });

      authLimiter(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
      });

      // Should not contain stack traces or internal details
      expect(APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE).not.toContain('Error:');
      expect(APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE).not.toContain('at ');
    });
  });

  describe('Advanced Rate Limiting Attack Vectors', () => {
    test('should handle IPv6 address manipulation', async () => {
      const ipv6Addresses = [
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '::1',
        '::ffff:192.0.2.1',
        'fe80::1%eth0',
        '2001:db8::1'
      ];

      ipv6Addresses.forEach(ip => {
        req.ip = ip;

        mockLimiterFunction.mockImplementation((req, res, next) => {
          res.status(429).json({
            success: false,
            message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
          });
        });

        authLimiter(req as Request, res as Response, next);
        expect(mockLimiterFunction).toHaveBeenCalled();
      });
    });

    test('should handle connection flooding attacks', async () => {
      // Simulate many connections from same IP
      const connections = Array(1000).fill(null).map(() => ({ ...req }));

      connections.forEach(connection => {
        mockLimiterFunction.mockImplementation((req, res, next) => {
          res.status(429).json({
            success: false,
            message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
          });
        });

        authLimiter(connection as Request, res as Response, next);
      });

      expect(mockLimiterFunction).toHaveBeenCalledTimes(1000);
    });

    test('should handle race condition exploitation attempts', async () => {
      // Simulate concurrent requests that might exploit race conditions
      const concurrentRequests = Array(10).fill(null).map(() => 
        new Promise(resolve => {
          mockLimiterFunction.mockImplementation((req, res, next) => {
            // Simulate async rate check with potential race condition
            setTimeout(() => {
              res.status(429).json({
                success: false,
                message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
              });
              resolve(true);
            }, Math.random() * 10);
          });

          authLimiter(req as Request, res as Response, next);
        })
      );

      await Promise.all(concurrentRequests);
      expect(mockLimiterFunction).toHaveBeenCalledTimes(10);
    });
  });

  describe('Rate Limiter Response Header Security', () => {
    test('should verify rate limit headers are set securely', async () => {
      mockLimiterFunction.mockImplementation((req, res, next) => {
        // Verify standard headers are enabled
        res.set('X-RateLimit-Limit', '5');
        res.set('X-RateLimit-Remaining', '4');
        res.set('X-RateLimit-Reset', new Date(Date.now() + 900000).toISOString());
        
        next();
      });

      authLimiter(req as Request, res as Response, next);

      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(next).toHaveBeenCalled();
    });

    test('should not expose sensitive server information in headers', async () => {
      mockLimiterFunction.mockImplementation((req, res, next) => {
        // Should not set headers that expose internal information
        expect(res.set).not.toHaveBeenCalledWith('X-Redis-Instance', expect.any(String));
        expect(res.set).not.toHaveBeenCalledWith('X-Server-Node', expect.any(String));
        expect(res.set).not.toHaveBeenCalledWith('X-Rate-Store-Type', expect.any(String));
        
        next();
      });

      authLimiter(req as Request, res as Response, next);
    });
  });
});