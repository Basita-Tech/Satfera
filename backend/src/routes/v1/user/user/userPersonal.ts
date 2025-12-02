import { Router } from "express";
import * as userPersonalController from "../../../../controllers/userController/userPersonal";
import authenticate from "../../../../middleware/authMiddleware";
import * as validation from "../../../../validation";
import * as uploadController from "../../../../controllers/userController/uploadController";
import {
  createProfilePhotoUpload,
  createGovernmentIdUpload
} from "../../../../lib/fileValidation/fileValidationMiddleware";

const userPersonalRouter = Router();
const profilePhotoUpload = createProfilePhotoUpload();
const governmentIdUpload = createGovernmentIdUpload();

userPersonalRouter.post(
  "/",
  authenticate,
  validation.CreateUserPersonalValidation,
  userPersonalController.createUserPersonalController
);

userPersonalRouter.get(
  "/",
  authenticate,
  userPersonalController.getUserPersonalController
);
userPersonalRouter.put(
  "/",
  authenticate,
  userPersonalController.updateUserPersonalController
);

userPersonalRouter.post(
  "/family",
  authenticate,
  userPersonalController.addUserFamilyDetails
);
userPersonalRouter.get(
  "/family",
  authenticate,
  userPersonalController.getUserFamilyDetails
);
userPersonalRouter.put(
  "/family",
  authenticate,
  userPersonalController.updateUserFamilyDetails
);

userPersonalRouter.get(
  "/education",
  authenticate,
  userPersonalController.getUserEducationDetails
);
userPersonalRouter.post(
  "/education",
  authenticate,
  userPersonalController.createUserEducationDetails
);
userPersonalRouter.put(
  "/education",
  authenticate,
  userPersonalController.updateUserEducationDetails
);

userPersonalRouter.get(
  "/health",
  authenticate,
  userPersonalController.getUserHealthController
);

userPersonalRouter.post(
  "/health",
  authenticate,
  validation.UserHealthValidation,
  userPersonalController.addUserHealthController
);

userPersonalRouter.put(
  "/health",
  authenticate,
  validation.UserHealthValidation,
  userPersonalController.updateUserHealthController
);

userPersonalRouter.get(
  "/profession",
  authenticate,
  userPersonalController.getUserProfessionController
);
userPersonalRouter.post(
  "/profession",
  authenticate,
  validation.UserProfessionValidation,
  userPersonalController.addUserProfessionController
);
userPersonalRouter.put(
  "/profession",
  authenticate,
  validation.UserProfessionValidation,
  userPersonalController.updateUserProfessionController
);

userPersonalRouter.get(
  "/expectations",
  authenticate,
  userPersonalController.getUserExpectationsById
);

userPersonalRouter.post(
  "/expectations",
  authenticate,
  validation.validateUserExpectations,
  userPersonalController.createUserExpectations
);

userPersonalRouter.put(
  "/expectations/",
  authenticate,
  userPersonalController.updateUserExpectations
);

userPersonalRouter.get(
  "/onboarding-status",
  authenticate,
  userPersonalController.getUserOnboardingStatus
);
userPersonalRouter.put(
  "/onboarding-status",
  authenticate,
  userPersonalController.updateUserOnboardingStatus
);

userPersonalRouter.post(
  "/upload/photos",
  authenticate,
  profilePhotoUpload.single("file"),
  uploadController.uploadPhotoController
);
userPersonalRouter.get(
  "/upload/photos",
  authenticate,
  uploadController.getPhotosController
);
userPersonalRouter.put(
  "/upload/photos",
  authenticate,
  profilePhotoUpload.single("file"),
  uploadController.updatePhotoController
);

userPersonalRouter.delete(
  "/upload/photos",
  authenticate,
  uploadController.deletePhotoController
);

userPersonalRouter.post(
  "/upload/government-id",
  authenticate,
  governmentIdUpload.single("file"),
  uploadController.uploadGovernmentIdController
);

userPersonalRouter.get(
  "/upload/government-id",
  authenticate,
  uploadController.getGovernmentIdController
);

userPersonalRouter.put(
  "/upload/government-id",
  authenticate,
  governmentIdUpload.single("file"),
  uploadController.updateGovernmentIdController
);

userPersonalRouter.get(
  "/review/status",
  authenticate,
  userPersonalController.getProfileReviewStatusController
);
userPersonalRouter.post(
  "/review/submit",
  authenticate,
  userPersonalController.submitProfileForReviewController
);

export default userPersonalRouter;
