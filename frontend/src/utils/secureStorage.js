/**
 * Secure Storage Service
 * Handles token storage with session timeout and security features
 */

import Cookies from 'js-cookie';

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const TOKEN_EXPIRY_KEY = 'token_expiry';
const LAST_ACTIVITY_KEY = 'last_activity';

/**
 * Store authentication token securely
 * Note: For production, tokens should be in httpOnly cookies (backend implementation)
 * This is a frontend fallback with additional security measures
 * 
 * @param {string} token - Authentication token
 * @param {boolean} rememberMe - Whether to persist token
 */
export const setAuthToken = (token, rememberMe = false) => {
  if (!token) return;
  
  const now = Date.now();
  const expiry = now + SESSION_TIMEOUT;
  
  try {
    // Store only in cookies (httpOnly should be set by backend)
    Cookies.set('authToken', token, {
      expires: rememberMe ? 7 : undefined, // 7 days or session
      secure: window.location.protocol === 'https:',
      sameSite: 'strict'
    });
    
    // Store metadata in sessionStorage for activity tracking only
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
};

/**
 * Get authentication token with expiry check
 * @returns {string|null} Token if valid, null if expired
 */
export const getAuthToken = () => {
  try {
    // Get token from cookie only
    const token = Cookies.get('authToken');
    
    if (!token) return null;
    
    // Check if token is expired based on sessionStorage metadata
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
    const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    
    if (expiry && Date.now() > parseInt(expiry)) {
      // Token expired
      clearAuthToken();
      return null;
    }
    
    // Check for inactivity timeout
    if (lastActivity && Date.now() - parseInt(lastActivity) > SESSION_TIMEOUT) {
      // Session timed out due to inactivity
      clearAuthToken();
      return null;
    }
    
    // Update last activity time
    updateActivity();
    
    return token;
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
};

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
  } catch (error) {
    console.error('Failed to update activity:', error);
  }
};

/**
 * Clear authentication token and related data
 */
export const clearAuthToken = () => {
  try {
    // Clear metadata from sessionStorage
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    
    // Clear cookie
    Cookies.remove('authToken');
    
    // Clear any other sensitive data
    sessionStorage.removeItem('gender');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userRole');
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
};

/**
 * Check if user session is active
 * @returns {boolean} True if session is valid
 */
export const isSessionActive = () => {
  const token = getAuthToken();
  return token !== null;
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
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  
  const handleActivity = () => {
    if (isSessionActive()) {
      updateActivity();
    }
  };
  
  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, { passive: true });
  });
  
  // Check session expiry every minute
  const interval = setInterval(() => {
    if (!isSessionActive() && onSessionExpired) {
      clearInterval(interval);
      onSessionExpired();
    }
  }, 60000); // Check every minute
  
  // Cleanup function
  return () => {
    activityEvents.forEach(event => {
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
      encrypted: false // Placeholder for future encryption
    };
    
    storage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to store secure item:', error);
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
    console.error('Failed to retrieve secure item:', error);
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
    console.error('Failed to remove secure item:', error);
  }
};

export default {
  setAuthToken,
  getAuthToken,
  updateActivity,
  clearAuthToken,
  isSessionActive,
  getSessionTimeRemaining,
  initSessionTracking,
  setSecureItem,
  getSecureItem,
  removeSecureItem
};
