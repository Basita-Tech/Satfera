import { Router } from "express";
import * as userPersonalController from "../../../../controllers/userController/userPersonal";
import authenticate from "../../../../middleware/authMiddleware";
import * as validation from "../../../../validation";
import * as uploadController from "../../../../controllers/userController/uploadController";
import {
  createProfilePhotoUpload,
  createGovernmentIdUpload
} from "../../../../lib/fileValidation/fileValidationMiddleware";
import { photoUploadGatewayLimiter } from "../../../../middleware/redisRateLimiter";
import { asyncHandler } from "../../../../utils/utils";

const userPersonalRouter = Router();
const profilePhotoUpload = createProfilePhotoUpload();
const governmentIdUpload = createGovernmentIdUpload();

userPersonalRouter.post(
  "/",
  authenticate,
  validation.CreateUserPersonalValidation,
  asyncHandler(userPersonalController.createUserPersonalController)
);

userPersonalRouter.get(
  "/",
  authenticate,
  asyncHandler(userPersonalController.getUserPersonalController)
);
userPersonalRouter.put(
  "/",
  authenticate,
  asyncHandler(userPersonalController.updateUserPersonalController)
);

userPersonalRouter.post(
  "/family",
  authenticate,
  asyncHandler(userPersonalController.addUserFamilyDetails)
);
userPersonalRouter.get(
  "/family",
  authenticate,
  asyncHandler(userPersonalController.getUserFamilyDetails)
);
userPersonalRouter.put(
  "/family",
  authenticate,
  asyncHandler(userPersonalController.updateUserFamilyDetails)
);

userPersonalRouter.get(
  "/education",
  authenticate,
  asyncHandler(userPersonalController.getUserEducationDetails)
);
userPersonalRouter.post(
  "/education",
  authenticate,
  asyncHandler(userPersonalController.createUserEducationDetails)
);
userPersonalRouter.put(
  "/education",
  authenticate,
  asyncHandler(userPersonalController.updateUserEducationDetails)
);

userPersonalRouter.get(
  "/health",
  authenticate,
  asyncHandler(userPersonalController.getUserHealthController)
);

userPersonalRouter.post(
  "/health",
  authenticate,
  validation.UserHealthValidation,
  asyncHandler(userPersonalController.addUserHealthController)
);

userPersonalRouter.put(
  "/health",
  authenticate,
  validation.UserHealthValidation,
  asyncHandler(userPersonalController.updateUserHealthController)
);

userPersonalRouter.get(
  "/profession",
  authenticate,
  asyncHandler(userPersonalController.getUserProfessionController)
);
userPersonalRouter.post(
  "/profession",
  authenticate,
  validation.UserProfessionValidation,
  asyncHandler(userPersonalController.addUserProfessionController)
);
userPersonalRouter.put(
  "/profession",
  authenticate,
  validation.UserProfessionValidation,
  asyncHandler(userPersonalController.updateUserProfessionController)
);

userPersonalRouter.get(
  "/expectations",
  authenticate,
  asyncHandler(userPersonalController.getUserExpectationsById)
);

userPersonalRouter.post(
  "/expectations",
  authenticate,
  validation.validateUserExpectations,
  asyncHandler(userPersonalController.createUserExpectations)
);

userPersonalRouter.put(
  "/expectations/",
  authenticate,
  asyncHandler(userPersonalController.updateUserExpectations)
);

userPersonalRouter.get(
  "/onboarding-status",
  authenticate,
  asyncHandler(userPersonalController.getUserOnboardingStatus)
);
userPersonalRouter.put(
  "/onboarding-status",
  authenticate,
  asyncHandler(userPersonalController.updateUserOnboardingStatus)
);

userPersonalRouter.post(
  "/upload/photos",
  authenticate,
  photoUploadGatewayLimiter,
  profilePhotoUpload.single("file"),
  asyncHandler(uploadController.uploadPhotoController)
);
userPersonalRouter.get(
  "/upload/photos",
  authenticate,
  asyncHandler(uploadController.getPhotosController)
);
userPersonalRouter.put(
  "/upload/photos",
  authenticate,
  photoUploadGatewayLimiter,
  profilePhotoUpload.single("file"),
  asyncHandler(uploadController.updatePhotoController)
);

userPersonalRouter.delete(
  "/upload/photos",
  authenticate,
  asyncHandler(uploadController.deletePhotoController)
);

userPersonalRouter.post(
  "/upload/government-id",
  authenticate,
  photoUploadGatewayLimiter,
  governmentIdUpload.single("file"),
  asyncHandler(uploadController.uploadGovernmentIdController)
);

userPersonalRouter.get(
  "/upload/government-id",
  authenticate,
  asyncHandler(uploadController.getGovernmentIdController)
);

userPersonalRouter.put(
  "/upload/government-id",
  authenticate,
  photoUploadGatewayLimiter,
  governmentIdUpload.single("file"),
  asyncHandler(uploadController.updateGovernmentIdController)
);

userPersonalRouter.get(
  "/review/status",
  authenticate,
  asyncHandler(userPersonalController.getProfileReviewStatusController)
);
userPersonalRouter.post(
  "/review/submit",
  authenticate,
  asyncHandler(userPersonalController.submitProfileForReviewController)
);

export default userPersonalRouter;
