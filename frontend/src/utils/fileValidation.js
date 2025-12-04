/**
 * File Upload Validation Utilities
 * Comprehensive security checks for file uploads
 */

/**
 * File type magic numbers (first bytes) for validation
 */
const FILE_SIGNATURES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0],
    [0xFF, 0xD8, 0xFF, 0xE1],
    [0xFF, 0xD8, 0xFF, 0xE2],
    [0xFF, 0xD8, 0xFF, 0xE3],
    [0xFF, 0xD8, 0xFF, 0xE8]
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46] // RIFF
  ],
  'application/pdf': [
    [0x25, 0x50, 0x44, 0x46] // %PDF
  ]
};

/**
 * Allowed MIME types for different upload contexts
 */
export const ALLOWED_MIME_TYPES = {
  PROFILE_PHOTO: ['image/jpeg', 'image/png', 'image/webp'],
  GOVERNMENT_ID: ['image/jpeg', 'image/png'], // Removed PDF for security
  DOCUMENT: ['application/pdf', 'image/jpeg', 'image/png']
};

/**
 * Maximum file sizes (in bytes)
 */
export const MAX_FILE_SIZES = {
  IMAGE: 2 * 1024 * 1024,      // 2MB
  DOCUMENT: 5 * 1024 * 1024,   // 5MB
  PROFILE_PHOTO: 2 * 1024 * 1024 // 2MB
};

/**
 * Read file header bytes
 * @param {File} file - File to read
 * @param {number} numBytes - Number of bytes to read
 * @returns {Promise<Uint8Array>} First bytes of file
 */
const readFileHeader = (file, numBytes = 8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target.result);
      resolve(arr);
    };
    
    reader.onerror = reject;
    
    const blob = file.slice(0, numBytes);
    reader.readAsArrayBuffer(blob);
  });
};

/**
 * Verify file signature matches declared MIME type
 * @param {File} file - File to validate
 * @returns {Promise<boolean>} True if signature is valid
 */
export const validateFileSignature = async (file) => {
  try {
    const header = await readFileHeader(file, 8);
    const signatures = FILE_SIGNATURES[file.type];
    
    if (!signatures) {
      console.warn('Unknown file type:', file.type);
      return false;
    }
    
    // Check if header matches any known signature for this type
    return signatures.some(signature => {
      return signature.every((byte, index) => header[index] === byte);
    });
  } catch (error) {
    console.error('Error validating file signature:', error);
    return false;
  }
};

/**
 * Validate file extension
 * @param {string} filename - File name
 * @param {string[]} allowedExtensions - Allowed extensions
 * @returns {boolean} True if extension is valid
 */
export const validateFileExtension = (filename, allowedExtensions) => {
  if (!filename || !allowedExtensions) return false;
  
  const ext = filename.split('.').pop().toLowerCase();
  return allowedExtensions.includes(`.${ext}`);
};

/**
 * Sanitize filename to prevent path traversal
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  if (!filename) return 'unnamed';
  
  // Remove path separators and special characters
  let sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Remove multiple consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');
  
  // Ensure filename is not too long
  if (sanitized.length > 100) {
    const ext = sanitized.split('.').pop();
    sanitized = sanitized.substring(0, 95) + '.' + ext;
  }
  
  return sanitized;
};

/**
 * Validate image dimensions
 * @param {File} file - Image file
 * @param {Object} constraints - {minWidth, maxWidth, minHeight, maxHeight}
 * @returns {Promise<{valid: boolean, dimensions: {width, height}}>}
 */
export const validateImageDimensions = (file, constraints = {}) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ valid: false, dimensions: null });
      return;
    }
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const { width, height } = img;
      const {
        minWidth = 0,
        maxWidth = Infinity,
        minHeight = 0,
        maxHeight = Infinity
      } = constraints;
      
      const valid = 
        width >= minWidth &&
        width <= maxWidth &&
        height >= minHeight &&
        height <= maxHeight;
      
      resolve({ valid, dimensions: { width, height } });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, dimensions: null });
    };
    
    img.src = url;
  });
};

/**
 * Check if file might be a malicious polyglot
 * @param {File} file - File to check
 * @returns {Promise<boolean>} True if file appears suspicious
 */
export const checkForPolyglot = async (file) => {
  try {
    // Read more bytes to check for embedded scripts
    const header = await readFileHeader(file, 1024);
    const text = new TextDecoder().decode(header);
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /<iframe/i,
      /eval\(/i,
      /<object/i,
      /<embed/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(text));
  } catch (error) {
    console.error('Error checking for polyglot:', error);
    return true; // Assume suspicious if check fails
  }
};

/**
 * Comprehensive file validation
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
export const validateFile = async (file, options = {}) => {
  const errors = [];
  
  const {
    allowedTypes = ALLOWED_MIME_TYPES.PROFILE_PHOTO,
    maxSize = MAX_FILE_SIZES.IMAGE,
    checkSignature = true,
    checkDimensions = false,
    dimensionConstraints = {},
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  } = options;
  
  // Check if file exists
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${(maxSize / (1024 * 1024)).toFixed(2)}MB`);
  }
  
  if (file.size === 0) {
    errors.push('File is empty');
  }
  
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // Check file extension
  if (!validateFileExtension(file.name, allowedExtensions)) {
    errors.push('Invalid file extension');
  }
  
  // Check file signature (magic numbers)
  if (checkSignature && allowedTypes.includes(file.type)) {
    const signatureValid = await validateFileSignature(file);
    if (!signatureValid) {
      errors.push('File signature does not match declared type (possible spoofing)');
    }
  }
  
  // Check for polyglot attacks
  const isPolyglot = await checkForPolyglot(file);
  if (isPolyglot) {
    errors.push('File contains suspicious content');
  }
  
  // Check image dimensions if required
  if (checkDimensions && file.type.startsWith('image/')) {
    const { valid, dimensions } = await validateImageDimensions(file, dimensionConstraints);
    if (!valid) {
      errors.push(`Image dimensions ${dimensions?.width}x${dimensions?.height} do not meet requirements`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate profile photo specifically
 * @param {File} file - Photo file
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
export const validateProfilePhoto = async (file) => {
  return validateFile(file, {
    allowedTypes: ALLOWED_MIME_TYPES.PROFILE_PHOTO,
    maxSize: MAX_FILE_SIZES.PROFILE_PHOTO,
    checkSignature: true,
    checkDimensions: true,
    dimensionConstraints: {
      minWidth: 200,
      minHeight: 200,
      maxWidth: 4000,
      maxHeight: 4000
    },
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  });
};

/**
 * Validate government ID document
 * @param {File} file - Document file
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
export const validateGovernmentID = async (file) => {
  return validateFile(file, {
    allowedTypes: ALLOWED_MIME_TYPES.GOVERNMENT_ID, // No PDF
    maxSize: MAX_FILE_SIZES.IMAGE,
    checkSignature: true,
    checkDimensions: true,
    dimensionConstraints: {
      minWidth: 300,
      minHeight: 200
    },
    allowedExtensions: ['.jpg', '.jpeg', '.png']
  });
};

/**
 * Create a secure FormData for file upload
 * @param {File} file - File to upload
 * @param {Object} additionalData - Additional form data
 * @returns {FormData} Secure FormData object
 */
export const createSecureFormData = (file, additionalData = {}) => {
  const formData = new FormData();
  
  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name);
  
  // Create new file with sanitized name
  const secureFile = new File([file], sanitizedFilename, {
    type: file.type,
    lastModified: file.lastModified
  });
  
  formData.append('file', secureFile);
  
  // Add additional data
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key]);
  });
  
  return formData;
};

export default {
  validateFile,
  validateProfilePhoto,
  validateGovernmentID,
  validateFileSignature,
  validateFileExtension,
  validateImageDimensions,
  sanitizeFilename,
  checkForPolyglot,
  createSecureFormData,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES
};
