/**
 * CSRF Protection Utility
 * Generates and validates CSRF tokens for forms
 */

import Cookies from "js-cookie";

const CSRF_TOKEN_KEY = "csrf_token";

export const getCSRFToken = () => {
  const cookieToken = Cookies.get(CSRF_TOKEN_KEY);
  return cookieToken || null;
};

/**
 * Add CSRF token to request headers
 * @param {Object} headers - Existing headers
 * @returns {Object} Headers with CSRF token
 */
export const addCSRFHeader = (headers = {}) => {
  const token = getCSRFToken();
  if (!token) return headers;

  return {
    ...headers,
    "X-CSRF-Token": token,
  };
};

/**
 * Get CSRF token for form inclusion
 * @returns {Object} Object with csrf token field
 */
export const getCSRFFormField = () => {
  return {
    _csrf: getCSRFToken(),
  };
};

export default {
  getCSRFToken,
  addCSRFHeader,
  getCSRFFormField,
};
