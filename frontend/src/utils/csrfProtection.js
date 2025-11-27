/**
 * CSRF Protection Utility
 * Generates and validates CSRF tokens for forms
 */

import { v4 as uuidv4 } from 'uuid';

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_EXPIRY = 'csrf_token_expiry';
const TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour

/**
 * Generate a new CSRF token
 * @returns {string} CSRF token
 */
export const generateCSRFToken = () => {
  // For now, generate locally. Ideally this comes from backend
  const token = uuidv4();
  const expiry = Date.now() + TOKEN_LIFETIME;
  
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  sessionStorage.setItem(CSRF_TOKEN_EXPIRY, expiry.toString());
  
  return token;
};

/**
 * Get current CSRF token (generate if not exists)
 * @returns {string} CSRF token
 */
export const getCSRFToken = () => {
  const token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  const expiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY);
  
  // Check if token exists and is not expired
  if (token && expiry && Date.now() < parseInt(expiry)) {
    return token;
  }
  
  // Generate new token if expired or doesn't exist
  return generateCSRFToken();
};

/**
 * Clear CSRF token
 */
export const clearCSRFToken = () => {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  sessionStorage.removeItem(CSRF_TOKEN_EXPIRY);
};

/**
 * Add CSRF token to request headers
 * @param {Object} headers - Existing headers
 * @returns {Object} Headers with CSRF token
 */
export const addCSRFHeader = (headers = {}) => {
  return {
    ...headers,
    'X-CSRF-Token': getCSRFToken()
  };
};

/**
 * Get CSRF token for form inclusion
 * @returns {Object} Object with csrf token field
 */
export const getCSRFFormField = () => {
  return {
    _csrf: getCSRFToken()
  };
};

export default {
  generateCSRFToken,
  getCSRFToken,
  clearCSRFToken,
  addCSRFHeader,
  getCSRFFormField
};
