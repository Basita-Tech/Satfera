import { Request, Response } from "express";
import { extendUserValidity } from "../services/paymentService";
import { logger } from "../lib";

export async function paymentCompleteController(req: Request, res: Response) {
  try {
    const { userId, months, amount, transactionId, provider, planName } =
      req.body;
    if (!userId || !months || !amount) {
      return res.status(400).json({
        success: false,
        message: "userId, months and amount are required"
      });
    }

    const updated = await extendUserValidity(String(userId), Number(months), {
      amount: Number(amount),
      transactionId,
      provider,
      planName
    });

    return res.json({ success: true, user: updated });
  } catch (err: any) {
    logger.error("Payment complete error", { error: err.message });
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to extend validity"
    });
  }
}

export default { paymentCompleteController };
