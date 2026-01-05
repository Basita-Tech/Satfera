import { Router } from "express";
import { SupportController } from "../../../../controllers/supportController";
import { authenticate } from "../../../../middleware/authMiddleware";
import { asyncHandler } from "../../../../utils/utils";

const userSupportRouter = Router();

userSupportRouter.post(
  "/tickets",
  authenticate,
  asyncHandler(SupportController.createTicket)
);
userSupportRouter.get(
  "/tickets",
  authenticate,
  asyncHandler(SupportController.getUserTickets)
);
userSupportRouter.get(
  "/tickets/:id",
  authenticate,
  asyncHandler(SupportController.getTicketDetails)
);
userSupportRouter.post(
  "/tickets/:id/messages",
  authenticate,
  asyncHandler(SupportController.addMessage)
);

export default userSupportRouter;
