import { Router } from "express";
import { SupportController } from "../../../../controllers/supportController";
import { authenticate } from "../../../../middleware/authMiddleware";

const userSupportRouter = Router();

userSupportRouter.post(
  "/tickets",
  authenticate,
  SupportController.createTicket
);
userSupportRouter.get(
  "/tickets",
  authenticate,
  SupportController.getUserTickets
);
userSupportRouter.get(
  "/tickets/:id",
  authenticate,
  SupportController.getTicketDetails
);
userSupportRouter.post(
  "/tickets/:id/messages",
  authenticate,
  SupportController.addMessage
);

export default userSupportRouter;
