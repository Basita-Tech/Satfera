import { Response } from "express";
import { SupportService } from "../services/supportService";
import { MessageSender } from "../models/SupportMessage";
import { AuthenticatedRequest } from "../types";
import { logger } from "../lib/common/logger";
import { User } from "../models";

export class SupportController {
  static async createTicket(req: AuthenticatedRequest, res: Response) {
    const { subject, category, message, description } = req.body;
    if (!subject || !category || !message || !description) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    try {
      const { id, fullName } = req.user!;
      const user = await User.findById(id)
        .select("email phoneNumber customId")
        .lean();

      const ticket = await SupportService.createTicket({
        userId: id,
        userCustomId: user?.customId,
        name: fullName,
        email: user?.email,
        phone: user?.phoneNumber,
        subject,
        category,
        description,
        initialMessage: message
      });

      return res.status(201).json({ success: true, data: ticket });
    } catch (error: any) {
      logger.error(`CreateTicket Error: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  static async getUserTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const tickets = await SupportService.getUserTickets(req.user!.id);
      return res.status(200).json({ success: true, data: tickets });
    } catch (error: any) {
      logger.error(`GetUserTickets Error: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  static async getTicketDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const ticket = await SupportService.getTicketWithHistory(
        req.params.id,
        req.user!.id,
        req.user!.role === "admin"
      );
      return res.status(200).json({ success: true, data: ticket });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      logger.error(`GetTicketDetails Error: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  static async addMessage(req: AuthenticatedRequest, res: Response) {
    const { text } = req.body;
    if (!text)
      return res
        .status(400)
        .json({ success: false, message: "Message required" });

    try {
      const sender =
        req.user!.role === "admin" ? MessageSender.ADMIN : MessageSender.USER;

      const message = await SupportService.addMessage({
        ticketId: req.params.id,
        userId: req.user!.id,
        text,
        sender
      });

      return res.status(201).json({ success: true, data: message });
    } catch (error: any) {
      const isAuthError = error.message.includes("Access denied");
      if (!isAuthError) logger.error(`AddMessage Error: ${error.message}`);

      return res.status(isAuthError ? 403 : 500).json({
        success: false,
        message: error.message
      });
    }
  }
}
