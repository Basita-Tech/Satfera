import { Router } from "express";
import {
  createUserPersonalController,
  getUserPersonalController,
  updateUserPersonalController,
  deleteUserPersonalController,
  addUserFamilyDetails,
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
userPersonalRouter.delete(
  "/:userId",
  authenticate,
  deleteUserPersonalController
);

userPersonalRouter.post("/family/:userId", authenticate, addUserFamilyDetails);

export default userPersonalRouter;
