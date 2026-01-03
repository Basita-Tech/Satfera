import { Router } from "express";
import { SupportController } from "../../../controllers/supportController";
import { authenticate } from "../../../middleware/authMiddleware";

const supportRouter = Router();

supportRouter.post("/tickets", authenticate, SupportController.createTicket);
supportRouter.get("/tickets", authenticate, SupportController.getUserTickets);
supportRouter.get(
  "/tickets/:id",
  authenticate,
  SupportController.getTicketDetails
);
supportRouter.post(
  "/tickets/:id/messages",
  authenticate,
  SupportController.addMessage
);

export default supportRouter;
