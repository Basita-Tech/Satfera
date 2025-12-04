import { Router } from "express";
import * as connectionController from "../../../../controllers/userController/connectionController";
import authenticate from "../../../../middleware/authMiddleware";

const requestRouter = Router();

requestRouter.get("/all", authenticate, connectionController.getSentRequests);

requestRouter.get(
  "/all/received",
  authenticate,
  connectionController.getReceivedRequests
);

requestRouter.post(
  "/send",
  authenticate,
  connectionController.sendConnectionRequest
);
requestRouter.post(
  "/accept",
  authenticate,
  connectionController.acceptConnectionRequest
);

requestRouter.post(
  "/reject",
  authenticate,
  connectionController.rejectConnectionRequest
);

requestRouter.post(
  "/accepted/reject",
  authenticate,
  connectionController.rejectAcceptedConnection
);

requestRouter.post(
  "/rejected/accept",
  authenticate,
  connectionController.acceptRejectedConnection
);

requestRouter.get(
  "/approve",
  authenticate,
  connectionController.getApprovedConnections
);

requestRouter.post(
  "/withdraw",
  authenticate,
  connectionController.withdrawConnection
);

requestRouter.get(
  "/favorites",
  authenticate,
  connectionController.getFavorites
);

requestRouter.post(
  "/favorites/add",
  authenticate,
  connectionController.addToFavorites
);

requestRouter.post(
  "/favorites/remove",
  authenticate,
  connectionController.removeFromFavorites
);

export default requestRouter;
