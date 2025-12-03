import multer, { Multer } from "multer";
import sharp from "sharp";
import { logger } from "../common/logger";
import { env } from "../../config";

// Allowed MIME types for different photo types
const ALLOWED_MIME_TYPES = {
  profile: ["image/jpeg", "image/png", "image/webp"],
  governmentId: ["image/jpeg", "image/png"],
  document: ["application/pdf", "image/jpeg", "image/png"]
};

const ALLOWED_EXTENSIONS = {
  profile: [".jpg", ".jpeg", ".png", ".webp"],
  governmentId: [".jpg", ".jpeg", ".png"],
  document: [".pdf", ".jpg", ".jpeg", ".png"]
};

interface FileValidationOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

/**
 * Validate file signature (magic bytes) to prevent polyglot attacks
 */
function isValidFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signatures: { [key: string]: number[] } = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/webp": [0x52, 0x49, 0x46, 0x46],
    "application/pdf": [0x25, 0x50, 0x44, 0x46]
  };

  const expectedSig = signatures[mimeType];
  if (!expectedSig) return false;

  for (let i = 0; i < expectedSig.length; i++) {
    if (buffer[i] !== expectedSig[i]) return false;
  }

  return true;
}

/**
 * Check for suspicious content in file (polyglot attack detection)
 * Focus on code execution patterns, not common binary sequences
 */
function detectPolyglotAttack(buffer: Buffer): boolean {
  // Only check ASCII portions to avoid false positives in binary image data
  const ascii = buffer.toString("ascii", 0, Math.min(buffer.length, 1024));
  
  const suspiciousPatterns = [
    "<?php",
    "<%",
    "<script",
    "onclick=",
    "onerror=",
    "eval(",
    "exec(",
    "system(",
    "shell_exec(",
    "passthru("
  ];

  for (const pattern of suspiciousPatterns) {
    if (ascii.includes(pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Strip EXIF data from image buffer
 */
async function stripExifData(
  buffer: Buffer,
  mimeType: string
): Promise<Buffer> {
  try {
    const img = sharp(buffer, { failOnError: false });

    let processed: Buffer | null = null;
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
      processed = await img.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    } else if (mimeType === "image/png") {
      processed = await img.png().toBuffer();
    } else if (mimeType === "image/webp") {
      processed = await img.webp().toBuffer();
    } else {
      processed = await img.toBuffer();
    }

    if (!processed || processed.length < 200) {
      logger.warn(
        `Processed image buffer suspiciously small (${processed?.length}). Falling back to original buffer.`
      );
      return buffer;
    }

    return processed;
  } catch (error) {
    logger.warn(
      "Could not strip EXIF data using sharp, returning original buffer:",
      error
    );
    return buffer;
  }
}

/**
 * Sanitize filename to prevent directory traversal
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.\.\//g, "")
    .replace(/\.\.\\/g, "")
    .substring(0, 100);
}

/**
 * Create multer storage configuration for file validation
 */
function createMulterStorage(photoType: string = "profile") {
  return multer.memoryStorage();
}

/**
 * Create file filter for multer
 */
function createFileFilter(photoType: string = "profile") {
  const allowedMimeTypes =
    ALLOWED_MIME_TYPES[photoType as keyof typeof ALLOWED_MIME_TYPES] ||
    ALLOWED_MIME_TYPES.profile;

  return (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    // Validate MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      logger.warn(`Invalid MIME type for ${photoType}: ${file.mimetype}`);
      cb(
        new Error(
          `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`
        )
      );
      return;
    }

    // Validate file extension
    const fileExt = `.${file.originalname.split(".").pop()}`.toLowerCase();
    const allowedExts =
      ALLOWED_EXTENSIONS[photoType as keyof typeof ALLOWED_EXTENSIONS] ||
      ALLOWED_EXTENSIONS.profile;
    if (!allowedExts.includes(fileExt)) {
      logger.warn(`Invalid file extension for ${photoType}: ${fileExt}`);
      cb(
        new Error(`Invalid file extension. Allowed: ${allowedExts.join(", ")}`)
      );
      return;
    }

    cb(null, true);
  };
}

/**
 * Validate uploaded file with comprehensive checks
 */
export async function validateUploadedFile(
  file: Express.Multer.File,
  options: FileValidationOptions = {}
): Promise<{ valid: boolean; error?: string; cleanBuffer?: Buffer }> {
  const maxSize = options.maxSize || env.MAX_FILE_SIZE;
  const allowedMimeTypes =
    options.allowedMimeTypes || ALLOWED_MIME_TYPES.profile;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`
    };
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`
    };
  }

  // Validate file signature
  if (!isValidFileSignature(file.buffer, file.mimetype)) {
    return {
      valid: false,
      error: "Invalid file signature. File may be corrupted or tampered."
    };
  }

  // Detect polyglot attacks
  if (detectPolyglotAttack(file.buffer)) {
    return {
      valid: false,
      error: "Suspicious content detected in file. Upload rejected."
    };
  }

  //   // Check for minimum dimensions for images
  //   if (file.mimetype.startsWith("image/")) {
  //     if (file.size < 1000) {
  //       return {
  //         valid: false,
  //         error: "Image file is too small"
  //       };
  //     }
  //   }

  // Strip EXIF data for images
  let cleanBuffer = file.buffer;
  if (file.mimetype.startsWith("image/")) {
    try {
      cleanBuffer = await stripExifData(file.buffer, file.mimetype);
    } catch (error) {
      logger.warn("Error stripping EXIF data:", error);
      // Continue with original buffer if EXIF stripping fails
      cleanBuffer = file.buffer;
    }
  }

  return {
    valid: true,
    cleanBuffer
  };
}

/**
 * Create multer instance for profile photos
 */
export function createProfilePhotoUpload(): Multer {
  return multer({
    storage: createMulterStorage("profile"),
    fileFilter: createFileFilter("profile"),
    limits: {
      fileSize: env.MAX_FILE_SIZE,
      files: 1
    }
  });
}

/**
 * Create multer instance for government ID
 */
export function createGovernmentIdUpload(): Multer {
  return multer({
    storage: createMulterStorage("governmentId"),
    fileFilter: createFileFilter("governmentId"),
    limits: {
      fileSize: env.MAX_FILE_SIZE,
      files: 1
    }
  });
}

/**
 * Create multer instance for multiple files
 */
export function createMultiplePhotosUpload(maxFiles: number = 10): Multer {
  return multer({
    storage: createMulterStorage("profile"),
    fileFilter: createFileFilter("profile"),
    limits: {
      fileSize: env.MAX_FILE_SIZE,
      files: maxFiles
    }
  });
}

export default {
  validateUploadedFile,
  createProfilePhotoUpload,
  createGovernmentIdUpload,
  createMultiplePhotosUpload,
  sanitizeFilename
};
