import { logger } from "../../../lib";
import { Profile, User } from "../../../models";
import { calculateAge } from "../../../utils/utils";

async function updateProfileApproval(
  userId: string,
  updateData: Record<string, any>,
  successMessage: string
) {
  try {
    const profile = await Profile.findOne({ _id: userId, isDeleted: false });

    if (!profile) {
      return { success: false, message: "Profile not found" };
    }

    Object.assign(profile, updateData);
    await profile.save();

    return { success: true, message: successMessage };
  } catch (error) {
    logger.error("Profile approval error:", error);
    return { success: false, message: "Something went wrong" };
  }
}

export function approveUserProfileService(userId: string) {
  return updateProfileApproval(
    userId,
    {
      profileReviewStatus: "approved",
      isProfileApproved: true,
      reviewedAt: new Date()
    },
    "Profile approved successfully"
  );
}

export function rejectUserProfileService(userId: string, reason: string) {
  return updateProfileApproval(
    userId,
    {
      profileReviewStatus: "rejected",
      isProfileApproved: false,
      reviewNotes: reason,
      reviewedAt: new Date()
    },
    "Profile rejected successfully"
  );
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
  userId: string,
  makeVerified: boolean
) {
  try {
    const profile = await Profile.findOne({ userId, isDeleted: false });

    if (!profile) {
      return { success: false, message: "Profile not found" };
    }

    if (profile.isVerified === makeVerified) {
      return {
        success: true,
        message: makeVerified
          ? "Profile is already verified"
          : "Profile is already unverified"
      };
    }

    profile.isVerified = makeVerified;
    await profile.save();

    return {
      success: true,
      message: makeVerified
        ? "Profile verified successfully"
        : "Profile unverified successfully"
    };
  } catch (error) {
    logger.error("Verification toggle error:", error);
    return { success: false, message: "Something went wrong" };
  }
}
