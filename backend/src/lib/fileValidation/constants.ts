export const ALLOWED_MIME_TYPES = {
  profile: ["image/jpeg", "image/png", "image/webp"],
  governmentId: ["image/jpeg", "image/png"],
  document: ["application/pdf", "image/jpeg", "image/png"]
};

export const ALLOWED_EXTENSIONS = {
  profile: [".jpg", ".jpeg", ".png", ".webp"],
  governmentId: [".jpg", ".jpeg", ".png"],
  document: [".pdf", ".jpg", ".jpeg", ".png"]
};

export const FILE_SIZE_LIMITS = {
  profile: 2 * 1024 * 1024,
  governmentId: 2 * 1024 * 1024,
  document: 5 * 1024 * 1024
};

export const IMAGE_DIMENSION_CONSTRAINTS = {
  minWidth: 200,
  minHeight: 200,
  maxWidth: 4000,
  maxHeight: 4000
};

export const FILE_SIGNATURES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "application/pdf": [0x25, 0x50, 0x44, 0x46]
};

export const MALICIOUS_PATTERNS = [
  Buffer.from("<?php"),
  Buffer.from("<%"),
  Buffer.from("javascript:"),
  Buffer.from("<script"),
  Buffer.from("onclick"),
  Buffer.from("onerror"),
  Buffer.from("eval("),
  Buffer.from("exec("),
  Buffer.from("system("),
  Buffer.from("<iframe"),
  Buffer.from("<object"),
  Buffer.from("<embed"),
  Buffer.from("onload=")
];
