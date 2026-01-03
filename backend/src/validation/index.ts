import { body } from "express-validator";

export const LoginValidation = [
  body("email")
    .optional({ nullable: true })
    .isEmail()
    .withMessage("Invalid email format"),

  body("phoneNumber")
    .optional({ nullable: true })
    .isMobilePhone("any")
    .withMessage("Invalid phone number format"),

  body().custom((value, { req }) => {
    const hasEmail = !!req.body.email;
    const hasPhone = !!req.body.phoneNumber;
    if (!hasEmail && !hasPhone) {
      throw new Error("Either email or phoneNumber must be provided");
    }
    return true;
  }),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
];

export const SignupValidation = [
  body("for_Profile")
    .notEmpty()
    .withMessage(
      "for_Profile must be one of: myself, son, daughter, brother, sister, friend"
    )
    .bail()
    .isIn(["myself", "son", "daughter", "brother", "sister", "friend"])
    .withMessage(
      "for_Profile must be one of: myself, son, daughter, brother, sister, friend"
    ),

  body("dateOfBirth")
    .notEmpty()
    .withMessage("date Of Birth is required")
    .bail()
    .matches(/^\d{2}-\d{2}-\d{4}$/)
    .withMessage("date Of Birth must be in DD-MM-YYYY format")
    .custom((value, { req }) => {
      const parts = value.split("-");
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (
        Number.isNaN(day) ||
        Number.isNaN(month) ||
        Number.isNaN(year) ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
      ) {
        throw new Error(
          "date Of Birth must be a valid calendar date in DD-MM-YYYY format"
        );
      }

      const dob = new Date(
        `${year.toString().padStart(4, "0")}-${month
          .toString()
          .padStart(2, "0")}-${day.toString().padStart(2, "0")}`
      );

      if (isNaN(dob.getTime())) {
        throw new Error(
          "date Of Birth must be a valid calendar date in DD-MM-YYYY format"
        );
      }
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

      const gender = (req as any).user?.gender || req.body.gender;
      if (gender === "male" && age < 21) {
        throw new Error(
          "Male users must be at least 21 years old to create a profile"
        );
      }
      if (gender === "female" && age < 20) {
        throw new Error(
          "Female users must be at least 20 years old to create a profile"
        );
      }
      return true;
    }),

  body("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .bail()
    .isString()
    .withMessage("First name must be a string"),
  body("lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .bail()
    .isString()
    .withMessage("Last name must be a string"),
  body("middleName").optional().isString(),

  body("gender")
    .notEmpty()
    .withMessage("Gender is required")
    .bail()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be one of: male, female, other"),

  body("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .bail()
    .custom((value) => {
      const e164 = /^\+[1-9]\d{7,14}$/;
      const validator = require("validator");
      if (e164.test(value) || validator.isMobilePhone(value, "any")) {
        return true;
      }
      throw new Error("Invalid phone number format");
    }),

  body("email").notEmpty().bail().isEmail().withMessage("Invalid email format"),

  body("isEmailLoginEnabled")
    .optional()
    .isBoolean()
    .withMessage("isEmailLoginEnabled must be a boolean"),
  body("isMobileLoginEnabled")
    .optional()
    .isBoolean()
    .withMessage("isMobileLoginEnabled must be a boolean"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Password must contain at least one special character")
];

export const CreateUserPersonalValidation = [
  body("timeOfBirth")
    .optional()
    .isString()
    .withMessage("timeOfBirth must be a string"),

  body("height").notEmpty().withMessage("Height is required"),

  body("weight").notEmpty().withMessage("Weight is required"),

  body("astrologicalSign")
    .notEmpty()
    .withMessage("astrologicalSign is required")
    .isString()
    .withMessage("astrologicalSign must be a string"),

  body("birthPlace")
    .notEmpty()
    .withMessage("birthPlace is required")
    .isString()
    .withMessage("birthPlace must be a string"),

  body("dosh")
    .notEmpty()
    .withMessage("dosh is required")
    .isString()
    .withMessage("dosh must be a string"),

  body("subCaste")
    .optional()
    .isString()
    .withMessage("subCaste must be a string"),

  body("religion")
    .notEmpty()
    .withMessage("Religion is required")
    .bail()
    .isString()
    .withMessage("Religion must be a string"),

  body("marriedStatus")
    .notEmpty()
    .withMessage("Marital status is required")
    .bail()
    .isIn([
      "Never Married",
      "Divorced",
      "Widowed",
      "Separated",
      "Awaiting Divorce"
    ])
    .withMessage(
      "Marital status must be one of: Never Married, Divorced, Widowed, Separated, Awaiting Divorce"
    ),

  body("marryToOtherReligion")
    .optional()
    .isBoolean()
    .withMessage("marryToOtherReligion must be a boolean"),

  body("full_address")
    .optional()
    .isObject()
    .withMessage("full_address must be an object"),

  body("full_address.street1")
    .optional()
    .isString()
    .withMessage("full_address.street1 must be a string"),

  body("full_address.street2")
    .optional()
    .isString()
    .withMessage("full_address.street2 must be a string"),

  body("full_address.city")
    .optional()
    .isString()
    .withMessage("full_address.city must be a string"),

  body("full_address.state")
    .optional()
    .isString()
    .withMessage("full_address.state must be a string"),

  body("full_address.zipCode")
    .optional()
    .isString()
    .withMessage("full_address.zipCode must be a string"),

  body("full_address.isYourHome")
    .optional()
    .isBoolean()
    .withMessage("full_address.isYourHome must be a boolean"),

  body("nationality")
    .notEmpty()
    .withMessage("nationality is required")
    .isString()
    .withMessage("nationality must be a string"),

  body("isResidentOfIndia")
    .optional()
    .isBoolean()
    .withMessage("isResidentOfIndia must be a boolean"),

  body("residingCountry")
    .optional()
    .isString()
    .withMessage("residingCountry must be a string"),

  body("visaType")
    .optional()
    .isString()
    .withMessage("visaType must be a string"),

  body("isHaveChildren")
    .optional()
    .isBoolean()
    .withMessage("isHaveChildren must be a boolean"),

  body("numberOfChildren")
    .optional()
    .isInt()
    .withMessage("numberOfChildren must be an integer")
    .toInt(),

  body("occupation")
    .optional()
    .isString()
    .withMessage("occupation must be a string"),

  body("isChildrenLivingWithYou")
    .optional()
    .isBoolean()
    .withMessage("isChildrenLivingWithYou must be a boolean"),

  body("isYouLegallySeparated")
    .optional()
    .isBoolean()
    .withMessage("isYouLegallySeparated must be a boolean"),

  body("separatedSince")
    .optional()
    .isString()
    .withMessage("separatedSince must be a string")
];

export const AddUserFamilyDetailsValidation = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .bail()
    .isString()
    .withMessage("User ID must be a string"),

  body("fatherName")
    .optional()
    .isString()
    .withMessage("Father's name must be a string"),
  body("motherName")
    .optional()
    .isString()
    .withMessage("Mother's name must be a string"),
  body("fatherOccupation")
    .optional()
    .isString()
    .withMessage("Father's occupation must be a string"),
  body("motherOccupation")
    .optional()
    .isString()
    .withMessage("Mother's occupation must be a string"),
  body("fatherContact")
    .optional()
    .isMobilePhone("any")
    .withMessage("Father's contact must be a valid phone number"),
  body("motherContact")
    .optional()
    .isMobilePhone("any")
    .withMessage("Mother's contact must be a valid phone number"),
  body("fatherNativePlace")
    .optional()
    .isString()
    .withMessage("Father's native place must be a string"),

  body("doYouHaveChildren")
    .optional()
    .isBoolean()
    .withMessage("doYouHaveChildren must be a boolean value"),
  body("grandFatherName")
    .optional()
    .isString()
    .withMessage("Grandfather's name must be a string"),
  body("grandMotherName")
    .optional()
    .isString()
    .withMessage("Grandmother's name must be a string"),
  body("naniName")
    .optional()
    .isString()
    .withMessage("Nani name must be a string"),
  body("nanaName")
    .optional()
    .isString()
    .withMessage("Nana name must be a string"),
  body("nanaNativePlace")
    .optional()
    .isString()
    .withMessage("Nana native place must be a string"),

  body("familyType")
    .optional()
    .isLowercase()
    .isIn(["joint", "nuclear", "others"])
    .withMessage('familyType must be one of: "joint", "nuclear", "others"'),
  body("haveSibling")
    .optional()
    .isBoolean()
    .withMessage("haveSibling must be a boolean value"),
  body("howManySiblings")
    .optional()
    .isInt({ min: 0 })
    .withMessage("howManySiblings must be an integer >= 0")
    .toInt(),

  body("siblingDetails")
    .optional()
    .isArray()
    .withMessage("siblingDetails must be an array"),
  body("siblingDetails.*.name")
    .optional()
    .isString()
    .withMessage("Each sibling's name must be a string"),
  body("siblingDetails.*.isElder")
    .optional()
    .isBoolean()
    .withMessage("Each sibling's isElder must be a boolean")
];

export const UserEducationDetailsValidation = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .bail()
    .isString()
    .withMessage("User ID must be a string"),
  body("SchoolName")
    .optional()
    .isString()
    .withMessage("School Name must be a string"),
  body("HighestEducation")
    .optional()
    .isString()
    .withMessage("Highest Education must be a string"),
  body("FieldOfStudy")
    .optional()
    .isString()
    .withMessage("Field Of Study must be a string"),
  body("University")
    .optional()
    .isString()
    .withMessage("University must be a string"),
  body("CountryOfEducation")
    .optional()
    .isString()
    .withMessage("Country Of Education must be a string")
];

export const UserHealthValidation = [
  body("isAlcoholic").optional(),

  body("isTobaccoUser").optional(),

  body("isHaveTattoos").optional(),

  body("isHaveHIV").optional(),

  body("isPostiviInTB").optional(),

  body("isHaveMedicalHistory").optional(),

  body("medicalHistoryDetails")
    .optional()
    .isString()
    .withMessage("medicalHistoryDetails must be a string"),

  body("diet")
    .optional()
    .customSanitizer((value) => {
      if (typeof value === "string") {
        return value.replace(/&amp;/g, "&");
      }
      return value;
    })
    .isIn([
      "vegetarian",
      "non-vegetarian",
      "eggetarian",
      "jain",
      "swaminarayan",
      "veg & non-veg",
      ""
    ])
    .withMessage(
      "diet must be one of: vegetarian, non-vegetarian, eggetarian, jain, swaminarayan, veg & non-veg"
    )
];

export const validateUserExpectations = [
  body("userId").notEmpty().withMessage("User ID is required"),
  body("age.from")
    .notEmpty()
    .withMessage("Age 'from' is required")
    .isInt({ min: 18, max: 100 })
    .withMessage("Age 'from' must be between 18 and 100"),
  body("age.to")
    .notEmpty()
    .withMessage("Age 'to' is required")
    .isInt({ min: 18, max: 100 })
    .withMessage("Age 'to' must be between 18 and 100"),
  body("maritalStatus")
    .notEmpty()
    .withMessage("Marital status is required")
    .custom((value) => {
      if (!value || typeof value !== "object") {
        throw new Error("Marital status must be an object or array");
      }
      return true;
    }),
  body("isConsumeAlcoholic")
    .notEmpty()
    .withMessage("Alcohol consumption is required")
    .isIn(["yes", "no", "occasionally"])
    .withMessage("Invalid value for alcohol consumption"),
  body("educationLevel")
    .notEmpty()
    .withMessage("Education level is required")
    .isIn([
      "High School",
      "Bachelor's Degree",
      "Graduate",
      "Post Graduate",
      "Doctorate",
      "Professional",
      "Other"
    ])
    .withMessage("Invalid education level"),
  body("community")
    .isArray({ min: 1 })
    .withMessage("Community must be a non-empty array of strings"),

  body("livingInCountry")
    .notEmpty()
    .withMessage("Living in country is required"),

  body("livingInState")
    .isString()
    .withMessage("Living in state must be a string"),
  body("profession")
    .notEmpty()
    .withMessage("Profession is required")
    .isArray({ min: 1 })
    .withMessage("Profession must be a non-empty array of strings"),
  body("diet")
    .notEmpty()
    .withMessage("Diet is required")
    .isArray({ min: 1 })
    .withMessage("Diet must be a non-empty array of strings")
];

export const UserProfessionValidation = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .bail()
    .isString()
    .withMessage("User ID must be a string"),
  body("Occupation")
    .bail()
    .isString()
    .withMessage("Occupation must be a string"),
  body("EmploymentStatus")
    .optional()
    .isIn([
      "private sector",
      "government",
      "self-employed",
      "unemployed",
      "student",
      "business"
    ])
    .withMessage(
      'EmploymentStatus must be one of: "private sector", "government", "self-employed", "unemployed", "student", "business"'
    ),
  body("OrganizationName")
    .optional()
    .isString()
    .withMessage("Organization Name must be a string")
];

export const changePasswordValidation = [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long")
    .matches(/[A-Z]/)
    .withMessage("New password must contain at least one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("New password must contain at least one number")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("New password must contain at least one special character"),
  body("confirmPassword").notEmpty().withMessage("Confirm password is required")
];

export const deleteAccountValidation = [
  body("reason")
    .notEmpty()
    .withMessage("Deletion reason is required")
    .isString()
    .withMessage("Deletion reason must be a string")
    .isLength({ min: 10, max: 500 })
    .withMessage("Deletion reason must be between 10 and 500 characters")
];

export const notificationSettingsValidation = [
  body("emailNotifications")
    .optional()
    .isBoolean()
    .withMessage("emailNotifications must be a boolean"),
  body("pushNotifications")
    .optional()
    .isBoolean()
    .withMessage("pushNotifications must be a boolean"),
  body("smsNotifications")
    .optional()
    .isBoolean()
    .withMessage("smsNotifications must be a boolean")
];

export const requestEmailChangeValidation = [
  body("newEmail")
    .notEmpty()
    .withMessage("New email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
];

export const verifyEmailChangeValidation = [
  body("newEmail")
    .notEmpty()
    .withMessage("New email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers")
];

export const requestPhoneChangeValidation = [
  body("newPhoneNumber")
    .notEmpty()
    .withMessage("New phone number is required")
    .isMobilePhone("any")
    .withMessage("Invalid phone number format")
];

export const verifyPhoneChangeValidation = [
  body("newPhoneNumber")
    .notEmpty()
    .withMessage("New phone number is required")
    .isMobilePhone("any")
    .withMessage("Invalid phone number format")
];

export const createEmailTemplateValidation = [
  body("type")
    .notEmpty()
    .withMessage("Template type is required")
    .bail()
    .isString()
    .withMessage("Template type must be a string")
    .bail()
    .isIn([
      "FORGOT_PASSWORD",
      "SIGNUP",
      "RESET_PASSWORD",
      "WELCOME_EMAIL",
      "PROFILE_REVIEW",
      "PROFILE_APPROVED",
      "PROFILE_REJECTED",
      "PROFILE_RECTIFICATION",
      "ACCOUNT_DEACTIVATION",
      "ACCOUNT_DELETION",
      "ACCOUNT_ACTIVATION",
      "SUBSCRIPTION_RENEWAL",
      "SUBSCRIPTION_CANCELLATION",
      "PAYMENT_FAILED",
      "TRIAL_ENDING_SOON",
      "PROMOTION_OFFER",
      "SYSTEM_MAINTENANCE",
      "ACCOUNT_SUSPENSION_WARNING",
      "LEGAL_UPDATE",
      "APP_UPDATE_NOTIFICATION",
      "NEWSLETTER"
    ])
    .withMessage("Invalid template type"),

  body("subject")
    .notEmpty()
    .withMessage("Subject is required")
    .bail()
    .isString()
    .withMessage("Subject must be a string")
    .bail()
    .isLength({ min: 3, max: 200 })
    .withMessage("Subject must be between 3 and 200 characters"),

  body("body")
    .notEmpty()
    .withMessage("Body is required")
    .bail()
    .isString()
    .withMessage("Body must be a string")
    .bail()
    .isLength({ min: 10 })
    .withMessage("Body must be at least 10 characters long"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean")
];

export const updateEmailTemplateValidation = [
  body("subject")
    .optional()
    .isString()
    .withMessage("Subject must be a string")
    .bail()
    .isLength({ min: 3, max: 200 })
    .withMessage("Subject must be between 3 and 200 characters"),

  body("body")
    .optional()
    .isString()
    .withMessage("Body must be a string")
    .bail()
    .isLength({ min: 10 })
    .withMessage("Body must be at least 10 characters long"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean")
];

export const createOrUpdatePricingConfigValidation = [
  body("monthName")
    .notEmpty()
    .withMessage("Month name is required")
    .bail()
    .isIn(["1_month", "3_months", "6_months", "12_months"])
    .withMessage(
      "Month name must be one of: 1_month, 3_months, 6_months, 12_months"
    ),

  body("features")
    .optional()
    .isArray()
    .withMessage("Features must be an array")
    .bail()
    .custom((value) => {
      if (value && !value.every((item: any) => typeof item === "string")) {
        throw new Error("All features must be strings");
      }
      return true;
    }),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .bail()
    .isNumeric()
    .withMessage("Price must be a number")
    .bail()
    .custom((value) => {
      if (value < 0) {
        throw new Error("Price must be a positive number");
      }
      return true;
    })
];

export const updateUserProfileValidation = [
  body("firstName")
    .optional()
    .isString()
    .withMessage("First name must be a string")
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),

  body("middleName")
    .optional()
    .isString()
    .withMessage("Middle name must be a string")
    .bail()
    .isLength({ max: 50 })
    .withMessage("Middle name must be less than 50 characters"),

  body("lastName")
    .optional()
    .isString()
    .withMessage("Last name must be a string")
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),

  body("email").optional().isEmail().withMessage("Invalid email format"),

  body("phoneNumber")
    .optional()
    .isMobilePhone("any")
    .withMessage("Invalid phone number format"),

  body("gender")
    .optional()
    .isIn(["male", "female", "other", "Male", "Female", "Other"])
    .withMessage("Gender must be male, female, or other"),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for date of birth"),

  body("for_Profile")
    .optional()
    .isString()
    .withMessage("for_Profile must be a string"),

  body("healthData")
    .optional()
    .isObject()
    .withMessage("Health data must be an object"),

  body("diet")
    .optional()
    .customSanitizer((value) => {
      if (typeof value === "string") {
        return value.replace(/&amp;/g, "&");
      }
      return value;
    })
    .isIn([
      "vegetarian",
      "non-vegetarian",
      "eggetarian",
      "jain",
      "swaminarayan",
      "veg & non-veg",
      ""
    ])
    .withMessage(
      "diet must be one of: vegetarian, non-vegetarian, eggetarian, jain, swaminarayan, veg & non-veg"
    ),

  body("professionData")
    .optional()
    .isObject()
    .withMessage("Profession data must be an object"),

  body("professionData.AnnualIncome")
    .optional()
    .isNumeric()
    .withMessage("Annual income must be a number"),

  body("personalData")
    .optional()
    .isObject()
    .withMessage("Personal data must be an object"),

  body("personalData.height")
    .optional()
    .isNumeric()
    .withMessage("Height must be a number"),

  body("personalData.weight")
    .optional()
    .isNumeric()
    .withMessage("Weight must be a number"),

  body("personalData.religion")
    .optional()
    .isString()
    .withMessage("Religion must be a string"),

  body("familyData")
    .optional()
    .isObject()
    .withMessage("Family data must be an object"),

  body("familyData.howManySiblings")
    .optional()
    .isNumeric()
    .withMessage("Number of siblings must be a number"),

  body("educationsData")
    .optional()
    .isObject()
    .withMessage("Education data must be an object"),

  body("expectationsData")
    .optional()
    .isObject()
    .withMessage("Expectations data must be an object"),

  body("expectationsData.age")
    .optional()
    .isObject()
    .withMessage("Age must be an object with from and to")
];
