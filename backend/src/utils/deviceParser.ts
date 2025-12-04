import { Request } from "express";

/**
 * Device Information Parser
 * Extracts browser, OS, and device type from User Agent
 */

export interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  userAgent: string;
}

/**
 * Parse User Agent to extract device information
 */
export const parseUserAgent = (userAgent: string): DeviceInfo => {
  if (!userAgent) {
    return {
      browser: "Unknown",
      os: "Unknown",
      device: "Unknown",
      userAgent: ""
    };
  }

  const ua = userAgent.toLowerCase();

  let browser = "Unknown";
  if (ua.includes("edg/")) {
    browser = "Edge";
  } else if (ua.includes("chrome/") && !ua.includes("edg/")) {
    browser = "Chrome";
  } else if (ua.includes("firefox/")) {
    browser = "Firefox";
  } else if (ua.includes("safari/") && !ua.includes("chrome/")) {
    browser = "Safari";
  } else if (ua.includes("opera/") || ua.includes("opr/")) {
    browser = "Opera";
  } else if (ua.includes("brave/")) {
    browser = "Brave";
  } else if (ua.includes("msie") || ua.includes("trident/")) {
    browser = "Internet Explorer";
  }

  let os = "Unknown";
  if (ua.includes("windows nt 10.0")) {
    os = "Windows 10/11";
  } else if (ua.includes("windows nt 6.3")) {
    os = "Windows 8.1";
  } else if (ua.includes("windows nt 6.2")) {
    os = "Windows 8";
  } else if (ua.includes("windows nt 6.1")) {
    os = "Windows 7";
  } else if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("mac os x")) {
    const match = ua.match(/mac os x (\d+)[._](\d+)/);
    if (match) {
      os = `macOS ${match[1]}.${match[2]}`;
    } else {
      os = "macOS";
    }
  } else if (ua.includes("android")) {
    const match = ua.match(/android (\d+\.?\d*)/);
    if (match) {
      os = `Android ${match[1]}`;
    } else {
      os = "Android";
    }
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    const match = ua.match(/os (\d+)_(\d+)/);
    if (match) {
      os = `iOS ${match[1]}.${match[2]}`;
    } else {
      os = "iOS";
    }
  } else if (ua.includes("linux")) {
    os = "Linux";
  } else if (ua.includes("ubuntu")) {
    os = "Ubuntu";
  } else if (ua.includes("cros")) {
    os = "Chrome OS";
  }

  let device = "Desktop";
  if (ua.includes("mobile") || ua.includes("android")) {
    device = "Mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    device = "Tablet";
  }

  return {
    browser,
    os,
    device,
    userAgent
  };
};

/**
 * Get device info from request
 */
export const getDeviceInfo = (req: Request): DeviceInfo => {
  const userAgent = req.get("user-agent") || "";
  return parseUserAgent(userAgent);
};

/**
 * Generate a unique device identifier
 * Combination of IP + Browser + OS
 */
export const getDeviceFingerprint = (
  req: Request,
  ipAddress: string
): string => {
  const deviceInfo = getDeviceInfo(req);
  return `${ipAddress}_${deviceInfo.browser}_${deviceInfo.os}`.replace(
    /[^a-zA-Z0-9_]/g,
    "_"
  );
};

/**
 * Format device info for display
 * Example: "Chrome on Windows"
 */
export const formatDeviceInfo = (deviceInfo: DeviceInfo): string => {
  if (deviceInfo.browser === "Unknown" && deviceInfo.os === "Unknown") {
    return "Unknown Device";
  }

  if (deviceInfo.browser === "Unknown") {
    return deviceInfo.os;
  }

  if (deviceInfo.os === "Unknown") {
    return deviceInfo.browser;
  }

  return `${deviceInfo.browser} on ${deviceInfo.os}`;
};
