import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { logger } from "../../../lib/common/logger";
import { validationResult } from "express-validator";
import {
  blockUser,
  getBlockedUsers,
  unblockUser,
  deleteAccount,
  getAccountDeletionStatus,
  deactivateAccount,
  activateAccount,
  getAccountStatus,
  updateNotificationSettings,
  getNotificationSettings,
  changeUserPasswordService,
  requestEmailChange,
  verifyAndChangeEmail,
  requestPhoneChange,
  verifyAndChangePhone
} from "../../../services/userPersonalService/userSettingService";
import { User } from "../../../models";

export async function blockController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    const { customId } = req.body;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!customId)
      return res
        .status(400)
        .json({ success: false, message: "customId is required" });

    try {
      const result = await blockUser(userId, customId);
      return res.status(200).json({
        success: true,
        message: "User blocked successfully"
      });
    } catch (err: any) {
      const msg = err?.message || "Failed to block user";
      if (msg.startsWith("Cooldown")) {
        return res.status(429).json({
          success: false,
          message: "You can change block status for this profile after 24 hours"
        });
      }
      if (msg.startsWith("AlreadyBlocked")) {
        return res.status(400).json({
          success: false,
          message: "User is already in your blocked list"
        });
      }
      if (msg === "Target user not found") {
        return res
          .status(404)
          .json({ success: false, message: "Target user not found" });
      }
      if (msg === "Cannot block yourself") {
        return res.status(400).json({
          success: false,
          message: "You cannot block your own profile"
        });
      }
      return res.status(400).json({ success: false, message: msg });
    }
  } catch (error: any) {
    logger.error("Error in blockController", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function unblockController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    const { customId } = req.body;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!customId)
      return res
        .status(400)
        .json({ success: false, message: "customId is required" });

    try {
      const result = await unblockUser(userId, customId);
      return res.status(200).json({
        success: true,
        message: "User unblocked successfully"
      });
    } catch (err: any) {
      const msg = err?.message || "Failed to unblock user";
      if (msg.startsWith("Cooldown")) {
        return res.status(429).json({
          success: false,
          message: "You can change block status for this profile after 24 hours"
        });
      }
      if (msg.startsWith("NotBlocked")) {
        return res.status(400).json({
          success: false,
          message: "User is not in your blocked list"
        });
      }
      if (msg === "Target user not found") {
        return res
          .status(404)
          .json({ success: false, message: "Target user not found" });
      }
      return res.status(400).json({ success: false, message: msg });
    }
  } catch (error: any) {
    logger.error("Error in unblockController", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function listBlockedController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const list = await getBlockedUsers(userId);
    return res.status(200).json({ success: true, data: list });
  } catch (error: any) {
    logger.error("Error in listBlockedController", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function deactivateAccountController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { reason } = req.body;

    try {
      const result = await deactivateAccount(userId, reason);
      return res.status(200).json(result);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to deactivate account";

      if (errorMessage.startsWith("Cooldown:")) {
        return res.status(429).json({
          success: false,
          message: errorMessage.replace("Cooldown: ", "")
        });
      }

      if (errorMessage.startsWith("AlreadyDeactivated:")) {
        return res.status(400).json({
          success: false,
          message: errorMessage.replace("AlreadyDeactivated: ", "")
        });
      }

      if (errorMessage.includes("User not found")) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (errorMessage.includes("deleted account")) {
        return res.status(400).json({
          success: false,
          message: errorMessage
        });
      }

      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error: any) {
    logger.error("Error in deactivateAccountController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while deactivating account"
    });
  }
}

export async function activateAccountController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    try {
      const result = await activateAccount(userId);
      return res.status(200).json(result);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to activate account";

      if (errorMessage.startsWith("Cooldown:")) {
        return res.status(429).json({
          success: false,
          message: errorMessage.replace("Cooldown: ", "")
        });
      }

      if (errorMessage.startsWith("AlreadyActive:")) {
        return res.status(400).json({
          success: false,
          message: errorMessage.replace("AlreadyActive: ", "")
        });
      }

      if (errorMessage.includes("User not found")) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (errorMessage.includes("deleted account")) {
        return res.status(400).json({
          success: false,
          message: errorMessage
        });
      }

      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error: any) {
    logger.error("Error in activateAccountController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while activating account"
    });
  }
}

export async function getAccountStatusController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    try {
      const status = await getAccountStatus(userId);
      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to get account status"
      });
    }
  } catch (error: any) {
    logger.error("Error in getAccountStatusController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching account status"
    });
  }
}

export async function deleteAccountController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors
          .array()
          .map((e) => e.msg)
          .join(", ")
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { reason } = req.body;

    try {
      const result = await deleteAccount(userId, reason);
      return res.status(200).json(result);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete account";

      if (errorMessage.startsWith("AlreadyDeleted:")) {
        return res.status(400).json({
          success: false,
          message: errorMessage.replace("AlreadyDeleted: ", "")
        });
      }

      if (errorMessage.includes("User not found")) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (
        errorMessage.includes("Deletion reason must") ||
        errorMessage.includes("reason")
      ) {
        return res.status(400).json({
          success: false,
          message: errorMessage
        });
      }

      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error: any) {
    logger.error("Error in deleteAccountController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting account"
    });
  }
}

export async function getAccountDeletionStatusController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    try {
      const status = await getAccountDeletionStatus(userId);
      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to get deletion status"
      });
    }
  } catch (error: any) {
    logger.error("Error in getAccountDeletionStatusController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching deletion status"
    });
  }
}

export async function getNotificationSettingsController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    try {
      const settings = await getNotificationSettings(userId);
      return res.status(200).json({
        success: true,
        data: settings
      });
    } catch (err: any) {
      if (err.message.includes("Profile not found")) {
        return res.status(404).json({
          success: false,
          message: "Profile not found"
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || "Failed to get notification settings"
      });
    }
  } catch (error: any) {
    logger.error("Error in getNotificationSettingsController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching notification settings"
    });
  }
}

export async function updateNotificationSettingsController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors
          .array()
          .map((e) => e.msg)
          .join(", ")
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { emailNotifications, pushNotifications, smsNotifications } =
      req.body;

    try {
      const result = await updateNotificationSettings(userId, {
        emailNotifications,
        pushNotifications,
        smsNotifications
      });

      return res.status(200).json(result);
    } catch (err: any) {
      if (err.message.includes("Profile not found")) {
        return res.status(404).json({
          success: false,
          message: "Profile not found"
        });
      }

      if (err.message.includes("At least one")) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || "Failed to update notification settings"
      });
    }
  } catch (error: any) {
    logger.error(
      "Error in updateNotificationSettingsController",
      error.message
    );
    return res.status(500).json({
      success: false,
      message: "Server error while updating notification settings"
    });
  }
}

export async function changeUserPassword(
  req: AuthenticatedRequest,
  res: Response
) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors
        .array()
        .map((e) => e.msg)
        .toString()
    });
  }

  const { oldPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user?.id;

  const result = await changeUserPasswordService(
    userId!,
    oldPassword,
    newPassword,
    confirmPassword
  );

  if (result.success) {
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } else {
    return res.status(400).json({
      success: false,
      message: result.message
    });
  }
}

export async function requestEmailChangeController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "New email is required"
      });
    }

    const result = await requestEmailChange(userId, newEmail);

    return res.status(200).json(result);
  } catch (err: any) {
    logger.error("Error in requestEmailChangeController:", err.message);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to send OTP to new email"
    });
  }
}

export async function verifyEmailChangeController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const { newEmail, otp } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "New email is required"
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required"
      });
    }

    const result = await verifyAndChangeEmail(userId, newEmail, otp);

    return res.status(200).json(result);
  } catch (err: any) {
    logger.error("Error in verifyEmailChangeController:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to verify and change email"
    });
  }
}

export async function requestPhoneChangeController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const { newPhoneNumber } = req.body;

    if (!newPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: "New phone number is required"
      });
    }

    const result = await requestPhoneChange(userId, newPhoneNumber);

    return res.status(200).json(result);
  } catch (err: any) {
    logger.error("Error in requestPhoneChangeController:", err.message);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to initiate phone number change"
    });
  }
}

export async function verifyPhoneChangeController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const { newPhoneNumber } = req.body;

    if (!newPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: "New phone number is required"
      });
    }

    const result = await verifyAndChangePhone(userId, newPhoneNumber);

    return res.status(200).json(result);
  } catch (err: any) {
    logger.error("Error in verifyPhoneChangeController:", err.message);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to change phone number"
    });
  }
}

export async function getUserContactInfoController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const user = await User.findById(userId).select("email phoneNumber").lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        email: user.email,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error: any) {
    logger.error("Error fetching user contact info:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact information"
    });
  }
}
