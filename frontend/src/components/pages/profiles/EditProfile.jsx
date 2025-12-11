import React, { useState, useEffect, useMemo } from "react";
import ReactSelect from "react-select";
import { getNames } from "country-list";
import { allCountries } from "country-telephone-data";
import CreatableSelect from "react-select/creatable";
import { State } from "country-state-city";
import {
  nationalities,
  visaCategories,
  doshOptions,
  weightOptions,
  heightOptions,
} from "@/lib/constant";
import LocationSelect from "../../ui/LocationSelect";
import {
  getStateCode,
  getAllCountriesWithCodes,
} from "../../../lib/locationUtils";
import { TabsComponent } from "../../TabsComponent";
import { Label } from "../../ui/label";
import CustomSelect from "../../ui/CustomSelect";
import SearchableCountryCode from "../../SearchableCountryCode";
import { Textarea } from "../../ui/textarea";
import { Button } from "../../ui/button";
import { ArrowLeft, Save } from "lucide-react";
import usePhotoUpload from "../../../hooks/usePhotoUpload";
import {
  getUserPersonal,
  getUserFamilyDetails,
  getEducationalDetails,
  getUserProfession,
  getUserExpectations,
  getUserPhotos,
  getUserHealth,
  updateUserPersonal,
  updateUserFamilyDetails,
  updateUserExpectations,
  updateUserHealth,
  updateEducationalDetails,
  saveEducationalDetails,
  saveUserProfession,
  updateUserProfession,
  saveUserHealth,
  saveUserFamilyDetails,
  saveUserExpectations,
} from "../../../api/auth";
import toast from "react-hot-toast";

const QUALIFICATION_LEVELS = [
  "Associates Degree",
  "Bachelors",
  "Diploma",
  "Doctorate",
  "High School",
  "Honours Degree",
  "Less Than High School",
  "Masters",
  "Trade School",
  "Undergraduate",
];

const EDUCATION_OPTIONS_BY_LEVEL = {
  "High School": [
    "Higher Secondary School / High School",
    "Science Stream",
    "Commerce Stream",
    "Arts Stream",
  ],
  "Less Than High School": ["Primary School", "Middle School"],
  Undergraduate: [
    "Aeronautical Engineering",
    "B.Arch. - Bachelor of Architecture",
    "BCA - Bachelor of Computer Applications",
    "B.E. - Bachelor of Engineering",
    "B.Plan - Bachelor of Planning",
    "B.Sc. IT/CS - Bachelor of Science in IT/Computer Science",
    "B.S. Eng. - Bachelor of Science in Engineering",
    "B.Tech. - Bachelor of Technology",
    "Other Bachelor's Degree in Engineering / Computers",
    "Aviation Degree",
    "B.A. - Bachelor of Arts",
    "B.Com. - Bachelor of Commerce",
    "B.Ed. - Bachelor of Education",
    "BFA - Bachelor of Fine Arts",
    "BFT - Bachelor of Fashion Technology",
    "BLIS - Bachelor of Library and Information Science",
    "B.M.M. - Bachelor of Mass Media",
    "B.Sc. - Bachelor of Science",
    "B.S.W. - Bachelor of Social Work",
    "B.Phil. - Bachelor of Philosophy",
    "Other Bachelor's Degree in Arts / Science / Commerce",
    "BBA - Bachelor of Business Administration",
    "BFM - Bachelor of Financial Management",
    "BHM - Bachelor of Hotel Management",
    "BHA - Bachelor of Hospital Administration",
    "Other Bachelor's Degree in Management",
    "BAMS - Bachelor of Ayurvedic Medicine and Surgery",
    "BDS - Bachelor of Dental Surgery",
    "BHMS - Bachelor of Homeopathic Medicine and Surgery",
    "BSMS - Bachelor of Siddha Medicine and Surgery",
    "BUMS - Bachelor of Unani Medicine and Surgery",
    "BVSc - Bachelor of Veterinary Science",
    "MBBS - Bachelor of Medicine, Bachelor of Surgery",
    "BPharm - Bachelor of Pharmacy",
    "BPT - Bachelor of Physiotherapy",
    "B.Sc. Nursing - Bachelor of Science in Nursing",
    "Other Bachelor's Degree in Pharmacy / Nursing or Health Sciences",
    "BGL - Bachelor of General Laws",
    "BL - Bachelor of Laws",
    "LLB - Bachelor of Legislative Law",
    "Other Bachelor's Degree in Legal",
  ],
  Bachelors: [
    "Aeronautical Engineering",
    "B.Arch. - Bachelor of Architecture",
    "BCA - Bachelor of Computer Applications",
    "B.E. - Bachelor of Engineering",
    "B.Plan - Bachelor of Planning",
    "B.Sc. IT/CS - Bachelor of Science in IT/Computer Science",
    "B.S. Eng. - Bachelor of Science in Engineering",
    "B.Tech. - Bachelor of Technology",
    "Other Bachelor's Degree in Engineering / Computers",
    "Aviation Degree",
    "B.A. - Bachelor of Arts",
    "B.Com. - Bachelor of Commerce",
    "B.Ed. - Bachelor of Education",
    "BFA - Bachelor of Fine Arts",
    "BFT - Bachelor of Fashion Technology",
    "BLIS - Bachelor of Library and Information Science",
    "B.M.M. - Bachelor of Mass Media",
    "B.Sc. - Bachelor of Science",
    "B.S.W. - Bachelor of Social Work",
    "B.Phil. - Bachelor of Philosophy",
    "Other Bachelor's Degree in Arts / Science / Commerce",
    "BBA - Bachelor of Business Administration",
    "BFM - Bachelor of Financial Management",
    "BHM - Bachelor of Hotel Management",
    "BHA - Bachelor of Hospital Administration",
    "Other Bachelor's Degree in Management",
    "BAMS - Bachelor of Ayurvedic Medicine and Surgery",
    "BDS - Bachelor of Dental Surgery",
    "BHMS - Bachelor of Homeopathic Medicine and Surgery",
    "BSMS - Bachelor of Siddha Medicine and Surgery",
    "BUMS - Bachelor of Unani Medicine and Surgery",
    "BVSc - Bachelor of Veterinary Science",
    "MBBS - Bachelor of Medicine, Bachelor of Surgery",
    "BPharm - Bachelor of Pharmacy",
    "BPT - Bachelor of Physiotherapy",
    "B.Sc. Nursing - Bachelor of Science in Nursing",
    "Other Bachelor's Degree in Pharmacy / Nursing or Health Sciences",
    "BGL - Bachelor of General Laws",
    "BL - Bachelor of Laws",
    "LLB - Bachelor of Legislative Law",
    "Other Bachelor's Degree in Legal",
  ],
  "Honours Degree": [
    "B.Arch. (Hons) - Bachelor of Architecture with Honours",
    "B.E. (Hons) - Bachelor of Engineering with Honours",
    "B.Tech. (Hons) - Bachelor of Technology with Honours",
    "B.Sc. (Hons) - Bachelor of Science with Honours",
    "B.A. (Hons) - Bachelor of Arts with Honours",
    "B.Com. (Hons) - Bachelor of Commerce with Honours",
    "Other Honours Degree",
  ],
  "Associates Degree": [
    "Associates in Arts",
    "Associates in Science",
    "Associates in Applied Science",
    "Associates in Business",
    "Associates in Engineering",
    "Other Associates Degree",
  ],
  Masters: [
    "M.Arch. - Master of Architecture",
    "MCA - Master of Computer Applications",
    "M.E. - Master of Engineering",
    "M.Sc. IT/CS - Master of Science in IT/Computer Science",
    "M.S. Eng. - Master of Science in Engineering",
    "M.Tech. - Master of Technology",
    "Other Master's Degree in Engineering / Computers",
    "M.A. - Master of Arts",
    "M.Com. - Master of Commerce",
    "M.Ed. - Master of Education",
    "MFA - Master of Fine Arts",
    "MLIS - Master of Library and Information Science",
    "M.Sc. - Master of Science",
    "M.S.W. - Master of Social Work",
    "M.Phil. - Master of Philosophy",
    "Other Master's Degree in Arts / Science / Commerce",
    "MBA - Master of Business Administration",
    "MFM - Master of Financial Management",
    "MHM - Master of Hotel Management",
    "MHRM - Master of Human Resource Management",
    "MHA - Master of Hospital Administration",
    "Other Master's Degree in Management",
    "MDS - Master of Dental Surgery",
    "MS - Master of Surgery",
    "MVSc - Master of Veterinary Science",
    "MCh - Master of Chirurgiae",
    "MPharm - Master of Pharmacy",
    "MPT - Master of Physiotherapy",
    "M.Sc. Nursing - Master of Science in Nursing",
    "Other Master's Degree in Pharmacy / Nursing or Health Sciences",
    "LLM - Master of Laws",
    "ML - Master of Legal Studies",
    "Other Master's Degree in Legal",
    "CA - Chartered Accountant",
    "CFA - Chartered Financial Analyst",
    "CS - Company Secretary",
    "ICWA - Cost And Works Accountant",
  ],
  Doctorate: [
    "Ph.D. - Doctor of Philosophy",
    "DM - Doctor of Medicine",
    "DNB - Diplomate of National Board",
    "FNB - Fellow of National Board",
    "D.Sc. - Doctor of Science",
    "Ed.D. - Doctor of Education",
    "DBA - Doctor of Business Administration",
    "D.Litt. - Doctor of Literature",
    "LL.D. - Doctor of Laws",
    "Postdoctoral Fellow",
  ],
  Diploma: [
    "Diploma in Engineering",
    "Diploma in Computer Applications",
    "Diploma in Management",
    "Diploma in Nursing",
    "Diploma in Pharmacy",
    "Diploma in Education",
    "Polytechnic Diploma",
    "PGDCA - Post Graduate Diploma in Computer Applications",
    "PGDM - Post Graduate Diploma in Management",
    "Advanced Diploma",
    "Other Diplomas",
  ],
  "Trade School": [
    "Electrician",
    "Plumber",
    "Carpenter",
    "Mechanic",
    "Welder",
    "Other Trade Certification",
  ],
};

const FIELD_OF_STUDY_OPTIONS = [
  "Aeronautical Engineering",
  "B.Arch. - Bachelor of Architecture",
  "BCA - Bachelor of Computer Applications",
  "B.E. - Bachelor of Engineering",
  "B.Plan - Bachelor of Planning",
  "B.Sc. IT/CS - Bachelor of Science in IT/Computer Science",
  "B.S. Eng. - Bachelor of Science in Engineering",
  "B.Tech. - Bachelor of Technology",
  "Other Bachelor's Degree in Engineering / Computers",
  "M.Arch. - Master of Architecture",
  "MCA - Master of Computer Applications",
  "M.E. - Master of Engineering",
  "M.Sc. IT/CS - Master of Science in IT/Computer Science",
  "M.S. Eng. - Master of Science in Engineering",
  "M.Tech. - Master of Technology",
  "PGDCA - Post Graduate Diploma in Computer Applications",
  "Other Master's Degree in Engineering / Computers",
  "Aviation Degree",
  "B.A. - Bachelor of Arts",
  "B.Com. - Bachelor of Commerce",
  "B.Ed. - Bachelor of Education",
  "BFA - Bachelor of Fine Arts",
  "BFT - Bachelor of Fashion Technology",
  "BLIS - Bachelor of Library and Information Science",
  "B.M.M. - Bachelor of Mass Media",
  "B.Sc. - Bachelor of Science",
  "B.S.W. - Bachelor of Social Work",
  "B.Phil. - Bachelor of Philosophy",
  "Other Bachelor's Degree in Arts / Science / Commerce",
  "M.A. - Master of Arts",
  "M.Com. - Master of Commerce",
  "M.Ed. - Master of Education",
  "MFA - Master of Fine Arts",
  "MLIS - Master of Library and Information Science",
  "M.Sc. - Master of Science",
  "M.S.W. - Master of Social Work",
  "M.Phil. - Master of Philosophy",
  "Other Master's Degree in Arts / Science / Commerce",
  "BBA - Bachelor of Business Administration",
  "BFM - Bachelor of Financial Management",
  "BHM - Bachelor of Hotel Management",
  "BHA - Bachelor of Hospital Administration",
  "Other Bachelor's Degree in Management",
  "MBA - Master of Business Administration",
  "MFM - Master of Financial Management",
  "MHM - Master of Hotel Management",
  "MHRM - Master of Human Resource Management",
  "PGDM - Post Graduate Diploma in Management",
  "MHA - Master of Hospital Administration",
  "Other Master's Degree in Management",
  "BAMS - Bachelor of Ayurvedic Medicine and Surgery",
  "BDS - Bachelor of Dental Surgery",
  "BHMS - Bachelor of Homeopathic Medicine and Surgery",
  "BSMS - Bachelor of Siddha Medicine and Surgery",
  "BUMS - Bachelor of Unani Medicine and Surgery",
  "BVSc - Bachelor of Veterinary Science",
  "MBBS - Bachelor of Medicine, Bachelor of Surgery",
  "MDS - Master of Dental Surgery",
  "Doctor of Medicine / Master of Surgery",
  "MVSc - Master of Veterinary Science",
  "MCh - Master of Chirurgiae",
  "DNB - Diplomate of National Board",
  "BPharm - Bachelor of Pharmacy",
  "BPT - Bachelor of Physiotherapy",
  "B.Sc. Nursing - Bachelor of Science in Nursing",
  "Other Bachelor's Degree in Pharmacy / Nursing or Health Sciences",
  "MPharm - Master of Pharmacy",
  "MPT - Master of Physiotherapy",
  "Other Master's Degree in Pharmacy / Nursing or Health Sciences",
  "BGL - Bachelor of General Laws",
  "BL - Bachelor of Laws",
  "LLB - Bachelor of Legislative Law",
  "Other Bachelor's Degree in Legal",
  "LLM - Master of Laws",
  "ML - Master of Legal Studies",
  "Other Master's Degree in Legal",
  "CA - Chartered Accountant",
  "CFA - Chartered Financial Analyst",
  "CS - Company Secretary",
  "ICWA - Cost and Works Accountant",
  "Other Degree / Qualification in Finance",
  "IAS - Indian Administrative Service",
  "IPS - Indian Police Service",
  "IRS - Indian Revenue Service",
  "IES - Indian Engineering Services",
  "IFS - Indian Foreign Service",
  "Other Civil Services",
  "Ph.D. - Doctor of Philosophy",
  "DM - Doctor of Medicine",
  "Postdoctoral Fellow",
  "FNB - Fellow of National Board",
  "Diploma",
  "Polytechnic",
  "Other Diplomas",
  "Higher Secondary School / High School",
];
const EMPLOYMENT_OPTIONS = [
  "business",
  "government",
  "unemployed",
  "private sector",
  "self-employed",
  "student",
];

const EMPLOYMENT_DISPLAY_MAP = {
  business: "Business",
  government: "Government",
  unemployed: "Not Working",
  "private sector": "Private Sector",
  "self-employed": "Self-Employed",
  student: "Student",
};

const INCOME_OPTIONS = [
  "₹1 – 5 Lakh",
  "₹5 – 10 Lakh",
  "₹10 – 15 Lakh",
  "₹15 – 20 Lakh",
  "₹20 – 25 Lakh",
  "₹25 – 30 Lakh",
  "₹30 – 35 Lakh",
  "₹35 – 40 Lakh",
  "₹40 – 45 Lakh",
  "₹45 – 50 Lakh",
  "₹50 – 55 Lakh",
  "₹55 – 60 Lakh",
  "₹60 – 65 Lakh",
  "₹65 – 70 Lakh",
  "₹70 – 75 Lakh",
  "₹75 – 80 Lakh",
  "₹80 – 85 Lakh",
  "₹85 – 90 Lakh",
  "₹90 – 95 Lakh",
  "₹95 Lakh – ₹1 Crore",
  "More than ₹1 Crore",
];
const JOB_TITLES = [
  "Marketing Specialist",
  "Marketing Manager",
  "Graphic Designer",
  "Product Manager",
  "Public Relations",
  "Brand Manager",
  "SEO Manager",
  "Content Marketing Manager",
  "Copywriter",
  "Administrative Assistant",
  "Accountant",
  "Software Engineer",
  "Web Developer",
  "DevOps Engineer",
  "Network Administrator",
  "Information Security Analyst",
  "Cloud Architect",
  "Data Analyst",
  "Researcher",
  "Teacher",
  "Professor",
  "Artist",
  "Video Editor",
  "Photographer",
  "Musician",
  "Nurse",
  "Doctor",
  "Physical Therapist",
  "Chef",
  "Restaurant Manager",
  "Biologist",
  "Geologist",
  "Physicist",
  "Counselor",
  "Social Worker",
  "Therapist",
  "Beautician",
  "Makeup Artist",
  "Esthetician",
  "Security Guard",
  "Mechanic",
  "Entrepreneur",
  "Management Consultant",
  "Attorney",
  "Engineer",
  "Operations Manager",
  "HR",
  "Business Analyst",
  "Financial Analyst",
  "Sales Executive",
  "Customer Support Representative",
  "Tutor",
  "Project Manager",
  "UX Designer & UI Developer",
  "Application Developer",
  "Virtual Assistant",
];
const LIFESTYLE_HABIT_OPTIONS = ["Yes", "No", "Occasional"];
const LIFESTYLE_YES_NO = ["Yes", "No"];
const LIFESTYLE_DIET_OPTIONS = [
  "Eggetarian",
  "Jain",
  "Non-Vegetarian",
  "Swaminarayan",
  "Veg & Non-veg",
  "Vegetarian",
];
const LEGAL_STATUSES = [
  "Awaiting Divorce",
  "Divorced",
  "Never Married",
  "Separated",
  "Widowed",
];
const EXPECT_MARITAL_STATUSES = [
  "Any",
  "Awaiting Divorce",
  "Divorced",
  "Never Married",
  "Separated",
  "Widowed",
];
const EXPECT_PROFESSION_OPTIONS = [
  "Any",
  "Business",
  "Government",
  "Not Working",
  "Private Sector",
  "Self-Employed",
  "Student",
];
const EXPECT_CAST_OPTIONS = [
  "Brahmin",
  "Brahmin-Audichya",
  "Jain-Digambar",
  "Jain-Swetamber",
  "Jain-Vanta",
  "No preference",
  "Patel",
  "Patel-Desai",
  "Patel-Kadva",
  "Patel-Leva",
  "Vaishnav-Vania",
];
const EXPECT_EDUCATION_OPTIONS = ["Any", ...QUALIFICATION_LEVELS];
const EXPECT_DIET_OPTIONS = [
  "Any",
  "Eggetarian",
  "Jain",
  "Non-Vegetarian",
  "Swaminarayan",
  "Veg & Non-Veg",
  "Vegetarian",
];
const AGE_OPTIONS = Array.from({ length: 23 }, (_, i) => 18 + i);
const ALL_COUNTRIES = getAllCountriesWithCodes().map((c) => c.name);
const INDIAN_STATES = State.getStatesOfCountry("IN")
  .map((s) => s.name)
  .sort();
const ABROAD_OPTIONS = ["No preference", ...ALL_COUNTRIES];

const countryCodes = allCountries.map((c) => ({
  code: `+${c.dialCode}`,
  country: c.name,
}));

export function EditProfile({ onNavigateBack }) {
  const { uploadPhotos } = usePhotoUpload();
  const [activeTab, setActiveTab] = useState("personal");

  const [family, setFamily] = useState({
    fatherName: "",
    fatherProfession: "",
    fatherPhoneCode: "",
    fatherPhone: "",
    fatherNative: "",
    motherName: "",
    motherProfession: "",
    motherPhoneCode: "",
    motherPhone: "",
    motherNative: "",
    grandFatherName: "",
    grandMotherName: "",
    nanaName: "",
    naniName: "",
    nanaNativePlace: "",
    familyType: "",
    numberOfBrothers: "",
    numberOfSisters: "",

    hasSiblings: null,
    siblingCount: 0,
    siblings: [],
    doYouHaveChildren: false,
  });

  const [education, setEducation] = useState({
    schoolName: "",
    highestEducation: "",
    fieldOfStudy: "",
    universityName: "",
    countryOfEducation: "",
    otherCountry: "",
  });

  const [profession, setProfession] = useState({
    employmentStatus: "",
    occupation: "",
    annualIncome: "",
    organizationName: "",
  });

  const [lifestyle, setLifestyle] = useState({
    diet: "",
    smoking: "",
    drinking: "",
    healthIssues: "",
    isHaveMedicalHistory: "",
    isHaveTattoos: "",
    isHaveHIV: "",
    isPositiveInTB: "",
  });
  const [lifestyleRaw, setLifestyleRaw] = useState(null);

  const [expectations, setExpectations] = useState({
    partnerLocation: "",
    partnerCountry: "",
    partnerState: "",
    partnerStateOrCountry: [],
    openToPartnerHabits: "",
    partnerEducation: [],
    partnerDiet: [],
    partnerCommunity: [],
    profession: [],
    maritalStatus: [],
    preferredAgeFrom: "",
    preferredAgeTo: "",
  });

  const [photos, setPhotos] = useState([]);
  const [uploadingPhotoIdx, setUploadingPhotoIdx] = useState(null);

  const [initialPersonal, setInitialPersonal] = useState(null);
  const [initialFamily, setInitialFamily] = useState(null);
  const [initialEducation, setInitialEducation] = useState(null);
  const [initialProfession, setInitialProfession] = useState(null);
  const [initialLifestyle, setInitialLifestyle] = useState(null);
  const [initialExpectations, setInitialExpectations] = useState(null);

  const countries = useMemo(() => getNames(), []);

  const filteredFieldOfStudyOptions = useMemo(() => {
    if (!education.highestEducation) {
      const allOptions = Object.values(EDUCATION_OPTIONS_BY_LEVEL).flat();
      return [...new Set(allOptions)];
    }

    const levelOptions =
      EDUCATION_OPTIONS_BY_LEVEL[education.highestEducation] || [];
    return levelOptions;
  }, [education.highestEducation]);

  const tabs = [
    { key: "personal", label: "Personal Details" },
    { key: "family", label: "Family Details" },
    { key: "education", label: "Educational Details" },
    { key: "profession", label: "Profession Details" },
    { key: "lifestyle", label: "Health & Lifestyle" },
    { key: "expectations", label: "Expectation Details" },
    { key: "photos", label: "Photos" },
  ];

  /**
   * Sanitize input value:
   * - Trim spaces
   * - Remove HTML/script tags
   * - Replace multiple spaces with single space
   */
  const sanitizeInput = (value) => {
    if (!value || typeof value !== "string") return "";
    return value
      .trim()
      .replace(/<[^>]*>?/gm, "")
      .replace(/\s+/g, " ");
  };

  /**
   * Validate a field for required values
   */
  const isFieldValid = (value, isRequired = true) => {
    if (!isRequired) return true;
    const trimmed = String(value || "").trim();
    return trimmed.length > 0;
  };

  /**
   * Get validation errors for a tab
   * Returns object with field names as keys and error messages as values
   */
  const getTabErrors = (tabKey, formData) => {
    const errors = {};

    if (tabKey === "personal") {
      if (!isFieldValid(formData.birthHour))
        errors.birthHour = "Birth hour is required";
      if (!isFieldValid(formData.birthMinute))
        errors.birthMinute = "Birth minute is required";
      if (!isFieldValid(formData.maritalStatus))
        errors.maritalStatus = "Marital status is required";
      if (!isFieldValid(formData.height)) errors.height = "Height is required";
      if (!isFieldValid(formData.weight)) errors.weight = "Weight is required";
      if (!isFieldValid(formData.religion))
        errors.religion = "Religion is required";
      if (!isFieldValid(formData.caste)) errors.caste = "Caste is required";
      if (!isFieldValid(formData.birthCity))
        errors.birthCity = "Birth city is required";
      if (!isFieldValid(formData.birthState))
        errors.birthState = "Birth state is required";
      if (!isFieldValid(formData.rashi)) errors.rashi = "Rashi is required";
      if (!isFieldValid(formData.dosh)) errors.dosh = "Dosh is required";
      if (!isFieldValid(formData.street1))
        errors.street1 = "Street 1 is required";
      if (!isFieldValid(formData.street2))
        errors.street2 = "Street 2 is required";
      if (!isFieldValid(formData.pincode))
        errors.pincode = "Pincode is required";
      if (!isFieldValid(formData.city)) errors.city = "City is required";
      if (!isFieldValid(formData.state)) errors.state = "State is required";
      if (!isFieldValid(formData.ownHouse))
        errors.ownHouse = "Own house information is required";
      if (!isFieldValid(formData.nationality))
        errors.nationality = "Nationality is required";
      if (!isFieldValid(formData.residingInIndia))
        errors.residingInIndia = "Residing in India is required";

      if (formData.residingInIndia === "no") {
        if (!isFieldValid(formData.residingCountry))
          errors.residingCountry = "Residing country is required";
        if (!isFieldValid(formData.visaCategory))
          errors.visaCategory = "Visa category is required";
      }

      if (
        formData.maritalStatus &&
        formData.maritalStatus !== "Never Married"
      ) {
        if (!isFieldValid(formData.hasChildren))
          errors.hasChildren = "Has children is required";
        if (formData.hasChildren === "Yes") {
          if (!isFieldValid(formData.numChildren))
            errors.numChildren = "Number of children is required";
          if (!isFieldValid(formData.livingWith))
            errors.livingWith = "Living with is required";
        }
      }

      if (formData.maritalStatus === "Separated") {
        if (!isFieldValid(formData.separatedSince))
          errors.separatedSince = "Separated since is required";
      } else if (
        formData.maritalStatus === "Divorced" ||
        formData.maritalStatus === "Awaiting Divorce"
      ) {
        if (!isFieldValid(formData.divorceStatus))
          errors.divorceStatus = "Divorce status is required";
      }
    }

    if (tabKey === "education") {
      if (!isFieldValid(formData.schoolName))
        errors.schoolName = "School name is required";
      if (!isFieldValid(formData.highestEducation))
        errors.highestEducation = "Highest qualification is required";
      if (!isFieldValid(formData.fieldOfStudy))
        errors.fieldOfStudy = "Field of study is required";
      if (!isFieldValid(formData.universityName))
        errors.universityName = "University/College name is required";
      if (!isFieldValid(formData.countryOfEducation))
        errors.countryOfEducation = "Country of education is required";

      if (
        formData.countryOfEducation === "Other" &&
        !isFieldValid(formData.otherCountry)
      ) {
        errors.otherCountry = "Please specify your country";
      }
    }

    if (tabKey === "profession") {
      if (!isFieldValid(formData.employmentStatus))
        errors.employmentStatus = "Employment status is required";
      if (!isFieldValid(formData.occupation))
        errors.occupation = "Occupation is required";
      if (!isFieldValid(formData.annualIncome))
        errors.annualIncome = "Annual income is required";
      if (!isFieldValid(formData.organizationName))
        errors.organizationName = "Organization name is required";
    }

    if (tabKey === "lifestyle") {
      if (!isFieldValid(formData.diet)) errors.diet = "Diet is required";
      if (!isFieldValid(formData.smoking))
        errors.smoking = "Smoking preference is required";
      if (!isFieldValid(formData.drinking))
        errors.drinking = "Drinking preference is required";
      if (!isFieldValid(formData.isHaveMedicalHistory))
        errors.isHaveMedicalHistory = "Medical history is required";

      if (String(formData.isHaveMedicalHistory).toLowerCase() === "yes") {
        if (!isFieldValid(formData.healthIssues))
          errors.healthIssues = "Health issues information is required";
      }
      if (!isFieldValid(formData.isHaveTattoos))
        errors.isHaveTattoos = "Tattoo information is required";
      if (!isFieldValid(formData.isHaveHIV))
        errors.isHaveHIV = "HIV information is required";
      if (!isFieldValid(formData.isPositiveInTB))
        errors.isPositiveInTB = "TB information is required";
    }

    if (tabKey === "expectations") {
      if (!isFieldValid(formData.partnerLocation))
        errors.partnerLocation = "Partner location is required";

      if (formData.partnerLocation === "India") {
        if (
          !formData.partnerStateOrCountry ||
          formData.partnerStateOrCountry.length === 0
        ) {
          errors.partnerState = "Partner state is required";
        }
      } else if (formData.partnerLocation === "Abroad") {
        if (
          !formData.partnerStateOrCountry ||
          formData.partnerStateOrCountry.length === 0
        ) {
          errors.partnerCountry = "Partner country is required";
        }
      }

      if (!isFieldValid(formData.openToPartnerHabits))
        errors.openToPartnerHabits = "Partner habits preference is required";
      if (!formData.partnerEducation || formData.partnerEducation.length === 0)
        errors.partnerEducation = "Partner education is required";
      if (!formData.partnerDiet || formData.partnerDiet.length === 0)
        errors.partnerDiet = "Partner diet preference is required";
      if (!formData.partnerCommunity || formData.partnerCommunity.length === 0)
        errors.partnerCommunity = "Partner community is required";
      if (!formData.profession || formData.profession.length === 0)
        errors.profession = "Partner profession is required";
      if (!formData.maritalStatus || formData.maritalStatus.length === 0)
        errors.maritalStatus = "Partner marital status is required";
      if (!isFieldValid(formData.preferredAgeFrom))
        errors.preferredAgeFrom = "Preferred age from is required";
      if (!isFieldValid(formData.preferredAgeTo))
        errors.preferredAgeTo = "Preferred age to is required";
    }

    return errors;
  };

  const [personalErrors, setPersonalErrors] = useState({});
  const [educationErrors, setEducationErrors] = useState({});
  const [professionErrors, setProfessionErrors] = useState({});
  const [lifestyleErrors, setLifestyleErrors] = useState({});
  const [expectationErrors, setExpectationErrors] = useState({});

  const [personal, setPersonal] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    maritalStatus: "",
    height: "",
    weight: "",
    religion: "",
    caste: "",
    birthHour: "",
    birthMinute: "",
    birthCity: "",
    birthState: "",
    rashi: "",
    dosh: "",
    street1: "",
    street2: "",
    pincode: "",
    city: "",
    state: "",
    ownHouse: "",
    nationality: "",
    residingInIndia: "",
    residingCountry: "",
    visaCategory: "",
    hasChildren: "",
    numChildren: "",
    livingWith: "",
    divorceStatus: "",
    separatedSince: "",
  });

  const [showChildrenFields, setShowChildrenFields] = useState(false);
  const [showDivorceFields, setShowDivorceFields] = useState(false);

  const [birthStateCode, setBirthStateCode] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getUserPersonal();
        const data = res?.data?.data || {};

        const checkMissingPersonalFields = (d) => {
          const expected = [
            "firstName",
            "middleName",
            "lastName",
            "dateOfBirth",
            "timeOfBirth",
            "height",
            "weight",
            "astrologicalSign",
            "dosh",
            "subCaste",
            "birthPlace",
            "birthState",
            "full_address.street1",
            "full_address.city",
            "full_address.zipCode",
            "nationality",
            "isResidentOfIndia",
            "residingCountry",
            "visaType",
            "marriedStatus",
            "isHaveChildren",
          ];

          const missing = [];
          expected.forEach((key) => {
            if (key.includes(".")) {
              const [a, b] = key.split(".");
              if (
                !d[a] ||
                d[a][b] === undefined ||
                d[a][b] === null ||
                (typeof d[a][b] === "string" && String(d[a][b]).trim() === "")
              )
                missing.push(key);
            } else {
              if (
                d[key] === undefined ||
                d[key] === null ||
                (typeof d[key] === "string" && String(d[key]).trim() === "")
              )
                missing.push(key);
            }
          });

          if (missing.length)
            console.info("Missing personal fields from API response:", missing);
          else
            console.info(
              "All expected personal fields present in API response"
            );
        };

        if (!data || Object.keys(data).length === 0) {
          console.info(
            "No personal data returned from API (profile may not exist yet)"
          );
        } else {
          checkMissingPersonalFields(data);
        }

        const dob = data.dateOfBirth
          ? new Date(data.dateOfBirth).toISOString().split("T")[0]
          : "";

        let birthHour = "",
          birthMinute = "";
        if (data.timeOfBirth) {
          const parts = String(data.timeOfBirth).split(":");
          birthHour = parts[0] || "";
          birthMinute = parts[1] || "";
        }

        const personalMapped = {
          firstName: data.firstName || "",
          middleName: data.middleName || "",
          lastName: data.lastName || "",
          dateOfBirth: dob,
          birthHour,
          birthMinute,
          maritalStatus: data.marriedStatus || "",
          height:
            data.height && typeof data.height === "object"
              ? data.height.value || data.height.text || ""
              : data.height || "",
          weight:
            data.weight && typeof data.weight === "object"
              ? data.weight.text || data.weight.value || ""
              : data.weight !== undefined && data.weight !== null
              ? String(data.weight)
              : "",
          religion: data.religion || "",
          caste: data.subCaste || "",
          birthCity: data.birthPlace || "",
          birthState: data.birthState || "",
          rashi: data.astrologicalSign || "",
          dosh: data.dosh || "",
          street1: data.full_address?.street1 || "",
          street2: data.full_address?.street2 || "",
          pincode: data.full_address?.zipCode || "",
          country: data.full_address?.country || "India",
          city: data.full_address?.city || "",
          state: data.full_address?.state || "",
          ownHouse:
            typeof data.full_address?.isYourHome === "boolean"
              ? data.full_address.isYourHome
                ? "Yes"
                : "No"
              : "",
          nationality: data.nationality || "",
          residingInIndia:
            typeof data.isResidentOfIndia === "boolean"
              ? data.isResidentOfIndia
                ? "yes"
                : "no"
              : "",
          residingCountry: data.residingCountry || "",
          visaCategory: data.visaType || "",
          hasChildren:
            data.isHaveChildren === true
              ? "Yes"
              : data.isHaveChildren === false
              ? "No"
              : "",
          numChildren: data.numberOfChildren
            ? String(data.numberOfChildren)
            : "",
          livingWith:
            data.isChildrenLivingWithYou === true
              ? "With Me"
              : data.isChildrenLivingWithYou === false
              ? "No"
              : "",
          divorceStatus: data.divorceStatus || "",
          separatedSince: data.separatedSince
            ? String(data.separatedSince)
            : "",
        };

        setPersonal((p) => ({ ...p, ...personalMapped }));
        setInitialPersonal(personalMapped);

        if (personalMapped.birthState) {
          const code = getStateCode("IN", personalMapped.birthState);
          setBirthStateCode(code || "");
        }

        const maritalStatus = personalMapped.maritalStatus;
        if (maritalStatus) {
          setShowChildrenFields(maritalStatus !== "Never Married");
          setShowDivorceFields(
            maritalStatus === "Divorced" ||
              maritalStatus === "Awaiting Divorce" ||
              maritalStatus === "Separated"
          );
        }
      } catch (err) {
        console.error("Failed to load personal details", err);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadProfession = async () => {
      try {
        const res = await getUserProfession();
        const data = res?.data?.data;
        if (!data || Object.keys(data).length === 0) {
          console.info(
            "No profession data returned from API (profile may not exist yet)"
          );
          return;
        }

        const normalizeFromOptions = (val, opts) => {
          const s = String(val || "")
            .trim()
            .toLowerCase();
          const match = opts.find((o) => o.toLowerCase() === s);
          return match || String(val || "").trim();
        };

        const rawEmploymentStatus =
          typeof data?.EmploymentStatus === "object"
            ? data.EmploymentStatus.value || data.EmploymentStatus.label || ""
            : data?.EmploymentStatus ??
              data?.employmentStatus ??
              data?.employment_status ??
              "";

        const profMapped = {
          employmentStatus: normalizeFromOptions(
            rawEmploymentStatus,
            EMPLOYMENT_OPTIONS
          ),
          occupation: data.Occupation || data.occupation || "",
          annualIncome: data.AnnualIncome || data.annualIncome || "",
          organizationName:
            data.OrganizationName || data.organizationName || "",
        };
        setProfession(profMapped);
        setInitialProfession(profMapped);
        console.info("Loaded profession data keys:", Object.keys(data));
      } catch (err) {
        console.error("Failed to load profession details", err);
      }
    };

    loadProfession();
  }, []);

  useEffect(() => {
    const loadFamily = async () => {
      try {
        const res = await getUserFamilyDetails();
        const data = res?.data?.data;
        if (!data || Object.keys(data).length === 0) {
          console.info(
            "No family data returned from API (profile may not exist yet)"
          );
          return;
        }

        const normalizePhone = (val) => {
          if (!val) return "";
          if (typeof val === "string") return val;
          if (typeof val === "object" && val !== null) {
            if (val.number !== undefined && val.number !== null) {
              return String(val.number).trim();
            }

            if (val.value !== undefined && val.value !== null) {
              return String(val.value).trim();
            }
            if (val.label !== undefined && val.label !== null) {
              return String(val.label).trim();
            }
          }
          return "";
        };

        const familyMapped = {
          fatherName: data.fatherName || "",
          fatherProfession: data.fatherOccupation || "",
          fatherPhone: normalizePhone(data.fatherContact),
          fatherNative: data.fatherNativePlace || "",
          motherName: data.motherName || "",
          motherProfession: data.motherOccupation || "",
          motherPhone: normalizePhone(data.motherContact),
          grandFatherName: data.grandFatherName || "",
          grandMotherName: data.grandMotherName || "",
          nanaName: data.nanaName || "",
          naniName: data.naniName || "",
          nanaNativePlace: data.nanaNativePlace || "",
          familyType: data.familyType || "",

          hasSiblings:
            typeof data.haveSibling === "boolean" ? data.haveSibling : null,
          siblingCount: data.howManySiblings || 0,
          siblings: data.siblingDetails || [],
          doYouHaveChildren: data.doYouHaveChildren ?? false,
        };
        setFamily((f) => ({ ...f, ...familyMapped }));
        setInitialFamily(familyMapped);
      } catch (err) {
        console.error("Failed to load family details", err);
      }
    };

    loadFamily();
  }, []);

  useEffect(() => {
    const loadEducation = async () => {
      try {
        const res = await getEducationalDetails();

        try {
          console.info("Education API raw response:", res);
          console.info("Education API res.data:", res?.data);
        } catch (logErr) {
          console.error("Failed to log education API response", logErr);
        }
        const data = res?.data?.data;
        if (!data || Object.keys(data).length === 0) {
          console.info(
            "No education data returned from API (profile may not exist yet)"
          );
          return;
        }

        const educationMapped = {
          schoolName: data.SchoolName || data.schoolName || "",
          highestEducation:
            data.HighestEducation || data.highestEducation || "",
          fieldOfStudy:
            data.FieldOfStudy && typeof data.FieldOfStudy === "object"
              ? data.FieldOfStudy.value ||
                data.FieldOfStudy.label ||
                String(data.FieldOfStudy)
              : data.FieldOfStudy || data.fieldOfStudy || "",
          universityName:
            data.University || data.universityName || data.university || "",
          countryOfEducation:
            data.CountryOfEducation &&
            typeof data.CountryOfEducation === "object"
              ? data.CountryOfEducation.value ||
                data.CountryOfEducation.label ||
                String(data.CountryOfEducation)
              : data.CountryOfEducation || data.countryOfEducation || "",
          otherCountry: data.OtherCountry || data.otherCountry || "",
        };
        setEducation((e) => ({ ...e, ...educationMapped }));
        setInitialEducation(educationMapped);

        try {
          const presentKeys = Object.keys(data || {});
          console.info("Education API returned keys:", presentKeys);
          const countryVal =
            data?.CountryOfEducation ?? data?.countryOfEducation;
          console.info(
            "Education: CountryOfEducation raw value =>",
            countryVal
          );
          if (!countryVal || String(countryVal).trim() === "") {
            console.warn(
              "Education country appears missing or empty in API response"
            );
          }
        } catch (diagErr) {
          console.error("Education diagnostics failed", diagErr);
        }
      } catch (err) {
        console.error("Failed to load educational details", err);
      }
    };

    loadEducation();
  }, []);

  useEffect(() => {
    const loadLifestyle = async () => {
      try {
        const res = await getUserHealth();

        console.info("Lifestyle (getUserHealth) raw response ->", res);
        const data = res?.data?.data;
        try {
          console.info(
            "Lifestyle server data keys ->",
            Object.keys(data || {})
          );
          console.info("Lifestyle server values ->", {
            diet: data?.diet ?? data?.Diet,
            smoking: data?.isTobaccoUser ?? data?.isTobacco ?? data?.smoking,
            drinking: data?.isAlcoholic ?? data?.alcoholic ?? data?.drinking,
            medicalHistoryDetails:
              data?.medicalHistoryDetails ??
              data?.medicalHistory ??
              data?.description,
          });

          setLifestyleRaw(data || null);
        } catch (diagErr) {
          console.error("Failed to log lifestyle server values", diagErr);
        }
        if (!data || Object.keys(data).length === 0) {
          console.info(
            "No lifestyle/health data returned from API (profile may not exist yet)"
          );
          return;
        }

        const mapHabitDisplay = (val) => {
          if (val === undefined || val === null) return "";
          const s = String(val).toLowerCase();
          if (s === "yes") return "Yes";
          if (s === "no") return "No";
          if (s === "occasional" || s === "occasionally") return "Occasional";
          return String(val);
        };

        const mapDietDisplay = (val) => {
          if (!val && val !== "") return "";
          const s = String(val || "").trim();
          if (!s) return "";
          return s.charAt(0).toUpperCase() + s.slice(1);
        };

        const normalizedSmoking =
          typeof data.isTobaccoUser === "boolean"
            ? data.isTobaccoUser
              ? "Yes"
              : "No"
            : mapHabitDisplay(
                data.isTobaccoUser ?? data.isTobacco ?? data.smoking ?? ""
              );

        const normalizedDrinking =
          typeof data.isAlcoholic === "boolean"
            ? data.isAlcoholic
              ? "Yes"
              : "No"
            : mapHabitDisplay(
                data.isAlcoholic ?? data.alcoholic ?? data.drinking ?? ""
              );

        const normalizedHaveMedicalHistory =
          typeof data.isHaveMedicalHistory === "boolean"
            ? data.isHaveMedicalHistory
              ? "Yes"
              : "No"
            : mapHabitDisplay(
                data.isHaveMedicalHistory ?? data.isHaveMedicalHistory ?? ""
              );

        const lifestyleMapped = {
          diet: mapDietDisplay(data.diet || data.Diet || ""),
          smoking: normalizedSmoking,
          drinking: normalizedDrinking,
          healthIssues:
            data.medicalHistoryDetails ||
            data.medicalHistory ||
            data.description ||
            "",
          isHaveMedicalHistory: normalizedHaveMedicalHistory,
          isHaveTattoos: mapHabitDisplay(data.isHaveTattoos || ""),
          isHaveHIV: mapHabitDisplay(data.isHaveHIV || ""),
          isPositiveInTB: mapHabitDisplay(data.isPositiveInTB || ""),
        };
        setLifestyle(lifestyleMapped);
        setInitialLifestyle(lifestyleMapped);

        console.info("Loaded lifestyle keys:", Object.keys(data));
      } catch (err) {
        console.error("Failed to load lifestyle details", err);
      }
    };

    loadLifestyle();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadExpectations = async () => {
      try {
        const res = await getUserExpectations();
        const data = res?.data?.data;
        if (!mounted || !data) return;

        const isAnyLocation = (val) => {
          if (val === null || val === undefined) return false;
          const values = Array.isArray(val) ? val : [val];
          return values.some((entry) => {
            const lower = String(entry?.value || entry?.label || entry)
              .toLowerCase()
              .trim();
            return lower === "any" || lower === "no preference";
          });
        };

        const determinePartnerLocation = (livingInCountry) => {
          if (!livingInCountry || isAnyLocation(livingInCountry))
            return "No preference";
          if (typeof livingInCountry === "string") {
            if (livingInCountry === "India") return "India";
            return "Abroad";
          }
          if (Array.isArray(livingInCountry)) {
            const countryValues = livingInCountry.map((c) => c.value || c);
            if (
              countryValues.length === 0 ||
              countryValues.every((c) => isAnyLocation(c))
            ) {
              return "No preference";
            }
            if (countryValues.includes("India")) return "India";
            return "Abroad";
          }
          return "No preference";
        };

        const mapHabitsDisplay = (val) => {
          if (val === undefined || val === null) return "";
          const s = String(val).toLowerCase();
          if (s === "yes") return "Yes";
          if (s === "no") return "No";
          if (s === "occasionally" || s === "occasional") return "Occasional";
          return String(val);
        };

        const partnerLocation = determinePartnerLocation(data.livingInCountry);

        const partnerStateOrCountry = (() => {
          if (partnerLocation === "India") {
            return (data.livingInState || []).map((s) => s.value || s);
          }
          if (partnerLocation === "Abroad") {
            return (data.livingInCountry || []).map(
              (c) => c.value || c.label || c
            );
          }
          return ["Any"];
        })();

        const partnerState =
          partnerStateOrCountry.length > 0 && partnerLocation === "India"
            ? partnerStateOrCountry[0]
            : "";
        const partnerCountry =
          partnerStateOrCountry.length > 0 && partnerLocation === "Abroad"
            ? partnerStateOrCountry[0]
            : "";

        const toArray = (v) =>
          Array.isArray(v) ? v.map((e) => e.value || e) : [];

        const expectationsMapped = {
          partnerLocation,
          partnerState,
          partnerCountry,
          partnerStateOrCountry,
          openToPartnerHabits: mapHabitsDisplay(
            data.isConsumeAlcoholic ?? data.openToPartnerHabits ?? ""
          ),
          partnerEducation: toArray(
            data.educationLevel || data.partnerEducation
          ),
          partnerDiet: toArray(data.diet || data.partnerDiet),
          partnerCommunity: toArray(data.community || data.partnerCommunity),
          profession: toArray(data.profession),
          maritalStatus: toArray(data.maritalStatus),
          preferredAgeFrom:
            data.age?.from !== undefined && data.age?.from !== null
              ? String(data.age.from)
              : "",
          preferredAgeTo:
            data.age?.to !== undefined && data.age?.to !== null
              ? String(data.age.to)
              : "",
        };
        setExpectations(expectationsMapped);
        setInitialExpectations(expectationsMapped);
      } catch (err) {
        if (err?.response?.status === 404) return;
        console.error("Failed to load expectations", err);
      }
    };

    if (activeTab === "expectations") loadExpectations();

    return () => {
      mounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const res = await getUserPhotos();
        console.info("getUserPhotos API Response ->", res);

        const payload = res?.data?.photos || res?.data || res || {};
        console.info("Extracted photo payload ->", payload);

        const out = [];
        const pushIf = (v) => {
          if (v) out.push(v);
        };

        if (
          Array.isArray(payload.personalPhotos) &&
          payload.personalPhotos.length
        ) {
          payload.personalPhotos.forEach((p) => pushIf(p?.url || p));
        }

        pushIf(payload.familyPhoto?.url || payload.familyPhoto);

        pushIf(payload.closerPhoto?.url || payload.closerPhoto);

        if (Array.isArray(payload.otherPhotos)) {
          payload.otherPhotos.forEach((p) => pushIf(p?.url || p));
        }

        console.info("Processed photos for display ->", out);
        setPhotos(out);
      } catch (err) {
        console.error("Failed to load user photos", err);
      }
    };

    loadPhotos();
  }, []);

  const handleSave = async () => {
    try {
      let formData = {};
      let currentErrors = {};

      if (activeTab === "personal") {
        formData = personal;
        currentErrors = getTabErrors("personal", formData);
        setPersonalErrors(currentErrors);
      } else if (activeTab === "education") {
        formData = education;
        currentErrors = getTabErrors("education", formData);
        setEducationErrors(currentErrors);
      } else if (activeTab === "profession") {
        formData = profession;
        currentErrors = getTabErrors("profession", formData);
        setProfessionErrors(currentErrors);
      } else if (activeTab === "lifestyle") {
        formData = lifestyle;
        currentErrors = getTabErrors("lifestyle", formData);
        setLifestyleErrors(currentErrors);
      } else if (activeTab === "expectations") {
        formData = expectations;
        currentErrors = getTabErrors("expectations", formData);
        setExpectationErrors(currentErrors);
      }

      if (Object.keys(currentErrors).length > 0) {
        toast.error("Please fill in all required fields in this tab");
        return;
      }

      let savedCount = 0;

      if (activeTab === "family") {
        const normalize = (v) => (v === undefined || v === null ? "" : v);

        const buildPhoneObject = (phoneNumber) => {
          const num = normalize(phoneNumber).trim();
          if (!num) return { code: "+91", number: "" };
          return { code: "+91", number: num };
        };

        const submissionData = {
          fatherName: normalize(family.fatherName),
          fatherOccupation: normalize(family.fatherProfession),
          fatherContact: buildPhoneObject(family.fatherPhone),
          fatherNativePlace: normalize(family.fatherNative),
          motherName: normalize(family.motherName),
          motherOccupation: normalize(family.motherProfession),
          motherContact: buildPhoneObject(family.motherPhone),
          grandFatherName: normalize(family.grandFatherName),
          grandMotherName: normalize(family.grandMotherName),
          nanaName: normalize(family.nanaName),
          naniName: normalize(family.naniName),
          nanaNativePlace: normalize(family.nanaNativePlace),
          familyType: normalize(family.familyType),
          haveSibling:
            typeof family.hasSiblings === "boolean"
              ? family.hasSiblings
              : family.hasSiblings
              ? true
              : false,
          howManySiblings: Number(family.siblingCount) || 0,
          siblingDetails: family.siblings || [],
          doYouHaveChildren: !!family.doYouHaveChildren,
        };

        try {
          console.info("Family submissionData ->", submissionData);
        } catch (e) {
          /* ignore */
        }

        const existing = await getUserFamilyDetails();
        if (existing?.data?.data) {
          await updateUserFamilyDetails(submissionData);
          try {
            const refetch = await getUserFamilyDetails();
            const server = refetch?.data?.data || {};
            const normalizePhone = (val) => {
              if (!val) return "";
              if (typeof val === "string") return val;
              if (typeof val === "object" && val !== null) {
                if (val.number !== undefined && val.number !== null) {
                  return String(val.number).trim();
                }
                if (val.value !== undefined && val.value !== null) {
                  return String(val.value).trim();
                }
                if (val.label !== undefined && val.label !== null) {
                  return String(val.label).trim();
                }
              }
              return "";
            };
            setFamily((prev) => ({
              ...prev,
              fatherName:
                server.fatherName ||
                server.fatherName ||
                submissionData.fatherName,
              fatherProfession:
                server.fatherOccupation || submissionData.fatherOccupation,
              fatherPhone:
                normalizePhone(server.fatherContact) ||
                normalizePhone(submissionData.fatherContact),
              fatherNative:
                server.fatherNativePlace || submissionData.fatherNativePlace,
              motherName: server.motherName || submissionData.motherName,
              motherProfession:
                server.motherOccupation || submissionData.motherOccupation,
              motherPhone:
                normalizePhone(server.motherContact) ||
                normalizePhone(submissionData.motherContact),
              grandFatherName:
                server.grandFatherName || submissionData.grandFatherName,
              grandMotherName:
                server.grandMotherName || submissionData.grandMotherName,
              nanaName: server.nanaName || submissionData.nanaName,
              naniName: server.naniName || submissionData.naniName,
              nanaNativePlace:
                server.nanaNativePlace || submissionData.nanaNativePlace,
              familyType: server.familyType || submissionData.familyType,
              hasSiblings:
                typeof server.haveSibling === "boolean"
                  ? server.haveSibling
                  : submissionData.haveSibling,
              siblingCount:
                server.howManySiblings || submissionData.howManySiblings,
              siblings: server.siblingDetails || submissionData.siblingDetails,
              doYouHaveChildren:
                server.doYouHaveChildren ?? submissionData.doYouHaveChildren,
            }));
          } catch (refErr) {
            console.error("Failed to refetch family after update", refErr);
          }

          toast.success("✅ Family details updated successfully");
        } else {
          const res = await saveUserFamilyDetails(submissionData);
          try {
            const refetch = await getUserFamilyDetails();
            const server = refetch?.data?.data || {};
            const normalizePhone = (val) => {
              if (!val) return "";
              if (typeof val === "string") return val;
              if (typeof val === "object" && val !== null) {
                if (val.number !== undefined && val.number !== null) {
                  return String(val.number).trim();
                }
                if (val.value !== undefined && val.value !== null) {
                  return String(val.value).trim();
                }
                if (val.label !== undefined && val.label !== null) {
                  return String(val.label).trim();
                }
              }
              return "";
            };
            setFamily((prev) => ({
              ...prev,
              fatherName: server.fatherName || submissionData.fatherName,
              fatherProfession:
                server.fatherOccupation || submissionData.fatherOccupation,
              fatherPhone:
                normalizePhone(server.fatherContact) ||
                normalizePhone(submissionData.fatherContact),
              fatherNative:
                server.fatherNativePlace || submissionData.fatherNativePlace,
              motherName: server.motherName || submissionData.motherName,
              motherProfession:
                server.motherOccupation || submissionData.motherOccupation,
              motherPhone:
                normalizePhone(server.motherContact) ||
                normalizePhone(submissionData.motherContact),
              grandFatherName:
                server.grandFatherName || submissionData.grandFatherName,
              grandMotherName:
                server.grandMotherName || submissionData.grandMotherName,
              nanaName: server.nanaName || submissionData.nanaName,
              naniName: server.naniName || submissionData.naniName,
              nanaNativePlace:
                server.nanaNativePlace || submissionData.nanaNativePlace,
              familyType: server.familyType || submissionData.familyType,
              hasSiblings:
                typeof server.haveSibling === "boolean"
                  ? server.haveSibling
                  : submissionData.haveSibling,
              siblingCount:
                server.howManySiblings || submissionData.howManySiblings,
              siblings: server.siblingDetails || submissionData.siblingDetails,
              doYouHaveChildren:
                server.doYouHaveChildren ?? submissionData.doYouHaveChildren,
            }));
          } catch (refErr) {
            console.error("Failed to refetch family after save", refErr);
          }
          toast.success("✅ Family details saved successfully");
        }
        return;
      }

      if (activeTab === "expectations") {
        const normalize = (v) => (v === undefined || v === null ? "" : v);
        const isNoPreferenceLocation =
          expectations.partnerLocation === "No preference";

        const submissionData = {
          livingInCountry:
            expectations.partnerLocation === "Abroad"
              ? expectations.partnerStateOrCountry || []
              : isNoPreferenceLocation
              ? ["Any"]
              : [],
          livingInState:
            expectations.partnerLocation === "India"
              ? expectations.partnerStateOrCountry || []
              : isNoPreferenceLocation
              ? ["Any"]
              : [],
          isConsumeAlcoholic: normalize(
            expectations.openToPartnerHabits.toLowerCase()
          ),
          educationLevel: expectations.partnerEducation || [],
          diet: expectations.partnerDiet || [],
          community: expectations.partnerCommunity || [],
          profession: expectations.profession || [],
          maritalStatus: expectations.maritalStatus || [],
          age: {
            from: expectations.preferredAgeFrom
              ? Number(expectations.preferredAgeFrom)
              : undefined,
            to: expectations.preferredAgeTo
              ? Number(expectations.preferredAgeTo)
              : undefined,
          },
        };

        try {
          console.info("Expectations submissionData ->", submissionData);
        } catch (e) {}

        const existing = await getUserExpectations();
        if (existing?.data?.data) {
          await updateUserExpectations(submissionData);
          try {
            const refetch = await getUserExpectations();
            const server = refetch?.data?.data || {};

            const isAnyLocation = (val) => {
              if (val === null || val === undefined) return false;
              const values = Array.isArray(val) ? val : [val];
              return values.some((entry) => {
                const lower = String(entry?.value || entry?.label || entry)
                  .toLowerCase()
                  .trim();
                return lower === "any" || lower === "no preference";
              });
            };

            const determinePartnerLocation = (livingInCountry) => {
              if (!livingInCountry || isAnyLocation(livingInCountry))
                return "No preference";
              if (typeof livingInCountry === "string") {
                if (livingInCountry === "India") return "India";
                return "Abroad";
              }
              if (Array.isArray(livingInCountry)) {
                const countryValues = livingInCountry.map((c) => c.value || c);
                if (
                  countryValues.length === 0 ||
                  countryValues.every((c) => isAnyLocation(c))
                ) {
                  return "No preference";
                }
                if (countryValues.includes("India")) return "India";
                return "Abroad";
              }
              return "No preference";
            };

            const partnerLocation = determinePartnerLocation(
              server.livingInCountry ||
                server.livingInState ||
                expectations.partnerLocation
            );
            const partnerStateOrCountry = (() => {
              if (partnerLocation === "India") {
                return (server.livingInState || []).map((s) => s.value || s);
              }
              if (partnerLocation === "Abroad") {
                return (server.livingInCountry || []).map(
                  (c) => c.value || c.label || c
                );
              }
              return ["Any"];
            })();

            const partnerState =
              partnerStateOrCountry.length > 0 && partnerLocation === "India"
                ? partnerStateOrCountry[0]
                : "";
            const partnerCountry =
              partnerStateOrCountry.length > 0 && partnerLocation === "Abroad"
                ? partnerStateOrCountry[0]
                : "";

            const toArray = (v) =>
              Array.isArray(v) ? v.map((e) => e.value || e) : [];

            setExpectations({
              partnerLocation,
              partnerState,
              partnerCountry,
              partnerStateOrCountry,
              openToPartnerHabits:
                server.isConsumeAlcoholic ??
                server.openToPartnerHabits ??
                expectations.openToPartnerHabits,
              partnerEducation: toArray(
                server.educationLevel || server.partnerEducation
              ),
              partnerDiet: toArray(server.diet || server.partnerDiet),
              partnerCommunity: toArray(
                server.community || server.partnerCommunity
              ),
              profession: toArray(server.profession),
              maritalStatus: toArray(server.maritalStatus),
              preferredAgeFrom:
                server.age?.from !== undefined && server.age?.from !== null
                  ? String(server.age.from)
                  : expectations.preferredAgeFrom,
              preferredAgeTo:
                server.age?.to !== undefined && server.age?.to !== null
                  ? String(server.age.to)
                  : expectations.preferredAgeTo,
            });
          } catch (refErr) {
            console.error(
              "Failed to refetch expectations after update",
              refErr
            );
          }

          toast.success("✅ Expectations updated successfully");
        } else {
          await saveUserExpectations(submissionData);
          try {
            const refetch = await getUserExpectations();
            const server = refetch?.data?.data || {};

            setExpectations((prev) => ({
              ...prev,
              partnerEducation: server.educationLevel || prev.partnerEducation,
            }));
          } catch (refErr) {
            console.error("Failed to refetch expectations after save", refErr);
          }
          toast.success("✅ Expectations saved successfully");
        }

        return;
      }
      if (activeTab === "education") {
        const normalize = (v) =>
          v === undefined || v === null ? "" : String(v);
        const submissionData = {
          SchoolName: normalize(education.schoolName),
          HighestEducation: normalize(education.highestEducation),
          FieldOfStudy: normalize(education.fieldOfStudy),
          University: normalize(education.universityName),
          CountryOfEducation: normalize(education.countryOfEducation),
          OtherCountry: normalize(education.otherCountry),
        };

        try {
          console.info("Education submissionData ->", submissionData);
        } catch (logErr) {
          console.error("Failed to log education submissionData", logErr);
        }

        const existing = await getEducationalDetails();
        if (existing?.data?.data) {
          const resUpdate = await updateEducationalDetails(submissionData);
          console.info("Education update response ->", resUpdate);

          try {
            const refetch = await getEducationalDetails();
            const server = refetch?.data?.data || {};
            setEducation((prev) => ({
              ...prev,
              schoolName:
                server.SchoolName ||
                server.schoolName ||
                submissionData.SchoolName,
              highestEducation:
                server.HighestEducation ||
                server.highestEducation ||
                submissionData.HighestEducation,
              fieldOfStudy:
                server.FieldOfStudy && typeof server.FieldOfStudy === "object"
                  ? server.FieldOfStudy.value ||
                    server.FieldOfStudy.label ||
                    String(server.FieldOfStudy)
                  : server.FieldOfStudy ||
                    server.fieldOfStudy ||
                    submissionData.FieldOfStudy,
              universityName:
                server.University ||
                server.universityName ||
                server.university ||
                submissionData.University,
              countryOfEducation:
                server.CountryOfEducation &&
                typeof server.CountryOfEducation === "object"
                  ? server.CountryOfEducation.value ||
                    server.CountryOfEducation.label ||
                    String(server.CountryOfEducation)
                  : server.CountryOfEducation ||
                    server.countryOfEducation ||
                    submissionData.CountryOfEducation,
              otherCountry:
                server.OtherCountry ||
                server.otherCountry ||
                submissionData.OtherCountry,
            }));
          } catch (refetchErr) {
            console.error(
              "Failed to refetch education after update",
              refetchErr
            );
          }

          toast.success("✅ Education details updated successfully");
        } else {
          const resSave = await saveEducationalDetails(submissionData);
          console.info("Education save response ->", resSave);

          try {
            const refetch = await getEducationalDetails();
            const server = refetch?.data?.data || {};
            setEducation((prev) => ({
              ...prev,
              schoolName:
                server.SchoolName ||
                server.schoolName ||
                submissionData.SchoolName,
              highestEducation:
                server.HighestEducation ||
                server.highestEducation ||
                submissionData.HighestEducation,
              fieldOfStudy:
                server.FieldOfStudy && typeof server.FieldOfStudy === "object"
                  ? server.FieldOfStudy.value ||
                    server.FieldOfStudy.label ||
                    String(server.FieldOfStudy)
                  : server.FieldOfStudy ||
                    server.fieldOfStudy ||
                    submissionData.FieldOfStudy,
              universityName:
                server.University ||
                server.universityName ||
                server.university ||
                submissionData.University,
              countryOfEducation:
                server.CountryOfEducation &&
                typeof server.CountryOfEducation === "object"
                  ? server.CountryOfEducation.value ||
                    server.CountryOfEducation.label ||
                    String(server.CountryOfEducation)
                  : server.CountryOfEducation ||
                    server.countryOfEducation ||
                    submissionData.CountryOfEducation,
              otherCountry:
                server.OtherCountry ||
                server.otherCountry ||
                submissionData.OtherCountry,
            }));
          } catch (refetchErr) {
            console.error("Failed to refetch education after save", refetchErr);
          }

          toast.success("✅ Education details saved successfully");
        }
        return;
      }

      if (activeTab === "profession") {
        const normalize = (v) =>
          v === undefined || v === null ? "" : String(v);
        const submissionData = {
          EmploymentStatus: normalize(profession.employmentStatus),
          Occupation: normalize(profession.occupation),
          AnnualIncome: normalize(profession.annualIncome),
          OrganizationName: normalize(profession.organizationName),
        };

        try {
          console.info("Profession submissionData ->", submissionData);
        } catch (logErr) {
          console.error("Failed to log profession submissionData", logErr);
        }

        setProfession((prev) => ({
          ...prev,
          employmentStatus: submissionData.EmploymentStatus,
          occupation: submissionData.Occupation,
          annualIncome: submissionData.AnnualIncome,
          organizationName: submissionData.OrganizationName,
        }));

        const existingProf = await getUserProfession();
        if (existingProf?.data?.data) {
          const resUpdate = await updateUserProfession(submissionData);
          console.info("Profession update response ->", resUpdate);
          try {
            const refetch = await getUserProfession();
            const server = refetch?.data?.data || {};
            const normalizeFromOptions = (val, opts) => {
              const s = String(val || "")
                .trim()
                .toLowerCase();
              const match = opts.find((o) => o.toLowerCase() === s);
              return match || String(val || "").trim();
            };
            setProfession({
              employmentStatus:
                normalizeFromOptions(
                  server.EmploymentStatus ?? server.employmentStatus ?? "",
                  EMPLOYMENT_OPTIONS
                ) || submissionData.EmploymentStatus,
              occupation:
                (server.Occupation ?? server.occupation ?? "").toString() ||
                submissionData.Occupation,
              annualIncome:
                (server.AnnualIncome ?? server.annualIncome ?? "").toString() ||
                submissionData.AnnualIncome,
              organizationName:
                (
                  server.OrganizationName ??
                  server.organizationName ??
                  ""
                ).toString() || submissionData.OrganizationName,
            });
          } catch (refetchErr) {
            console.error(
              "Failed to refetch profession after update",
              refetchErr
            );
          }

          toast.success("✅ Profession details updated successfully");
        } else {
          const resSave = await saveUserProfession(submissionData);
          console.info("Profession save response ->", resSave);
          try {
            const refetch = await getUserProfession();
            const server = refetch?.data?.data || {};
            const normalizeFromOptions = (val, opts) => {
              const s = String(val || "")
                .trim()
                .toLowerCase();
              const match = opts.find((o) => o.toLowerCase() === s);
              return match || String(val || "").trim();
            };
            setProfession({
              employmentStatus:
                normalizeFromOptions(
                  server.EmploymentStatus ?? server.employmentStatus ?? "",
                  EMPLOYMENT_OPTIONS
                ) || submissionData.EmploymentStatus,
              occupation:
                (server.Occupation ?? server.occupation ?? "").toString() ||
                submissionData.Occupation,
              annualIncome:
                (server.AnnualIncome ?? server.annualIncome ?? "").toString() ||
                submissionData.AnnualIncome,
              organizationName:
                (
                  server.OrganizationName ??
                  server.organizationName ??
                  ""
                ).toString() || submissionData.OrganizationName,
            });
          } catch (refetchErr) {
            console.error(
              "Failed to refetch profession after save",
              refetchErr
            );
          }

          toast.success("✅ Profession details saved successfully");
        }
        return;
      }

      if (activeTab === "lifestyle") {
        const toYesNo = (v) => {
          const s = String(v || "").toLowerCase();
          if (s === "yes" || s === "true") return "yes";
          if (s === "no" || s === "false") return "no";
          return "";
        };
        const normalizeDiet = (v) => {
          const s = String(v || "")
            .trim()
            .toLowerCase();
          if (!s) return "";
          if (s === "vegetarian") return "vegetarian";
          if (s === "non-vegetarian" || s === "non vegetarian")
            return "non-vegetarian";
          if (s === "eggetarian") return "eggetarian";
          if (s === "jain") return "jain";
          if (s === "swaminarayan") return "swaminarayan";
          if (s === "veg & non-veg" || s === "veg and non-veg")
            return "veg & non-veg";
          return s;
        };
        const inferredMedical = (() => {
          const explicit = toYesNo(lifestyle.isHaveMedicalHistory);
          if (explicit) return explicit;
          const hasText = Boolean(
            lifestyle.healthIssues &&
              String(lifestyle.healthIssues).trim().length
          );
          return hasText ? "yes" : "no";
        })();
        const submissionData = {
          diet: normalizeDiet(lifestyle.diet),
          isAlcoholic: toYesNo(lifestyle.drinking),
          isTobaccoUser: toYesNo(lifestyle.smoking),
          isHaveMedicalHistory: inferredMedical,
          medicalHistoryDetails: String(lifestyle.healthIssues || ""),
          isHaveTattoos: toYesNo(lifestyle.isHaveTattoos),
          isHaveHIV: toYesNo(lifestyle.isHaveHIV),
          isPositiveInTB: toYesNo(lifestyle.isPositiveInTB),
        };

        const toDisplay = (yesNo) => {
          const s = String(yesNo || "").toLowerCase();
          if (s === "yes") return "Yes";
          if (s === "no") return "No";
          return "";
        };
        const dietDisplay = (val) => {
          const s = String(val || "").trim();
          if (!s) return "";
          return s.charAt(0).toUpperCase() + s.slice(1);
        };
        setLifestyle((prev) => ({
          ...prev,
          diet: dietDisplay(submissionData.diet),
          drinking: toDisplay(submissionData.isAlcoholic),
          smoking: toDisplay(submissionData.isTobaccoUser),
          isHaveMedicalHistory: toDisplay(submissionData.isHaveMedicalHistory),
          isHaveTattoos: toDisplay(submissionData.isHaveTattoos),
          isHaveHIV: toDisplay(submissionData.isHaveHIV),
          isPositiveInTB: toDisplay(submissionData.isPositiveInTB),
          healthIssues: submissionData.medicalHistoryDetails,
        }));

        try {
          console.info("Lifestyle submissionData ->", submissionData);
        } catch (logErr) {
          console.error("Failed to log lifestyle submissionData", logErr);
        }

        const existingHealth = await getUserHealth();
        if (existingHealth?.data?.data) {
          const resUpdate = await updateUserHealth(submissionData);
          console.info("Lifestyle update response ->", resUpdate);
          try {
            const refetch = await getUserHealth();
            const server = refetch?.data?.data || {};
            const toDisplayYesNo = (val) => {
              if (typeof val === "boolean") return val ? "Yes" : "No";
              const s = String(val || "").toLowerCase();
              if (s === "yes") return "Yes";
              if (s === "no") return "No";
              return "";
            };
            const dietDisplay = (val) => {
              const s = String(val || "").trim();
              return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
            };
            setLifestyle({
              diet: dietDisplay(server.diet || server.Diet || ""),
              smoking: toDisplayYesNo(
                server.isTobaccoUser ?? server.isTobacco ?? server.smoking
              ),
              drinking: toDisplayYesNo(
                server.isAlcoholic ?? server.alcoholic ?? server.drinking
              ),
              healthIssues:
                server.medicalHistoryDetails ||
                server.medicalHistory ||
                server.description ||
                "",
              isHaveMedicalHistory: toDisplayYesNo(server.isHaveMedicalHistory),
              isHaveTattoos: toDisplayYesNo(server.isHaveTattoos),
              isHaveHIV: toDisplayYesNo(server.isHaveHIV),
              isPositiveInTB: toDisplayYesNo(server.isPositiveInTB),
            });
          } catch (refetchErr) {
            console.error(
              "Failed to refetch lifestyle after update",
              refetchErr
            );
          }

          toast.success("✅ Lifestyle details updated successfully");
        } else {
          const resSave = await saveUserHealth(submissionData);
          console.info("Lifestyle save response ->", resSave);
          try {
            const refetch = await getUserHealth();
            const server = refetch?.data?.data || {};
            const toDisplayYesNo2 = (val) => {
              if (typeof val === "boolean") return val ? "Yes" : "No";
              const s = String(val || "").toLowerCase();
              if (s === "yes") return "Yes";
              if (s === "no") return "No";
              return "";
            };
            const dietDisplay2 = (val) => {
              const s = String(val || "").trim();
              return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
            };
            setLifestyle({
              diet: dietDisplay2(server.diet || server.Diet || ""),
              smoking: toDisplayYesNo2(
                server.isTobaccoUser ?? server.isTobacco ?? server.smoking
              ),
              drinking: toDisplayYesNo2(
                server.isAlcoholic ?? server.alcoholic ?? server.drinking
              ),
              healthIssues:
                server.medicalHistoryDetails ||
                server.medicalHistory ||
                server.description ||
                "",
              isHaveMedicalHistory: toDisplayYesNo2(
                server.isHaveMedicalHistory
              ),
              isHaveTattoos: toDisplayYesNo2(server.isHaveTattoos),
              isHaveHIV: toDisplayYesNo2(server.isHaveHIV),
              isPositiveInTB: toDisplayYesNo2(server.isPositiveInTB),
            });
          } catch (refetchErr) {
            console.error("Failed to refetch lifestyle after save", refetchErr);
          }

          toast.success("✅ Lifestyle details saved successfully");
        }
        return;
      }

      const timeOfBirth =
        personal.birthHour && personal.birthMinute
          ? `${personal.birthHour}:${personal.birthMinute}`
          : null;

      const payload = {
        dateOfBirth: personal.dateOfBirth || null,
        timeOfBirth,
        firstName: personal.firstName || undefined,
        middleName: personal.middleName || undefined,
        lastName: personal.lastName || undefined,
        marriedStatus: personal.maritalStatus || undefined,
        height: personal.height || undefined,
        weight: personal.weight || undefined,
        religion: personal.religion || undefined,
        astrologicalSign: personal.rashi || undefined,
        dosh: personal.dosh || undefined,
        subCaste: personal.caste || undefined,

        birthPlace: personal.birthCity || undefined,
        birthState: personal.birthState || undefined,
        full_address: {
          street1: personal.street1 || undefined,
          street2: personal.street2 || undefined,
          city: personal.city || undefined,
          state: personal.state || undefined,
          zipCode: personal.pincode || undefined,
          isYourHome: personal.ownHouse === "Yes",
        },
        nationality: personal.nationality || undefined,
        isResidentOfIndia:
          personal.residingInIndia === "yes"
            ? true
            : personal.residingInIndia === "no"
            ? false
            : undefined,
        residingCountry: personal.residingCountry || undefined,
        visaType: personal.visaCategory || undefined,
      };

      if (personal.maritalStatus !== "Never Married") {
        payload.divorceStatus = personal.divorceStatus || undefined;
        payload.isHaveChildren =
          personal.hasChildren === "Yes"
            ? true
            : personal.hasChildren === "No"
            ? false
            : undefined;
        payload.numberOfChildren = personal.numChildren
          ? parseInt(personal.numChildren)
          : undefined;
        payload.isChildrenLivingWithYou =
          personal.livingWith === "With Me"
            ? true
            : personal.livingWith === "No"
            ? false
            : undefined;
      }

      if (personal.maritalStatus === "Separated") {
        payload.separatedSince = personal.separatedSince || undefined;
      }

      await updateUserPersonal(payload);

      try {
        const refetch = await getUserPersonal();
        const refetchedData = refetch?.data?.data || {};

        const refetchedPersonal = {
          firstName: refetchedData.firstName || "",
          middleName: refetchedData.middleName || "",
          lastName: refetchedData.lastName || "",
          street1: refetchedData.full_address?.street1 || "",
          street2: refetchedData.full_address?.street2 || "",
          pincode: refetchedData.full_address?.zipCode || "",
          city: refetchedData.full_address?.city || "",
          state: refetchedData.full_address?.state || "",
          ownHouse:
            typeof refetchedData.full_address?.isYourHome === "boolean"
              ? refetchedData.full_address.isYourHome
                ? "Yes"
                : "No"
              : "",
          nationality: refetchedData.nationality || "",
        };

        setPersonal((prev) => ({ ...prev, ...refetchedPersonal }));
      } catch (refetchErr) {
        console.error("Failed to refetch personal after save", refetchErr);
      }

      toast.success("✅ Personal details saved");
    } catch (err) {
      console.error("Failed to save details", err);
      toast.error("Failed to save details");
    }
  };

  const handleFamilyChange = (field) => (e) => {
    const rawValue = e?.target ? e.target.value : e;

    const fieldsToCapitalize = [
      "fatherName",
      "fatherProfession",
      "fatherNative",
      "motherName",
      "motherProfession",
      "grandFatherName",
      "grandMotherName",
      "nanaName",
      "naniName",
      "nanaNativePlace",
    ];
    const value = fieldsToCapitalize.includes(field)
      ? capitalizeWords(rawValue)
      : rawValue;
    setFamily((prev) => ({ ...prev, [field]: value }));
  };

  const handleFamilyPhoneChange = (field, value) => {
    let phoneValue = value;

    if (typeof value === "object" && value !== null) {
      if (value.number !== undefined) {
        phoneValue = String(value.number || "");
      } else if (value.value !== undefined) {
        phoneValue = String(value.value || "");
      } else if (value.label !== undefined) {
        phoneValue = String(value.label || "");
      } else {
        phoneValue = String(value || "");
      }
    } else {
      phoneValue = String(value || "");
    }

    const digitsOnly = phoneValue.replace(/\D/g, "");
    setFamily((prev) => ({ ...prev, [field]: digitsOnly }));
  };

  const handleSiblingChange = (index, field, value) => {
    setFamily((prev) => {
      const updated = [...(prev.siblings || [])];
      updated[index] = { ...(updated[index] || {}) };

      const finalValue = field === "name" ? capitalizeWords(value) : value;
      updated[index][field] = finalValue;
      return { ...prev, siblings: updated };
    });
  };

  const handleSiblingCount = (count) => {
    const siblingsArray = Array.from({ length: count }, () => ({
      name: "",
      relation: "",
      maritalStatus: "",
    }));
    setFamily((prev) => ({
      ...prev,
      siblingCount: count,
      siblings: siblingsArray,
    }));
  };

  const capitalizeWords = (str) => {
    if (!str) return str;
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleEducationChange = (field) => (e) => {
    const rawValue = e?.target ? e.target.value : e;

    const fieldsToCapitalize = ["schoolName", "universityName", "otherCountry"];
    const value = fieldsToCapitalize.includes(field)
      ? capitalizeWords(rawValue)
      : rawValue;
    setEducation((prev) => ({ ...prev, [field]: value }));

    setEducationErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleProfessionChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setProfession((prev) => ({ ...prev, [field]: value }));

    setProfessionErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleLifestyleChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setLifestyle((prev) => ({ ...prev, [field]: value }));

    setLifestyleErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleExpectationsTextChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setExpectations((prev) => ({ ...prev, [field]: value }));
    setExpectationErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const inputClass =
    "w-full border border-[#D4A052] rounded-md p-2.5 sm:p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition";

  const isBlank = (v) =>
    v === undefined ||
    v === null ||
    (typeof v === "string" && String(v).trim() === "");

  const getDobParts = React.useCallback((isoDate) => {
    if (!isoDate) return { day: "", month: "", year: "" };
    const parts = String(isoDate).split("-");
    if (parts.length === 3)
      return {
        year: parts[0] || "",
        month: parts[1] || "",
        day: parts[2] || "",
      };
    return { day: "", month: "", year: "" };
  }, []);

  const handleInputChange = React.useCallback((e) => {
    const { name, value } = e.target;

    setPersonalErrors((prev) => ({ ...prev, [name]: "" }));

    if (name.startsWith("dateOfBirth_")) {
      const part = name.split("_")[1];
      const val = String(value)
        .replace(/\D/g, "")
        .slice(0, part === "year" ? 4 : 2);

      setPersonal((p) => {
        const curr = p.dateOfBirth
          ? String(p.dateOfBirth).split("-")
          : ["", "", ""];
        const currentParts = {
          year: curr[0] || "",
          month: curr[1] || "",
          day: curr[2] || "",
        };
        const next = { ...currentParts, [part]: val };

        if (next.year && next.month && next.day) {
          return {
            ...p,
            dateOfBirth: `${next.year}-${next.month.padStart(
              2,
              "0"
            )}-${next.day.padStart(2, "0")}`,
          };
        } else {
          return {
            ...p,
            dateOfBirth: `${next.year || ""}-${next.month || ""}-${
              next.day || ""
            }`,
          };
        }
      });
    } else {
      setPersonal((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleMaritalStatusChange = React.useCallback((e) => {
    const status = e.target.value;

    setPersonal((prev) => ({
      ...prev,
      maritalStatus: status,
      hasChildren: "",
      numChildren: "",
      livingWith: "",
      divorceStatus: "",
    }));

    setShowChildrenFields(status && status !== "Never Married");
    setShowDivorceFields(
      status === "Divorced" ||
        status === "Awaiting Divorce" ||
        status === "Separated"
    );
  }, []);

  const EditableInput = React.useCallback(
    ({ name, value, disabled = false, className = "", ...rest }) => {
      return (
        <input
          name={name}
          value={value || ""}
          onChange={handleInputChange}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="words"
          className={
            disabled
              ? "w-full border border-gray-300 bg-gray-50 rounded-md p-2.5 sm:p-3 text-sm cursor-not-allowed opacity-60"
              : `${inputClass} ${className}`
          }
          {...rest}
        />
      );
    },
    [handleInputChange]
  );

  const renderPersonalDetails = () => (
    <div className="space-y-6 px-4 md:px-6 py-2 md:py-4">
      {/* Full Name */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 gap-y-6">
        <div>
          <Label className="mb-2">First Name *</Label>
          <EditableInput
            value={personal.firstName || ""}
            className={`rounded-md ${
              personalErrors.firstName ? "border-red-500" : "border-gray-300"
            }`}
            name="firstName"
            disabled={true}
          />
          {personalErrors.firstName && (
            <p className="text-red-500 text-sm mt-1">
              {personalErrors.firstName}
            </p>
          )}
        </div>
        <div>
          <Label className="mb-2">Middle Name *</Label>
          <EditableInput
            value={personal.middleName || ""}
            className={`rounded-md ${
              personalErrors.middleName ? "border-red-500" : "border-gray-300"
            }`}
            name="middleName"
            disabled={true}
          />
          {personalErrors.middleName && (
            <p className="text-red-500 text-sm mt-1">
              {personalErrors.middleName}
            </p>
          )}
        </div>
        <div>
          <Label className="mb-2">Last Name *</Label>
          <EditableInput
            value={personal.lastName || ""}
            className={`rounded-md ${
              personalErrors.lastName ? "border-red-500" : "border-gray-300"
            }`}
            name="lastName"
            disabled={true}
          />
          {personalErrors.lastName && (
            <p className="text-red-500 text-sm mt-1">
              {personalErrors.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Date of Birth split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 gap-y-6">
        <div>
          <Label className="mb-2">Date of Birth (DD) *</Label>
          <EditableInput
            value={getDobParts(personal.dateOfBirth).day || ""}
            placeholder="DD"
            maxLength={2}
            className={`rounded-md ${
              personalErrors.dateOfBirth ? "border-red-500" : "border-gray-300"
            }`}
            name="dateOfBirth_day"
            disabled={true}
          />
        </div>
        <div>
          <Label className="mb-2">Date of Birth (MM) *</Label>
          <EditableInput
            value={getDobParts(personal.dateOfBirth).month || ""}
            placeholder="MM"
            maxLength={2}
            className={`rounded-md ${
              personalErrors.dateOfBirth ? "border-red-500" : "border-gray-300"
            }`}
            name="dateOfBirth_month"
            disabled={true}
          />
        </div>
        <div>
          <Label className="mb-2">Date of Birth (YYYY) *</Label>
          <EditableInput
            value={getDobParts(personal.dateOfBirth).year || ""}
            placeholder="YYYY"
            maxLength={4}
            className={`rounded-md ${
              personalErrors.dateOfBirth ? "border-red-500" : "border-gray-300"
            }`}
            name="dateOfBirth_year"
            disabled={true}
          />
          {personalErrors.dateOfBirth && (
            <p className="text-red-500 text-sm mt-1">
              {personalErrors.dateOfBirth}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-y-6">
        <div>
          <Label className="mb-2">
            Time of Birth (24 hrs format - HH : MM) *
          </Label>
          <div className="flex gap-2 mt-1">
            <EditableInput
              name="birthHour"
              value={personal.birthHour || ""}
              placeholder="HH (00-23)"
              maxLength={2}
              className={`rounded-md ${
                personalErrors.birthHour ? "border-red-500" : "border-gray-300"
              }`}
            />
            <EditableInput
              name="birthMinute"
              value={personal.birthMinute || ""}
              placeholder="MM (00-59)"
              maxLength={2}
              className={`rounded-md ${
                personalErrors.birthMinute
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
          </div>
          {(personalErrors.birthHour || personalErrors.birthMinute) && (
            <p className="text-red-500 text-sm mt-1">
              {personalErrors.birthHour || personalErrors.birthMinute}
            </p>
          )}
        </div>
      </div>

      {/* Marital Status */}
      <div>
        <Label className="mb-2">Marital Status *</Label>
        <CustomSelect
          name="maritalStatus"
          value={personal.maritalStatus || ""}
          onChange={handleMaritalStatusChange}
          options={LEGAL_STATUSES}
          placeholder="Select Marital Status"
          className={personalErrors.maritalStatus ? "border-red-500" : ""}
          disabled={false}
        />
        {personalErrors.maritalStatus && (
          <p className="text-red-500 text-sm mt-1">
            {personalErrors.maritalStatus}
          </p>
        )}
      </div>

      {/* Children Fields - Show only if marital status is not "Never Married" */}
      {showChildrenFields && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <Label className="block text-sm font-medium mb-2">
            Do you have children? *
          </Label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasChildren"
                value="Yes"
                checked={personal.hasChildren === "Yes"}
                onChange={() => {
                  setPersonal((p) => ({ ...p, hasChildren: "Yes" }));
                  setPersonalErrors((prev) => ({ ...prev, hasChildren: "" }));
                }}
                className="peer hidden"
              />
              <span className="w-4 h-4 rounded-full border border-[#E4C48A] peer-checked:bg-[#E4C48A] peer-checked:border-[#E4C48A] transition-all"></span>
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasChildren"
                value="No"
                checked={personal.hasChildren === "No"}
                onChange={() => {
                  setPersonal((p) => ({ ...p, hasChildren: "No" }));
                  setPersonalErrors((prev) => ({ ...prev, hasChildren: "" }));
                }}
                className="peer hidden"
              />
              <span className="w-4 h-4 rounded-full border border-[#E4C48A] peer-checked:bg-[#E4C48A] peer-checked:border-[#E4C48A] transition-all"></span>
              <span className="text-sm">No</span>
            </label>
          </div>
          {personalErrors.hasChildren && (
            <p className="text-red-500 text-sm mt-1">
              {personalErrors.hasChildren}
            </p>
          )}
          {personal.hasChildren === "Yes" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <CustomSelect
                  name="numChildren"
                  value={personal.numChildren || ""}
                  onChange={handleInputChange}
                  options={[...Array(10)].map((_, i) => String(i + 1))}
                  placeholder="Number of Children *"
                  className={personalErrors.numChildren ? "border-red-500" : ""}
                />
                {personalErrors.numChildren && (
                  <p className="text-red-500 text-sm mt-1">
                    {personalErrors.numChildren}
                  </p>
                )}
              </div>
              <div>
                <CustomSelect
                  name="livingWith"
                  value={personal.livingWith || ""}
                  onChange={handleInputChange}
                  options={["Yes", "No"]}
                  placeholder="Living with you? *"
                  className={personalErrors.livingWith ? "border-red-500" : ""}
                />
                {personalErrors.livingWith && (
                  <p className="text-red-500 text-sm mt-1">
                    {personalErrors.livingWith}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Divorce Fields - Show only for "Divorced" or "Awaiting Divorce" */}
      {showDivorceFields && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 space-y-4">
          {personal.maritalStatus === "Separated" ? (
            <>
              <div>
                <Label className="block text-sm font-medium mb-1">
                  Separated Since *
                </Label>
                <CustomSelect
                  name="separatedSince"
                  value={personal.separatedSince || ""}
                  onChange={handleInputChange}
                  options={Array.from({ length: 50 }, (_, i) =>
                    String(new Date().getFullYear() - i)
                  )}
                  placeholder="Select Year"
                  className={
                    personalErrors.separatedSince ? "border-red-500" : ""
                  }
                />
                {personalErrors.separatedSince && (
                  <p className="text-red-500 text-sm mt-1">
                    {personalErrors.separatedSince}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="block text-sm font-medium mb-1">
                  Divorce Status *
                </Label>
                <CustomSelect
                  name="divorceStatus"
                  value={personal.divorceStatus || ""}
                  onChange={handleInputChange}
                  options={["court", "divorced", "filed", "process"]}
                  placeholder="Select Divorce Status"
                  className={
                    personalErrors.divorceStatus ? "border-red-500" : ""
                  }
                />
                {personalErrors.divorceStatus && (
                  <p className="text-red-500 text-sm mt-1">
                    {personalErrors.divorceStatus}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Height + Weight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="mb-2">Height *</Label>
          <CustomSelect
            name="height"
            value={personal.height || ""}
            onChange={(e) => {
              setPersonal((p) => ({ ...p, height: e.target.value }));
              setPersonalErrors((prev) => ({ ...prev, height: "" }));
            }}
            options={[...heightOptions].sort()}
            placeholder="Select Height"
            className={personalErrors.height ? "border-red-500" : ""}
            disabled={false}
          />
          {personalErrors.height && (
            <p className="text-red-500 text-sm mt-1">{personalErrors.height}</p>
          )}
        </div>
        <div>
          <Label className="mb-2">Weight (kg) *</Label>
          <CustomSelect
            name="weight"
            value={personal.weight || ""}
            onChange={(e) => {
              setPersonal((p) => ({ ...p, weight: e.target.value }));
              setPersonalErrors((prev) => ({ ...prev, weight: "" }));
            }}
            options={[...weightOptions].sort(
              (a, b) => parseFloat(a) - parseFloat(b)
            )}
            placeholder="Select Weight"
            className={personalErrors.weight ? "border-red-500" : ""}
            disabled={false}
          />
          {personalErrors.weight && (
            <p className="text-red-500 text-sm mt-1">{personalErrors.weight}</p>
          )}
        </div>
      </div>

      {/* Rashi + Dosh */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-y-6">
        <div>
          <Label className="mb-2">Rashi *</Label>
          <CustomSelect
            name="rashi"
            value={personal.rashi || ""}
            onChange={handleInputChange}
            options={[
              "Aquarius (Kumbh)",
              "Aries (Mesh)",
              "Cancer (Kark)",
              "Capricorn (Makar)",
              "Gemini (Mithun)",
              "Leo (Singh)",
              "Libra (Tula)",
              "Pisces (Meen)",
              "Sagittarius (Dhanu)",
              "Scorpio (Vrischik)",
              "Taurus (Vrishabh)",
              "Virgo (Kanya)",
            ].sort()}
            placeholder="Select Rashi"
            className={personalErrors.rashi ? "border-red-500" : ""}
            disabled={false}
          />
          {personalErrors.rashi && (
            <p className="text-red-500 text-sm mt-1">{personalErrors.rashi}</p>
          )}
        </div>
        <div>
          <Label className="mb-2">Dosh *</Label>
          <CustomSelect
            name="dosh"
            value={personal.dosh || ""}
            onChange={handleInputChange}
            options={[...doshOptions].sort()}
            placeholder="Select Dosh"
            className={personalErrors.dosh ? "border-red-500" : ""}
            disabled={false}
          />
          {personalErrors.dosh && (
            <p className="text-red-500 text-sm mt-1">{personalErrors.dosh}</p>
          )}
        </div>
      </div>

      {/* Religion + Caste */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2">Religion *</Label>
          <CustomSelect
            name="religion"
            value={personal.religion || ""}
            onChange={(e) => {
              setPersonal((p) => ({
                ...p,
                religion: e.target.value,
                caste: "",
              }));
              setPersonalErrors((prev) => ({
                ...prev,
                religion: "",
                caste: "",
              }));
            }}
            options={["Hindu", "Jain"]}
            placeholder="Select Religion"
            className={personalErrors.religion ? "border-red-500" : ""}
            disabled={false}
          />
          {personalErrors.religion && (
            <p className="text-red-500 text-sm mt-1">
              {personalErrors.religion}
            </p>
          )}
        </div>
        <div>
          <Label className="mb-2">Caste *</Label>
          <CustomSelect
            name="caste"
            value={personal.caste || ""}
            onChange={(e) => {
              setPersonal((p) => ({ ...p, caste: e.target.value }));
              setPersonalErrors((prev) => ({ ...prev, caste: "" }));
            }}
            options={
              personal.religion === "Hindu"
                ? [
                    "Brahmin",
                    "Brahmin-Audichya",
                    "Patel",
                    "Patel-Desai",
                    "Patel-Kadva",
                    "Patel-Leva",
                    "Vaishnav-Vania",
                  ]
                : personal.religion === "Jain"
                ? ["Jain-Digambar", "Jain-Swetamber", "Jain-Vanta"]
                : []
            }
            placeholder="Select Caste"
            className={personalErrors.caste ? "border-red-500" : ""}
            disabled={false}
          />
          {personalErrors.caste && (
            <p className="text-red-500 text-sm mt-1">{personalErrors.caste}</p>
          )}
        </div>
      </div>

      {/* Birth Place */}
      <div>
        <label className="block text-sm font-medium mb-3">Birth Place</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-2">Birth State</Label>
            <LocationSelect
              type="state"
              name="birthState"
              value={personal.birthState || ""}
              onChange={(e) => {
                handleInputChange(e);

                setPersonal((prev) => ({ ...prev, birthCity: "" }));
                setPersonalErrors((prev) => ({
                  ...prev,
                  birthState: "",
                  birthCity: "",
                }));
                const code =
                  e.target.code || getStateCode("IN", e.target.value);
                setBirthStateCode(code || "");
              }}
              countryCode="IN"
              placeholder="Select state"
              className={`rounded-md ${
                personalErrors.birthState ? "border-red-500" : "border-gray-300"
              }`}
            />
            {personalErrors.birthState && (
              <p className="text-red-500 text-sm mt-1">
                {personalErrors.birthState}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2">Birth City</Label>
            <LocationSelect
              type="city"
              name="birthCity"
              value={personal.birthCity || ""}
              onChange={handleInputChange}
              countryCode="IN"
              stateCode={birthStateCode}
              placeholder="Select city"
              className={`rounded-md ${
                personalErrors.birthCity ? "border-red-500" : "border-gray-300"
              }`}
              disabled={!birthStateCode}
            />
            {personalErrors.birthCity && (
              <p className="text-red-500 text-sm mt-1">
                {personalErrors.birthCity}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4 mt-4 border-t pt-4">
        <h4 className="text-lg font-semibold text-gray-800">Full Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Street Address Line 1</Label>
            <EditableInput
              placeholder="Enter street address"
              value={personal.street1 || ""}
              onChange={handleInputChange}
              className={`rounded-md ${
                personalErrors.street1 ? "border-red-500" : "border-gray-300"
              }`}
              name="street1"
            />
            {personalErrors.street1 && (
              <p className="text-red-500 text-sm">{personalErrors.street1}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Street Address Line 2 *
            </Label>
            <EditableInput
              placeholder="Apartment, suite, etc."
              value={personal.street2 || ""}
              onChange={handleInputChange}
              className={`rounded-md ${
                personalErrors.street2 ? "border-red-500" : "border-gray-300"
              }`}
              name="street2"
            />
            {personalErrors.street2 && (
              <p className="text-red-500 text-sm">{personalErrors.street2}</p>
            )}
          </div>

          {/* State & City Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* State */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">State *</Label>
              <LocationSelect
                type="state"
                name="state"
                value={personal.state || ""}
                onChange={(e) => {
                  setPersonal((p) => ({
                    ...p,
                    state: e.target.value,
                    city: "",
                  }));
                  setPersonalErrors((prev) => ({ ...prev, state: "" }));
                }}
                countryCode="IN"
                placeholder="Select state"
                className={personalErrors.state ? "border-red-500" : ""}
              />
              {personalErrors.state && (
                <p className="text-red-500 text-sm">{personalErrors.state}</p>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">City *</Label>
              <LocationSelect
                type="city"
                name="city"
                value={personal.city || ""}
                onChange={(e) => {
                  setPersonal((p) => ({ ...p, city: e.target.value }));
                  setPersonalErrors((prev) => ({ ...prev, city: "" }));
                }}
                countryCode="IN"
                stateCode={getStateCode("IN", personal.state) || ""}
                placeholder="Select city"
                className={personalErrors.city ? "border-red-500" : ""}
                disabled={!personal.state}
              />
              {personalErrors.city && (
                <p className="text-red-500 text-sm">{personalErrors.city}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Pincode / Postal Code *
            </Label>
            <EditableInput
              placeholder="Enter pincode"
              value={personal.pincode || ""}
              onChange={handleInputChange}
              className={`rounded-md ${
                personalErrors.pincode ? "border-red-500" : "border-gray-300"
              }`}
              name="pincode"
            />
            {personalErrors.pincode && (
              <p className="text-red-500 text-sm">{personalErrors.pincode}</p>
            )}
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <Label className="text-sm font-medium">
            Is this your own house? *
          </Label>
          <div className="flex items-center gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ownHouse"
                value="Yes"
                checked={personal.ownHouse === "Yes"}
                onChange={() => {
                  setPersonal((p) => ({ ...p, ownHouse: "Yes" }));
                  setPersonalErrors((prev) => ({ ...prev, ownHouse: "" }));
                }}
                className={`appearance-none w-4 h-4 rounded-full border transition duration-200 cursor-pointer ${
                  personal.ownHouse === "Yes"
                    ? "bg-[#D4A052] border-[#D4A052]"
                    : "border-gray-300"
                } focus:ring-1 focus:ring-[#E4C48A]`}
              />
              <span className="text-gray-700 text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ownHouse"
                value="No"
                checked={personal.ownHouse === "No"}
                onChange={() => {
                  setPersonal((p) => ({ ...p, ownHouse: "No" }));
                  setPersonalErrors((prev) => ({ ...prev, ownHouse: "" }));
                }}
                className={`appearance-none w-4 h-4 rounded-full border transition duration-200 cursor-pointer ${
                  personal.ownHouse === "No"
                    ? "bg-[#D4A052] border-[#D4A052]"
                    : "border-gray-300"
                } focus:ring-1 focus:ring-[#E4C48A]`}
              />
              <span className="text-gray-700 text-sm">No</span>
            </label>
          </div>
          {personalErrors.ownHouse && (
            <p className="text-red-500 text-sm mt-1">
              {personalErrors.ownHouse}
            </p>
          )}
        </div>
      </div>

      {/* Nationality + Residing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <Label className="mb-2">Nationality *</Label>
          <CustomSelect
            name="nationality"
            value={personal.nationality || ""}
            onChange={handleInputChange}
            options={[...nationalities].sort()}
            placeholder="Select Nationality"
            className={personalErrors.nationality ? "border-red-500" : ""}
            disabled={false}
          />
          {personalErrors.nationality && (
            <p className="text-red-500 text-sm mt-1">
              {personalErrors.nationality}
            </p>
          )}
        </div>
        <div>
          <Label className="mb-2">Currently Residing in India? *</Label>
          <div className="flex items-center gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="residingInIndia"
                value="yes"
                checked={personal.residingInIndia === "yes"}
                onChange={() => {
                  setPersonal((p) => ({
                    ...p,
                    residingInIndia: "yes",
                    residingCountry: "India",
                  }));
                  setPersonalErrors((prev) => ({
                    ...prev,
                    residingInIndia: "",
                  }));
                }}
                disabled={isBlank(personal.residingInIndia)}
                className={`appearance-none w-4 h-4 rounded-full border transition duration-200 ${
                  personal.residingInIndia === "yes"
                    ? "bg-[#E4C48A] border-[#E4C48A]"
                    : "border-gray-300"
                } focus:ring-1 focus:ring-[#E4C48A]`}
              />
              <span className="text-gray-700 text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="residingInIndia"
                value="no"
                checked={personal.residingInIndia === "no"}
                onChange={() => {
                  setPersonal((p) => ({
                    ...p,
                    residingInIndia: "no",
                    residingCountry: "",
                  }));
                  setPersonalErrors((prev) => ({
                    ...prev,
                    residingInIndia: "",
                  }));
                }}
                disabled={isBlank(personal.residingInIndia)}
                className={`appearance-none w-4 h-4 rounded-full border transition duration-200 ${
                  personal.residingInIndia === "no"
                    ? "bg-[#E4C48A] border-[#E4C48A]"
                    : "border-gray-300"
                } focus:ring-1 focus:ring-[#E4C48A]`}
              />
              <span className="text-gray-700 text-sm">No</span>
            </label>
          </div>
          {personalErrors.residingInIndia && (
            <p className="text-red-500 text-sm mt-1">
              {personalErrors.residingInIndia}
            </p>
          )}
        </div>
      </div>

      {personal.residingInIndia === "no" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <Label className="mb-2">Residing Country *</Label>
            <LocationSelect
              type="country"
              name="residingCountry"
              value={personal.residingCountry || ""}
              onChange={(e) => {
                setPersonal((p) => ({ ...p, residingCountry: e.target.value }));
                setPersonalErrors((prev) => ({ ...prev, residingCountry: "" }));
              }}
              placeholder="Select Country"
              className={personalErrors.residingCountry ? "border-red-500" : ""}
            />
            {personalErrors.residingCountry && (
              <p className="text-red-500 text-sm mt-1">
                {personalErrors.residingCountry}
              </p>
            )}
          </div>
          <div>
            <Label className="mb-2">Visa Category *</Label>
            <CustomSelect
              name="visaCategory"
              value={personal.visaCategory || ""}
              onChange={handleInputChange}
              options={[...visaCategories].sort()}
              placeholder="Select Visa Category"
              className={personalErrors.visaCategory ? "border-red-500" : ""}
              disabled={false}
            />
            {personalErrors.visaCategory && (
              <p className="text-red-500 text-sm mt-1">
                {personalErrors.visaCategory}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderExpectations = () => {
    const toOptions = (arr = []) => arr.map((v) => ({ label: v, value: v }));
    const multiStyles = {
      control: (base, state) => ({
        ...base,
        minHeight: "3rem",
        borderColor: state.isFocused ? "#9ca3af" : "#d1d5db",
        boxShadow: "none",
        borderRadius: "10px",
        backgroundColor: "#ffffff",
        "&:hover": { borderColor: state.isFocused ? "#6b7280" : "#9ca3af" },
      }),
      valueContainer: (base) => ({ ...base, padding: "0 0.75rem" }),
      multiValue: (base) => ({
        ...base,
        backgroundColor: "#e5e7eb",
        borderRadius: "14px",
        padding: "2px 4px",
      }),
      multiValueLabel: (base) => ({
        ...base,
        color: "#374151",
        fontSize: "0.70rem",
        padding: "0 2px",
      }),
      multiValueRemove: (base) => ({
        ...base,
        color: "#4b5563",
        ":hover": {
          backgroundColor: "#d1d5db",
          color: "#111827",
          borderRadius: "50%",
        },
      }),
      dropdownIndicator: (base, state) => ({
        ...base,
        color: state.isFocused ? "#4b5563" : "#6b7280",
        ":hover": { color: "#111827" },
      }),
      clearIndicator: (base) => ({
        ...base,
        color: "#6b7280",
        ":hover": { color: "#111827" },
      }),
      indicatorsContainer: (base) => ({ ...base, height: "3rem" }),
      menu: (base) => ({
        ...base,
        borderRadius: "10px",
        overflow: "hidden",
        zIndex: 9999,
        maxHeight: "300px",
      }),
      menuList: (base) => ({
        ...base,
        maxHeight: "300px",
        overflowY: "auto",
        overflowX: "hidden",
        scrollBehavior: "smooth",
        "&::-webkit-scrollbar": {
          width: "8px",
        },
        "&::-webkit-scrollbar-track": {
          background: "#f1f1f1",
          borderRadius: "10px",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "#c8a227",
          borderRadius: "10px",
        },
        "&::-webkit-scrollbar-thumb:hover": {
          background: "#b39120",
        },
      }),
      option: (base, state) => ({
        ...base,
        fontSize: "0.75rem",
        backgroundColor: state.isSelected
          ? "#d1d5db"
          : state.isFocused
          ? "#f3f4f6"
          : "#ffffff",
        color: "#111827",
        padding: "10px 12px",
        ":active": { backgroundColor: "#e5e7eb" },
      }),
    };

    return (
      <div className="space-y-6 px-4 md:px-6 py-2 md:py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 gap-y-6">
          {/* Location Type Selection */}
          <div>
            <Label className="mb-2">Preferred Partner Location Type</Label>
            <select
              value={expectations.partnerLocation || ""}
              onChange={(e) => {
                const val = e.target.value;
                setExpectations((prev) => ({
                  ...prev,
                  partnerLocation: val,
                  partnerCountry: "",
                  partnerState: "",
                  partnerStateOrCountry: [],
                }));
                setExpectationErrors((prev) => ({
                  ...prev,
                  partnerLocation: "",
                }));
              }}
              className={`${inputClass} ${
                expectationErrors.partnerLocation
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            >
              <option value="">Select</option>
              <option value="No preference">No preference</option>
              <option value="India">India (Select States)</option>
              <option value="Abroad">Abroad (Select Countries)</option>
            </select>
            {expectationErrors.partnerLocation && (
              <p className="text-red-500 text-sm mt-1">
                {expectationErrors.partnerLocation}
              </p>
            )}
          </div>

          {/* For India - State Selection */}
          {expectations.partnerLocation === "India" && (
            <div>
              <Label className="mb-2">Preferred State *</Label>
              <ReactSelect
                isMulti
                closeMenuOnSelect={false}
                value={toOptions(expectations.partnerStateOrCountry || [])}
                onChange={(sel) => {
                  const values = sel ? sel.map((o) => o.value) : [];
                  setExpectations((prev) => ({
                    ...prev,
                    partnerStateOrCountry: values,
                    partnerState: values[0] || "",
                  }));
                  setExpectationErrors((prev) => ({
                    ...prev,
                    partnerState: "",
                  }));
                }}
                options={toOptions(INDIAN_STATES)}
                classNamePrefix="react-select"
                styles={multiStyles}
                menuPlacement="auto"
                menuPortalTarget={document.body}
                placeholder="Search and select states"
              />
              {expectationErrors.partnerState && (
                <p className="text-red-500 text-sm mt-1">
                  {expectationErrors.partnerState}
                </p>
              )}
            </div>
          )}

          {/* For Abroad - Country Selection */}
          {expectations.partnerLocation === "Abroad" && (
            <div>
              <Label className="mb-2">Preferred Country *</Label>
              <ReactSelect
                isMulti
                closeMenuOnSelect={false}
                value={toOptions(expectations.partnerStateOrCountry || [])}
                onChange={(sel) => {
                  const values = sel ? sel.map((o) => o.value) : [];
                  setExpectations((prev) => ({
                    ...prev,
                    partnerStateOrCountry: values,
                    partnerCountry: values[0] || "",
                  }));
                  setExpectationErrors((prev) => ({
                    ...prev,
                    partnerCountry: "",
                  }));
                }}
                options={toOptions(ABROAD_OPTIONS)}
                classNamePrefix="react-select"
                styles={multiStyles}
                menuPlacement="auto"
                menuPortalTarget={document.body}
                placeholder="Search and select countries"
              />
              {expectationErrors.partnerCountry && (
                <p className="text-red-500 text-sm mt-1">
                  {expectationErrors.partnerCountry}
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="mb-2">Open To Partner Habits *</Label>
            <CustomSelect
              name="openToPartnerHabits"
              value={capitalizeWords(expectations.openToPartnerHabits) || ""}
              onChange={(e) =>
                handleExpectationsTextChange("openToPartnerHabits")(e)
              }
              options={["Yes", "No", "Occasional"]}
              placeholder="Select"
              className={
                expectationErrors.openToPartnerHabits ? "border-red-500" : ""
              }
            />
            {expectationErrors.openToPartnerHabits && (
              <p className="text-red-500 text-sm mt-1">
                {expectationErrors.openToPartnerHabits}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2">Preferred Education *</Label>
            <ReactSelect
              isMulti
              closeMenuOnSelect={false}
              value={toOptions(expectations.partnerEducation)}
              onChange={(sel) => {
                setExpectations((prev) => ({
                  ...prev,
                  partnerEducation: sel ? sel.map((o) => o.value) : [],
                }));
                setExpectationErrors((prev) => ({
                  ...prev,
                  partnerEducation: "",
                }));
              }}
              options={toOptions(EXPECT_EDUCATION_OPTIONS)}
              classNamePrefix="react-select"
              styles={multiStyles}
              menuPlacement="auto"
              menuPortalTarget={document.body}
              placeholder="Select education"
            />
            {expectationErrors.partnerEducation && (
              <p className="text-red-500 text-sm mt-1">
                {expectationErrors.partnerEducation}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2">Preferred Diet *</Label>
            <ReactSelect
              isMulti
              closeMenuOnSelect={false}
              value={toOptions(expectations.partnerDiet)}
              onChange={(sel) => {
                setExpectations((prev) => ({
                  ...prev,
                  partnerDiet: sel ? sel.map((o) => o.value) : [],
                }));
                setExpectationErrors((prev) => ({ ...prev, partnerDiet: "" }));
              }}
              options={toOptions(EXPECT_DIET_OPTIONS)}
              classNamePrefix="react-select"
              styles={multiStyles}
              menuPlacement="auto"
              menuPortalTarget={document.body}
              placeholder="Select diet"
            />
            {expectationErrors.partnerDiet && (
              <p className="text-red-500 text-sm mt-1">
                {expectationErrors.partnerDiet}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2">Preferred Community *</Label>
            <ReactSelect
              isMulti
              closeMenuOnSelect={false}
              value={toOptions(expectations.partnerCommunity)}
              onChange={(sel) => {
                setExpectations((prev) => ({
                  ...prev,
                  partnerCommunity: sel ? sel.map((o) => o.value) : [],
                }));
                setExpectationErrors((prev) => ({
                  ...prev,
                  partnerCommunity: "",
                }));
              }}
              options={toOptions(EXPECT_CAST_OPTIONS)}
              classNamePrefix="react-select"
              styles={multiStyles}
              menuPlacement="auto"
              menuPortalTarget={document.body}
              placeholder="Select community"
            />
            {expectationErrors.partnerCommunity && (
              <p className="text-red-500 text-sm mt-1">
                {expectationErrors.partnerCommunity}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2">Preferred Profession *</Label>
            <ReactSelect
              isMulti
              closeMenuOnSelect={false}
              value={toOptions(expectations.profession)}
              onChange={(sel) => {
                setExpectations((prev) => ({
                  ...prev,
                  profession: sel ? sel.map((o) => o.value) : [],
                }));
                setExpectationErrors((prev) => ({ ...prev, profession: "" }));
              }}
              options={toOptions(EXPECT_PROFESSION_OPTIONS)}
              classNamePrefix="react-select"
              styles={multiStyles}
              menuPlacement="auto"
              menuPortalTarget={document.body}
              placeholder="Select profession"
            />
            {expectationErrors.profession && (
              <p className="text-red-500 text-sm mt-1">
                {expectationErrors.profession}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2">Marital Status Preference *</Label>
            <ReactSelect
              isMulti
              closeMenuOnSelect={false}
              value={toOptions(expectations.maritalStatus)}
              onChange={(sel) => {
                setExpectations((prev) => ({
                  ...prev,
                  maritalStatus: sel ? sel.map((o) => o.value) : [],
                }));
                setExpectationErrors((prev) => ({
                  ...prev,
                  maritalStatus: "",
                }));
              }}
              options={toOptions(EXPECT_MARITAL_STATUSES)}
              classNamePrefix="react-select"
              styles={multiStyles}
              menuPlacement="auto"
              menuPortalTarget={document.body}
              placeholder="Select marital status"
            />
            {expectationErrors.maritalStatus && (
              <p className="text-red-500 text-sm mt-1">
                {expectationErrors.maritalStatus}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2">Preferred Age From *</Label>
            <CustomSelect
              name="preferredAgeFrom"
              value={expectations.preferredAgeFrom || ""}
              onChange={(e) =>
                handleExpectationsTextChange("preferredAgeFrom")(e)
              }
              options={AGE_OPTIONS.map((a) => String(a))}
              placeholder="From"
              className={
                expectationErrors.preferredAgeFrom ? "border-red-500" : ""
              }
            />
            {expectationErrors.preferredAgeFrom && (
              <p className="text-red-500 text-sm mt-1">
                {expectationErrors.preferredAgeFrom}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2">Preferred Age To *</Label>
            <CustomSelect
              name="preferredAgeTo"
              value={expectations.preferredAgeTo || ""}
              onChange={(e) =>
                handleExpectationsTextChange("preferredAgeTo")(e)
              }
              options={AGE_OPTIONS.filter(
                (age) =>
                  !expectations.preferredAgeFrom ||
                  age >= Number(expectations.preferredAgeFrom)
              ).map((a) => String(a))}
              placeholder="To"
              className={
                expectationErrors.preferredAgeTo ? "border-red-500" : ""
              }
            />
            {expectationErrors.preferredAgeTo && (
              <p className="text-red-500 text-sm mt-1">
                {expectationErrors.preferredAgeTo}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFamilyDetails = () => (
    <div className="space-y-6">
      {/* Parents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label>Father's Name</Label>
          <EditableInput
            placeholder="Enter father's name"
            value={family.fatherName || ""}
            onChange={handleFamilyChange("fatherName")}
            className="rounded-[12px]"
            name="fatherName"
            autoCapitalize="words"
          />
        </div>
        <div className="space-y-2">
          <Label>Father's Occupation</Label>
          <EditableInput
            placeholder="Enter occupation"
            value={family.fatherProfession || ""}
            onChange={handleFamilyChange("fatherProfession")}
            className="rounded-[12px]"
            name="fatherProfession"
            autoCapitalize="words"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label>Father's Phone</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchableCountryCode
              className="w-full sm:w-32"
              value={family.fatherPhoneCode || ""}
              onChange={(code) =>
                setFamily((prev) => ({ ...prev, fatherPhoneCode: code }))
              }
              countryCodes={countryCodes}
            />
            <EditableInput
              placeholder="Phone Number"
              value={(() => {
                const val = family.fatherPhone;
                if (!val) return "";
                if (typeof val === "string") return val;
                if (typeof val === "object") {
                  if (val.number) return String(val.number || "");
                  if (val.value || val.label)
                    return String(val.value || val.label || "");
                }
                return String(val || "");
              })()}
              onChange={(e) =>
                handleFamilyPhoneChange("fatherPhone", e.target.value)
              }
              className="rounded-[12px] flex-1"
              name="fatherPhone"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Father's Native Place</Label>
          <EditableInput
            placeholder="Native place"
            value={family.fatherNative || ""}
            onChange={handleFamilyChange("fatherNative")}
            className="rounded-[12px]"
            name="fatherNative"
            autoCapitalize="words"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label>Mother's Name</Label>
          <EditableInput
            placeholder="Enter mother's name"
            value={family.motherName || ""}
            onChange={handleFamilyChange("motherName")}
            className="rounded-[12px]"
            name="motherName"
            autoCapitalize="words"
          />
        </div>
        <div className="space-y-2">
          <Label>Mother's Occupation</Label>
          <EditableInput
            placeholder="Enter occupation"
            value={family.motherProfession || ""}
            onChange={handleFamilyChange("motherProfession")}
            className="rounded-[12px]"
            name="motherProfession"
            autoCapitalize="words"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label>Mother's Phone</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchableCountryCode
              className="w-full sm:w-32"
              value={family.motherPhoneCode || ""}
              onChange={(code) =>
                setFamily((prev) => ({ ...prev, motherPhoneCode: code }))
              }
              countryCodes={countryCodes}
            />
            <EditableInput
              placeholder="Phone Number"
              value={(() => {
                const val = family.motherPhone;
                if (!val) return "";
                if (typeof val === "string") return val;
                if (typeof val === "object") {
                  if (val.number) return String(val.number || "");
                  if (val.value || val.label)
                    return String(val.value || val.label || "");
                }
                return String(val || "");
              })()}
              onChange={(e) =>
                handleFamilyPhoneChange("motherPhone", e.target.value)
              }
              className="rounded-[12px] flex-1"
              name="motherPhone"
            />
          </div>
        </div>
      </div>

      {/* Grandparents */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">
          Grandparents
        </h4>
        {[
          {
            label: "Paternal Grandfather  Name",
            key: "grandFatherName",
            placeholder: "e.g., Ramesh Kumar",
          },
          {
            label: "Paternal Grandmother  Name",
            key: "grandMotherName",
            placeholder: "e.g., Sushma Devi",
          },
          {
            label: "Maternal Grandfather  Name",
            key: "nanaName",
            placeholder: "e.g., Ramesh Kumar",
          },
          {
            label: "Maternal Grandmother  Name",
            key: "naniName",
            placeholder: "e.g., Sushma Devi",
          },
          {
            label: "Maternal Grandparents’ Native Place",
            key: "nanaNativePlace",
            placeholder: "e.g., Jaipur, Rajasthan",
          },
        ].map(({ label, key, placeholder }) => (
          <div className="flex flex-col" key={key}>
            <label className="text-sm font-medium mb-1">{label}</label>
            <input
              type="text"
              name={key}
              placeholder={placeholder || label}
              value={family[key] || ""}
              onChange={(e) => handleFamilyChange(key)(e)}
              autoCapitalize="words"
              className="w-full rounded-md p-2.5 sm:p-3 text-sm transition-all border border-[#D4A052] focus:border-[#D4A052] focus:ring-2 focus:ring-[#E4C48A]/30 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Family Type (radio) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label>Family Type *</Label>
          <div className="flex items-center gap-6 mt-2 flex-wrap">
            {["Joint", "Nuclear"].map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <input
                  type="radio"
                  name="familyType"
                  value={type}
                  checked={family.familyType === type}
                  onChange={() =>
                    setFamily((prev) => ({ ...prev, familyType: type }))
                  }
                  className={`appearance-none w-4 h-4 rounded-full border transition duration-200 cursor-pointer ${
                    family.familyType === type
                      ? "bg-[#D4A052] border-[#D4A052]"
                      : "border-gray-300"
                  } focus:ring-1 focus:ring-[#E4C48A]`}
                />
                <span className="text-gray-700 text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>
        <div />
      </div>

      {/* Siblings */}
      <div className="space-y-4 mt-4">
        <label className="text-sm font-medium mb-2 block">
          Do you have any siblings?
        </label>
        <div className="flex gap-4 items-center flex-wrap">
          {["Yes", "No"].map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <input
                type="radio"
                name="hasSiblings"
                value={option}
                checked={family.hasSiblings === (option === "Yes")}
                onChange={() =>
                  setFamily((prev) => ({
                    ...prev,
                    hasSiblings: option === "Yes",
                    siblingCount: 0,
                    siblings: [],
                  }))
                }
                className={`appearance-none w-4 h-4 rounded-full border transition duration-200 cursor-pointer
            ${
              family.hasSiblings === (option === "Yes")
                ? "bg-[#D4A052] border-[#D4A052]"
                : "border-[#E4C48A]"
            }
            focus:outline-none focus:ring-1 focus:ring-[#E4C48A]`}
              />
              <span className="text-gray-700">{option}</span>
            </label>
          ))}
        </div>

        {family.hasSiblings && (
          <div className="mt-3 space-y-3">
            <label className="text-sm font-medium mb-2">
              How many siblings?
            </label>
            <CustomSelect
              value={family.siblingCount || ""}
              onChange={(e) => handleSiblingCount(Number(e.target.value))}
              options={[1, 2, 3, 4, 5, 6].map((num) => String(num))}
              placeholder="Select"
              className=""
            />

            {family.siblings.map((sibling, index) => (
              <div
                key={index}
                className="border p-3 rounded-md bg-purple-50 space-y-2"
              >
                <div className="flex flex-col">
                  <label className="text-sm font-medium">
                    Sibling {index + 1} Name
                  </label>
                  <input
                    type="text"
                    placeholder={`Sibling ${index + 1} Name`}
                    value={sibling.name}
                    onChange={(e) =>
                      handleSiblingChange(index, "name", e.target.value)
                    }
                    autoCapitalize="words"
                    className="w-full border border-[#D4A052] rounded-md p-2.5 sm:p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-medium">Relation</label>
                  <CustomSelect
                    value={sibling.relation}
                    onChange={(e) =>
                      handleSiblingChange(index, "relation", e.target.value)
                    }
                    options={[
                      "Elder Brother",
                      "Elder Sister",
                      "Younger Brother",
                      "Younger Sister",
                    ]}
                    placeholder="Select"
                    className=""
                  />
                </div>

                {[
                  "Elder Brother",
                  "Elder Sister",
                  "Younger Brother",
                  "Younger Sister",
                ].includes(sibling.relation) && (
                  <div className="flex flex-col">
                    <label className="text-sm font-medium">
                      Marital Status
                    </label>
                    <CustomSelect
                      value={sibling.maritalStatus}
                      onChange={(e) =>
                        handleSiblingChange(
                          index,
                          "maritalStatus",
                          e.target.value
                        )
                      }
                      options={["Married", "Unmarried"]}
                      placeholder="Select"
                      className=""
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Family Location and About Family removed (were dummy data) */}
    </div>
  );

  const renderEducationDetails = () => (
    <div className="space-y-6">
      {/* School Name */}
      <div className="space-y-2">
        <Label>School Name *</Label>
        <EditableInput
          placeholder="Enter your school name"
          value={education.schoolName || ""}
          onChange={handleEducationChange("schoolName")}
          className={` rounded-[12px] ${
            educationErrors.schoolName ? "border-red-500" : "border-gray-300"
          }`}
          name="schoolName"
          autoCapitalize="words"
        />
        {educationErrors.schoolName && (
          <p className="text-red-500 text-sm">{educationErrors.schoolName}</p>
        )}
      </div>
      {/* Highest Qualification */}
      <div className="space-y-2">
        <Label>Highest Qualification *</Label>
        <CustomSelect
          name="highestEducation"
          value={education.highestEducation || ""}
          onChange={(e) => {
            handleEducationChange("highestEducation")(e);
          }}
          options={QUALIFICATION_LEVELS}
          placeholder="Select your qualification"
          className={educationErrors.highestEducation ? "border-red-500" : ""}
        />
        {educationErrors.highestEducation && (
          <p className="text-red-500 text-sm mt-1">
            {educationErrors.highestEducation}
          </p>
        )}
      </div>

      {/* Field of Study */}
      <div className="space-y-2">
        <Label className="mb-2">Field of Study *</Label>
        <CreatableSelect
          isClearable
          name="fieldOfStudy"
          value={
            education.fieldOfStudy
              ? { label: education.fieldOfStudy, value: education.fieldOfStudy }
              : null
          }
          onChange={(val) => {
            const next = val ? val.value : "";
            const sanitized = next ? sanitizeInput(next) : "";
            setEducation((prev) => ({ ...prev, fieldOfStudy: sanitized }));
            setEducationErrors((prev) => ({ ...prev, fieldOfStudy: "" }));
          }}
          options={filteredFieldOfStudyOptions.map((opt) => ({
            label: opt,
            value: opt,
          }))}
          classNamePrefix="react-select"
          styles={{
            control: (base, state) => ({
              ...base,
              minHeight: "3rem",
              borderColor: educationErrors.fieldOfStudy
                ? "#ef4444"
                : state.isFocused
                ? "#9ca3af"
                : "#d1d5db",
              boxShadow: "none",
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              "&:hover": {
                borderColor: state.isFocused ? "#6b7280" : "#9ca3af",
              },
            }),
            valueContainer: (base) => ({
              ...base,
              padding: "0 0.75rem",
              height: "3rem",
            }),
            indicatorsContainer: (base) => ({ ...base, height: "3rem" }),
          }}
          menuPlacement="top"
        />
        {educationErrors.fieldOfStudy && (
          <p className="text-red-500 text-sm mt-1">
            {educationErrors.fieldOfStudy}
          </p>
        )}
      </div>

      {/* University / College */}
      <div className="space-y-2">
        <Label>University / College Name *</Label>
        <EditableInput
          placeholder="Enter university name"
          value={education.universityName || ""}
          onChange={handleEducationChange("universityName")}
          className={`rounded-[12px] ${
            educationErrors.universityName
              ? "border-red-500"
              : "border-gray-300"
          }`}
          name="universityName"
          autoCapitalize="words"
        />
        {educationErrors.universityName && (
          <p className="text-red-500 text-sm">
            {educationErrors.universityName}
          </p>
        )}
      </div>

      {/* Country of Education */}
      <div className="space-y-2">
        <Label>Country of Education *</Label>
        <CustomSelect
          name="countryOfEducation"
          value={education.countryOfEducation || ""}
          onChange={(e) => handleEducationChange("countryOfEducation")(e)}
          options={[...countries].sort().concat("Other")}
          placeholder="Select your country"
          className={educationErrors.countryOfEducation ? "border-red-500" : ""}
        />
        {educationErrors.countryOfEducation && (
          <p className="text-red-500 text-sm mt-1">
            {educationErrors.countryOfEducation}
          </p>
        )}
        {education.countryOfEducation === "Other" && (
          <div className="mt-2">
            <EditableInput
              placeholder="Please specify your country"
              value={education.otherCountry || ""}
              onChange={handleEducationChange("otherCountry")}
              className={`rounded-[12px] ${
                educationErrors.otherCountry
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              name="otherCountry"
              autoCapitalize="words"
            />
            {educationErrors.otherCountry && (
              <p className="text-red-500 text-sm mt-1">
                {educationErrors.otherCountry}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Occupation, Company and Annual Income removed (were dummy fields) */}
    </div>
  );

  const renderProfessionDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 gap-y-6 mt-4">
        <div className="flex flex-col">
          <Label className="mb-2">Employment Status *</Label>
          <select
            name="employmentStatus"
            value={profession.employmentStatus || ""}
            onChange={(e) => {
              handleProfessionChange("employmentStatus")(e);
            }}
            className={`w-full border rounded-md p-2.5 sm:p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition ${
              professionErrors.employmentStatus
                ? "border-red-500"
                : "border-[#D4A052]"
            }`}
          >
            <option value="">Select Employment Status</option>
            {EMPLOYMENT_OPTIONS.map((val) => (
              <option key={val} value={val}>
                {EMPLOYMENT_DISPLAY_MAP[val] || val}
              </option>
            ))}
          </select>
          {professionErrors.employmentStatus && (
            <p className="text-red-500 text-sm mt-1">
              {professionErrors.employmentStatus}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <Label className="mb-2">Occupation *</Label>
          <div style={{ marginBottom: "8px" }}>
            <CreatableSelect
              name="occupation"
              isClearable
              value={
                profession.occupation
                  ? {
                      label: profession.occupation,
                      value: profession.occupation,
                    }
                  : null
              }
              onChange={(val) => {
                const sanitized = val ? sanitizeInput(val.value) : "";
                setProfession((prev) => ({
                  ...prev,
                  occupation: sanitized,
                }));
                setProfessionErrors((prev) => ({ ...prev, occupation: "" }));
              }}
              options={[...JOB_TITLES]
                .sort()
                .map((t) => ({ label: t, value: t }))}
              classNamePrefix="react-select"
              maxMenuHeight={192}
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: "3rem",
                  borderColor: professionErrors.occupation
                    ? "#ef4444"
                    : state.isFocused
                    ? "#9ca3af"
                    : "#d1d5db",
                  boxShadow: "none",
                  backgroundColor: "#ffffff",
                  borderRadius: "10px",
                  "&:hover": {
                    borderColor: state.isFocused ? "#6b7280" : "#9ca3af",
                  },
                }),
                valueContainer: (base) => ({
                  ...base,
                  padding: "0 0.75rem",
                  height: "3rem",
                }),
                indicatorsContainer: (base) => ({ ...base, height: "3rem" }),
              }}
              menuPlacement="top"
            />
            {professionErrors.occupation && (
              <p className="text-red-500 text-sm mt-1">
                {professionErrors.occupation}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 gap-y-6 mt-4">
        <div>
          <Label className="mb-2">Annual Income *</Label>
          <CustomSelect
            name="annualIncome"
            value={profession.annualIncome || ""}
            onChange={(e) => {
              handleProfessionChange("annualIncome")(e);
            }}
            options={INCOME_OPTIONS}
            placeholder="Select Annual Income"
            className={professionErrors.annualIncome ? "border-red-500" : ""}
          />
          {professionErrors.annualIncome && (
            <p className="text-red-500 text-sm mt-1">
              {professionErrors.annualIncome}
            </p>
          )}
        </div>
        <div>
          <Label className="mb-2">Organization Name *</Label>
          <EditableInput
            value={profession.organizationName || ""}
            onChange={handleProfessionChange("organizationName")}
            className={`rounded-md ${
              professionErrors.organizationName
                ? "border-red-500"
                : "border-gray-300"
            }`}
            name="organizationName"
          />
          {professionErrors.organizationName && (
            <p className="text-red-500 text-sm mt-1">
              {professionErrors.organizationName}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderLifestyleDetails = () => (
    <div className="space-y-6 px-4 md:px-6 py-2 md:py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 gap-y-6">
        <div>
          <Label className="mb-2">Diet</Label>
          <CustomSelect
            name="diet"
            value={lifestyle.diet || ""}
            onChange={(e) => {
              handleLifestyleChange("diet")(e);
            }}
            options={LIFESTYLE_DIET_OPTIONS}
            placeholder="Select"
            className={lifestyleErrors.diet ? "border-red-500" : ""}
          />
          {lifestyleErrors.diet && (
            <p className="text-red-500 text-sm mt-1">{lifestyleErrors.diet}</p>
          )}
        </div>

        <div>
          <Label className="mb-2">Smoking / Tobacco</Label>
          <CustomSelect
            name="smoking"
            value={lifestyle.smoking || ""}
            onChange={(e) => {
              handleLifestyleChange("smoking")(e);
            }}
            options={LIFESTYLE_HABIT_OPTIONS}
            placeholder="Select"
            className={lifestyleErrors.smoking ? "border-red-500" : ""}
          />
          {lifestyleErrors.smoking && (
            <p className="text-red-500 text-sm mt-1">
              {lifestyleErrors.smoking}
            </p>
          )}
        </div>

        <div>
          <Label className="mb-2">Drinking / Alcohol</Label>
          <CustomSelect
            name="drinking"
            value={lifestyle.drinking || ""}
            onChange={(e) => {
              handleLifestyleChange("drinking")(e);
            }}
            options={LIFESTYLE_HABIT_OPTIONS}
            placeholder="Select"
            className={lifestyleErrors.drinking ? "border-red-500" : ""}
          />
          {lifestyleErrors.drinking && (
            <p className="text-red-500 text-sm mt-1">
              {lifestyleErrors.drinking}
            </p>
          )}
        </div>

        <div>
          <Label className="mb-2">Have Medical History? *</Label>
          <CustomSelect
            name="isHaveMedicalHistory"
            value={lifestyle.isHaveMedicalHistory || ""}
            onChange={(e) => handleLifestyleChange("isHaveMedicalHistory")(e)}
            options={LIFESTYLE_YES_NO}
            placeholder="Select"
            className={
              lifestyleErrors.isHaveMedicalHistory ? "border-red-500" : ""
            }
          />
          {lifestyleErrors.isHaveMedicalHistory && (
            <p className="text-red-500 text-sm mt-1">
              {lifestyleErrors.isHaveMedicalHistory}
            </p>
          )}
        </div>

        <div>
          <Label className="mb-2">Have Tattoos? *</Label>
          <CustomSelect
            name="isHaveTattoos"
            value={lifestyle.isHaveTattoos || ""}
            onChange={(e) => handleLifestyleChange("isHaveTattoos")(e)}
            options={LIFESTYLE_YES_NO}
            placeholder="Select"
            className={lifestyleErrors.isHaveTattoos ? "border-red-500" : ""}
          />
          {lifestyleErrors.isHaveTattoos && (
            <p className="text-red-500 text-sm mt-1">
              {lifestyleErrors.isHaveTattoos}
            </p>
          )}
        </div>

        <div>
          <Label className="mb-2">HIV Positive? *</Label>
          <CustomSelect
            name="isHaveHIV"
            value={lifestyle.isHaveHIV || ""}
            onChange={(e) => handleLifestyleChange("isHaveHIV")(e)}
            options={LIFESTYLE_YES_NO}
            placeholder="Select"
            className={lifestyleErrors.isHaveHIV ? "border-red-500" : ""}
          />
          {lifestyleErrors.isHaveHIV && (
            <p className="text-red-500 text-sm mt-1">
              {lifestyleErrors.isHaveHIV}
            </p>
          )}
        </div>

        <div>
          <Label className="mb-2">Positive in TB? *</Label>
          <CustomSelect
            name="isPositiveInTB"
            value={lifestyle.isPositiveInTB || ""}
            onChange={(e) => handleLifestyleChange("isPositiveInTB")(e)}
            options={LIFESTYLE_YES_NO}
            placeholder="Select"
            className={lifestyleErrors.isPositiveInTB ? "border-red-500" : ""}
          />
          {lifestyleErrors.isPositiveInTB && (
            <p className="text-red-500 text-sm mt-1">
              {lifestyleErrors.isPositiveInTB}
            </p>
          )}
        </div>

        {String(lifestyle.isHaveMedicalHistory || "").toLowerCase() ===
          "yes" && (
          <div className="md:col-span-2">
            <Label className="mb-2">Medical History Details *</Label>
            <Textarea
              value={lifestyle.healthIssues || ""}
              onChange={(e) => handleLifestyleChange("healthIssues")(e)}
              className={`${inputClass} ${
                lifestyleErrors.healthIssues ? "border-red-500" : ""
              }`}
            />
            {lifestyleErrors.healthIssues && (
              <p className="text-red-500 text-sm mt-1">
                {lifestyleErrors.healthIssues}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Raw server payload removed per request */}
    </div>
  );

  const renderPhotosDetails = () => (
    <div className="space-y-6">
      <div className="text-left mb-4">
        <h3 className="text-2xl font-semibold text-black">Photos</h3>
      </div>
      {photos && photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {photos.map((src, idx) => (
            <div key={idx} className="flex flex-col items-start">
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="block w-full h-32 overflow-hidden rounded-md bg-gray-50 mb-2"
              >
                <img
                  src={src}
                  alt={`photo-${idx}`}
                  className="w-full h-full object-cover"
                />
              </a>
              <div className="w-full flex items-center gap-3">
                <div className="text-sm font-medium">{getPhotoLabel(idx)}</div>
                <button
                  type="button"
                  onClick={() => handleReplacePhoto(idx)}
                  className="ml-auto px-3 py-1 rounded-md bg-[#D4A052] text-white text-sm"
                >
                  {uploadingPhotoIdx === idx ? "Uploading..." : "Edit"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No photos uploaded yet.</p>
      )}
    </div>
  );

  function getPhotoLabel(index) {
    if (index === 0) return "Personal Photo";
    if (index === 1) return "Family Photo";
    if (index === 2) return "Closer Photo";
    return `Other Photo ${index - 2}`;
  }

  function mapIndexToPhotoType(index) {
    if (index === 0) return "personal";
    if (index === 1) return "family";
    if (index === 2) return "closer";
    return "other";
  }

  async function uploadToCloudinaryAndSave(file, photoType, index) {
    try {
      const photosRes = await getUserPhotos();
      const existingPhotos = {};

      if (photosRes?.success && photosRes?.data) {
        const photosData = photosRes.data.photos || photosRes.data;
        if (photosData.closerPhoto?.url)
          existingPhotos.closer = photosData.closerPhoto.url;
        if (
          Array.isArray(photosData.personalPhotos) &&
          photosData.personalPhotos[0]?.url
        ) {
          existingPhotos.compulsory1 = photosData.personalPhotos[0].url;
        }
        if (Array.isArray(photosData.otherPhotos)) {
          if (photosData.otherPhotos[0]?.url)
            existingPhotos.optional1 = photosData.otherPhotos[0].url;
          if (photosData.otherPhotos[1]?.url)
            existingPhotos.optional2 = photosData.otherPhotos[1].url;
        }
      }

      let photoKey;
      if (photoType === "closer") {
        photoKey = "closer";
      } else if (photoType === "personal") {
        photoKey = "compulsory1";
      } else if (photoType === "family") {
        photoKey = "family";
      } else if (photoType === "other") {
        const otherIndex = index - 3;
        photoKey = otherIndex === 0 ? "optional1" : "optional2";
      }

      const photosToUpload = [
        {
          key: photoKey,
          file,
          photoType,
        },
      ];

      const uploadResult = await uploadPhotos(photosToUpload, existingPhotos);

      if (uploadResult.success && uploadResult.results.length > 0) {
        const url = uploadResult.results[0].url;
        if (url) {
          setPhotos((prev) => {
            const next = [...prev];
            next[index] = url;
            return next;
          });
          toast.success("Photo updated successfully");
        }
      } else {
        const errorMsg =
          uploadResult.errors?.[0]?.error || "Failed to update photo";
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      toast.error(err?.message || "Failed to update photo");
    } finally {
      setUploadingPhotoIdx(null);
    }
  }

  function handleReplacePhoto(index) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      setUploadingPhotoIdx(index);
      const photoType = mapIndexToPhotoType(index);
      await uploadToCloudinaryAndSave(file, photoType, index);
    };
    input.click();
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="bg-white rounded-[16px] sm:rounded-[20px] md:rounded-[24px] shadow-md border border-[#e5e5e5] p-4 sm:p-5 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
          <button
            onClick={onNavigateBack}
            className="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-full hover:bg-[#E4C48A] transition-colors bg-[#D4A052] shadow-lg"
          >
            <ArrowLeft className="w-8 h-8 text-white" strokeWidth={3} />
          </button>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
            Edit Profile
          </h2>
        </div>

        {/* Photos preview moved into Photos tab to avoid showing above header */}

        {/* Tabs */}
        <TabsComponent
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content */}
        <div className="mt-8 overflow-visible">
          {activeTab === "personal" && renderPersonalDetails()}
          {activeTab === "family" && renderFamilyDetails()}
          {activeTab === "education" && renderEducationDetails()}
          {activeTab === "profession" && renderProfessionDetails()}
          {activeTab === "lifestyle" && renderLifestyleDetails()}
          {activeTab === "expectations" && renderExpectations()}
          {activeTab === "photos" && renderPhotosDetails()}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 sm:mt-8 md:mt-10 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={onNavigateBack}
            className="rounded-[12px] px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 text-sm sm:text-base border-[#C8A227] text-[#C8A227] hover:bg-[#C8A227] hover:text-white transition-colors w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-[12px] px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 text-sm sm:text-base flex items-center justify-center gap-2 bg-[#C8A227] hover:bg-[#B49520] text-white w-full sm:w-auto order-1 sm:order-2"
          >
            <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
