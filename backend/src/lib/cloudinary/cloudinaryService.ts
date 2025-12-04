import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config";
import { logger } from "../common";

// Configure Cloudinary
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
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `satfera/${folder}`,
        resource_type: "auto",
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        quality: "auto:good",
        fetch_format: "auto"
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload error:", error);
          reject(
            new Error(`Failed to upload file to Cloudinary: ${error.message}`)
          );
        } else if (result) {
          logger.info(`File uploaded to Cloudinary: ${result.public_id}`);
          resolve({
            url: result.url,
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format,
            width: result.width,
            height: result.height,
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
    const result = await cloudinary.uploader.destroy(publicId);
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
  // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
  try {
    const match = secureUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
    return match?.[1] ?? "";
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
