import { Router } from "express";
import authenticate from "../../../../middleware/authMiddleware";

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

const user = Router();

user.use("/user-personal", userPersonalRouter);

user.get(
  "/user/profile",
  authenticate,
  userController.getUserDashboardController
);

user.post(
  "/user/change-password",
  authenticate,
  changePasswordValidation,
  userController.changeUserPassword
);

user.get("/user/notifications", authenticate, getAllUserNotifications);
user.get("/user/notifications/count", authenticate, getUnreadCount);
user.patch("/user/notifications/:id/read", authenticate, markAsRead);
user.patch("/user/notifications/mark-all-read", authenticate, markAllAsRead);

user.get("/user/search", authenticate, userController.searchController);
user.post("/user/block", authenticate, userController.blockController);
user.post("/user/unblock", authenticate, userController.unblockController);
user.get("/user/blocked", authenticate, userController.listBlockedController);

user.get(
  "/user/profile-views",
  authenticate,
  userController.getUserProfileViewsController
);

user.post("/user/compare", authenticate, userController.addCompareController);

user.get("/user/compare", authenticate, userController.getCompareController);

user.delete(
  "/user/compare",
  authenticate,
  userController.deleteCompareController
);

user.post(
  "/user/account/deactivate",
  authenticate,
  userController.deactivateAccountController
);

user.post(
  "/user/account/activate",
  authenticate,
  userController.activateAccountController
);

user.get(
  "/user/account/status",
  authenticate,
  userController.getAccountStatusController
);

user.delete(
  "/user/account",
  authenticate,
  deleteAccountValidation,
  userController.deleteAccountController
);

user.get(
  "/user/notification-settings",
  authenticate,
  userController.getNotificationSettingsController
);

user.patch(
  "/user/notification-settings",
  authenticate,
  notificationSettingsValidation,
  userController.updateNotificationSettingsController
);

user.post(
  "/user/email/request-change",
  authenticate,
  requestEmailChangeValidation,
  userController.requestEmailChangeController
);

user.post(
  "/user/email/verify-change",
  authenticate,
  verifyEmailChangeValidation,
  userController.verifyEmailChangeController
);

user.post(
  "/user/phone/request-change",
  authenticate,
  requestPhoneChangeValidation,
  userController.requestPhoneChangeController
);

user.post(
  "/user/phone/verify-change",
  authenticate,
  verifyPhoneChangeValidation,
  userController.verifyPhoneChangeController
);

user.get(
  "/user/contact-info",
  authenticate,
  userController.getUserContactInfoController
);

user.get(
  "/user/download-pdf",
  authenticate,
  userController.downloadMyPdfDataController
);

export default user;
