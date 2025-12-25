import mongoose, { FilterQuery } from "mongoose";
import {
  SupportTicket,
  SupportTicketStatus,
  MessageSender,
  SupportMessage,
  ISupportTicket
} from "../../../models";

export class SupportService {
  static async getTicketWithHistory(
    ticketId: string,
    userId?: string,
    isAdmin: boolean = true
  ) {
    const tId = new mongoose.Types.ObjectId(ticketId);

    const ticketQuery: FilterQuery<ISupportTicket> = { _id: tId };
    if (!isAdmin && userId) {
      ticketQuery.userId = new mongoose.Types.ObjectId(userId);
    }

    const [ticket, messages] = await Promise.all([
      SupportTicket.findOne(ticketQuery).lean(),
      SupportMessage.find({ ticketId: tId }).sort({ createdAt: 1 }).lean()
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

    const message = new SupportMessage({
      ticketId: ticket._id,
      text: data.text,
      sender: data.sender,
      senderId: new mongoose.Types.ObjectId(data.userId)
    });

    const shouldUpdateStatus =
      data.sender === MessageSender.ADMIN &&
      ticket.status === SupportTicketStatus.OPEN;

    const saveOperations = [message.save()];

    if (shouldUpdateStatus) {
      saveOperations.push(
        SupportTicket.updateOne(
          { _id: ticket._id },
          { status: SupportTicketStatus.IN_PROGRESS }
        ) as any
      );
    }

    const [savedMessage] = await Promise.all(saveOperations);
    return savedMessage;
  }

  static async updateStatus(ticketId: string, status: SupportTicketStatus) {
    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { status },
      { new: true }
    ).lean();

    if (!ticket) throw new Error("Ticket not found");
    return {
      message: "Ticket update successful"
    };
  }

  static async getAllTickets(
    filters: FilterQuery<ISupportTicket> = {},
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const result = await SupportTicket.aggregate([
      { $match: filters },

      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
          ],

          totalCount: [{ $count: "count" }],

          statusCounts: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const total = result[0].totalCount[0]?.count || 0;

    const statusCounts = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };

    result[0].statusCounts.forEach((item) => {
      statusCounts[item._id] = item.count;
    });

    return {
      data: result[0].data,
      statusCounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
