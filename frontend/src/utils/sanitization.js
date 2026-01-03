import DOMPurify from 'dompurify';
import validator from 'validator';
export const sanitizeHTML = (dirty, options = {}) => {
  if (!dirty || typeof dirty !== 'string') return '';
  const defaultConfig = {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    ...options
  };
  return DOMPurify.sanitize(dirty, defaultConfig);
};
export const sanitizeText = input => {
  if (!input || typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  }).trim();
};
export const sanitizeEmail = email => {
  if (!email || typeof email !== 'string') return '';
  const sanitized = sanitizeText(email).toLowerCase();
  return sanitized.replace(/[<>'\"]/g, '').trim();
};
export const sanitizePhone = phone => {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
};
export const sanitizeName = name => {
  if (!name || typeof name !== 'string') return '';
  const sanitized = sanitizeText(name);
  let cleaned = sanitized.replace(/[^a-zA-Z\s\-'.]/g, '').trim();
  cleaned = cleaned.replace(/\b\w/g, char => char.toUpperCase());
  return cleaned;
};
export const sanitizeAlphanumeric = input => {
  if (!input || typeof input !== 'string') return '';
  const sanitized = sanitizeText(input);
  return sanitized.replace(/[^a-zA-Z0-9]/g, '');
};
export const sanitizeURL = url => {
  if (!url || typeof url !== 'string') return '';
  const sanitized = sanitizeText(url).trim();
  return sanitized.replace(/[<>'\"]/g, '');
};
export const sanitizePassword = password => {
  if (!password || typeof password !== 'string') return '';
  return DOMPurify.sanitize(password, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};
export const sanitizeCountryCode = code => {
  if (!code || typeof code !== 'string') return '';
  return code.replace(/[^\d+]/g, '').trim();
};
export const sanitizeString = input => {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim();
};
export const sanitizeObject = obj => {
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
export const validateAndSanitizeForm = (formData, schema = {}) => {
  const sanitized = {};
  const errors = {};
  for (const field in formData) {
    const value = formData[field];
    const rules = schema[field] || {
      type: 'text'
    };
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
  return {
    sanitized,
    errors
  };
};
export const escapeRegex = string => {
  if (!string || typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
export const containsXSSPatterns = input => {
  if (!input || typeof input !== 'string') return false;
  const xssPatterns = [/<script[\s\S]*?>[\s\S]*?<\/script>/gi, /javascript:/gi, /on\w+\s*=/gi, /<iframe/gi, /eval\(/gi, /expression\(/gi, /<embed/gi, /<object/gi, /vbscript:/gi, /data:text\/html/gi];
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