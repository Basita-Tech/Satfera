import { Request, Response, NextFunction } from "express";
import hpp from "hpp";
import { xss } from "express-xss-sanitizer";
import { logger } from "../lib/common/logger";
import { getClientIp } from "../utils/ipUtils";

/**
 * Comprehensive Security Middleware
 * Protects against XSS, NoSQL injection, HPP, and other common attacks
 */

export const xssProtection = xss({
  allowedKeys: [],
  allowedTags: []
});

export const hppProtection = hpp({
  whitelist: ["tags", "categories", "filters"]
});

export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      // "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; " +
      // "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      // "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      // "connect-src 'self' https://www.google-analytics.com; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
  );
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );

  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  next();
};

export const requestSizeLimits = {
  json: { limit: "10mb" },
  urlencoded: { limit: "10mb", extended: true }
};

export const suspiciousActivityDetector = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const suspiciousPatterns = [
    /(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex)/i,
    /(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|alert|onerror|onload)/i,
    /(<script|<iframe|<object|<embed|javascript:)/i,
    /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)/i
  ];

  const checkForSuspiciousContent = (data: any): boolean => {
    if (typeof data === "string") {
      return suspiciousPatterns.some((pattern) => pattern.test(data));
    }

    if (Array.isArray(data)) {
      return data.some(checkForSuspiciousContent);
    }

    if (typeof data === "object" && data !== null) {
      return Object.values(data).some(checkForSuspiciousContent);
    }

    return false;
  };

  const isSuspicious =
    checkForSuspiciousContent(req.body) ||
    checkForSuspiciousContent(req.query) ||
    checkForSuspiciousContent(req.params);

  if (isSuspicious) {
    logger.warn("Suspicious activity detected", {
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      userAgent: req.get("user-agent"),
      body: JSON.stringify(req.body),
      query: JSON.stringify(req.query)
    });
  }

  next();
};

export const requestTimeoutProtection = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.error("Request timeout", {
          path: req.path,
          method: req.method,
          ip: getClientIp(req)
        });
        res.status(408).json({
          success: false,
          message: "Request timeout"
        });
      }
    }, timeoutMs);

    res.on("finish", () => {
      clearTimeout(timeout);
    });

    next();
  };
};

export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:5173"
    ].filter(Boolean);

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn("CORS blocked request", { origin });
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
    "csrf-token"
  ],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
  maxAge: 86400
};

export const sanitizeError = (
  error: any
): { message: string; status: number } => {
  const isProduction = process.env.NODE_ENV === "production";

  const sensitivePatterns = [
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /mongodb/i,
    /redis/i,
    /connection/i,
    /database/i,
    /sql/i,
    /query/i,
    /stack trace/i,
    /at \w+/,
    /\/[\w\/]+\.[\w]+:\d+/
  ];

  let message = error?.message || "An error occurred";
  const status = error?.status || error?.statusCode || 500;

  if (isProduction && status >= 500) {
    message = "Internal server error";
  } else if (isProduction) {
    const hasSensitiveInfo = sensitivePatterns.some((pattern) =>
      pattern.test(message)
    );

    if (hasSensitiveInfo) {
      message = "An error occurred while processing your request";
    }
  }

  return { message, status };
};

export const securityLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (duration > 5000) {
      logger.warn("Slow request detected", {
        path: req.path,
        method: req.method,
        duration,
        ip: getClientIp(req),
        userAgent: req.get("user-agent")
      });
    }

    if (req.path.includes("/login") && res.statusCode === 401) {
      logger.warn("Failed login attempt", {
        ip: getClientIp(req),
        userAgent: req.get("user-agent"),
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
};
