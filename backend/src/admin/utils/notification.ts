import mongoose from "mongoose";
import { Notification } from "../../models";
import { User } from "../../models";

async function createNotificationForAdmin(
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

async function notifyAdminsOfNewUserRegistration(newUser: any) {
  try {
    const admins = await User.find({ role: "admin", isDeleted: false });

    if (admins.length === 0) {
      console.log("No admins found to notify");
      return;
    }

    const notifications = admins.map((admin) => ({
      user: admin._id,
      type: "new_user_registered",
      title: "New User Registration",
      message: `New user registered: ${newUser.firstName} ${newUser.lastName} (${newUser.email})`,
      meta: {
        newUserId: newUser._id,
        userEmail: newUser.email,
        userName: `${newUser.firstName} ${newUser.lastName}`,
        registeredAt: new Date()
      }
    }));

    await Notification.insertMany(notifications);
    console.log(`Notification sent to ${admins.length} admin(s)`);
  } catch (error) {
    console.error("Error notifying admins of new user registration:", error);
    throw error;
  }
}

async function notifyAdminsOfUserBlocked(blocker: any, blocked: any) {
  try {
    const admins = await User.find({ role: "admin", isDeleted: false });

    if (admins.length === 0) {
      console.log("No admins found to notify");
      return;
    }

    const blockerName = `${blocker.firstName} ${blocker.lastName}`.trim();
    const blockedName = `${blocked.firstName} ${blocked.lastName}`.trim();

    const notifications = admins.map((admin) => ({
      user: admin._id,
      type: "user_blocked",
      title: "User Blocked",
      message: `${blockerName} (${blocker.email}) has blocked ${blockedName} (${blocked.email})`,
      meta: {
        blockerId: blocker._id,
        blockedUserId: blocked._id,
        blockerEmail: blocker.email,
        blockedEmail: blocked.email,
        blockerName,
        blockedName,
        blockedAt: new Date()
      }
    }));

    await Notification.insertMany(notifications);
    console.log(`Block notification sent to ${admins.length} admin(s)`);
  } catch (error) {
    console.error("Error notifying admins of user block:", error);
    throw error;
  }
}

async function notifyAdminsOfProfileReported(
  reporter: any,
  reportedUser: any,
  reason: string,
  description?: string
) {
  try {
    const admins = await User.find({ role: "admin", isDeleted: false });

    if (admins.length === 0) {
      console.log("No admins found to notify");
      return;
    }

    const reporterName = `${reporter.firstName} ${reporter.lastName}`.trim();
    const reportedName =
      `${reportedUser.firstName} ${reportedUser.lastName}`.trim();

    const notifications = admins.map((admin) => ({
      user: admin._id,
      type: "profile_reported",
      title: "Profile Reported",
      message: `Profile of ${reportedName} (${reportedUser.email}) reported by ${reporterName} for: ${reason}`,
      meta: {
        reporterId: reporter._id,
        reportedUserId: reportedUser._id,
        reporterEmail: reporter.email,
        reportedEmail: reportedUser.email,
        reporterName,
        reportedName,
        reason,
        description,
        reportedAt: new Date()
      }
    }));

    await Notification.insertMany(notifications);
    console.log(`Report notification sent to ${admins.length} admin(s)`);
  } catch (error) {
    console.error("Error notifying admins of profile report:", error);
    throw error;
  }
}

export {
  createNotificationForAdmin,
  notifyAdminsOfNewUserRegistration,
  notifyAdminsOfUserBlocked,
  notifyAdminsOfProfileReported
};
