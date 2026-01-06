import express from "express";
import * as recommendationController from "../../../../controllers";
import authenticate from "../../../../middleware/authMiddleware";
import { asyncHandler } from "../../../../utils/utils";

const recommendationRouter = express.Router();

// recommendationRouter.get(
//   "/recommendations",
//   authenticate,
//   recommendationController.getRecommendations
// );

recommendationRouter.get(
  "/matches",
  authenticate,
  asyncHandler(recommendationController.getMatches)
);
recommendationRouter.get(
  "/profile/:candidateId",
  authenticate,
  asyncHandler(recommendationController.getProfile)
);

recommendationRouter.get(
  "/profiles",
  authenticate,
  asyncHandler(recommendationController.getAllProfiles)
);

export default recommendationRouter;
