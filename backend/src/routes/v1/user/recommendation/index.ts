import express from "express";
import * as recommendationController from "../../../../controllers";
import authenticate from "../../../../middleware/authMiddleware";

const recommendationRouter = express.Router();

// recommendationRouter.get(
//   "/recommendations",
//   authenticate,
//   recommendationController.getRecommendations
// );

recommendationRouter.get(
  "/matches",
  authenticate,
  recommendationController.getMatches
);
recommendationRouter.get(
  "/profile/:candidateId",
  authenticate,
  recommendationController.getProfile
);

recommendationRouter.get(
  "/profiles",
  authenticate,
  recommendationController.getAllProfiles
);

export default recommendationRouter;
