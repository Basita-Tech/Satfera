import { logger } from "../lib/common/logger";
import { redisClient } from "../lib/redis";

/**
 * Security Audit and Monitoring Utilities
 * Tracks security events and provides security metrics
 */

export enum SecurityEventType {
  FAILED_LOGIN = "failed_login",
  SUCCESSFUL_LOGIN = "successful_login",
  ACCOUNT_LOCKED = "account_locked",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  TOKEN_REVOKED = "token_revoked",
  PASSWORD_RESET = "password_reset",
  OTP_FAILED = "otp_failed",
  INJECTION_ATTEMPT = "injection_attempt",
  XSS_ATTEMPT = "xss_attempt",
  BRUTE_FORCE_ATTEMPT = "brute_force_attempt",
  UNAUTHORIZED_ACCESS = "unauthorized_access"
}

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ip: string;
  userAgent?: string | undefined;
  details?: any;
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Log a security event
 */
export const logSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  try {
    const logLevel =
      event.severity === "critical" || event.severity === "high"
        ? "error"
        : event.severity === "medium"
          ? "warn"
          : "info";

    logger[logLevel]("Security Event", {
      type: event.type,
      userId: event.userId,
      email: event.email,
      ip: event.ip,
      userAgent: event.userAgent,
      severity: event.severity,
      details: event.details,
      timestamp: event.timestamp
    });

    const eventKey = `security_event:${event.type}:${Date.now()}`;
    await redisClient.setEx(eventKey, 86400 * 7, JSON.stringify(event));

    const counterKey = `security_counter:${event.type}`;
    await redisClient.incr(counterKey);
    await redisClient.expire(counterKey, 86400);

    if (event.ip) {
      const ipKey = `security_ip:${event.ip}:${event.type}`;
      await redisClient.incr(ipKey);
      await redisClient.expire(ipKey, 3600);
    }

    if (event.severity === "critical" || event.severity === "high") {
      await alertSecurityTeam(event);
    }
  } catch (error) {
    logger.error("Failed to log security event", error);
  }
};

/**
 * Alert security team (placeholder - implement actual alerting)
 */
const alertSecurityTeam = async (event: SecurityEvent): Promise<void> => {
  logger.error("SECURITY ALERT", {
    type: event.type,
    severity: event.severity,
    details: event.details,
    timestamp: event.timestamp
  });
};

/**
 * Get security metrics
 */
export const getSecurityMetrics = async (): Promise<{
  events: Record<string, number>;
  recentEvents: SecurityEvent[];
  topOffendingIPs: { ip: string; count: number }[];
}> => {
  try {
    const events: Record<string, number> = {};

    for (const eventType of Object.values(SecurityEventType)) {
      const count = await redisClient.get(`security_counter:${eventType}`);
      events[eventType] = count ? parseInt(count, 10) : 0;
    }

    const eventKeys = await redisClient.keys("security_event:*");
    const recentEventKeys = eventKeys.slice(-100);

    const recentEvents: SecurityEvent[] = [];
    for (const key of recentEventKeys) {
      const data = await redisClient.get(key);
      if (data) {
        try {
          recentEvents.push(JSON.parse(data));
        } catch (e) {}
      }
    }

    const ipKeys = await redisClient.keys("security_ip:*");
    const ipCounts: { ip: string; count: number }[] = [];

    for (const key of ipKeys) {
      const count = await redisClient.get(key);
      const ip = key.split(":")[1];
      if (count && ip) {
        ipCounts.push({ ip, count: parseInt(count, 10) });
      }
    }

    const topOffendingIPs = ipCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      events,
      recentEvents: recentEvents.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
      topOffendingIPs
    };
  } catch (error) {
    logger.error("Failed to get security metrics", error);
    return {
      events: {},
      recentEvents: [],
      topOffendingIPs: []
    };
  }
};

/**
 * Check if an IP should be blocked based on suspicious activity
 */
export const shouldBlockIP = async (ip: string): Promise<boolean> => {
  try {
    const keys = await redisClient.keys(`security_ip:${ip}:*`);
    let totalEvents = 0;

    for (const key of keys) {
      const count = await redisClient.get(key);
      if (count) {
        totalEvents += parseInt(count, 10);
      }
    }

    return totalEvents > 50;
  } catch (error) {
    logger.error("Failed to check IP block status", error);
    return false;
  }
};

/**
 * Block an IP address
 */
export const blockIP = async (
  ip: string,
  duration: number = 3600,
  reason: string = "Excessive security violations"
): Promise<void> => {
  try {
    await redisClient.setEx(`blocked_ip:${ip}`, duration, reason);

    await logSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      ip,
      details: { action: "IP blocked", reason },
      timestamp: new Date(),
      severity: "high"
    });

    logger.warn("IP address blocked", { ip, duration, reason });
  } catch (error) {
    logger.error("Failed to block IP", error);
  }
};

/**
 * Check if an IP is blocked
 */
export const isIPBlocked = async (ip: string): Promise<boolean> => {
  try {
    const blocked = await redisClient.get(`blocked_ip:${ip}`);
    return blocked !== null;
  } catch (error) {
    logger.error("Failed to check IP block status", error);
    return false;
  }
};

/**
 * Unblock an IP address
 */
export const unblockIP = async (ip: string): Promise<void> => {
  try {
    await redisClient.del(`blocked_ip:${ip}`);
    logger.info("IP address unblocked", { ip });
  } catch (error) {
    logger.error("Failed to unblock IP", error);
  }
};

/**
 * Track failed authentication attempts per user
 */
export const trackFailedAuth = async (
  identifier: string,
  ip: string,
  userAgent?: string
): Promise<void> => {
  await logSecurityEvent({
    type: SecurityEventType.FAILED_LOGIN,
    email: identifier,
    ip,
    userAgent: userAgent || undefined,
    timestamp: new Date(),
    severity: "medium"
  });
};

/**
 * Track successful authentication
 */
export const trackSuccessfulAuth = async (
  userId: string,
  email: string,
  ip: string,
  userAgent?: string
): Promise<void> => {
  await logSecurityEvent({
    type: SecurityEventType.SUCCESSFUL_LOGIN,
    userId,
    email,
    ip,
    userAgent: userAgent || undefined,
    timestamp: new Date(),
    severity: "low"
  });
};

/**
 * Track injection attempts
 */
export const trackInjectionAttempt = async (
  ip: string,
  type: "sql" | "nosql" | "xss" | "command",
  payload: string,
  userAgent?: string
): Promise<void> => {
  await logSecurityEvent({
    type:
      type === "xss"
        ? SecurityEventType.XSS_ATTEMPT
        : SecurityEventType.INJECTION_ATTEMPT,
    ip,
    userAgent: userAgent || undefined,
    details: { type, payload: payload.substring(0, 200) },
    timestamp: new Date(),
    severity: "high"
  });
};

/**
 * Get security summary for admin dashboard
 */
export interface SecuritySummary {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  blockedIPs: number;
  lockedAccounts: number;
  recentAlerts: SecurityEvent[];
}

export const getSecuritySummary = async (): Promise<SecuritySummary> => {
  try {
    const metrics = await getSecurityMetrics();

    const totalEvents = Object.values(metrics.events).reduce(
      (a, b) => a + b,
      0
    );

    const criticalEvents = metrics.recentEvents.filter(
      (e) => e.severity === "critical"
    ).length;

    const highEvents = metrics.recentEvents.filter(
      (e) => e.severity === "high"
    ).length;

    const mediumEvents = metrics.recentEvents.filter(
      (e) => e.severity === "medium"
    ).length;

    const lowEvents = metrics.recentEvents.filter(
      (e) => e.severity === "low"
    ).length;

    const blockedIPKeys = await redisClient.keys("blocked_ip:*");
    const lockedAccountKeys = await redisClient.keys("lockout:login:*");

    return {
      totalEvents,
      criticalEvents,
      highEvents,
      mediumEvents,
      lowEvents,
      blockedIPs: blockedIPKeys.length,
      lockedAccounts: lockedAccountKeys.length,
      recentAlerts: metrics.recentEvents
        .filter((e) => e.severity === "critical" || e.severity === "high")
        .slice(0, 10)
    };
  } catch (error) {
    logger.error("Failed to get security summary", error);
    return {
      totalEvents: 0,
      criticalEvents: 0,
      highEvents: 0,
      mediumEvents: 0,
      lowEvents: 0,
      blockedIPs: 0,
      lockedAccounts: 0,
      recentAlerts: []
    };
  }
};
