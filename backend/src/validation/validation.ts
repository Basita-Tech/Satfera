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
    .withMessage("Password must be at least 6 characters long"),
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
    .withMessage("Password must contain at least one special character"),
];

export const CreateUserPersonalValidation = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .bail()
    .isString()
    .withMessage("User ID must be a string"),

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

  body("timeOfBirth")
    .optional()
    .isString()
    .withMessage("timeOfBirth must be a string"),

  body("height")
    .notEmpty()
    .withMessage("Height is required")
    .isFloat()
    .withMessage("Height must be a number")
    .toFloat(),

  body("weight")
    .notEmpty()
    .withMessage("Weight is required")
    .isFloat()
    .withMessage("Weight must be a number")
    .toFloat(),

  body("astrologicalSign")
    .notEmpty()
    .withMessage("astrologicalSign is required")
    .isString()
    .withMessage("astrologicalSign must be a string"),

  body("BirthPlace")
    .notEmpty()
    .withMessage("BirthPlace is required")
    .isString()
    .withMessage("BirthPlace must be a string"),

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
      "Awaiting Divorce",
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
    .withMessage("separatedSince must be a string"),
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
    .isIn(["Joint", "Nuclear", "Others"])
    .withMessage('familyType must be one of: "Joint", "Nuclear", "Others"'),
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
    .withMessage("Each sibling's isElder must be a boolean"),
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
    .withMessage("Country Of Education must be a string"),
];

export const UserHealthValidation = [
  body("isAlcoholic")
    .optional()
    .isBoolean()
    .withMessage("isAlcoholic must be a boolean"),
  body("isTobaccoUser")
    .optional()
    .isBoolean()
    .withMessage("isTobaccoUser must be a boolean"),
  body("isHaveTattoos")
    .optional()
    .isBoolean()
    .withMessage("isHaveTattoos must be a boolean"),
  body("isHaveHIV")
    .optional()
    .isBoolean()
    .withMessage("isHaveHIV must be a boolean"),
  body("isPostiviInTB")
    .optional()
    .isBoolean()
    .withMessage("isPostiviInTB must be a boolean"),
  body("isHaveMedicalHistory")
    .optional()
    .isBoolean()
    .withMessage("isHaveMedicalHistory must be a boolean"),
  body("medicalHistoryDetails")
    .optional()
    .isString()
    .withMessage("medicalHistoryDetails must be a string"),
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
    .isIn([
      "Never Married",
      "Divorced",
      "Widowed",
      "Separated",
      "Awaiting Divorce",
      "No Preference",
    ])
    .withMessage("Invalid marital status"),
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
      "Other",
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
  body("AnnualIncome")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Annual income must be a positive number")
    .toFloat(),
  body("EmploymentStatus")
    .optional()
    .isIn([
      "Private Sector",
      "Government",
      "self-employed",
      "unemployed",
      "student",
      "business",
    ])
    .withMessage(
      'EmploymentStatus must be one of: "Private Sector", "Government", "self-employed", "unemployed", "student", "business"'
    ),
  body("OrganizationName")
    .optional()
    .isString()
    .withMessage("Organization Name must be a string"),
];
