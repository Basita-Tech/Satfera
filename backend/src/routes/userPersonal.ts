import { Router } from "express";
import {
  createUserPersonalController,
  getUserPersonalController,
  updateUserPersonalController,
  addUserFamilyDetails,
  getUserFamilyDetails,
} from "../controllers/userPersonal";
import { CreateUserPersonalValidation } from "../validation/validation";
import { authenticate } from "../middleware/authMiddleware";

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

export default userPersonalRouter;
