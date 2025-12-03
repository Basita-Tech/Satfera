import { Response } from "express";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../../../types";
import {
  ConnectionRequest,
  Notification,
  User,
  UserPersonal,
  Profile,
  UserProfession
} from "../../../models";
import { logger } from "../../../lib/common/logger";
import { isEitherBlocked } from "../../../lib/common/blockUtils";
import { computeMatchScore } from "../../../services";
import { formatListingProfile } from "../../../lib/common/formatting";

async function createNotificationBatch(
  notifications: Array<{
    user: mongoose.Types.ObjectId | string;
    type: string;
    title: string;
    message: string;
    meta?: Record<string, any>;
  }>
) {
  await Notification.insertMany(notifications);
}

export async function getAllConnectionRequests(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const requests = await ConnectionRequest.find({
      receiver: userId,
      status: { $ne: "withdrawn" }
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    logger.error("Error fetching connection requests", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch connection requests."
    });
  }
}

export async function getSentRequests(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const sentRequests = await ConnectionRequest.find({
      sender: userObjectId,
      status: { $ne: "withdrawn" }
    })
      .populate("receiver", "firstName lastName dateOfBirth gender")
      .lean();

    if (sentRequests.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const receiverIds = sentRequests.map(
      (r: any) => r.receiver._id || r.receiver
    );

    const [personals, profiles, users, professions, authUser] =
      await Promise.all([
        UserPersonal.find({ userId: { $in: receiverIds } })
          .select(
            "userId full_address.city full_address.state residingCountry religion subCaste"
          )
          .lean(),
        Profile.find({ userId: { $in: receiverIds } })
          .select("userId favoriteProfiles photos.closerPhoto.url")
          .lean(),
        User.find(
          { _id: { $in: receiverIds } },
          "firstName lastName dateOfBirth blockedUsers"
        ).lean(),
        UserProfession.find({ userId: { $in: receiverIds } })
          .select("userId Occupation")
          .lean(),
        User.findById(userObjectId).select("blockedUsers").lean()
      ]);

    const personalMap = new Map(
      personals.map((p: any) => [p.userId.toString(), p])
    );
    const profileMap = new Map(
      profiles.map((p: any) => [p.userId.toString(), p])
    );
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
    const professionMap = new Map(
      professions.map((p: any) => [p.userId.toString(), p])
    );

    const result = await Promise.all(
      sentRequests.map(async (connReq: any) => {
        const receiverId = connReq.receiver._id || connReq.receiver;
        const receiverIdStr = receiverId.toString();
        const receiverUser = userMap.get(receiverIdStr);
        const receiverPersonal = personalMap.get(receiverIdStr);
        const receiverProfile = profileMap.get(receiverIdStr);

        try {
          const blockedByAuth = (authUser as any)?.blockedUsers || [];
          const blockedByReceiver = (receiverUser as any)?.blockedUsers || [];
          if (
            blockedByAuth.some((id: any) => String(id) === receiverIdStr) ||
            blockedByReceiver.some((id: any) => String(id) === userId)
          ) {
            return null;
          }
        } catch (e) {}

        if (!receiverUser) return null;

        const scoreDetail = await computeMatchScore(userObjectId, receiverId);
        const receiverProfession = professionMap.get(receiverIdStr);

        const formatted = await formatListingProfile(
          receiverUser,
          receiverPersonal,
          receiverProfile,
          receiverProfession,
          scoreDetail || { score: 0, reasons: [] },
          connReq.status
        );

        if (connReq.status === "pending" && connReq._id) {
          formatted.user = formatted.user || {};
          formatted.user.connectionId = connReq._id.toString();
        }

        return formatted;
      })
    );

    const validResults = result.filter((r) => r !== null);

    logger.info(
      `Sent requests fetched for user ${userId} - Total: ${validResults}`
    );

    res.status(200).json({
      success: true,
      data: validResults
    });
  } catch (err: any) {
    logger.error("Error fetching sent requests:", {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch sent requests."
    });
  }
}

export async function getReceivedRequests(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const receivedRequests = await ConnectionRequest.find({
      receiver: userObjectId,
      status: { $ne: "withdrawn" }
    })
      .populate("sender", "firstName lastName dateOfBirth gender")
      .lean();

    if (receivedRequests.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const senderIds = receivedRequests.map(
      (r: any) => r.sender._id || r.sender
    );

    const [personals, profiles, users, professions, authUser] =
      await Promise.all([
        UserPersonal.find({ userId: { $in: senderIds } })
          .select(
            "userId full_address.city full_address.state residingCountry religion subCaste"
          )
          .lean(),
        Profile.find({ userId: { $in: senderIds } })
          .select("userId favoriteProfiles photos.closerPhoto.url")
          .lean(),
        User.find(
          { _id: { $in: senderIds } },
          "firstName lastName dateOfBirth blockedUsers"
        ).lean(),
        UserProfession.find({ userId: { $in: senderIds } })
          .select("userId Occupation")
          .lean(),
        User.findById(userObjectId).select("blockedUsers").lean()
      ]);

    const personalMap = new Map(
      personals.map((p: any) => [p.userId.toString(), p])
    );
    const profileMap = new Map(
      profiles.map((p: any) => [p.userId.toString(), p])
    );
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
    const professionMap = new Map(
      professions.map((p: any) => [p.userId.toString(), p])
    );

    const result = await Promise.all(
      receivedRequests.map(async (connReq: any) => {
        const senderId = connReq.sender._id || connReq.sender;
        const senderIdStr = senderId.toString();
        const senderUser = userMap.get(senderIdStr);
        const senderPersonal = personalMap.get(senderIdStr);
        const senderProfile = profileMap.get(senderIdStr);

        try {
          const blockedByAuth = (authUser as any)?.blockedUsers || [];
          const blockedBySender = (senderUser as any)?.blockedUsers || [];
          if (
            blockedByAuth.some((id: any) => String(id) === senderIdStr) ||
            blockedBySender.some((id: any) => String(id) === userId)
          ) {
            return null;
          }
        } catch (e) {}

        if (!senderUser) return null;

        const scoreDetail = await computeMatchScore(userObjectId, senderId);
        const senderProfession = professionMap.get(senderIdStr);

        const formatted = await formatListingProfile(
          senderUser,
          senderPersonal,
          senderProfile,
          senderProfession,
          scoreDetail || { score: 0, reasons: [] },
          connReq.status
        );

        if (connReq.status === "pending" && connReq._id) {
          formatted.user = formatted.user || {};
          formatted.user.connectionId = connReq._id.toString();
        }

        return formatted;
      })
    );

    const validResults = result.filter((r) => r !== null);

    logger.info(
      `Received requests fetched for user ${userId} - Total: ${validResults.length}`
    );

    res.status(200).json({
      success: true,
      data: validResults
    });
  } catch (err: any) {
    logger.error("Error fetching received requests:", {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch received requests."
    });
  }
}

export async function sendConnectionRequest(
  req: AuthenticatedRequest,
  res: Response
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const senderId = req.user!.id;
    const { receiverId } = req.body;

    if (senderId === receiverId) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot send request to yourself." });
    }

    const [sender, receiver] = await Promise.all([
      User.findById(senderId).lean(),
      User.findById(receiverId).lean()
    ]);

    if (!receiver) {
      return res
        .status(404)
        .json({ success: false, message: "Receiver not found." });
    }

    try {
      const blocked = await isEitherBlocked(senderId, receiverId);
      if (blocked) {
        return res.status(403).json({
          success: false,
          message: "Action not allowed: one of the users has blocked the other."
        });
      }
    } catch (e) {
      return res.status(403).json({
        success: false,
        message: "Action not allowed."
      });
    }

    const existing = await ConnectionRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ],
      status: { $ne: "withdrawn" }
    }).session(session);

    if (existing) {
      const existingStatus = existing.status;
      const isOutgoing = String(existing.sender) === String(senderId);

      if (existingStatus === "pending") {
        if (isOutgoing) {
          return res.status(409).json({
            success: false,
            message: "A pending connection request already exists."
          });
        }

        return res.status(409).json({
          success: false,
          message:
            "This user has already sent you a connection request. Check your received requests to accept or reject."
        });
      }

      if (existingStatus === "accepted") {
        return res.status(409).json({
          success: false,
          message: "You are already connected with this user."
        });
      }

      if (existingStatus === "rejected") {
        return res.status(409).json({
          success: false,
          message:
            "A previous connection request was rejected. You cannot send a new request at this time."
        });
      }

      if (existingStatus === "blocked") {
        return res.status(403).json({
          success: false,
          message: "Action not allowed: one of the users has blocked the other."
        });
      }

      return res.status(409).json({
        success: false,
        message: "A connection record already exists between these users."
      });
    }

    const newRequest = await ConnectionRequest.create(
      [{ sender: senderId, receiver: receiverId, status: "pending" }],
      { session }
    );

    await createNotificationBatch([
      {
        user: receiverId,
        type: "request_received",
        title: "New connection request",
        message: `${
          sender?.firstName || "Someone"
        } sent you a connection request.`,
        meta: { senderId }
      },
      {
        user: senderId,
        type: "request_sent",
        title: "Request sent",
        message: `You sent a connection request to ${receiver.firstName} ${receiver.lastName}.`,
        meta: { receiverId }
      }
    ]);

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: "Connection request sent successfully."
    });
  } catch (err) {
    await session.abortTransaction();
    logger.error("Error sending connection request:", err);
    res
      .status(500)
      .json({ success: false, message: "Error sending connection request." });
  } finally {
    session.endSession();
  }
}

export async function acceptConnectionRequest(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const { requestId } = req.body;

    const request = await ConnectionRequest.findOneAndUpdate(
      { _id: requestId, receiver: userId, status: "pending" },
      { status: "accepted", actionedBy: userId },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found or already handled."
      });
    }

    try {
      const blocked = await isEitherBlocked(String(request.sender), userId);
      if (blocked) {
        return res.status(403).json({
          success: false,
          message: "Action not allowed: one of the users has blocked the other."
        });
      }
    } catch (e) {
      return res
        .status(403)
        .json({ success: false, message: "Action not allowed." });
    }

    const receiver = await User.findById(userId).lean();

    await createNotificationBatch([
      {
        user: request.sender,
        type: "request_accepted",
        title: "Request accepted",
        message: `${
          receiver?.firstName || "User"
        } accepted your connection request.`,
        meta: { receiverId: userId }
      }
    ]);

    res.status(200).json({ success: true, data: request });
  } catch (err) {
    logger.error("Error accepting connection request:", err);
    res
      .status(500)
      .json({ success: false, message: "Error accepting connection request." });
  }
}

export async function rejectConnectionRequest(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const { requestId } = req.body;

    const request = await ConnectionRequest.findOneAndUpdate(
      { _id: requestId, receiver: userId, status: "pending" },
      { status: "rejected", actionedBy: userId },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found or already processed."
      });
    }

    try {
      const blocked = await isEitherBlocked(String(request.sender), userId);
      if (blocked) {
        return res.status(403).json({
          success: false,
          message: "Action not allowed: one of the users has blocked the other."
        });
      }
    } catch (e) {
      return res
        .status(403)
        .json({ success: false, message: "Action not allowed." });
    }

    const receiver = await User.findById(userId).lean();

    await createNotificationBatch([
      {
        user: request.sender,
        type: "request_rejected",
        title: "Request rejected",
        message: `${
          receiver?.firstName || "User"
        } rejected your connection request.`,
        meta: { receiverId: userId }
      }
    ]);

    res.status(200).json({ success: true, data: request });
  } catch (err) {
    logger.error("Error rejecting connection request:", err);
    res
      .status(500)
      .json({ success: false, message: "Error rejecting connection request." });
  }
}

export async function getApprovedConnections(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "20"), 10))
    );

    const filter = {
      $or: [{ sender: userObjectId }, { receiver: userObjectId }],
      status: "accepted"
    };

    const total = await ConnectionRequest.countDocuments(filter);

    const connections = await ConnectionRequest.find(filter, {
      sender: 1,
      receiver: 1,
      updatedAt: 1
    })
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (connections.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { total, page, limit, pages: Math.ceil(total / limit) }
      });
    }

    const otherUserIds = connections.map((c: any) => {
      const senderId = c.sender.toString();
      const receiverId = c.receiver.toString();
      return senderId === userId ? receiverId : senderId;
    });

    const [users, personals, profiles, professions, authUser] =
      await Promise.all([
        User.find(
          {
            _id: {
              $in: otherUserIds.map((id) => new mongoose.Types.ObjectId(id))
            }
          },
          "firstName lastName dateOfBirth blockedUsers"
        ).lean(),
        UserPersonal.find({ userId: { $in: otherUserIds } })
          .select(
            "userId full_address.city full_address.state residingCountry religion subCaste"
          )
          .lean(),
        Profile.find({ userId: { $in: otherUserIds } })
          .select("userId favoriteProfiles photos.closerPhoto.url")
          .lean(),
        UserProfession.find({ userId: { $in: otherUserIds } })
          .select("userId Occupation")
          .lean(),
        User.findById(userObjectId).select("blockedUsers").lean()
      ]);

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
    const personalMap = new Map(
      personals.map((p: any) => [p.userId.toString(), p])
    );
    const profileMap = new Map(
      profiles.map((p: any) => [p.userId.toString(), p])
    );
    const professionMap = new Map(
      professions.map((p: any) => [p.userId.toString(), p])
    );

    const formattedConnections = await Promise.all(
      connections.map(async (conn: any) => {
        const otherUserId =
          conn.sender.toString() === userId
            ? conn.receiver.toString()
            : conn.sender.toString();

        const otherUser = userMap.get(otherUserId);

        try {
          const blockedByAuth = (authUser as any)?.blockedUsers || [];
          const blockedByOther = (otherUser as any)?.blockedUsers || [];
          if (
            blockedByAuth.some((id: any) => String(id) === otherUserId) ||
            blockedByOther.some((id: any) => String(id) === userId)
          ) {
            return null;
          }
        } catch (e) {}
        if (!otherUser) return null;

        const personal = personalMap.get(otherUserId);
        const profile = profileMap.get(otherUserId);
        const profession = professionMap.get(otherUserId);

        const scoreDetail = await computeMatchScore(
          userObjectId,
          new mongoose.Types.ObjectId(otherUserId)
        );

        return formatListingProfile(
          otherUser,
          personal,
          profile,
          profession,
          scoreDetail || { score: 0, reasons: [] },
          conn.status
        );
      })
    );

    const validConnections = formattedConnections.filter((c) => c !== null);

    res.status(200).json({
      success: true,
      data: validConnections,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    logger.error("Error fetching approved connections", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch approved connections."
    });
  }
}

export async function withdrawConnection(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const { connectionId } = req.body;

    const connection = await ConnectionRequest.findOneAndUpdate({
      _id: connectionId,
      $or: [{ sender: userId }, { receiver: userId }]
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found"
      });
    }
    if (connection.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Cannot withdraw an accepted connection."
      });
    }

    if (connection.status === "pending") {
      await connection.deleteOne();
    }

    res.status(200).json({
      success: true,
      message: "Connection withdrawn successfully."
    });
  } catch (err) {
    logger.error("Error withdrawing connection", err);
    res.status(500).json({
      success: false,
      message: "Failed to withdraw connection."
    });
  }
}

export const getFavorites = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const viewerId = req.user?.id;
    if (!viewerId || typeof viewerId !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Authentication required" });
    }

    const viewerObjectId = new mongoose.Types.ObjectId(viewerId);

    const viewerProfile: any = await Profile.findOne({
      userId: viewerObjectId
    }).lean();
    const favoriteIds =
      viewerProfile && Array.isArray(viewerProfile.favoriteProfiles)
        ? (viewerProfile.favoriteProfiles as any[]).map(
            (f: any) => new mongoose.Types.ObjectId(f)
          )
        : [];

    if (!favoriteIds.length) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: favoriteIds.length,
          total: 0,
          hasMore: false
        }
      });
    }

    const [users, personals, profiles, professions, authUser] =
      await Promise.all([
        User.find(
          { _id: { $in: favoriteIds } },
          "firstName lastName dateOfBirth blockedUsers"
        ).lean(),
        UserPersonal.find({ userId: { $in: favoriteIds } })
          .select(
            "userId full_address.city full_address.state residingCountry religion subCaste"
          )
          .lean(),
        Profile.find({ userId: { $in: favoriteIds } })
          .select("userId favoriteProfiles photos.closerPhoto.url")
          .lean(),
        UserProfession.find({ userId: { $in: favoriteIds } })
          .select("userId Occupation")
          .lean(),
        User.findById(viewerObjectId).select("blockedUsers").lean()
      ]);

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
    const personalMap = new Map(
      personals.map((p: any) => [p.userId.toString(), p])
    );
    const profileMap = new Map(
      profiles.map((p: any) => [p.userId.toString(), p])
    );
    const professionMap = new Map(
      professions.map((p: any) => [p.userId.toString(), p])
    );

    const formattedResults = await Promise.all(
      favoriteIds.map(async (fid: any) => {
        const cid = fid.toString();
        const user = userMap.get(cid);
        const personal = personalMap.get(cid);
        const candidateProfile = profileMap.get(cid) || null;

        try {
          const blockedByAuth = (authUser as any)?.blockedUsers || [];
          const blockedByOther = (user as any)?.blockedUsers || [];
          if (
            blockedByAuth.some((id: any) => String(id) === cid) ||
            blockedByOther.some((id: any) => String(id) === viewerId)
          ) {
            return null;
          }
        } catch (e) {}
        if (!user) return null;
        const score = await computeMatchScore(viewerObjectId, fid);
        const profession = professionMap.get(cid);
        return formatListingProfile(
          user,
          personal,
          candidateProfile,
          profession,
          score || { score: 0, reasons: [] },
          null
        );
      })
    );

    const validResults = formattedResults.filter((r: any) => r !== null);

    return res.json({ success: true, data: validResults });
  } catch (error) {
    logger.error("Error fetching favorites:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch favorites" });
  }
};

export async function addToFavorites(req: AuthenticatedRequest, res: Response) {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { profileId } = req.body || {};
    if (!profileId) {
      return res
        .status(400)
        .json({ success: false, message: "profileId is required" });
    }

    if (String(authUser.id) === String(profileId)) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot favorite yourself" });
    }

    const target = await User.findOne({
      _id: profileId,
      isActive: true,
      isDeleted: false
    }).lean();
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "Target user not found" });
    }

    try {
      const blocked = await isEitherBlocked(
        String(authUser.id),
        String(profileId)
      );
      if (blocked) {
        return res.status(403).json({
          success: false,
          message: "Action not allowed: one of the users has blocked the other."
        });
      }
    } catch (e) {
      return res
        .status(403)
        .json({ success: false, message: "Action not allowed." });
    }

    const alreadyFav = await Profile.findOne({
      userId: new mongoose.Types.ObjectId(authUser.id),
      favoriteProfiles: new mongoose.Types.ObjectId(profileId)
    }).lean();
    if (alreadyFav) {
      return res.status(409).json({
        success: false,
        message: "User is already in favorites"
      });
    }

    const updated = await Profile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(authUser.id) },
      {
        $addToSet: {
          favoriteProfiles: new mongoose.Types.ObjectId(profileId)
        }
      },
      { new: true, upsert: true }
    ).lean();

    const updatedDoc = Array.isArray(updated) ? updated[0] : updated;
    const favoriteProfiles =
      (updatedDoc && (updatedDoc as any).favoriteProfiles) || [];

    return res.status(200).json({
      success: true,
      message: "Added to favorites"
    });
  } catch (err: any) {
    logger.error("Error adding to favorites:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to add to favorites" });
  }
}

export async function removeFromFavorites(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { profileId } = req.body || {};
    if (!profileId) {
      return res
        .status(400)
        .json({ success: false, message: "profileId is required" });
    }

    const updated = await Profile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(authUser.id) },
      {
        $pull: {
          favoriteProfiles: new mongoose.Types.ObjectId(profileId)
        }
      },
      { new: true }
    ).lean();

    const updatedDoc = Array.isArray(updated) ? updated[0] : updated;
    const favoriteProfiles =
      (updatedDoc && (updatedDoc as any).favoriteProfiles) || [];

    return res.status(200).json({
      success: true,
      data: { favoriteProfiles }
    });
  } catch (err: any) {
    logger.error("Error removing from favorites:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove from favorites" });
  }
}

export async function rejectAcceptedConnection(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId is required"
      });
    }

    const request = await ConnectionRequest.findOne({
      _id: requestId,
      receiver: userId,
      status: "accepted"
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Connection request not found or you are not authorized to modify it."
      });
    }

    try {
      const blocked = await isEitherBlocked(
        String(request.sender),
        String(request.receiver)
      );
      if (blocked) {
        return res.status(403).json({
          success: false,
          message: "Action not allowed: one of the users has blocked the other."
        });
      }
    } catch (e) {
      return res
        .status(403)
        .json({ success: false, message: "Action not allowed." });
    }

    await ConnectionRequest.findByIdAndUpdate(
      requestId,
      { status: "rejected", actionedBy: userId },
      { new: true }
    );

    const receiver = await User.findById(userId)
      .select("firstName lastName")
      .lean();

    await createNotificationBatch([
      {
        user: request.sender,
        type: "request_rejected",
        title: "Connection status changed",
        message: `${
          receiver?.firstName + " " + receiver?.lastName || "User"
        } changed the connection status to rejected.`,
        meta: { receiverId: userId, newStatus: "rejected" }
      }
    ]);

    res.status(200).json({
      success: true,
      message: "Connection successfully changed to rejected."
    });
  } catch (err) {
    logger.error("Error rejecting accepted connection:", err);
    res.status(500).json({
      success: false,
      message: "Error updating connection status."
    });
  }
}

export async function acceptRejectedConnection(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user!.id;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId is required"
      });
    }

    const request = await ConnectionRequest.findOne({
      _id: requestId,
      receiver: userId,
      status: "rejected"
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Connection request not found or you are not authorized to modify it."
      });
    }

    try {
      const blocked = await isEitherBlocked(
        String(request.sender),
        String(request.receiver)
      );
      if (blocked) {
        return res.status(403).json({
          success: false,
          message: "Action not allowed: one of the users has blocked the other."
        });
      }
    } catch (e) {
      return res
        .status(403)
        .json({ success: false, message: "Action not allowed." });
    }

    await ConnectionRequest.findByIdAndUpdate(
      requestId,
      { status: "accepted", actionedBy: userId },
      { new: true }
    );

    const receiver = await User.findById(userId)
      .select("firstName lastName")
      .lean();
    await createNotificationBatch([
      {
        user: request.sender,
        type: "request_accepted",
        title: "Connection status changed",
        message: `${
          receiver?.firstName + " " + receiver?.lastName || "User"
        } changed the connection status to accepted.`,
        meta: { receiverId: userId, newStatus: "accepted" }
      }
    ]);

    res.status(200).json({
      success: true,
      message: "Connection successfully changed to accepted."
    });
  } catch (err) {
    logger.error("Error accepting rejected connection:", err);
    res.status(500).json({
      success: false,
      message: "Error updating connection status."
    });
  }
}
