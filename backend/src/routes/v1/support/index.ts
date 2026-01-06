import { Router } from "express";
import { SupportController } from "../../../controllers/supportController";
import { authenticate } from "../../../middleware/authMiddleware";
import { asyncHandler } from "../../../utils/utils";

const supportRouter = Router();

supportRouter.post(
  "/tickets",
  authenticate,
  asyncHandler(SupportController.createTicket)
);
supportRouter.get(
  "/tickets",
  authenticate,
  asyncHandler(SupportController.getUserTickets)
);
supportRouter.get(
  "/tickets/:id",
  authenticate,
  asyncHandler(SupportController.getTicketDetails)
);
supportRouter.post(
  "/tickets/:id/messages",
  authenticate,
  asyncHandler(SupportController.addMessage)
);

export default supportRouter;
