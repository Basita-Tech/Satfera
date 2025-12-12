import { logger } from "../../../lib";
import { Profile, User } from "../../../models";
import { calculateAge } from "../../../utils/utils";
import { validateUserId } from "../../../services";
import { enqueueProfileReviewEmail } from "../../../lib/queue/enqueue";

async function updateProfileApproval(
  profileIdOrUserId: string,
  updateData: Record<string, any>,
  successMessage: string,
  sendEmail?: boolean
) {
  const objectId = validateUserId(profileIdOrUserId);

  let profile = await Profile.findById(objectId)
    .select("_id userId isProfileApproved profileReviewStatus")
    .lean();
  let userId = profile?.userId;

  if (!profile) {
    profile = await Profile.findOne({ userId: objectId })
      .select("_id userId isProfileApproved profileReviewStatus")
      .lean();
    userId = objectId;
  }

  if (!profile) {
    throw new Error("Profile not found");
  }

  const newStatus = updateData.profileReviewStatus;
  const currentStatus = profile.profileReviewStatus;
  const statusChanged = newStatus !== currentStatus;

  if (!statusChanged) {
    return {
      success: false,
      message: `Profile is already ${currentStatus}.`
    };
  }

  const [updateResult, user] = await Promise.all([
    Profile.findByIdAndUpdate(profile._id, updateData, { new: false }),
    sendEmail
      ? User.findById(userId).select("firstName lastName email").lean()
      : Promise.resolve(null)
  ]);

  if (sendEmail && statusChanged && user && user.email) {
    const reviewType = newStatus === "approved" ? "approved" : "rejected";

    try {
      const enqueued = await enqueueProfileReviewEmail(
        userId,
        {
          email: user.email,
          firstName: user.firstName || "",
          lastName: user.lastName || ""
        },
        {
          type: reviewType,
          reason: updateData.reviewNotes,
          dashboardLink: `${process.env.FRONTEND_URL || "https://satfera.in"}/dashboard`
        }
      );

      if (enqueued) {
        logger.info(
          `✉️ Profile review email queued for user ${userId} (${reviewType}) - Status changed from ${currentStatus} to ${newStatus}`
        );
      } else {
        logger.warn(`Failed to queue profile review email for user ${userId}`);
      }
    } catch (queueError: any) {
      logger.error("Error queuing profile review email:", {
        userId,
        type: reviewType,
        error: queueError.message
      });
    }
  } else if (!statusChanged) {
    logger.info(`Profile status unchanged (${currentStatus}), no email sent`);
  }

  return { success: true, message: successMessage };
}

export async function approveUserProfileService(userId: string) {
  try {
    return await updateProfileApproval(
      userId,
      {
        profileReviewStatus: "approved",
        isProfileApproved: true,
        reviewedAt: new Date()
      },
      "Profile approved successfully",
      true
    );
  } catch (error: any) {
    logger.error("Error approving profile:", error);
    throw error;
  }
}

export async function rejectUserProfileService(userId: string, reason: string) {
  try {
    if (!reason) {
      throw new Error("Rejection reason is required");
    }

    return await updateProfileApproval(
      userId,
      {
        profileReviewStatus: "rejected",
        isProfileApproved: false,
        reviewNotes: reason,
        reviewedAt: new Date()
      },
      "Profile rejected successfully",
      true
    );
  } catch (error: any) {
    logger.error("Error rejecting profile:", error);
    throw error;
  }
}

export async function getPendingProfilesService() {
  try {
    const pendingProfiles = await Profile.find({
      profileReviewStatus: "pending"
    })
      .select("photos.closerPhoto userId")
      .lean();

    if (!pendingProfiles || pendingProfiles.length === 0) {
      return { success: true, data: [] };
    }

    const userIds = pendingProfiles.map((profile) => profile.userId);

    const users = await User.find({
      _id: { $in: userIds }
    })
      .select("firstName lastName gender dateOfBirth phoneNumber email")
      .lean();

    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    const profilesWithUserData = pendingProfiles.map((profile) => {
      const user = userMap.get(profile.userId.toString());

      return {
        profileId: profile._id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        gender: user?.gender,
        age: calculateAge(user?.dateOfBirth),
        phoneNumber: user?.phoneNumber,
        email: user?.email,
        closerPhoto: profile?.photos?.closerPhoto?.url || null
      };
    });

    return { success: true, data: profilesWithUserData };
  } catch (error) {
    logger.error("Error fetching pending profiles:", error);
    return { success: false, message: "Failed to fetch pending profiles" };
  }
}

export async function toggleVerificationService(
  profileIdOrUserId: string,
  makeVerified: boolean
) {
  try {
    const objectId = validateUserId(profileIdOrUserId);

    let profile = await Profile.findById(objectId).select("_id isVerified");

    if (!profile) {
      profile = await Profile.findOne({ userId: objectId }).select(
        "_id isVerified"
      );
    }

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (profile.isVerified === makeVerified) {
      return {
        success: false,
        message: makeVerified
          ? "Profile is already verified"
          : "Profile is already unverified",
        data: { _id: profile._id, isVerified: profile.isVerified }
      };
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      profile._id,
      { isVerified: makeVerified },
      { new: true }
    ).select("_id isVerified");

    return {
      success: true,
      message: makeVerified
        ? "Profile verified successfully"
        : "Profile unverified successfully",
      data: updatedProfile
    };
  } catch (error: any) {
    logger.error("Verification toggle error:", error);
    throw error;
  }
}
