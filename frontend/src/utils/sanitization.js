/**
 * Input Sanitization Utilities
 * Comprehensive XSS protection and input validation
 */

import DOMPurify from 'dompurify';
import validator from 'validator';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - Untrusted input
 * @param {Object} options - DOMPurify configuration options
 * @returns {string} Sanitized output
 */
export const sanitizeHTML = (dirty, options = {}) => {
  if (!dirty || typeof dirty !== 'string') return '';
  
  const defaultConfig = {
    ALLOWED_TAGS: [], // No HTML tags by default
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    ...options
  };
  
  return DOMPurify.sanitize(dirty, defaultConfig);
};

/**
 * Sanitize text input (removes all HTML, keeps text only)
 * @param {string} input - User input
 * @returns {string} Sanitized text
 */
export const sanitizeText = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove all HTML tags and trim
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  }).trim();
};

/**
 * Sanitize email (removes HTML/dangerous chars, converts to lowercase)
 * Note: Returns sanitized string even if invalid format (validation is separate)
 * @param {string} email - Email input
 * @returns {string} Sanitized email
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  
  // Sanitize text and convert to lowercase
  const sanitized = sanitizeText(email).toLowerCase();
  
  // Remove any remaining dangerous characters while preserving email structure
  return sanitized.replace(/[<>'\"]/g, '').trim();
};

/**
 * Sanitize phone number
 * @param {string} phone - Phone input
 * @returns {string} Sanitized phone
 */
export const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove all non-digit and non-plus characters
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
};

/**
 * Sanitize name fields (allows letters, spaces, hyphens, apostrophes)
 * @param {string} name - Name input
 * @returns {string} Sanitized name
 */
export const sanitizeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  const sanitized = sanitizeText(name);
  
  // Allow only letters, spaces, hyphens, apostrophes, and dots
  let cleaned = sanitized.replace(/[^a-zA-Z\s\-'.]/g, '').trim();
  
  // Capitalize first letter of each word
  cleaned = cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  
  return cleaned;
};

/**
 * Sanitize alphanumeric input
 * @param {string} input - Alphanumeric input
 * @returns {string} Sanitized output
 */
export const sanitizeAlphanumeric = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  const sanitized = sanitizeText(input);
  return sanitized.replace(/[^a-zA-Z0-9]/g, '');
};

/**
 * Sanitize URL (removes HTML/dangerous chars)
 * Note: Returns sanitized string even if invalid format (validation is separate)
 * @param {string} url - URL input
 * @returns {string} Sanitized URL
 */
export const sanitizeURL = (url) => {
  if (!url || typeof url !== 'string') return '';
  
  const sanitized = sanitizeText(url).trim();
  
  // Remove dangerous characters
  return sanitized.replace(/[<>'\"]/g, '');
};

/**
 * Sanitize password (no HTML, preserve special chars)
 * @param {string} password - Password input
 * @returns {string} Sanitized password
 */
export const sanitizePassword = (password) => {
  if (!password || typeof password !== 'string') return '';
  
  // Remove HTML tags but keep special characters for password
  return DOMPurify.sanitize(password, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

/**
 * Sanitize country code (e.g., +91, +1, +44)
 * @param {string} code - Country code input
 * @returns {string} Sanitized country code
 */
export const sanitizeCountryCode = (code) => {
  if (!code || typeof code !== 'string') return '';
  
  // Only allow + and digits for country codes
  return code.replace(/[^\d+]/g, '').trim();
};

/**
 * Sanitize generic string input
 * @param {string} input - The input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Sanitize object - recursively sanitize all string properties
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeText(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
};

/**
 * Validate and sanitize form data
 * @param {Object} formData - Form data object
 * @param {Object} schema - Validation schema
 * @returns {Object} { sanitized, errors }
 */
export const validateAndSanitizeForm = (formData, schema = {}) => {
  const sanitized = {};
  const errors = {};
  
  for (const field in formData) {
    const value = formData[field];
    const rules = schema[field] || { type: 'text' };
    
    switch (rules.type) {
      case 'email':
        const email = sanitizeEmail(value);
        sanitized[field] = email;
        break;
        
      case 'phone':
        sanitized[field] = sanitizePhone(value);
        break;
        
      case 'name':
        sanitized[field] = sanitizeName(value);
        if (rules.required && !sanitized[field]) {
          errors[field] = `${field} is required`;
        }
        break;
        
      case 'url':
        const url = sanitizeURL(value);
        sanitized[field] = url;
        break;
        
      case 'password':
        sanitized[field] = sanitizePassword(value);
        if (rules.minLength && sanitized[field].length < rules.minLength) {
          errors[field] = `Password must be at least ${rules.minLength} characters`;
        }
        break;
        
      case 'alphanumeric':
        sanitized[field] = sanitizeAlphanumeric(value);
        break;
        
      default:
        sanitized[field] = sanitizeText(value);
    }
  }
  
  return { sanitized, errors };
};

/**
 * Escape special regex characters in user input
 * @param {string} string - User input
 * @returns {string} Escaped string
 */
export const escapeRegex = (string) => {
  if (!string || typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Check if string contains potential XSS patterns
 * @param {string} input - Input to check
 * @returns {boolean} True if suspicious patterns detected
 */
export const containsXSSPatterns = (input) => {
  if (!input || typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /eval\(/gi,
    /expression\(/gi,
    /<embed/gi,
    /<object/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeName,
  sanitizeAlphanumeric,
  sanitizeURL,
  sanitizePassword,
  sanitizeCountryCode,
  sanitizeString,
  sanitizeObject,
  validateAndSanitizeForm,
  escapeRegex,
  containsXSSPatterns
};
