import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config";
import { logger } from "../common";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

export interface UploadResponse {
  url: string;
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

function getFileType(fileBuffer: Buffer, filename: string): "image" | "pdf" {
  if (fileBuffer.length >= 4) {
    const pdfSignature = [0x25, 0x50, 0x44, 0x46];
    if (pdfSignature.every((byte, index) => fileBuffer[index] === byte)) {
      return "pdf";
    }
  }

  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") {
    return "pdf";
  }

  return "image";
}

/**
 * Upload a file to Cloudinary
 * @param fileBuffer - File buffer from multer
 * @param filename - Original filename
 * @param folder - Cloudinary folder path
 * @returns Upload response with URL and metadata
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  filename: string,
  folder: string
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const fileType = getFileType(fileBuffer, filename);
    const isPdf = fileType === "pdf";

    const uploadOptions: any = {
      folder: `satfera/${folder}`,
      resource_type: "auto",
      unique_filename: true,
      overwrite: false
    };

    if (isPdf) {
      uploadOptions.flags = "attachment";
      uploadOptions.format = "pdf";
      uploadOptions.use_filename = true;
      const baseFilename = filename.replace(/\.pdf$/i, "");
      uploadOptions.public_id = `${baseFilename}_${Date.now()}`;
    } else {
      uploadOptions.use_filename = false;
      uploadOptions.quality = "auto:good";
      uploadOptions.fetch_format = "auto";
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload error:", error);
          reject(
            new Error(`Failed to upload file to Cloudinary: ${error.message}`)
          );
        } else if (result) {
          logger.info(
            `File uploaded to Cloudinary: ${result.public_id} (${isPdf ? "PDF" : "Image"})`
          );
          resolve({
            url: result.url,
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: isPdf ? "pdf" : result.format,
            width: result.width || 0,
            height: result.height || 0,
            bytes: result.bytes
          });
        } else {
          reject(new Error("Upload completed but no result returned"));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete a file from Cloudinary
 * @param publicId - Cloudinary public ID of the file
 * @returns Success status
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    let result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "not found") {
      result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw"
      });
    }

    if (result.result === "ok") {
      logger.info(`File deleted from Cloudinary: ${publicId}`);
      return true;
    } else {
      logger.warn(`Failed to delete file from Cloudinary: ${publicId}`);
      return false;
    }
  } catch (error) {
    logger.error(`Cloudinary delete error for ${publicId}:`, error);
    throw new Error(
      `Failed to delete file from Cloudinary: ${(error as Error).message}`
    );
  }
}

/**
 * Get file info from Cloudinary
 * @param publicId - Cloudinary public ID
 * @returns File metadata
 */
export async function getCloudinaryFileInfo(publicId: string) {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    logger.error(`Error getting file info from Cloudinary: ${publicId}`, error);
    throw new Error(`Failed to get file info: ${(error as Error).message}`);
  }
}

/**
 * Extract public ID from secure URL
 * @param secureUrl - Cloudinary secure URL
 * @returns Public ID
 */
export function extractPublicIdFromUrl(secureUrl: string): string {
  try {
    const match = secureUrl.match(
      /\/(?:image|raw|video|auto)\/upload\/(?:v\d+\/)?(.*?)(?:\?|$)/
    );
    if (match && match[1]) {
      return match[1].replace(/\.[^.]+$/, "");
    }
    return "";
  } catch (error) {
    logger.error("Error extracting public ID from URL:", error);
    return "";
  }
}

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinaryFileInfo,
  extractPublicIdFromUrl
};
