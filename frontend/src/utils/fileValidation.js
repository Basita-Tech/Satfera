const FILE_SIGNATURES = {
  "image/jpeg": [[0xff, 0xd8, 0xff, 0xe0], [0xff, 0xd8, 0xff, 0xe1], [0xff, 0xd8, 0xff, 0xe2], [0xff, 0xd8, 0xff, 0xe3], [0xff, 0xd8, 0xff, 0xe8]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]]
};
export const ALLOWED_MIME_TYPES = {
  PROFILE_PHOTO: ["image/jpeg", "image/png", "image/webp"],
  GOVERNMENT_ID: ["image/jpeg", "image/png", "application/pdf"],
  DOCUMENT: ["application/pdf", "image/jpeg", "image/png"]
};
export const MAX_FILE_SIZES = {
  IMAGE: 2 * 1024 * 1024,
  DOCUMENT: 5 * 1024 * 1024,
  PROFILE_PHOTO: 2 * 1024 * 1024,
  GOVERNMENT_ID_PDF: 5 * 1024 * 1024,
  GOVERNMENT_ID_IMAGE: 2 * 1024 * 1024
};
const readFileHeader = (file, numBytes = 8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const arr = new Uint8Array(e.target.result);
      resolve(arr);
    };
    reader.onerror = reject;
    const blob = file.slice(0, numBytes);
    reader.readAsArrayBuffer(blob);
  });
};
export const validateFileSignature = async file => {
  try {
    const header = await readFileHeader(file, 8);
    const signatures = FILE_SIGNATURES[file.type];
    if (!signatures) {
      console.warn("Unknown file type:", file.type);
      return false;
    }
    return signatures.some(signature => {
      return signature.every((byte, index) => header[index] === byte);
    });
  } catch (error) {
    console.error("Error validating file signature:", error);
    return false;
  }
};
export const validateFileExtension = (filename, allowedExtensions) => {
  if (!filename || !allowedExtensions) return false;
  const ext = filename.split(".").pop().toLowerCase();
  return allowedExtensions.includes(`.${ext}`);
};
export const sanitizeFilename = filename => {
  if (!filename) return "unnamed";
  let sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  sanitized = sanitized.replace(/_+/g, "_");
  if (sanitized.length > 100) {
    const ext = sanitized.split(".").pop();
    sanitized = sanitized.substring(0, 95) + "." + ext;
  }
  return sanitized;
};
export const validateImageDimensions = (file, constraints = {}) => {
  return new Promise(resolve => {
    if (!file.type.startsWith("image/")) {
      resolve({
        valid: false,
        dimensions: null
      });
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const {
        width,
        height
      } = img;
      const {
        minWidth = 0,
        maxWidth = Infinity,
        minHeight = 0,
        maxHeight = Infinity
      } = constraints;
      const valid = width >= minWidth && width <= maxWidth && height >= minHeight && height <= maxHeight;
      resolve({
        valid,
        dimensions: {
          width,
          height
        }
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        dimensions: null
      });
    };
    img.src = url;
  });
};
export const checkForPolyglot = async file => {
  try {
    const header = await readFileHeader(file, 1024);
    const text = new TextDecoder().decode(header);
    const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+=/i, /<iframe/i, /eval\(/i, /<object/i, /<embed/i];
    return suspiciousPatterns.some(pattern => pattern.test(text));
  } catch (error) {
    console.error("Error checking for polyglot:", error);
    return true;
  }
};
export const validateFile = async (file, options = {}) => {
  const errors = [];
  const {
    allowedTypes = ALLOWED_MIME_TYPES.PROFILE_PHOTO,
    maxSize = MAX_FILE_SIZES.IMAGE,
    checkSignature = true,
    checkDimensions = false,
    dimensionConstraints = {},
    allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"]
  } = options;
  if (!file) {
    errors.push("No file provided");
    return {
      valid: false,
      errors
    };
  }
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${(maxSize / (1024 * 1024)).toFixed(2)}MB`);
  }
  if (file.size === 0) {
    errors.push("File is empty");
  }
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  if (!validateFileExtension(file.name, allowedExtensions)) {
    errors.push("Invalid file extension");
  }
  if (checkSignature && allowedTypes.includes(file.type)) {
    const signatureValid = await validateFileSignature(file);
    if (!signatureValid) {
      errors.push("File signature does not match declared type (possible spoofing)");
    }
  }
  const isPolyglot = await checkForPolyglot(file);
  if (isPolyglot) {
    errors.push("File contains suspicious content");
  }
  if (checkDimensions && file.type.startsWith("image/")) {
    const {
      valid,
      dimensions
    } = await validateImageDimensions(file, dimensionConstraints);
    if (!valid) {
      errors.push(`Image dimensions ${dimensions?.width}x${dimensions?.height} do not meet requirements`);
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
};
export const validateProfilePhoto = async file => {
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
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"]
  });
};
export const validateGovernmentID = async file => {
  const isPdf = file.type === "application/pdf";
  return validateFile(file, {
    allowedTypes: ALLOWED_MIME_TYPES.GOVERNMENT_ID,
    maxSize: isPdf ? MAX_FILE_SIZES.GOVERNMENT_ID_PDF : MAX_FILE_SIZES.GOVERNMENT_ID_IMAGE,
    checkSignature: true,
    checkDimensions: !isPdf,
    dimensionConstraints: {
      minWidth: 300,
      minHeight: 200
    },
    allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"]
  });
};
export const createSecureFormData = (file, additionalData = {}) => {
  const formData = new FormData();
  const sanitizedFilename = sanitizeFilename(file.name);
  const secureFile = new File([file], sanitizedFilename, {
    type: file.type,
    lastModified: file.lastModified
  });
  formData.append("file", secureFile);
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