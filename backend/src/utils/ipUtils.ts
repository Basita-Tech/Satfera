import { Request } from "express";

/**
 * Extracts the real client IP address from the request
 * Handles various proxy scenarios (Nginx, Cloudflare, AWS, etc.)
 *
 * Priority order:
 * 1. X-Forwarded-For (most common proxy header) - takes first IP
 * 2. X-Real-IP (Nginx)
 * 3. CF-Connecting-IP (Cloudflare)
 * 4. X-Client-IP
 * 5. X-Cluster-Client-IP
 * 6. Forwarded (RFC 7239)
 * 7. req.ip (Express default)
 * 8. req.connection.remoteAddress (fallback)
 */
export const getClientIp = (req: Request): string => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    if (ips) {
      const firstIp = ips.split(",")[0]?.trim();
      if (firstIp) return firstIp;
    }
  }

  const xRealIp = req.headers["x-real-ip"];
  if (xRealIp) {
    const ip = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    if (ip) return ip;
  }

  const cfConnectingIp = req.headers["cf-connecting-ip"];
  if (cfConnectingIp) {
    const ip = Array.isArray(cfConnectingIp)
      ? cfConnectingIp[0]
      : cfConnectingIp;
    if (ip) return ip;
  }

  const xClientIp = req.headers["x-client-ip"];
  if (xClientIp) {
    const ip = Array.isArray(xClientIp) ? xClientIp[0] : xClientIp;
    if (ip) return ip;
  }

  const xClusterClientIp = req.headers["x-cluster-client-ip"];
  if (xClusterClientIp) {
    const ip = Array.isArray(xClusterClientIp)
      ? xClusterClientIp[0]
      : xClusterClientIp;
    if (ip) return ip;
  }

  const forwarded = req.headers["forwarded"];
  if (forwarded) {
    const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (forwardedStr) {
      const match = forwardedStr.match(/for=([^,;]+)/);
      if (match && match[1]) {
        return match[1].replace(/["[\]]/g, "");
      }
    }
  }

  if (req.ip) {
    return req.ip;
  }

  const remoteAddress =
    req.socket?.remoteAddress || (req.connection as any)?.remoteAddress;
  if (remoteAddress) {
    return remoteAddress;
  }

  return "unknown";
};

/**
 * Validates if an IP address is valid (IPv4 or IPv6)
 */
export const isValidIp = (ip: string): boolean => {
  if (!ip || ip === "unknown") return false;

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split(".");
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Pattern.test(ip);
};

/**
 * Checks if an IP is a private/internal IP
 */
export const isPrivateIp = (ip: string): boolean => {
  if (!isValidIp(ip)) return false;

  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/
  ];

  return privateRanges.some((pattern) => pattern.test(ip));
};

/**
 * Gets a normalized IP for consistent storage/comparison
 * Removes IPv6 prefix from IPv4-mapped IPv6 addresses
 */
export const normalizeIp = (ip: string): string => {
  if (!ip) return "unknown";

  const ipv4Mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/i);
  if (ipv4Mapped && ipv4Mapped[1]) {
    return ipv4Mapped[1];
  }

  return ip;
};

/**
 * Gets IP information for logging/security purposes
 */
export const getIpInfo = (req: Request) => {
  const rawIp = getClientIp(req);
  const normalizedIp = normalizeIp(rawIp);

  return {
    ip: normalizedIp,
    rawIp,
    isValid: isValidIp(normalizedIp),
    isPrivate: isPrivateIp(normalizedIp),
    headers: {
      xForwardedFor: req.headers["x-forwarded-for"],
      xRealIp: req.headers["x-real-ip"],
      cfConnectingIp: req.headers["cf-connecting-ip"],
      forwarded: req.headers["forwarded"]
    }
  };
};
