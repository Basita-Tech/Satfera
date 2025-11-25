import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { Profile } from "../../../models";
import { logger } from "../../../lib/common/logger";

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

    const { photoType, url, title, visibility } = req.body;

    if (!photoType || !url) {
      return res.status(400).json({
        success: false,
        message: "photoType and url are required"
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

    let profile = await Profile.findOne({ userId: user.id });

    if (!profile) {
      profile = new Profile({ userId: user.id });
    }

    const now = new Date();

    if (photoType === "closer") {
      profile.photos.closerPhoto = {
        url,
        uploadedAt: now,
        visibility: visibility || "public"
      };
    } else if (photoType === "personal") {
      if (!profile.photos.personalPhotos) {
        profile.photos.personalPhotos = [];
      }
      profile.photos.personalPhotos.push({
        url,
        uploadedAt: now,
        visibility: visibility || "connectionOnly"
      });
    } else if (photoType === "family") {
      profile.photos.familyPhoto = {
        url,
        uploadedAt: now,
        visibility: visibility || "connectionOnly"
      };
    } else if (photoType === "other") {
      if (!profile.photos.otherPhotos) {
        profile.photos.otherPhotos = [];
      }
      profile.photos.otherPhotos.push({
        url,
        title: title || "Photo",
        uploadedAt: now,
        visibility: visibility || "connectionOnly"
      });
    }

    await profile.save();

    logger.info(`Photo uploaded for user ${user.id}: ${photoType}`);
    return res.status(201).json({
      success: true,
      message: `${photoType} photo uploaded successfully`,
      data: profile
    });
  } catch (error: any) {
    logger.error("Error uploading photo:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Upload failed" });
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

    const { photoId } = req.params;
    const { url, title, visibility } = req.body;

    if (!url) {
      return res
        .status(400)
        .json({ success: false, message: "url is required" });
    }

    const profile = await Profile.findOne({ userId: user.id });
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    const now = new Date();
    let updated = false;

    if (
      profile.photos.closerPhoto &&
      profile.photos.closerPhoto.url === photoId
    ) {
      profile.photos.closerPhoto.url = url;
      profile.photos.closerPhoto.uploadedAt = now;
      if (visibility) profile.photos.closerPhoto.visibility = visibility;
      updated = true;
    } else if (
      profile.photos.familyPhoto &&
      profile.photos.familyPhoto.url === photoId
    ) {
      profile.photos.familyPhoto.url = url;
      profile.photos.familyPhoto.uploadedAt = now;
      if (visibility) profile.photos.familyPhoto.visibility = visibility;
      updated = true;
    } else if (profile.photos.personalPhotos) {
      const personalIndex = profile.photos.personalPhotos.findIndex(
        (p: any) => p.url === photoId
      );
      if (personalIndex !== -1) {
        profile.photos.personalPhotos[personalIndex].url = url;
        profile.photos.personalPhotos[personalIndex].uploadedAt = now;
        if (visibility)
          profile.photos.personalPhotos[personalIndex].visibility = visibility;
        updated = true;
      }
    } else if (profile.photos.otherPhotos) {
      const otherIndex = profile.photos.otherPhotos.findIndex(
        (p: any) => p.url === photoId
      );
      if (otherIndex !== -1) {
        profile.photos.otherPhotos[otherIndex].url = url;
        profile.photos.otherPhotos[otherIndex].uploadedAt = now;
        if (title) profile.photos.otherPhotos[otherIndex].title = title;
        if (visibility)
          profile.photos.otherPhotos[otherIndex].visibility = visibility;
        updated = true;
      }
    }

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Photo not found" });
    }

    await profile.save();

    logger.info(`Photo updated for user ${user.id}: ${photoId}`);
    return res.status(200).json({
      success: true,
      message: "Photo updated successfully",
      data: profile
    });
  } catch (error: any) {
    logger.error("Error updating photo:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Update failed" });
  }
};

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

    const { photoId } = req.params;

    const profile = await Profile.findOne({ userId: user.id });
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    let deleted = false;

    if (
      profile.photos.closerPhoto &&
      profile.photos.closerPhoto.url === photoId
    ) {
      profile.photos.closerPhoto = {};
      deleted = true;
    } else if (
      profile.photos.familyPhoto &&
      profile.photos.familyPhoto.url === photoId
    ) {
      profile.photos.familyPhoto = {};
      deleted = true;
    } else if (profile.photos.personalPhotos) {
      const personalIndex = profile.photos.personalPhotos.findIndex(
        (p: any) => p.url === photoId
      );
      if (personalIndex !== -1) {
        profile.photos.personalPhotos.splice(personalIndex, 1);
        deleted = true;
      }
    } else if (profile.photos.otherPhotos) {
      const otherIndex = profile.photos.otherPhotos.findIndex(
        (p: any) => p.url === photoId
      );
      if (otherIndex !== -1) {
        profile.photos.otherPhotos.splice(otherIndex, 1);
        deleted = true;
      }
    }

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Photo not found" });
    }

    await profile.save();

    logger.info(`Photo deleted for user ${user.id}: ${photoId}`);
    return res.status(200).json({
      success: true,
      message: "Photo deleted successfully",
      data: profile
    });
  } catch (error: any) {
    logger.error("Error deleting photo:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Delete failed" });
  }
};

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

    const { url } = req.body;

    if (!url) {
      return res
        .status(400)
        .json({ success: false, message: "url is required" });
    }

    let profile = await Profile.findOne({ userId: user.id });
    if (!profile) {
      profile = new Profile({ userId: user.id });
    }

    profile.governmentIdImage = {
      url,
      uploadedAt: new Date(),
      verificationStatus: "pending",
      visibility: "adminOnly"
    };

    await profile.save();

    logger.info(`Government ID uploaded for user ${user.id}`);
    return res.status(201).json({
      success: true,
      message: "Government ID uploaded successfully",
      data: profile
    });
  } catch (error: any) {
    logger.error("Error uploading government ID:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Upload failed" });
  }
};

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

    const { url } = req.body;

    if (!url) {
      return res
        .status(400)
        .json({ success: false, message: "url is required" });
    }

    const profile = await Profile.findOne({ userId: user.id });
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    if (!profile.governmentIdImage) {
      return res.status(404).json({
        success: false,
        message: "Government ID not found. Please upload first."
      });
    }

    profile.governmentIdImage.url = url;
    profile.governmentIdImage.uploadedAt = new Date();
    profile.governmentIdImage.verificationStatus = "pending";

    await profile.save();

    logger.info(`Government ID updated for user ${user.id}`);
    return res.status(200).json({
      success: true,
      message: "Government ID updated successfully",
      data: profile
    });
  } catch (error: any) {
    logger.error("Error updating government ID:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Update failed" });
  }
};

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

    const profile = await Profile.findOne({ userId: user.id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: profile.photos
    });
  } catch (error: any) {
    logger.error("Error fetching photos:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Fetch failed" });
  }
};

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

    const profile = await Profile.findOne({ userId: user.id });
    if (!profile || !profile.governmentIdImage) {
      return res.status(404).json({
        success: false,
        message: "Government ID not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: profile.governmentIdImage
    });
  } catch (error: any) {
    logger.error("Error fetching government ID:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Fetch failed" });
  }
};
