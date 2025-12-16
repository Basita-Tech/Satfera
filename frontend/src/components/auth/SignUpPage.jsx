import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendEmailOtp, signupUser } from "../../api/auth";
import {
  ArrowLeft,
  CheckCircleFill,
} from "react-bootstrap-icons";
import { Eye, EyeOff } from "lucide-react";
import { allCountries } from "country-telephone-data";
import SearchableCountryCode from "../SearchableCountryCode";
import toast from "react-hot-toast";
import { AuthContextr } from "../context/AuthContext";
import {
  sanitizeName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeCountryCode,
  sanitizePassword,
  sanitizeString,
} from "../../utils/sanitization";
import {
  validateName,
  validateEmail,
  validatePhone,
  validateDateOfBirth,
  validatePassword,
  validatePasswordMatch,
  validateCountryCode,
  validateProfileFor,
  validateGender,
  validateSignupForm,
  getPasswordStrength,
} from "../../utils/validation";

const profileOptions = [
  { value: "myself", label: "Myself" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "friend", label: "Friend" },
];

const existingEmails = ["test@example.com", "hello@domain.com"];
const existingMobiles = ["+911234567890", "+919876543210"];
console.log("API URL:", import.meta.env.VITE_API_URL);

const SignUpPage = () => {
  const today = new Date();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useContext(AuthContextr);

  const [formData, setFormData] = useState({
    profileFor: "",
    gender: localStorage.getItem("gender") || "",
    firstName: "",
    middleName: "",
    lastName: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    email: "",
    countryCode: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    useAsUsername: [],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Helper function to add aliases for common country name variations
  const getCountryAliases = (name, iso2) => {
    const aliasMap = {
      'United States': ['USA', 'US', 'America'],
      'United Kingdom': ['UK', 'Britain', 'Great Britain'],
      'United Arab Emirates': ['UAE'],
      'South Korea': ['Korea'],
      'Czech Republic': ['Czechia'],
      'Netherlands': ['Holland'],
      'Switzerland': ['Swiss'],
    };
    return aliasMap[name] || [];
  };

  const countryCodes = [
    { code: "+91", country: "India", aliases: [] },
    ...allCountries
      .filter((c) => c.iso2 !== "in")
      .map((c) => ({
        code: `+${c.dialCode}`,
        country: c.name,
        aliases: getCountryAliases(c.name, c.iso2),
      })),
  ];

  const getNameLabel = () => {
    switch (formData.profileFor) {
      case "myself":
        return "Your Name";
      case "son":
      case "brother":
        return "His Name";
      case "daughter":
      case "sister":
        return "Her Name";
      default:
        return "Name";
    }
  };


  // Allow authenticated users to access signup page
  // (removed auto-redirect to dashboard)

  useEffect(() => {
    if (formData.gender) localStorage.setItem("gender", formData.gender);
  }, [formData.gender]);

  const focusNext = (currentName) => {
    const order = ["dobDay", "dobMonth", "dobYear"];
    const currentIndex = order.indexOf(currentName);
    if (currentIndex !== -1 && currentIndex < order.length - 1) {
      const nextField = document.getElementsByName(order[currentIndex + 1])[0];
      nextField?.focus();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Sanitize input based on field type
    if (name === "email") {
      formattedValue = sanitizeEmail(value);
    } else if (name === "mobile") {
      formattedValue = sanitizePhone(value);
    } else if (name === "countryCode") {
      formattedValue = sanitizeCountryCode(value);
    } else if (name === "password" || name === "confirmPassword") {
      formattedValue = sanitizePassword(value);
    } else if (["firstName", "middleName", "lastName"].includes(name)) {
      formattedValue = sanitizeName(value);
    } else if (["dobDay", "dobMonth", "dobYear"].includes(name)) {
      formattedValue = value.replace(/\D/g, "");
    } else {
      formattedValue = sanitizeString(value);
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));

    // Real-time validation for names - only validate on blur or if field had previous error
    if (["firstName", "lastName"].includes(name)) {
      // Only show validation error if field was previously touched (had an error) or field is being blurred
      if (formattedValue.trim() && errors[name]) {
        const error = validateName(
          formattedValue,
          name === "firstName" ? "First Name" : "Last Name"
        );
        if (error) {
          setErrors((prev) => ({ ...prev, [name]: error }));
        }
      }
    }

    // Real-time validation for email
    if (name === "email" && formattedValue) {
      const emailError = validateEmail(formattedValue);
      if (emailError) {
        setErrors((prev) => ({ ...prev, email: emailError }));
      }
    }

    // Real-time validation for mobile
    if (name === "mobile" && formattedValue) {
      const phoneError = validatePhone(formattedValue, formData.countryCode);
      if (phoneError) {
        setErrors((prev) => ({ ...prev, mobile: phoneError }));
      }
    }

    // Password strength indicator
    if (name === "password") {
      const strength = getPasswordStrength(formattedValue);
      setPasswordCriteria({
        length: formattedValue.length >= 6,
        upper: /[A-Z]/.test(formattedValue),
        lower: /[a-z]/.test(formattedValue),
        number: /\d/.test(formattedValue),
        special: /[@$!%*?&]/.test(formattedValue),
      });
    }

    // Real-time validation for DOB fields
    if (["dobDay", "dobMonth", "dobYear"].includes(name)) {
      let dobError = "";
      
      if (name === "dobDay" && formattedValue.length === 2) {
        if (+formattedValue < 1 || +formattedValue > 31)
          dobError = "Invalid day";
        else focusNext(name);
      }
      
      if (name === "dobMonth" && formattedValue.length === 2) {
        if (+formattedValue < 1 || +formattedValue > 12)
          dobError = "Invalid month";
        else focusNext(name);
      }
      
      if (name === "dobYear" && formattedValue.length === 4) {
        const year = +formattedValue;
        const currentYear = today.getFullYear();
        if (year < currentYear - 100 || year > currentYear)
          dobError = "Invalid year";
        else {
          // Validate full DOB when year is complete
          const dobValidationError = validateDateOfBirth(
            formData.dobDay,
            formData.dobMonth,
            formattedValue,
            formData.gender
          );
          if (dobValidationError) dobError = dobValidationError;
        }
      }
      
      if (dobError) {
        setErrors((prev) => ({ ...prev, dobDay: dobError }));
      }
    }
  };

  const handleProfileForChange = (value) => {
    const sanitizedValue = sanitizeString(value);
    const profileError = validateProfileFor(sanitizedValue);
    
    let autoGender = "";
    if (sanitizedValue === "son" || sanitizedValue === "brother")
      autoGender = "male";
    if (sanitizedValue === "daughter" || sanitizedValue === "sister")
      autoGender = "female";

    setFormData((prev) => ({
      ...prev,
      profileFor: sanitizedValue,
      gender: autoGender || "",
    }));

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.profileFor;
      if (autoGender) {
        delete updated.gender;
      } else if (sanitizedValue === "myself" || sanitizedValue === "friend") {
        updated.gender = "Please select gender";
      } else {
        delete updated.gender;
      }
      return updated;
    });

    if (autoGender) {
      const dobError = validateDateOfBirth(
        formData.dobDay,
        formData.dobMonth,
        formData.dobYear,
        autoGender
      );
      setErrors((prev) => ({ ...prev, dobDay: dobError }));
    }
  };

  const handleGenderSelect = (gender) => {
    const sanitizedGender = sanitizeString(gender);
    const genderError = validateGender(sanitizedGender);
    
    setFormData((prev) => ({ ...prev, gender: sanitizedGender }));
    setErrors((prev) => ({ ...prev, gender: "" }));
    localStorage.setItem("gender", sanitizedGender);

    const dobError = validateDateOfBirth(
      formData.dobDay,
      formData.dobMonth,
      formData.dobYear,
      sanitizedGender
    );
    setErrors((prev) => ({ ...prev, dobDay: dobError }));
  };

  const handleGenderBlur = () => {
    if (
      (formData.profileFor === "myself" || formData.profileFor === "friend") &&
      !formData.gender
    ) {
      setErrors((prev) => ({ ...prev, gender: "Please select gender" }));
    } else {
      setErrors((prev) => {
        const newErr = { ...prev };
        delete newErr.gender;
        return newErr;
      });
    }
  };

  const handleNameBlur = (fieldName) => {
    const fieldLabel = fieldName === "firstName" ? "First Name" : fieldName === "lastName" ? "Last Name" : "Middle Name";
    const fieldValue = formData[fieldName];
    
    if (fieldValue.trim()) {
      const error = validateName(fieldValue, fieldLabel);
      if (error) {
        setErrors((prev) => ({ ...prev, [fieldName]: error }));
      } else {
        setErrors((prev) => {
          const newErr = { ...prev };
          delete newErr[fieldName];
          return newErr;
        });
      }
    }
  };

  const handleDOBBlur = () => {
    // Validate complete DOB when user leaves any DOB field
    const dobError = validateDateOfBirth(
      formData.dobDay,
      formData.dobMonth,
      formData.dobYear,
      formData.gender
    );
    
    if (dobError) {
      setErrors((prev) => ({ ...prev, dobDay: dobError }));
    } else {
      setErrors((prev) => {
        const newErr = { ...prev };
        delete newErr.dobDay;
        delete newErr.dobMonth;
        delete newErr.dobYear;
        return newErr;
      });
    }
  };

  const handleUsernameToggle = (type) => {
    setFormData((prev) => {
      let updatedSelection = [];
      if (prev.useAsUsername.includes(type)) {
        updatedSelection = prev.useAsUsername.filter((t) => t !== type);
      } else {
        updatedSelection = [type];
      }

      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors };
        if (updatedSelection.length > 0) {
          delete newErrors.useAsUsername;
        }
        return newErrors;
      });

      return { ...prev, useAsUsername: updatedSelection };
    });
  };

  const validateForm = () => {
    const validation = validateSignupForm({
      profileFor: formData.profileFor,
      gender: formData.gender,
      firstName: formData.firstName,
      lastName: formData.lastName,
      middleName: formData.middleName,
      dobDay: formData.dobDay,
      dobMonth: formData.dobMonth,
      dobYear: formData.dobYear,
      email: formData.email,
      mobile: formData.mobile,
      countryCode: formData.countryCode,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      useAsUsername: formData.useAsUsername,
      termsAccepted: termsAccepted,
    });

    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // Sanitize all input before submission
      const sanitizedFirstName = sanitizeName(formData.firstName.trim());
      const sanitizedMiddleName = sanitizeName(formData.middleName?.trim() || "");
      const sanitizedLastName = sanitizeName(formData.lastName.trim());
      const sanitizedEmail = sanitizeEmail(formData.email.trim());
      let sanitizedMobile = sanitizePhone(formData.mobile).replace(/\D/g, "");
      // Extract just the country code from "+91 India" format
      const countryCodeMatch = formData.countryCode.match(/^\+\d+/);
      const sanitizedCountryCode = countryCodeMatch ? sanitizeCountryCode(countryCodeMatch[0]) : sanitizeCountryCode(formData.countryCode);
      const sanitizedProfileFor = sanitizeString(formData.profileFor);
      const sanitizedGender = sanitizeString(formData.gender);
      const sanitizedPassword = sanitizePassword(formData.password);

      if (sanitizedMobile.startsWith("0")) {
        sanitizedMobile = sanitizedMobile.slice(1);
      }
      const phoneNumber = `${sanitizedCountryCode}${sanitizedMobile}`;

      const payload = {
        firstName: sanitizedFirstName,
        middleName: sanitizedMiddleName,
        lastName: sanitizedLastName,
        gender: sanitizedGender,
        email: sanitizedEmail,
        phoneNumber,
        password: sanitizedPassword,
        termsAndConditionsAccepted: termsAccepted,
        dateOfBirth: `${String(formData.dobDay).padStart(2, "0")}-${String(
          formData.dobMonth
        ).padStart(2, "0")}-${formData.dobYear}`,
        for_Profile: sanitizedProfileFor,
      };

      console.log("Signup payload (sanitized):", payload);

      const res = await signupUser(payload);
      console.log("Signup response:", res);

      if (res?.success) {
        try {
          const emailOtpRes = await sendEmailOtp({
            email: payload.email,
            type: "signup",
          });

          if (emailOtpRes?.success) {
            toast.success("Email OTP sent successfully!");
            toast.success(`Your OTP is ${emailOtpRes.otp}`, {
              duration: 10000,
            });
            navigate("/verify-otp", {
              state: {
                email: payload.email,
                countryCode: sanitizedCountryCode,
                mobile: sanitizedMobile,
                name: `${sanitizedFirstName} ${sanitizedLastName}`,
              },
            });
            return;
          } else {
            toast.error(emailOtpRes?.message || "Failed to send Email OTP");
            return;
          }
        } catch (otpError) {
          console.error("Email OTP error:", otpError);
          toast.error("Error sending OTP. Please try again.");
          return;
        }
      }

      if (!res?.success) {
        toast.error(res?.message || "Signup failed");
        setErrors((prev) => ({
          ...prev,
          ...(res.message?.toLowerCase().includes("email")
            ? { email: res.message }
            : { mobile: res.message }),
        }));
        return;
      }

      if (res?.errors) {
        const newErrors = {};

        if (Array.isArray(res.errors)) {
          res.errors.forEach((err) => {
            const field =
              err.param || err.field || err.key || err.path || "form";
            const message = err.msg || err.message || String(err);

            const mappedField = (() => {
              if (["phoneNumber", "phone", "mobile"].includes(field))
                return "mobile";
              if (["for_Profile", "forProfile", "for_profile"].includes(field))
                return "profileFor";
              if (["dateOfBirth", "dob", "date_of_birth"].includes(field))
                return "dobDay";
              if (["firstName", "firstname"].includes(field))
                return "firstName";
              if (["lastName", "lastname"].includes(field)) return "lastName";
              if (field === "email") return "email";
              if (field === "password") return "password";
              return field;
            })();

            newErrors[mappedField] = message;
          });
        } else if (typeof res.errors === "object") {
          Object.keys(res.errors).forEach((k) => {
            newErrors[k] = Array.isArray(res.errors[k])
              ? res.errors[k].join(" ")
              : String(res.errors[k]);
          });
        }

        setErrors((prev) => ({ ...prev, ...newErrors }));
        return;
      }

      setErrors((prev) => ({
        ...prev,
        form: res?.message || "Signup failed. Try again.",
      }));
    } catch (error) {
      console.error("Signup error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-center px-2.5 sm:px-4">
      <div className="bg-[#FBFAF7] rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-xl hover:scale-[1.01] sm:hover:scale-[1.02] transition-transform duration-300">
        <Link
          to="/"
          className="text-[#D4A052] text-xs sm:text-sm flex items-center mb-4 sm:mb-6 hover:text-[#E4C48A] transition-colors"
        >
          <ArrowLeft className="mr-1 w-4 h-4 sm:w-5 sm:h-5" /> Back to Home
        </Link>

        <div className="text-center mb-6 sm:mb-8">
          <h2 className="inline font-bold text-xl sm:text-2xl md:text-3xl text-gray-800">
            Create Your Profile
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6"
          autoComplete="off"
        >
          {/* Profile For */}
          <div className="mb-6">
            <label className="block font-semibold mb-2 text-sm text-gray-700">
              Matrimony Profile For <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {profileOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleProfileForChange(opt.value)}
                  className={`px-4 py-3 text-sm font-medium shadow-md border rounded-md transition-all duration-200 
                    ${
                      formData.profileFor === opt.value
                        ? "bg-[#D4A052] text-white border-[#E4C48A] font-semibold"
                        : "bg-white text-gray-700 border-[#E4C48A] hover:bg-[#FFF9F2]"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.profileFor && (
              <p className="text-red-500 text-sm mt-1">{errors.profileFor}</p>
            )}
          </div>

          {/* Gender */}
          {(formData.profileFor === "myself" ||
            formData.profileFor === "friend") && (
            <div className="mt-4">
              <label className="block font-semibold mb-2 text-sm text-gray-700">
                Gender <span className="text-red-500">*</span>
              </label>

              <div className="flex flex-wrap gap-2">
                {["male", "female"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGenderSelect(g)}
                    className={`px-4 py-3 text-sm font-medium shadow-md border rounded-md transition-all duration-200
            ${
              formData.gender === g
                ? "bg-[#D4A052] text-white border-[#E4C48A] font-semibold"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
                  >
                    {g === "male" ? "Male" : "Female"}
                  </button>
                ))}
              </div>

              {errors.gender && (
                <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
              )}
            </div>
          )}

          {/* Names */}
          <div>
            <label className="block font-semibold mb-2 text-sm sm:text-base text-gray-700">
              {getNameLabel()} <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              <div className="flex flex-col">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name *"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onBlur={() => handleNameBlur("firstName")}
                  autoComplete="off"
                  className={`w-full p-3 rounded-md border text-sm ${
                    errors.firstName ? "border-red-500" : "border-[#E4C48A]"
                  } 
    focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                />

                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="flex flex-col">
                <input
                  type="text"
                  name="middleName"
                  placeholder="Middle Name"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  onBlur={() => handleNameBlur("middleName")}
                  autoComplete="off"
                  className={`w-full p-3 rounded-md border text-sm ${
                    errors.middleName ? "border-red-500" : "border-[#E4C48A]"
                  } 
    focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                />
              </div>

              <div className="flex flex-col">
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name *"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onBlur={() => handleNameBlur("lastName")}
                  autoComplete="off"
                  className={`w-full p-3 rounded-md border text-sm ${
                    errors.lastName ? "border-red-500" : "border-[#E4C48A]"
                  } 
    focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>
          </div>

          {/* DOB */}
          <div>
            <label className="block font-semibold mb-2 text-sm sm:text-base text-gray-700">
              Date of Birth <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                name="dobDay"
                placeholder="DD"
                maxLength={2}
                value={formData.dobDay}
                onChange={handleInputChange}
                onBlur={handleDOBBlur}
                autoComplete="off"
                className={`w-full p-3 rounded-md border text-sm ${
                  errors.dobDay ? "border-red-500" : "border-[#E4C48A]"
                } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />
              <input
                type="text"
                name="dobMonth"
                placeholder="MM"
                maxLength={2}
                value={formData.dobMonth}
                onChange={handleInputChange}
                onBlur={handleDOBBlur}
                autoComplete="off"
                className={`w-full p-3 rounded-md border text-sm ${
                  errors.dobMonth ? "border-red-500" : "border-[#E4C48A]"
                } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />
              <input
                type="text"
                name="dobYear"
                placeholder="YYYY"
                maxLength={4}
                value={formData.dobYear}
                onChange={handleInputChange}
                onBlur={handleDOBBlur}
                autoComplete="off"
                className={`w-full p-3 rounded-md border text-sm ${
                  errors.dobYear ? "border-red-500" : "border-[#E4C48A]"
                } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />
            </div>

            {/* ✅ Corrected Error Display */}
            {errors.dobDay && (
              <p className="text-red-500 text-sm mt-1">{errors.dobDay}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col w-full mb-4 sm:mb-6">
            <label className="block font-semibold mb-2 text-sm sm:text-base text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              placeholder="Enter Email Address"
              value={formData.email}
              onChange={(e) => {
                handleInputChange(e);
                setErrors((prev) => ({ ...prev, email: "" }));
              }}
              autoComplete="off"
              className={`w-full p-3 rounded-md border text-sm ${
                errors.email ? "border-red-500" : "border-[#E4C48A]"
              } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}

            <div className="mt-1">
              <input
                type="checkbox"
                checked={formData.useAsUsername.includes("email")}
                onChange={() => handleUsernameToggle("email")}
                className="mr-2 accent-[#333230] w-3 h-3"
              />
              <span className="text-xs sm:text-sm">
                Use as Username{" "}
                {formData.useAsUsername.includes("email") && (
                  <CheckCircleFill className="inline text-green-500 ml-1" />
                )}
              </span>
            </div>
            {errors.useAsUsername && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">
                {errors.useAsUsername}
              </p>
            )}
          </div>

          {/* Mobile Number */}
          <div className="flex flex-col w-full mb-4 sm:mb-6">
            <label className="text-xs sm:text-sm font-medium mb-2">
              Mobile <span className="text-red-500">*</span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Country Code */}
              <div>
                <SearchableCountryCode
                  value={formData.countryCode}
                  onChange={(code) => {
                    setFormData({ ...formData, countryCode: code });
                    setErrors((prev) => ({ ...prev, mobile: "" }));
                  }}
                  error={errors.mobile}
                  countryCodes={countryCodes}
                />
              </div>

              <input
                type="tel"
                name="mobile"
                placeholder="Enter Mobile Number"
                value={formData.mobile}
                onChange={(e) => {
                  handleInputChange(e);
                  setErrors((prev) => ({ ...prev, mobile: "" }));
                }}
                autoComplete="off"
                className={`w-full p-3 rounded-md border text-sm ${
                  errors.mobile ? "border-red-500" : "border-[#E4C48A]"
                } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />
            </div>

            {/* Checkbox */}
            <label className="flex items-center mt-2 cursor-pointer text-xs sm:text-sm select-none">
              <input
                type="checkbox"
                checked={formData.useAsUsername.includes("mobile")}
                onChange={() => handleUsernameToggle("mobile")}
                className="mr-2 accent-[#3e3d3a] w-3 h-3"
              />
              Use as Username
              {formData.useAsUsername.includes("mobile") && (
                <CheckCircleFill className="inline text-green-500 ml-1" />
              )}
            </label>

            {/* Error Messages */}
            {errors.mobile && (
              <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>
            )}
            {errors.useAsUsername && (
              <p className="text-red-500 text-sm mt-1">
                {errors.useAsUsername}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              autoComplete="new-password"
              className={`w-full p-3 pr-14 rounded-md border text-sm min-h-[48px] ${
                errors.password ? "border-red-500" : "border-[#E4C48A]"
              } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
            />
            <span
              className="absolute inset-y-0 right-3 flex items-center justify-center text-gray-500 cursor-pointer h-[48px] w-10"
              style={{ pointerEvents: 'auto' }}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="w-6 h-6" />
              ) : (
                <Eye className="w-6 h-6" />
              )}
            </span>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}

            {/* Password Criteria: show only if password is invalid */}
            {formData.password &&
              !(
                formData.password.length >= 6 &&
                /[A-Z]/.test(formData.password) &&
                /[a-z]/.test(formData.password) &&
                /[0-9]/.test(formData.password) &&
                /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
              ) && (
                <div className="mt-2 text-xs sm:text-sm space-y-1">
                  <p
                    className={`${
                      formData.password.length >= 6
                        ? "text-green-500"
                        : "text-gray-500"
                    }`}
                  >
                    • Minimum 6 characters
                  </p>
                  <p
                    className={`${
                      /[A-Z]/.test(formData.password)
                        ? "text-green-500"
                        : "text-gray-500"
                    }`}
                  >
                    • At least one uppercase letter
                  </p>
                  <p
                    className={`${
                      /[a-z]/.test(formData.password)
                        ? "text-green-500"
                        : "text-gray-500"
                    }`}
                  >
                    • At least one lowercase letter
                  </p>
                  <p
                    className={`${
                      /[0-9]/.test(formData.password)
                        ? "text-green-500"
                        : "text-gray-500"
                    }`}
                  >
                    • At least one number
                  </p>
                  <p
                    className={`${
                      /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
                        ? "text-green-500"
                        : "text-gray-500"
                    }`}
                  >
                    • At least one special character
                  </p>
                </div>
              )}
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              autoComplete="new-password"
              className={`w-full p-3 pr-14 rounded-md border text-sm min-h-[48px] ${
                errors.confirmPassword ? "border-red-500" : "border-[#E4C48A]"
              } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
            />
            <span
              className="absolute inset-y-0 right-3 flex items-center justify-center text-gray-500 cursor-pointer h-[48px] w-10"
              style={{ pointerEvents: 'auto' }}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-6 h-6" />
              ) : (
                <Eye className="w-6 h-6" />
              )}
            </span>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="flex items-start space-x-2 sm:space-x-3">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                setErrors((prev) => ({ ...prev, termsAccepted: "" }));
              }}
              className="w-4 h-4 accent-[#D4AF37] mt-1 flex-shrink-0"
            />
            <label className="text-xs sm:text-sm text-gray-700">
              I agree to the{" "}
              <span
                className="text-blue-600 underline hover:text-blue-700 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDisclaimer(true);
                }}
              >
                Terms & Conditions
              </span>
            </label>
          </div>
          {errors.termsAccepted && (
            <p className="text-red-500 text-sm mt-1">{errors.termsAccepted}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#D4A052] hover:bg-[#E4C48A] text-white p-3 rounded-full font-semibold text-sm shadow-lg transition-colors duration-300 
    ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Creating..." : "Create Profile"}
          </button>
        </form>

        {/* Disclaimer Modal for Terms & Conditions */}
        {showDisclaimer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end sm:items-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Header - Fixed */}
              <div className="flex-shrink-0 border-b border-gray-200 px-5 sm:px-8 py-4 sm:py-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                  Disclaimer for SATFERA Matrimony
                </h3>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 sm:py-6" style={{ maxHeight: "calc(90vh - 180px)" }}>
                <div className="text-sm sm:text-base text-gray-700 space-y-3 sm:space-y-4 leading-relaxed">
                  <p>
                    By registering on <strong>SATFERA</strong>, you give us
                    permission to use your photos, profile details, and other
                    shared information on our website, mobile application, and
                    for sharing with suitable profiles for matchmaking purposes.
                  </p>
                  <p>
                    You confirm that all personal details provided by you,
                    including name, age, contact number, education, financial
                    details, and any other information, are true, correct, and
                    updated.
                  </p>
                  <p>
                    <strong>SATFERA</strong> is only a matchmaking platform. We
                    do not guarantee marriage, engagement, or confirmation of
                    any relationship.
                  </p>
                  <p>
                    If you are interested in any profile, it is your sole
                    responsibility to verify their past, present, financial
                    capacity, family background, and other necessary details
                    before making any decision. SATFERA is not responsible for
                    the authenticity of users’ claims.
                  </p>
                  <p>
                    SATFERA will not be held responsible for any issues,
                    disputes, frauds, or misunderstandings arising after
                    marriage, engagement, or any personal interactions. We
                    cannot interfere in the personal life of any member.
                  </p>
                  <p>
                    SATFERA strongly advises all members to exercise caution,
                    conduct independent verification, and use their own judgment
                    before sharing personal, financial, or sensitive information
                    with other members.
                  </p>
                  <p>
                    SATFERA does not conduct criminal background checks or
                    financial verifications of its members. Users are
                    responsible for due diligence.
                  </p>
                  <p>
                    SATFERA will not be liable for any loss, damage, fraud, or
                    emotional/financial harm arising out of interactions with
                    other members.
                  </p>
                  <p>
                    Membership fees or charges paid to SATFERA are
                    non-refundable under any circumstances.
                  </p>
                  <p>
                    By using SATFERA, you agree to abide by our Terms &
                    Conditions and Privacy Policy.
                  </p>
                </div>
              </div>

              {/* Footer - Fixed at Bottom */}
              <div className="flex-shrink-0 border-t border-gray-200 px-5 sm:px-8 py-4 sm:py-6 flex justify-end bg-white">
                <button
                  className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg bg-[#D4A052] hover:bg-[#C8A227] text-white text-sm sm:text-base font-semibold transition shadow-md"
                  onClick={() => setShowDisclaimer(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUpPage;
