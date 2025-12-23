import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { SupportService } from "../../services/commonService/supportService";
import { logger } from "../../../lib";
import { MessageSender, SupportTicketStatus } from "../../../models";

export class SupportController {
  static async getAllTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const { status, category, page, limit } = req.query;
      const filters: any = {};
      if (status) filters.status = status;
      if (category) filters.category = category;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;

      const result = await SupportService.getAllTickets(
        filters,
        pageNum,
        limitNum
      );

      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      logger.error(`Controller Error (getAllTickets): ${error.message}`);
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
        true
      );
      return res.status(200).json({ success: true, data: ticket });
    } catch (error: any) {
      const isNotFound = error.message.includes("not found");
      if (!isNotFound) logger.error(`GetTicketDetails Error: ${error.message}`);

      return res.status(isNotFound ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { status } = req.body;
      if (!Object.values(SupportTicketStatus).includes(status)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid status" });
      }

      const { message } = await SupportService.updateStatus(
        req.params.id,
        status
      );
      return res.status(200).json({ success: true, message });
    } catch (error: any) {
      logger.error(`UpdateStatus Error: ${error.message}`);
      return res.status(error.message.includes("not found") ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async addMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { text } = req.body;
      if (!text)
        return res
          .status(400)
          .json({ success: false, message: "Message required" });

      const message = await SupportService.addMessage({
        ticketId: req.params.id,
        userId: req.user!.id,
        text,
        sender: MessageSender.ADMIN
      });

      return res.status(201).json({ success: true, data: message });
    } catch (error: any) {
      logger.error(`AddMessage Error: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
