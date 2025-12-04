import mongoose from "mongoose";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicIdFromUrl
} from "../lib/cloudinary/cloudinaryService";
import { Profile } from "../models";
import { env } from "../config";
import { logger } from "../lib";

export interface PhotoUploadParams {
  userId: string;
  photoType: "closer" | "personal" | "family" | "other" | "governmentId";
  file: Express.Multer.File;
  title?: string;
  cleanBuffer?: Buffer | undefined;
  idempotencyKey?: string;
}

export interface PhotoUpdateParams extends PhotoUploadParams {
  photoId?: string;
}

export interface PhotoResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Upload a single photo and update profile
 * Supports idempotent retries via idempotencyKey
 */
export async function uploadPhoto(
  params: PhotoUploadParams
): Promise<PhotoResponse> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, photoType, file, title, cleanBuffer, idempotencyKey } =
      params;

    const profile = await Profile.findOne({ userId }).session(session);
    if (!profile) {
      await session.abortTransaction();
      return {
        success: false,
        message:
          "Profile not found. Please ensure your profile is created before uploading photos.",
        error: "PROFILE_NOT_FOUND"
      };
    }

    if (idempotencyKey && photoType !== "personal" && photoType !== "other") {
      const existingPhoto =
        photoType === "closer"
          ? profile.photos?.closerPhoto
          : photoType === "family"
            ? profile.photos?.familyPhoto
            : photoType === "governmentId"
              ? profile.governmentIdImage
              : null;

      if (existingPhoto?.url && existingPhoto.uploadedAt) {
        const uploadAge =
          Date.now() - new Date(existingPhoto.uploadedAt).getTime();

        if (uploadAge < 5 * 60 * 1000) {
          await session.abortTransaction();
          logger.info(
            `Duplicate upload detected for ${photoType} (idempotency key: ${idempotencyKey})`
          );
          return {
            success: true,
            message: `${photoType} photo already uploaded recently (duplicate request)`,
            data: profile
          };
        }
      }
    }

    const uploadResponse = await uploadToCloudinary(
      cleanBuffer || file.buffer,
      file.originalname,
      `${photoType}/${userId}`
    );

    let updatedProfile;

    switch (photoType) {
      case "closer":
        if (profile.photos?.closerPhoto?.url) {
          const oldPublicId = extractPublicIdFromUrl(
            profile.photos.closerPhoto.url
          );
          if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId).catch((err: any) => {
              logger.warn(`Failed to delete old closer photo: ${err}`);
            });
          }
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          {
            $set: {
              "photos.closerPhoto": {
                url: uploadResponse.secure_url,
                uploadedAt: new Date(),
                visibility: "public"
              }
            }
          },
          { new: true, session }
        );
        break;

      case "personal":
        const personalPhotosCount = profile.photos?.personalPhotos?.length || 0;
        if (personalPhotosCount >= env.MAX_PERSONAL_PHOTOS) {
          await session.abortTransaction();
          return {
            success: false,
            message: `You have reached the maximum limit of ${env.MAX_PERSONAL_PHOTOS} personal photo(s). Please delete an existing photo before uploading a new one.`,
            error: "PHOTO_LIMIT_EXCEEDED"
          };
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          {
            $push: {
              "photos.personalPhotos": {
                url: uploadResponse.secure_url,
                uploadedAt: new Date(),
                visibility: "connectionOnly"
              }
            }
          },
          { new: true, session }
        );
        break;

      case "family":
        if (profile.photos?.familyPhoto?.url) {
          const oldPublicId = extractPublicIdFromUrl(
            profile.photos.familyPhoto.url
          );
          if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId).catch((err: any) => {
              logger.warn(`Failed to delete old family photo: ${err}`);
            });
          }
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          {
            $set: {
              "photos.familyPhoto": {
                url: uploadResponse.secure_url,
                uploadedAt: new Date(),
                visibility: "connectionOnly"
              }
            }
          },
          { new: true, session }
        );
        break;

      case "other":
        const otherPhotosCount = profile.photos?.otherPhotos?.length || 0;
        if (otherPhotosCount >= env.MAX_OTHER_PHOTOS) {
          await session.abortTransaction();
          return {
            success: false,
            message: `You have reached the maximum limit of ${env.MAX_OTHER_PHOTOS} optional photo(s). Please delete an existing photo before uploading a new one.`,
            error: "PHOTO_LIMIT_EXCEEDED"
          };
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          {
            $push: {
              "photos.otherPhotos": {
                url: uploadResponse.secure_url,
                title: title || `Other Photo ${otherPhotosCount + 1}`,
                uploadedAt: new Date(),
                visibility: "connectionOnly"
              }
            }
          },
          { new: true, session }
        );
        break;

      case "governmentId":
        if (profile.governmentIdImage?.url) {
          const oldPublicId = extractPublicIdFromUrl(
            profile.governmentIdImage.url
          );
          if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId).catch((err: any) => {
              logger.warn(`Failed to delete old government ID: ${err}`);
            });
          }
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          {
            $set: {
              governmentIdImage: {
                url: uploadResponse.secure_url,
                uploadedAt: new Date(),
                verificationStatus: "pending",
                visibility: "adminOnly"
              }
            }
          },
          { new: true, session }
        );
        break;

      default:
        await session.abortTransaction();
        return {
          success: false,
          message: `Invalid photo type: ${photoType}. Supported types are: closer, personal, family, other, governmentId`,
          error: "INVALID_PHOTO_TYPE"
        };
    }

    await session.commitTransaction();

    logger.info(
      `Successfully uploaded ${photoType} photo for user ${userId}${idempotencyKey ? ` (key: ${idempotencyKey})` : ""}`
    );

    return {
      success: true,
      message: `${photoType.charAt(0).toUpperCase() + photoType.slice(1)} photo uploaded successfully`,
      data: updatedProfile
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error("Error uploading photo:", {
      userId: params.userId,
      photoType: params.photoType,
      error
    });

    const errorMessage =
      (error as any).code === 11000
        ? "Duplicate photo upload detected. Please try again."
        : "Failed to upload photo. Please check your connection and try again.";

    return {
      success: false,
      message: errorMessage,
      error: (error as Error).message
    };
  } finally {
    session.endSession();
  }
}

/**
 * Update existing photo (for closerPhoto, familyPhoto, governmentId only)
 */
export async function updatePhoto(
  params: PhotoUpdateParams
): Promise<PhotoResponse> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, photoType, file, title, cleanBuffer } = params;

    const profile = await Profile.findOne({ userId }).session(session);
    if (!profile) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Profile not found",
        error: "User profile does not exist"
      };
    }

    const uploadResponse = await uploadToCloudinary(
      cleanBuffer || file.buffer,
      file.originalname,
      `${photoType}/${userId}`
    );

    let oldPublicId: string | null = null;
    let updatedProfile;

    switch (photoType) {
      case "closer":
        if (profile.photos?.closerPhoto?.url) {
          oldPublicId = extractPublicIdFromUrl(profile.photos.closerPhoto.url);
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          {
            $set: {
              "photos.closerPhoto": {
                url: uploadResponse.secure_url,
                uploadedAt: new Date(),
                visibility: "public"
              }
            }
          },
          { new: true, session }
        );
        break;

      case "family":
        if (profile.photos?.familyPhoto?.url) {
          oldPublicId = extractPublicIdFromUrl(profile.photos.familyPhoto.url);
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          {
            $set: {
              "photos.familyPhoto": {
                url: uploadResponse.secure_url,
                uploadedAt: new Date(),
                visibility: "connectionOnly"
              }
            }
          },
          { new: true, session }
        );
        break;

      case "governmentId":
        if (profile.governmentIdImage?.url) {
          oldPublicId = extractPublicIdFromUrl(profile.governmentIdImage.url);
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          {
            $set: {
              governmentIdImage: {
                url: uploadResponse.secure_url,
                uploadedAt: new Date(),
                verificationStatus: "pending",
                visibility: "adminOnly"
              }
            }
          },
          { new: true, session }
        );
        break;

      case "personal":
      case "other":
        await session.abortTransaction();
        return {
          success: false,
          message: "Use updatePhotoInArray for personal and other photos",
          error: "Invalid photo type for direct update"
        };

      default:
        await session.abortTransaction();
        return {
          success: false,
          message: "Invalid photo type",
          error: `Photo type "${photoType}" is not supported`
        };
    }

    await session.commitTransaction();

    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId).catch((err: any) => {
        logger.warn(`Failed to delete old photo: ${err}`);
      });
    }

    logger.info(`Successfully updated ${photoType} photo for user ${userId}`);

    return {
      success: true,
      message: `${photoType} photo updated successfully`,
      data: updatedProfile
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error("Error updating photo:", error);
    return {
      success: false,
      message: "Failed to update photo",
      error: (error as Error).message
    };
  } finally {
    session.endSession();
  }
}

/**
 * Update photo in array (personal or other photos)
 */
export async function updatePhotoInArray(
  userId: string,
  photoType: "personal" | "other",
  photoIndex: number,
  file: Express.Multer.File,
  title?: string,
  cleanBuffer?: Buffer
): Promise<PhotoResponse> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const profile = await Profile.findOne({ userId }).session(session);
    if (!profile) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Profile not found",
        error: "User profile does not exist"
      };
    }

    let photoArray;
    if (photoType === "personal") {
      photoArray = profile.photos?.personalPhotos || [];
    } else {
      photoArray = profile.photos?.otherPhotos || [];
    }

    if (photoIndex < 0 || photoIndex >= photoArray.length) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Invalid photo index",
        error: `Photo index ${photoIndex} is out of range`
      };
    }

    const oldPhotoUrl = photoArray[photoIndex]?.url;
    let oldPublicId: string | null = null;
    if (oldPhotoUrl) {
      oldPublicId = extractPublicIdFromUrl(oldPhotoUrl);
    }

    const uploadResponse = await uploadToCloudinary(
      cleanBuffer || file.buffer,
      file.originalname,
      `${photoType}/${userId}`
    );

    const updatePath =
      photoType === "personal"
        ? `photos.personalPhotos.${photoIndex}`
        : `photos.otherPhotos.${photoIndex}`;

    const updateData = {
      url: uploadResponse.secure_url,
      uploadedAt: new Date(),
      visibility: photoType === "personal" ? "connectionOnly" : "connectionOnly"
    };

    if (photoType === "other") {
      Object.assign(updateData, {
        title: title || `Other Photo ${photoIndex + 1}`
      });
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      profile._id,
      { $set: { [updatePath]: updateData } },
      { new: true, session }
    );

    await session.commitTransaction();

    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId).catch((err: any) => {
        logger.warn(`Failed to delete old photo: ${err}`);
      });
    }

    logger.info(
      `Successfully updated ${photoType} photo at index ${photoIndex} for user ${userId}`
    );

    return {
      success: true,
      message: `${photoType} photo updated successfully`,
      data: updatedProfile
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error("Error updating photo in array:", error);
    return {
      success: false,
      message: "Failed to update photo",
      error: (error as Error).message
    };
  } finally {
    session.endSession();
  }
}

/**
 * Delete a specific photo
 */
export async function deletePhoto(
  userId: string,
  photoType: string,
  photoIndex?: number
): Promise<PhotoResponse> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const profile = await Profile.findOne({ userId }).session(session);
    if (!profile) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Profile not found",
        error: "User profile does not exist"
      };
    }

    let oldPublicId: string | null = null;
    let updatedProfile;

    switch (photoType) {
      case "closer":
        if (profile.photos?.closerPhoto?.url) {
          oldPublicId = extractPublicIdFromUrl(profile.photos.closerPhoto.url);
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          { $unset: { "photos.closerPhoto": "" } },
          { new: true, session }
        );
        break;

      case "family":
        if (profile.photos?.familyPhoto?.url) {
          oldPublicId = extractPublicIdFromUrl(profile.photos.familyPhoto.url);
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          { $unset: { "photos.familyPhoto": "" } },
          { new: true, session }
        );
        break;

      case "personal":
        if (photoIndex !== undefined && photoIndex >= 0) {
          const oldPhoto = profile.photos?.personalPhotos?.[photoIndex];
          if (oldPhoto?.url) {
            oldPublicId = extractPublicIdFromUrl(oldPhoto.url);
          }

          updatedProfile = await Profile.findByIdAndUpdate(
            profile._id,
            { $unset: { [`photos.personalPhotos.${photoIndex}`]: "" } },
            { new: true, session }
          );

          updatedProfile = await Profile.findByIdAndUpdate(
            profile._id,
            { $pull: { "photos.personalPhotos": null } },
            { new: true, session }
          );
        } else {
          await session.abortTransaction();
          return {
            success: false,
            message: "Photo index required for personal photos",
            error: "photoIndex is required"
          };
        }
        break;

      case "other":
        if (photoIndex !== undefined && photoIndex >= 0) {
          const oldPhoto = profile.photos?.otherPhotos?.[photoIndex];
          if (oldPhoto?.url) {
            oldPublicId = extractPublicIdFromUrl(oldPhoto.url);
          }

          updatedProfile = await Profile.findByIdAndUpdate(
            profile._id,
            { $unset: { [`photos.otherPhotos.${photoIndex}`]: "" } },
            { new: true, session }
          );

          updatedProfile = await Profile.findByIdAndUpdate(
            profile._id,
            { $pull: { "photos.otherPhotos": null } },
            { new: true, session }
          );
        } else {
          await session.abortTransaction();
          return {
            success: false,
            message: "Photo index required for other photos",
            error: "photoIndex is required"
          };
        }
        break;

      case "governmentId":
        if (profile.governmentIdImage?.url) {
          oldPublicId = extractPublicIdFromUrl(profile.governmentIdImage.url);
        }

        updatedProfile = await Profile.findByIdAndUpdate(
          profile._id,
          { $unset: { governmentIdImage: "" } },
          { new: true, session }
        );
        break;

      default:
        await session.abortTransaction();
        return {
          success: false,
          message: "Invalid photo type",
          error: `Photo type "${photoType}" is not supported`
        };
    }

    await session.commitTransaction();

    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId).catch((err: any) => {
        logger.warn(`Failed to delete photo from Cloudinary: ${err}`);
      });
    }

    logger.info(`Successfully deleted ${photoType} photo for user ${userId}`);

    return {
      success: true,
      message: `${photoType} photo deleted successfully`,
      data: updatedProfile
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error("Error deleting photo:", error);
    return {
      success: false,
      message: "Failed to delete photo",
      error: (error as Error).message
    };
  } finally {
    session.endSession();
  }
}

/**
 * Get all photos for a user
 */
export async function getUserPhotos(userId: string): Promise<PhotoResponse> {
  try {
    const profile = await Profile.findOne({ userId }).select(
      "photos governmentIdImage"
    );

    if (!profile) {
      return {
        success: false,
        message: "Profile not found",
        error: "User profile does not exist"
      };
    }

    return {
      success: true,
      message: "Photos retrieved successfully",
      data: {
        photos: profile.photos,
        governmentIdImage: profile.governmentIdImage
      }
    };
  } catch (error) {
    logger.error("Error retrieving user photos:", error);
    return {
      success: false,
      message: "Failed to retrieve photos",
      error: (error as Error).message
    };
  }
}

export default {
  uploadPhoto,
  updatePhoto,
  updatePhotoInArray,
  deletePhoto,
  getUserPhotos
};
