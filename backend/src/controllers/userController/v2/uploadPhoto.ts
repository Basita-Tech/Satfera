import { logger } from "../../../lib";
import { Profile } from "../../../models";
import { AuthenticatedRequest } from "../../../types";
import { Response } from "express";

type PhotoType =
  | "closer"
  | "personal"
  | "family"
  | "other-1"
  | "other-2"
  | "governmentid";

export const updatePhotoController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const user = req.user.id;

    const { photoType, url, userId } = req.body;

    if (!photoType || !url) {
      return res.status(400).json({
        success: false,
        message: "photoType and url are required"
      });
    }

    const profile = await Profile.findOne({ userId: userId ? userId : user });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    const now = new Date();
    let updateQuery: any = {};

    switch (photoType as PhotoType) {
      case "closer":
        updateQuery = {
          $set: {
            "photos.closerPhoto": {
              url,
              uploadedAt: now
            }
          }
        };
        break;

      case "family":
        updateQuery = {
          $set: {
            "photos.familyPhoto": {
              url,
              uploadedAt: now
            }
          }
        };
        break;

      case "personal":
        updateQuery = {
          $set: {
            "photos.personalPhotos": [
              {
                url,
                uploadedAt: now
              }
            ]
          }
        };
        break;

      case "other-1":
        updateQuery = {
          $set: {
            "photos.otherPhotos.0": {
              url,
              title: "Other Photo",
              uploadedAt: now
            }
          }
        };
        break;

      case "other-2":
        updateQuery = {
          $set: {
            "photos.otherPhotos.1": {
              url,
              title: "Other Photo 2",
              uploadedAt: now
            }
          }
        };
        break;

      case "governmentid":
        updateQuery = {
          $set: {
            governmentIdImage: {
              url,
              uploadedAt: now,
              verificationStatus: "pending"
            }
          }
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid photoType"
        });
    }

    await Profile.updateOne({ userId: userId ? userId : user }, updateQuery);

    logger.info(
      `Photo updated | type=${photoType} | user=${userId ? userId : user}`
    );

    return res.status(200).json({
      success: true,
      message: `${photoType} photo updated successfully`
    });
  } catch (error: any) {
    logger.error("Update photo error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update photo",
      error: error.message || "Internal server error"
    });
  }
};
