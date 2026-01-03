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

    const allowedFields = [
      "firstName",
      "middleName",
      "lastName",
      "email",
      "phoneNumber",
      "dateOfBirth",
      "gender",
      "for_Profile",
      "isAlcoholic",
      "isTobaccoUser",
      "isHaveTattoos",
      "isHaveHIV",
      "isPositiveInTB",
      "isHaveMedicalHistory",
      "medicalHistoryDetails",
      "diet",
      "EmploymentStatus",
      "Occupation",
      "AnnualIncome",
      "OrganizationName",
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
      "divorceStatus",
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
      "siblingDetails",
      "SchoolName",
      "HighestEducation",
      "FieldOfStudy",
      "University",
      "CountryOfEducation",
      "age",
      "maritalStatus",
      "isConsumeAlcoholic",
      "educationLevel",
      "community",
      "livingInCountry",
      "livingInState",
      "profession",
      "expectations"
    ];

    const providedFields = Object.keys(profileData || {});
    const invalidFields = providedFields.filter(
      (f) => !allowedFields.includes(f)
    );
    if (invalidFields.length > 0) {
      return {
        success: false,
        message: `Fields not allowed to be updated: ${invalidFields.join(", ")}`
      };
    }

    const clean = (obj: any) => {
      const out: any = {};
      Object.keys(obj || {}).forEach((k) => {
        if (obj[k] !== undefined) out[k] = obj[k];
      });
      return out;
    };

    if (Object.keys(profileData).length > 0) {
      if (
        profileData.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Invalid email format"
        };
      }

      if (
        profileData.phoneNumber &&
        !/^[\d\s+\-()]+$/.test(profileData.phoneNumber)
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Invalid phone number format"
        };
      }

      if (
        profileData.gender &&
        !["male", "female", "other"].includes(profileData.gender.toLowerCase())
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Gender must be male, female, or other"
        };
      }

      const userUpdate: any = {};
      [
        "gender",
        "firstName",
        "middleName",
        "lastName",
        "email",
        "phoneNumber",
        "dateOfBirth"
      ].forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(profileData, k))
          userUpdate[k] = profileData[k];
      });

      const cleanedUser = clean(userUpdate);
      if (Object.keys(cleanedUser).length > 0) {
        await User.findByIdAndUpdate(objectId, cleanedUser, {
          new: true,
          session
        });
      }
    }

    if (
      profileData.isAlcoholic &&
      !["yes", "no", "occasional", ""].includes(profileData.isAlcoholic)
    ) {
      await session.abortTransaction();
      return {
        success: false,
        message: "isAlcoholic must be yes, no, occasional, or empty string"
      };
    }

    if (
      profileData.diet &&
      ![
        "vegetarian",
        "non-vegetarian",
        "eggetarian",
        "jain",
        "swaminarayan",
        "veg & non-veg"
      ].includes(profileData.diet)
    ) {
      await session.abortTransaction();
      return {
        success: false,
        message:
          "diet must be vegetarian, non-vegetarian, eggetarian, jain, swaminarayan, veg & non-veg"
      };
    }

    const healthUpdate: any = {};
    [
      "isAlcoholic",
      "isTobaccoUser",
      "isHaveTattoos",
      "isHaveHIV",
      "isPositiveInTB",
      "isHaveMedicalHistory",
      "medicalHistoryDetails",
      "diet"
    ].forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(profileData, k)) {
        healthUpdate[k] = profileData[k];
      }
    });

    const cleanedHealth = clean(healthUpdate);
    if (Object.keys(cleanedHealth).length > 0) {
      await UserHealth.findOneAndUpdate({ userId: objectId }, cleanedHealth, {
        new: true,
        session
      });
    }

    if (
      profileData.EmploymentStatus &&
      ![
        "private sector",
        "government",
        "self-employed",
        "unemployed",
        "student",
        "business"
      ].includes(profileData.EmploymentStatus)
    ) {
      await session.abortTransaction();
      return {
        success: false,
        message:
          "Employment status must be one of: private sector, government, self-employed, unemployed, student, business"
      };
    }

    const professionUpdate: any = {};
    [
      "EmploymentStatus",
      "Occupation",
      "AnnualIncome",
      "OrganizationName"
    ].forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(profileData, k))
        professionUpdate[k] = profileData[k];
    });

    const cleanedProfession = clean(professionUpdate);
    if (Object.keys(cleanedProfession).length > 0) {
      await UserProfession.findOneAndUpdate(
        { userId: objectId },
        cleanedProfession,
        { new: true, session }
      );
    }

    const personalUpdate: any = {};
    [
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
    ].forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(profileData, k))
        personalUpdate[k] = profileData[k];
    });

    if (
      profileData.full_address &&
      typeof profileData.full_address === "object"
    ) {
      personalUpdate.full_address = {
        street1: profileData.full_address.street1,
        street2: profileData.full_address.street2,
        city: profileData.full_address.city,
        state: profileData.full_address.state,
        zipCode: profileData.full_address.zipCode,
        isYourHome: profileData.full_address.isYourHome
      };
    }

    const cleanedPersonal = clean(personalUpdate);
    if (Object.keys(cleanedPersonal).length > 0) {
      await UserPersonal.findOneAndUpdate(
        { userId: objectId },
        cleanedPersonal,
        { new: true, session }
      );
    }

    const familyUpdate: any = {};
    [
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
    ].forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(profileData, k))
        familyUpdate[k] = profileData[k];
    });

    const cleanedFamily = clean(familyUpdate);
    if (Object.keys(cleanedFamily).length > 0) {
      await UserFamily.findOneAndUpdate({ userId: objectId }, cleanedFamily, {
        new: true,
        session
      });
    }

    const educationUpdate: any = {};
    [
      "SchoolName",
      "HighestEducation",
      "FieldOfStudy",
      "University",
      "CountryOfEducation"
    ].forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(profileData, k))
        educationUpdate[k] = profileData[k];
    });

    const cleanedEducation = clean(educationUpdate);
    if (Object.keys(cleanedEducation).length > 0) {
      await UserEducation.findOneAndUpdate(
        { userId: objectId },
        cleanedEducation,
        { new: true, session }
      );
    }

    if (profileData.expectations) {
      const expectationFields = [
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

      const expectationsUpdate: any = {};
      expectationFields.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(profileData.expectations, k))
          expectationsUpdate[k] = profileData.expectations[k];
      });

      if (Object.keys(expectationsUpdate).length > 0) {
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

        await UserExpectations.findOneAndUpdate(
          { userId: objectId },
          expectationsUpdate,
          {
            new: true,
            runValidators: true,
            session,
            upsert: true
          }
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
