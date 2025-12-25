import {
  SupportTicket,
  ISupportTicket,
  SupportTicketStatus
} from "../models/Support";
import { SupportMessage, MessageSender } from "../models/SupportMessage";
import mongoose from "mongoose";
import { logger } from "../lib/common/logger";
import { generateTicketId } from "../utils/utils";

export class SupportService {
  static async createTicket(data: {
    userId: string;
    name: string;
    userCustomId?: string;
    email: string;
    phone?: string;
    subject: string;
    description: string;
    category: string;
    initialMessage: string;
  }): Promise<ISupportTicket> {
    const session = await mongoose.startSession();

    session.startTransaction();

    try {
      const ticketId = generateTicketId();
      const userIdObj = new mongoose.Types.ObjectId(data.userId);

      const ticket = new SupportTicket({
        userId: userIdObj,
        ticketId,
        name: data.name,
        userCustomId: data.userCustomId,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        description: data.description,
        category: data.category,
        status: SupportTicketStatus.OPEN
      });

      const firstMessage = new SupportMessage({
        ticketId: ticket._id,
        text: data.initialMessage,
        sender: MessageSender.USER,
        senderId: userIdObj
      });

      await ticket.save({ session });
      await firstMessage.save({ session });

      await session.commitTransaction();

      logger.info(`Support ticket created: ${ticketId}`);

      return ticket;
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Error creating support ticket: ${error}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getUserTickets(userId: string, limit = 50, skip = 0) {
    return SupportTicket.find({
      userId: new mongoose.Types.ObjectId(userId)
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  static async getTicketWithHistory(
    ticketId: string,
    userId?: string,
    isAdmin: boolean = false
  ) {
    const tId = new mongoose.Types.ObjectId(ticketId);

    const ticketPromise = SupportTicket.findOne({
      _id: tId,
      ...(!isAdmin && userId
        ? { userId: new mongoose.Types.ObjectId(userId) }
        : {})
    }).lean();

    const messagesPromise = SupportMessage.find({ ticketId: tId })
      .sort({ createdAt: 1 })
      .lean();

    const [ticket, messages] = await Promise.all([
      ticketPromise,
      messagesPromise
    ]);

    if (!ticket) {
      throw new Error("Ticket not found or access denied");
    }

    return { ...ticket, messages };
  }

  static async addMessage(data: {
    ticketId: string;
    userId: string;
    text: string;
    sender: MessageSender;
  }) {
    const ticket = await SupportTicket.findById(data.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    if (
      data.sender === MessageSender.USER &&
      String(ticket.userId) !== data.userId
    ) {
      throw new Error("Access denied");
    }

    const message = new SupportMessage({
      ticketId: ticket._id,
      text: data.text,
      sender: data.sender,
      senderId: new mongoose.Types.ObjectId(data.userId)
    });

    const statusUpdatePromise =
      data.sender === MessageSender.ADMIN &&
      ticket.status === SupportTicketStatus.OPEN
        ? SupportTicket.updateOne(
            { _id: ticket._id },
            { status: SupportTicketStatus.IN_PROGRESS }
          )
        : Promise.resolve();

    const [savedMessage] = await Promise.all([
      message.save(),
      statusUpdatePromise
    ]);

    return savedMessage;
  }
}
