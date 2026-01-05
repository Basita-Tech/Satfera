import { Router } from "express";
import * as connectionController from "../../../../controllers/userController/connectionController";
import authenticate from "../../../../middleware/authMiddleware";
import { asyncHandler } from "../../../../utils/utils";

const requestRouter = Router();

requestRouter.get("/all", authenticate, connectionController.getSentRequests);

requestRouter.get(
  "/all/received",
  authenticate,
  asyncHandler(connectionController.getReceivedRequests)
);

requestRouter.post(
  "/send",
  authenticate,
  asyncHandler(connectionController.sendConnectionRequest)
);
requestRouter.post(
  "/accept",
  authenticate,
  asyncHandler(connectionController.acceptConnectionRequest)
);

requestRouter.post(
  "/reject",
  authenticate,
  asyncHandler(connectionController.rejectConnectionRequest)
);

requestRouter.post(
  "/accepted/reject",
  authenticate,
  asyncHandler(connectionController.rejectAcceptedConnection)
);

requestRouter.post(
  "/rejected/accept",
  authenticate,
  asyncHandler(connectionController.acceptRejectedConnection)
);

requestRouter.get(
  "/approve",
  authenticate,
  asyncHandler(connectionController.getApprovedConnections)
);

requestRouter.post(
  "/withdraw",
  authenticate,
  asyncHandler(connectionController.withdrawConnection)
);

requestRouter.get(
  "/favorites",
  authenticate,
  asyncHandler(connectionController.getFavorites)
);

requestRouter.post(
  "/favorites/add",
  authenticate,
  asyncHandler(connectionController.addToFavorites)
);

requestRouter.post(
  "/favorites/remove",
  authenticate,
  asyncHandler(connectionController.removeFromFavorites)
);

export default requestRouter;
