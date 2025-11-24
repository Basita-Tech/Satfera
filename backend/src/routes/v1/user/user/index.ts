import { Router } from "express";
import authenticate from "../../../../middleware/authMiddleware";

import { changePasswordValidation } from "../../../../validation";
import {
  getAllUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  changeUserPassword,
  getUserDashboardController
} from "../../../../controllers";
import userPersonalRouter from "./userPersonal";
import { searchController } from "../../../../controllers/userController/searchController";
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

user.get("/user/search", authenticate, searchController);
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

export default user;
