import { User, Payment } from "../../models";
import { addMonths } from "date-fns";

export async function extendUserValidity(
  userId: string,
  months: number,
  paymentData?: {
    amount: number;
    transactionId?: string;
    provider?: string;
    planName?: string;
  }
) {
  const user = await User.findById(userId).lean();
  if (!user) throw new Error("User not found");

  const now = new Date();
  const base =
    user.planExpiry && new Date(user.planExpiry) > now
      ? new Date(user.planExpiry)
      : now;
  const newExpiry = addMonths(base, months);

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      accountType: "premium",
      planDurationMonths: months,
      planExpiry: newExpiry,
      isActive: true,
      $unset: { deactivationReason: "", deactivatedAt: "" }
    },
    { new: true }
  );

  if (paymentData && paymentData.amount) {
    try {
      await Payment.create({
        userId,
        amount: paymentData.amount,
        months,
        planName: paymentData.planName,
        provider: paymentData.provider,
        transactionId: paymentData.transactionId
      });
    } catch (err) {}
  }

  return updated;
}

export default { extendUserValidity };
