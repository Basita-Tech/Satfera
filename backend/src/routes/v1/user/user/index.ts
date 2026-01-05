import { Router } from "express";
import authenticate from "../../../../middleware/authMiddleware";
import { searchGatewayLimiter } from "../../../../middleware/redisRateLimiter";
import {
  changePasswordValidation,
  deleteAccountValidation,
  notificationSettingsValidation,
  requestEmailChangeValidation,
  verifyEmailChangeValidation,
  requestPhoneChangeValidation,
  verifyPhoneChangeValidation
} from "../../../../validation";
import {
  getAllUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from "../../../../controllers";
import userPersonalRouter from "./userPersonal";
import * as userController from "../../../../controllers/userController";
import { asyncHandler } from "../../../../utils/utils";

const user = Router();

user.use("/user-personal", userPersonalRouter);

user.get(
  "/user/profile",
  authenticate,
  asyncHandler(userController.getUserDashboardController)
);

user.post(
  "/user/change-password",
  authenticate,
  changePasswordValidation,
  asyncHandler(userController.changeUserPassword)
);

user.get(
  "/user/notifications",
  authenticate,
  asyncHandler(getAllUserNotifications)
);
user.get(
  "/user/notifications/count",
  authenticate,
  asyncHandler(getUnreadCount)
);
user.patch(
  "/user/notifications/:id/read",
  authenticate,
  asyncHandler(markAsRead)
);
user.patch(
  "/user/notifications/mark-all-read",
  authenticate,
  asyncHandler(markAllAsRead)
);

user.get(
  "/user/search",
  authenticate,
  searchGatewayLimiter,
  asyncHandler(userController.searchController)
);
user.post(
  "/user/block",
  authenticate,
  asyncHandler(userController.blockController)
);
user.post(
  "/user/unblock",
  authenticate,
  asyncHandler(userController.unblockController)
);
user.get(
  "/user/blocked",
  authenticate,
  asyncHandler(userController.listBlockedController)
);

user.get(
  "/user/profile-views",
  authenticate,
  asyncHandler(userController.getUserProfileViewsController)
);

user.post(
  "/user/compare",
  authenticate,
  asyncHandler(userController.addCompareController)
);

user.get(
  "/user/compare",
  authenticate,
  asyncHandler(userController.getCompareController)
);

user.delete(
  "/user/compare",
  authenticate,
  asyncHandler(userController.deleteCompareController)
);

user.post(
  "/user/account/deactivate",
  authenticate,
  asyncHandler(userController.deactivateAccountController)
);

user.post(
  "/user/account/activate",
  authenticate,
  asyncHandler(userController.activateAccountController)
);

user.get(
  "/user/account/status",
  authenticate,
  asyncHandler(userController.getAccountStatusController)
);

user.delete(
  "/user/account",
  authenticate,
  deleteAccountValidation,
  asyncHandler(userController.deleteAccountController)
);

user.get(
  "/user/notification-settings",
  authenticate,
  asyncHandler(userController.getNotificationSettingsController)
);

user.patch(
  "/user/notification-settings",
  authenticate,
  notificationSettingsValidation,
  asyncHandler(userController.updateNotificationSettingsController)
);

user.post(
  "/user/email/request-change",
  authenticate,
  requestEmailChangeValidation,
  asyncHandler(userController.requestEmailChangeController)
);

user.post(
  "/user/email/verify-change",
  authenticate,
  verifyEmailChangeValidation,
  asyncHandler(userController.verifyEmailChangeController)
);

user.post(
  "/user/phone/request-change",
  authenticate,
  requestPhoneChangeValidation,
  asyncHandler(userController.requestPhoneChangeController)
);

user.post(
  "/user/phone/verify-change",
  authenticate,
  verifyPhoneChangeValidation,
  asyncHandler(userController.verifyPhoneChangeController)
);

user.get(
  "/user/contact-info",
  authenticate,
  asyncHandler(userController.getUserContactInfoController)
);

user.get(
  "/user/download-pdf",
  authenticate,
  asyncHandler(userController.downloadMyPdfDataController)
);

export default user;
