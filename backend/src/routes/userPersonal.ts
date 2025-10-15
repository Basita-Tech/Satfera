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
} from "../controllers/userPersonal";
import {
  CreateUserPersonalValidation,
  UserHealthValidation,
  validateUserExpectations,
} from "../validation/validation";
import { authenticate } from "../middleware/authMiddleware";
import { createUserEducationDetailsService } from "../services/userPersonal";

const userPersonalRouter = Router();

userPersonalRouter.post(
  "/",
  authenticate,
  CreateUserPersonalValidation,
  createUserPersonalController
);
userPersonalRouter.get("/", authenticate, getUserPersonalController);
userPersonalRouter.put(
  "/",
  authenticate,
  CreateUserPersonalValidation,
  updateUserPersonalController
);

userPersonalRouter.post("/family", authenticate, addUserFamilyDetails);
userPersonalRouter.get("/family", authenticate, getUserFamilyDetails);
userPersonalRouter.put("/family", authenticate, updateUserPersonalController);

userPersonalRouter.get("/education", authenticate, getUserEducationDetails);
userPersonalRouter.post("/education", authenticate, createUserEducationDetails);
userPersonalRouter.put(
  "/education",
  createUserEducationDetailsService,
  authenticate,
  updateUserEducationDetails
);

userPersonalRouter.get("/health", authenticate, getUserHealthController);

userPersonalRouter.post(
  "/health",
  authenticate,
  UserHealthValidation,
  addUserHealthController
);

userPersonalRouter.put(
  "/health  ",
  authenticate,
  UserHealthValidation,
  updateUserHealthController
);

userPersonalRouter.get("/expectations", authenticate, getUserExpectationsById);

userPersonalRouter.post(
  "/expectations",
  authenticate,
  validateUserExpectations,
  createUserExpectations
);

userPersonalRouter.put("/expectations/", authenticate, updateUserExpectations);

export default userPersonalRouter;
