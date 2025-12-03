import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { Profile } from "../../../models";
import { logger } from "../../../lib/common/logger";
import {
  uploadPhoto,
  updatePhoto,
  updatePhotoInArray,
  deletePhoto as deletePhotoService,
  getUserPhotos
} from "../../../services/photoService";
import { validateUploadedFile } from "../../../lib/fileValidation/fileValidationMiddleware";
import { ALLOWED_MIME_TYPES } from "../../../lib/fileValidation";

export const uploadPhotoController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided. Please upload a photo."
      });
    }

    const { photoType, title } = req.body;

    if (!photoType) {
      return res.status(400).json({
        success: false,
        message: "photoType is required (closer, personal, family, or other)"
      });
    }

    const validPhotoTypes = ["closer", "personal", "family", "other"];
    if (!validPhotoTypes.includes(photoType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid photoType. Must be one of: ${validPhotoTypes.join(
          ", "
        )}`
      });
    }

    const fileValidation = await validateUploadedFile(req.file, {
      allowedMimeTypes: ALLOWED_MIME_TYPES.profile,
      maxSize: req.body.maxSize
    });

    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        message: fileValidation.error || "File validation failed"
      });
    }

    const result = await uploadPhoto({
      userId: user.id,
      photoType: photoType as "closer" | "personal" | "family" | "other",
      file: req.file,
      title: title,
      cleanBuffer: fileValidation.cleanBuffer
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    logger.info(
      `Photo uploaded successfully for user ${user.id}: ${photoType}`
    );
    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error: any) {
    logger.error("Error uploading photo:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload photo",
      error: error.message || "Internal server error"
    });
  }
};

export const updatePhotoController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided. Please upload a photo to update."
      });
    }

    const { photoType, photoIndex } = req.body;

    if (!photoType) {
      return res.status(400).json({
        success: false,
        message: "photoType is required"
      });
    }

    const fileValidation = await validateUploadedFile(req.file, {
      allowedMimeTypes: ALLOWED_MIME_TYPES.profile,
      maxSize: req.body.maxSize
    });

    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        message: fileValidation.error || "File validation failed"
      });
    }

    let result;

    if (
      (photoType === "personal" || photoType === "other") &&
      photoIndex !== undefined
    ) {
      result = await updatePhotoInArray(
        user.id,
        photoType as "personal" | "other",
        parseInt(photoIndex),
        req.file,
        req.body.title,
        fileValidation.cleanBuffer
      );
    } else {
      result = await updatePhoto({
        userId: user.id,
        photoType: photoType as "closer" | "family" | "governmentId",
        file: req.file,
        cleanBuffer: fileValidation.cleanBuffer
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    logger.info(`Photo updated successfully for user ${user.id}: ${photoType}`);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error: any) {
    logger.error("Error updating photo:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update photo",
      error: error.message || "Internal server error"
    });
  }
};

/**
 * Delete a specific photo
 * Automatically deletes image from Cloudinary
 */
export const deletePhotoController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { photoType, photoIndex } = req.body;

    if (!photoType) {
      return res.status(400).json({
        success: false,
        message: "photoType is required"
      });
    }

    const photoIndexNum =
      photoIndex !== undefined ? parseInt(photoIndex) : undefined;

    const result = await deletePhotoService(user.id, photoType, photoIndexNum);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    logger.info(`Photo deleted successfully for user ${user.id}: ${photoType}`);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error: any) {
    logger.error("Error deleting photo:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete photo",
      error: error.message || "Internal server error"
    });
  }
};

/**
 * Upload government ID document
 * Handles multipart/form-data with file upload
 */
export const uploadGovernmentIdController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided. Please upload a government ID photo."
      });
    }

    const fileValidation = await validateUploadedFile(req.file, {
      allowedMimeTypes: ALLOWED_MIME_TYPES.governmentId,
      maxSize: req.body.maxSize
    });

    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        message: fileValidation.error || "File validation failed"
      });
    }

    const result = await uploadPhoto({
      userId: user.id,
      photoType: "governmentId",
      file: req.file,
      cleanBuffer: fileValidation.cleanBuffer
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    logger.info(`Government ID uploaded successfully for user ${user.id}`);
    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error: any) {
    logger.error("Error uploading government ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload government ID",
      error: error.message || "Internal server error"
    });
  }
};

/**
 * Update government ID document
 * Handles multipart/form-data and automatically deletes old image
 */
export const updateGovernmentIdController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided. Please upload a government ID photo."
      });
    }

    const fileValidation = await validateUploadedFile(req.file, {
      allowedMimeTypes: ALLOWED_MIME_TYPES.governmentId,
      maxSize: req.body.maxSize
    });

    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        message: fileValidation.error || "File validation failed"
      });
    }

    const result = await updatePhoto({
      userId: user.id,
      photoType: "governmentId",
      file: req.file,
      cleanBuffer: fileValidation.cleanBuffer
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    logger.info(`Government ID updated successfully for user ${user.id}`);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error: any) {
    logger.error("Error updating government ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update government ID",
      error: error.message || "Internal server error"
    });
  }
};

/**
 * Get all photos for authenticated user
 */
export const getPhotosController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const result = await getUserPhotos(user.id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      message: "Photos retrieved successfully",
      data: result.data
    });
  } catch (error: any) {
    logger.error("Error fetching photos:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch photos",
      error: error.message || "Internal server error"
    });
  }
};

/**
 * Get government ID for authenticated user
 */
export const getGovernmentIdController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const profile = await Profile.findOne({ userId: user.id }).select(
      "governmentIdImage"
    );

    if (!profile || !profile.governmentIdImage) {
      return res.status(404).json({
        success: false,
        message: "Government ID not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Government ID retrieved successfully",
      data: profile.governmentIdImage
    });
  } catch (error: any) {
    logger.error("Error fetching government ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch government ID",
      error: error.message || "Internal server error"
    });
  }
};
