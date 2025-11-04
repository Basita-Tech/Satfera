import { Router } from "express";
import {
  createUserPersonalController,
  getUserPersonalController,
  updateUserPersonalController,
  addUserFamilyDetails,
  getUserFamilyDetails,
  getUserEducationDetails,
  createUserEducationDetails,
  updateUserEducationDetails,
  getUserHealthController,
  updateUserHealthController,
  addUserHealthController,
  getUserExpectationsById,
  createUserExpectations,
  updateUserExpectations,
  getUserProfessionController,
  updateUserProfessionController,
  addUserProfessionController,
  getUserOnboardingStatus,
  updateUserOnboardingStatus,
  updateUserFamilyDetails,
} from "../controllers/userPersonal";
import {
  CreateUserPersonalValidation,
  UserHealthValidation,
  UserProfessionValidation,
  validateUserExpectations,
} from "../validation/validation";
import { authenticate } from "../middleware/authMiddleware";
import {
  deletePhotoController,
  updatePhotoController,
  uploadPhotoController,
  getPhotosController,
  uploadGovernmentIdController,
  updateGovernmentIdController,
  getGovernmentIdController,
} from "../controllers/uploadController";

const userPersonalRouter = Router();

userPersonalRouter.post(
  "/",
  authenticate,
  CreateUserPersonalValidation,
  createUserPersonalController
);
userPersonalRouter.get("/", authenticate, getUserPersonalController);
userPersonalRouter.put("/", authenticate, updateUserPersonalController);

userPersonalRouter.post("/family", authenticate, addUserFamilyDetails);
userPersonalRouter.get("/family", authenticate, getUserFamilyDetails);
userPersonalRouter.put("/family", authenticate, updateUserFamilyDetails);

userPersonalRouter.get("/education", authenticate, getUserEducationDetails);
userPersonalRouter.post("/education", authenticate, createUserEducationDetails);
userPersonalRouter.put("/education", authenticate, updateUserEducationDetails);

userPersonalRouter.get("/health", authenticate, getUserHealthController);

userPersonalRouter.post(
  "/health",
  authenticate,
  UserHealthValidation,
  addUserHealthController
);

userPersonalRouter.put(
  "/health",
  authenticate,
  UserHealthValidation,
  updateUserHealthController
);

userPersonalRouter.get(
  "/profession",
  authenticate,
  getUserProfessionController
);
userPersonalRouter.post(
  "/profession",
  authenticate,
  UserProfessionValidation,
  addUserProfessionController
);
userPersonalRouter.put(
  "/profession",
  authenticate,
  UserProfessionValidation,
  updateUserProfessionController
);

userPersonalRouter.get("/expectations", authenticate, getUserExpectationsById);

userPersonalRouter.post(
  "/expectations",
  authenticate,
  validateUserExpectations,
  createUserExpectations
);

userPersonalRouter.put("/expectations/", authenticate, updateUserExpectations);

userPersonalRouter.get(
  "/onboarding-status",
  authenticate,
  getUserOnboardingStatus
);
userPersonalRouter.put(
  "/onboarding-status",
  authenticate,
  updateUserOnboardingStatus
);

userPersonalRouter.post("/upload/photos", authenticate, uploadPhotoController);
userPersonalRouter.get("/upload/photos", authenticate, getPhotosController);
userPersonalRouter.put(
  "/upload/photos/:photoId",
  authenticate,
  updatePhotoController
);

userPersonalRouter.delete(
  "/upload/photos/:photoId",
  authenticate,
  deletePhotoController
);

userPersonalRouter.post(
  "/upload/government-id",
  authenticate,
  uploadGovernmentIdController
);

userPersonalRouter.get(
  "/upload/government-id",
  authenticate,
  getGovernmentIdController
);

userPersonalRouter.put(
  "/upload/government-id",
  authenticate,
  updateGovernmentIdController
);

export default userPersonalRouter;
