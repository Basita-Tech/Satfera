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
} from "../controllers/userPersonal";
import { CreateUserPersonalValidation } from "../validation/validation";
import { authenticate } from "../middleware/authMiddleware";
import { createUserEducationDetailsService } from "../services/userPersonal";

const userPersonalRouter = Router();

userPersonalRouter.post(
  "/",
  authenticate,
  CreateUserPersonalValidation,
  createUserPersonalController
);
userPersonalRouter.get("/:userId", authenticate, getUserPersonalController);
userPersonalRouter.put(
  "/:userId",
  authenticate,
  CreateUserPersonalValidation,
  updateUserPersonalController
);

userPersonalRouter.post("/family/:userId", authenticate, addUserFamilyDetails);
userPersonalRouter.get("/family/:userId", authenticate, getUserFamilyDetails);
userPersonalRouter.put(
  "/family/:userId",
  authenticate,
  updateUserPersonalController
);

userPersonalRouter.get(
  "/education/:userId",
  authenticate,
  getUserEducationDetails
);
userPersonalRouter.post(
  "/education/:userId",
  authenticate,
  createUserEducationDetails
);
userPersonalRouter.put(
  "/education/:userId",
  createUserEducationDetailsService,
  authenticate,
  updateUserEducationDetails
);

export default userPersonalRouter;
