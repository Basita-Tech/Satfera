import mongoose from "mongoose";
import {
  User,
  UserPersonal,
  UserProfession,
  UserFamily,
  UserEducation,
  UserExpectations
} from "../../../models";
import { UserHealth } from "../../../models/User_health";
import { validateUserId } from "../../../services";
import { logger } from "../../../lib";

export async function updateUserProfileDetailsService(
  userId: string,
  profileData: any
) {
  if (!userId) {
    return {
      success: false,
      message: "User ID is required"
    };
  }

  if (!profileData || Object.keys(profileData).length === 0) {
    return {
      success: false,
      message: "No data provided to update"
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const objectId = validateUserId(userId);

    const user = await User.findById(objectId).session(session);
    if (!user) {
      await session.abortTransaction();
      return {
        success: false,
        message: "User not found"
      };
    }

    const userFields = [
      "firstName",
      "middleName",
      "lastName",
      "email",
      "phoneNumber",
      "dateOfBirth",
      "gender",
      "for_Profile"
    ];

    const userUpdate: any = {};
    userFields.forEach((field) => {
      if (profileData[field] !== undefined) {
        userUpdate[field] = profileData[field];
      }
    });

    if (Object.keys(userUpdate).length > 0) {
      if (
        userUpdate.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userUpdate.email)
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Invalid email format"
        };
      }

      if (
        userUpdate.phoneNumber &&
        !/^[\d\s+\-()]+$/.test(userUpdate.phoneNumber)
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Invalid phone number format"
        };
      }

      if (
        userUpdate.gender &&
        !["male", "female", "other"].includes(userUpdate.gender.toLowerCase())
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Gender must be male, female, or other"
        };
      }

      await User.findByIdAndUpdate(objectId, userUpdate, {
        new: true,
        session
      });
    }

    if (profileData.healthData) {
      const healthUpdate: any = {};
      const allowedHealthFields = [
        "isAlcoholic",
        "isTobaccoUser",
        "isHaveTattoos",
        "isHaveHIV",
        "isPositiveInTB",
        "isHaveMedicalHistory",
        "medicalHistoryDetails",
        "diet"
      ];

      allowedHealthFields.forEach((field) => {
        if (profileData.healthData[field] !== undefined) {
          healthUpdate[field] = profileData.healthData[field];
        }
      });

      if (
        healthUpdate.isAlcoholic &&
        !["yes", "no", "occasional", ""].includes(healthUpdate.isAlcoholic)
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message: "isAlcoholic must be yes, no, occasional, or empty string"
        };
      }

      if (
        healthUpdate.diet &&
        ![
          "vegetarian",
          "non-vegetarian",
          "eggetarian",
          "jain",
          "swaminarayan",
          "veg & non-veg",
          ""
        ].includes(healthUpdate.diet)
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message:
            "diet must be vegetarian, non-vegetarian, eggetarian, jain, swaminarayan, veg & non-veg, or empty string"
        };
      }

      if (Object.keys(healthUpdate).length > 0) {
        await UserHealth.findOneAndUpdate({ userId: objectId }, healthUpdate, {
          new: true,
          session
        });
      }
    }

    if (profileData.professionData) {
      const professionUpdate: any = {};
      const allowedProfessionFields = [
        "EmploymentStatus",
        "Occupation",
        "AnnualIncome",
        "OrganizationName"
      ];

      allowedProfessionFields.forEach((field) => {
        if (profileData.professionData[field] !== undefined) {
          professionUpdate[field] = profileData.professionData[field];
        }
      });

      if (
        professionUpdate.EmploymentStatus &&
        ![
          "private sector",
          "government",
          "self-employed",
          "unemployed",
          "student",
          "business"
        ].includes(professionUpdate.EmploymentStatus)
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message:
            "Employment status must be one of: private sector, government, self-employed, unemployed, student, business"
        };
      }

      if (Object.keys(professionUpdate).length > 0) {
        await UserProfession.findOneAndUpdate(
          { userId: objectId },
          professionUpdate,
          { new: true, session }
        );
      }
    }

    if (profileData.personalData) {
      const personalUpdate: any = {};
      const allowedPersonalFields = [
        "timeOfBirth",
        "height",
        "weight",
        "astrologicalSign",
        "birthPlace",
        "birthState",
        "religion",
        "marriedStatus",
        "dosh",
        "subCaste",
        "marryToOtherReligion",
        "full_address",
        "nationality",
        "isResidentOfIndia",
        "residingCountry",
        "visaType",
        "isHaveChildren",
        "numberOfChildren",
        "isChildrenLivingWithYou",
        "isYouLegallySeparated",
        "separatedSince",
        "divorceStatus"
      ];

      allowedPersonalFields.forEach((field) => {
        if (profileData.personalData[field] !== undefined) {
          personalUpdate[field] = profileData.personalData[field];
        }
      });

      if (Object.keys(personalUpdate).length > 0) {
        await UserPersonal.findOneAndUpdate(
          { userId: objectId },
          personalUpdate,
          { new: true, session }
        );
      }
    }

    if (profileData.familyData) {
      const familyUpdate: any = {};
      const allowedFamilyFields = [
        "fatherName",
        "motherName",
        "fatherOccupation",
        "motherOccupation",
        "fatherContact",
        "motherContact",
        "fatherNativePlace",
        "doYouHaveChildren",
        "grandFatherName",
        "grandMotherName",
        "naniName",
        "nanaName",
        "nanaNativePlace",
        "familyType",
        "haveSibling",
        "howManySiblings",
        "siblingDetails"
      ];

      allowedFamilyFields.forEach((field) => {
        if (profileData.familyData[field] !== undefined) {
          familyUpdate[field] = profileData.familyData[field];
        }
      });

      if (Object.keys(familyUpdate).length > 0) {
        await UserFamily.findOneAndUpdate({ userId: objectId }, familyUpdate, {
          new: true,
          session
        });
      }
    }

    if (profileData.educationsData) {
      const educationUpdate: any = {};
      const allowedEducationFields = [
        "SchoolName",
        "HighestEducation",
        "FieldOfStudy",
        "University",
        "CountryOfEducation"
      ];

      allowedEducationFields.forEach((field) => {
        if (profileData.educationsData[field] !== undefined) {
          educationUpdate[field] = profileData.educationsData[field];
        }
      });

      if (Object.keys(educationUpdate).length > 0) {
        await UserEducation.findOneAndUpdate(
          { userId: objectId },
          educationUpdate,
          { new: true, session }
        );
      }
    }

    if (profileData.expectationsData) {
      const expectationsUpdate: any = {};
      const allowedExpectationsFields = [
        "age",
        "maritalStatus",
        "isConsumeAlcoholic",
        "educationLevel",
        "community",
        "livingInCountry",
        "livingInState",
        "profession",
        "diet"
      ];

      allowedExpectationsFields.forEach((field) => {
        if (profileData.expectationsData[field] !== undefined) {
          expectationsUpdate[field] = profileData.expectationsData[field];
        }
      });

      if (
        expectationsUpdate.isConsumeAlcoholic &&
        !["yes", "no", "occasionally"].includes(
          expectationsUpdate.isConsumeAlcoholic
        )
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message: "isConsumeAlcoholic must be yes, no, or occasionally"
        };
      }

      if (Object.keys(expectationsUpdate).length > 0) {
        await UserExpectations.findOneAndUpdate(
          { userId: objectId },
          expectationsUpdate,
          { new: true, session }
        );
      }
    }

    await session.commitTransaction();

    logger.info("User profile updated by admin:", {
      userId: objectId,
      adminAction: true
    });

    return {
      success: true,
      message: "User profile updated successfully"
    };
  } catch (error: any) {
    await session.abortTransaction();
    logger.error("Error updating user profile details:", {
      error: error.message,
      stack: error.stack,
      userId
    });
    return {
      success: false,
      message: error.message || "Failed to update user profile"
    };
  } finally {
    session.endSession();
  }
}
