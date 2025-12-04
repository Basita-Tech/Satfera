/**
 * Secure Storage Service
 * Handles token storage with session timeout and security features
 */

// Session timeout: Match backend cookie maxAge (24 hours)
// Backend cookie: 24 * 60 * 60 * 1000 (1 day)
// Frontend will track activity and auto-logout after 24 hours of inactivity
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const TOKEN_EXPIRY_KEY = "token_expiry";
const LAST_ACTIVITY_KEY = "last_activity";

/**
 * Store authentication token securely
 * Note: For production, tokens should be in httpOnly cookies (backend implementation)
 * This is a frontend fallback with additional security measures
 *
 * @param {string} token - Authentication token
 * @param {boolean} rememberMe - Whether to persist token
 */

/**
 * Get authentication token with expiry check
 * @returns {string|null} Token if valid, null if expired
 */

/**
 * Update last activity timestamp
 */
export const updateActivity = () => {
  const now = Date.now();
  const newExpiry = now + SESSION_TIMEOUT;

  try {
    // Update activity metadata in sessionStorage only
    sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, newExpiry.toString());
    
    // Debug: Log every 100th activity update to avoid console spam
    if (Math.random() < 0.01) {
      const hoursRemaining = ((newExpiry - now) / (1000 * 60 * 60)).toFixed(1);
      console.log(`[Session] Activity updated. Session expires in ${hoursRemaining} hours`);
    }
  } catch (error) {
    console.error("Failed to update activity:", error);
  }
};

/**
 * Clear authentication token and related data
 */
export const clearClientAuthData = () => {
  try {
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    // Clear any other sensitive data
    sessionStorage.removeItem("gender");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("userRole");
  } catch (error) {
    console.error("Failed to clear client auth data:", error);
  }
};

/**
 * Check if user session is active
 * @returns {boolean} True if session is valid
 */
export const isSessionActive = () => {
  const remaining = getSessionTimeRemaining();
  return remaining > 0;
};

/**
 * Get time until session expires (in milliseconds)
 * @returns {number} Time remaining in milliseconds, or 0 if expired
 */
export const getSessionTimeRemaining = () => {
  try {
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);

    if (!expiry) return 0;

    const remaining = parseInt(expiry) - Date.now();
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Initialize session activity tracking
 * Call this in your root component to track user activity
 */
export const initSessionTracking = (onSessionExpired) => {
  // Track user activity events
  const activityEvents = [
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
    "click",
  ];

  const handleActivity = () => {
    if (isSessionActive()) {
      updateActivity();
    }
  };

  activityEvents.forEach((event) => {
    document.addEventListener(event, handleActivity, { passive: true });
  });

  // Check session expiry every 5 minutes (reduced frequency since timeout is now 24 hours)
  const interval = setInterval(() => {
    if (!isSessionActive() && onSessionExpired) {
      console.log('[Session] Session expired, logging out user');
      clearInterval(interval);
      onSessionExpired();
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  // Cleanup function
  return () => {
    activityEvents.forEach((event) => {
      document.removeEventListener(event, handleActivity);
    });
    clearInterval(interval);
  };
};

/**
 * Store sensitive data with encryption flag
 * Note: This is still not truly encrypted, just marked
 * Real encryption requires a proper encryption library
 *
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @param {boolean} useSession - Use sessionStorage (default) or localStorage
 */
export const setSecureItem = (key, value, useSession = true) => {
  const storage = useSession ? sessionStorage : localStorage;

  try {
    const data = {
      value: value,
      timestamp: Date.now(),
      encrypted: false, // Placeholder for future encryption
    };

    storage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to store secure item:", error);
  }
};

/**
 * Retrieve securely stored data
 * @param {string} key - Storage key
 * @returns {any} Stored value or null
 */
export const getSecureItem = (key) => {
  try {
    // Try session first
    let data = sessionStorage.getItem(key);

    if (!data) {
      data = localStorage.getItem(key);
    }

    if (!data) return null;

    const parsed = JSON.parse(data);
    return parsed.value;
  } catch (error) {
    console.error("Failed to retrieve secure item:", error);
    return null;
  }
};

/**
 * Remove securely stored data
 * @param {string} key - Storage key
 */
export const removeSecureItem = (key) => {
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to remove secure item:", error);
  }
};

export default {
  updateActivity,
  clearClientAuthData,
  isSessionActive,
  getSessionTimeRemaining,
  initSessionTracking,
  setSecureItem,
  getSecureItem,
  removeSecureItem,
};
