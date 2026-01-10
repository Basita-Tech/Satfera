import {
  Expo,
  ExpoPushMessage,
  ExpoPushTicket,
  ExpoPushReceipt
} from "expo-server-sdk";
import { Router, Request, Response } from "express";
import { User } from "../models";

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true
});

const expoApp = Router();

expoApp.post("/app/save-token", async (req: Request, res: Response) => {
  const { userId, pushToken } = req.body;

  if (!Expo.isExpoPushToken(pushToken)) {
    return res.status(400).send({
      error: `Push token ${pushToken} is not a valid Expo push token`
    });
  }

  try {
    await User.findByIdAndUpdate(
      userId,
      { pushToken: pushToken },
      { new: true }
    );

    console.log(`Saved token for user ${userId}`);
    res.send({ success: true });
  } catch (error) {
    console.error("Error saving token:", error);
    res.status(500).send({ error: "Error saving token" });
  }
});

expoApp.post(
  "/admin/send-mass-notification",
  async (req: Request, res: Response) => {
    const { userIds, title, messageBody, data } = req.body;

    try {
      const users = await User.find({
        _id: { $in: userIds },
        pushToken: { $exists: true, $ne: null }
      });

      if (users.length === 0) {
        return res
          .status(404)
          .send({ error: "No valid tokens found for these users" });
      }

      const messages: ExpoPushMessage[] = users.map((user) => ({
        to: user.pushToken!,
        sound: "default",
        title: title || "New Notification",
        body: messageBody,
        data: data || {}
      }));

      const tickets = await sendInChunks(messages);

      handleReceipts(tickets);

      res.send({ success: true, sentCount: messages.length });
    } catch (error) {
      res.status(500).send({ error: "Failed to send mass notifications" });
    }
  }
);

const sendInChunks = async (
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> => {
  let chunks = expo.chunkPushNotifications(messages);
  let tickets: ExpoPushTicket[] = [];

  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Chunk send error:", error);
    }
  }
  return tickets;
};

const handleReceipts = async (tickets: ExpoPushTicket[]) => {
  let receiptIds = tickets
    .filter((ticket) => ticket.status === "ok")
    .map((ticket) => (ticket as any).id);

  let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  for (let chunk of receiptIdChunks) {
    try {
      let receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      for (let receiptId in receipts) {
        const receipt = receipts[receiptId] as ExpoPushReceipt;

        if (receipt.status === "error") {
          console.error(`Error: ${receipt.message}`);

          if (receipt.details && receipt.details.error) {
            const errorCode = receipt.details.error;
            console.error(`Error code: ${errorCode}`);

            if (errorCode === "DeviceNotRegistered") {
              console.warn(
                "User has uninstalled app. Token should be removed."
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Receipt fetching error:", error);
    }
  }
};

export default expoApp;
