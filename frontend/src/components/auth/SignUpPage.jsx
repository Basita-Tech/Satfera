import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendEmailOtp, signupUser,sendSmsOtp } from "../../api/auth";
import {
  HeartFill,
  ArrowLeft,
  EyeFill,
  EyeSlashFill,
  EnvelopeFill,
  PhoneFill,
  CheckCircleFill,
} from "react-bootstrap-icons";
import { allCountries } from "country-telephone-data";

const profileOptions = [
  { value: "myself", label: "Myself" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "friend", label: "Friend" },
];

// Demo existing emails/mobiles (frontend)
const existingEmails = ["test@example.com", "hello@domain.com"];
const existingMobiles = ["+911234567890", "+919876543210"];
console.log("API URL:", import.meta.env.VITE_API_URL);

const SignUpPage = () => {
  const today = new Date();
  const navigate = useNavigate();

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
    countryCode: "+91",
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

  const countryCodes = [
    { code: "+91", country: "India" }, // 👈 India always first
    ...allCountries
      .filter((c) => c.iso2 !== "in") // avoids duplicate India
      .map((c) => ({
        code: `+${c.dialCode}`,
        country: c.name,
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


  useEffect(() => {
    if (formData.gender) localStorage.setItem("gender", formData.gender);
  }, [formData.gender]);

  const capitalizeWords = (str) =>
    str.replace(/\b\w+\b/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());


  const validateDOB = (day, month, year, gender) => {
    if (!day || !month || !year) return "Complete Date of Birth required";
    if (day.length !== 2 || month.length !== 2 || year.length !== 4)
      return "Enter valid DD/MM/YYYY";
    const birthDate = new Date(year, month - 1, day);
    if (isNaN(birthDate.getTime())) return "Invalid Date";

    const ageDifMs = today - birthDate;
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if ((gender === "male" && age < 21 ) || (gender === "female" && age < 20))
      return `Age must be at least ${gender === "male" ? 21 : 20}`;

     if ((gender === "male" && age > 50 ) || (gender === "female" && age > 50))
      return `Age must be at most ${gender === "male" ? 50 : 50}`;


    return "";
  };

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
    // ✅ 1. Force lowercase for email FIRST
    if (name === "email") {
      formattedValue = value.toLowerCase();
    }

    if (["dobDay", "dobMonth", "dobYear"].includes(name)) {
      formattedValue = value.replace(/\D/g, "");
    }

    if (["firstName", "middleName", "lastName"].includes(name)) {
      formattedValue = capitalizeWords(value);
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    // Real-time name validation
    if (name === "firstName" || name === "lastName") {
      if (!formattedValue.trim()) {
        setErrors((prev) => ({
          ...prev,
          [name]: `${name === "firstName" ? "First" : "Last"} Name required`
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }




    // Password real-time check
    if (name === "password") {
      setPasswordCriteria({
        length: formattedValue.length >= 6,
        upper: /[A-Z]/.test(formattedValue),
        lower: /[a-z]/.test(formattedValue),
        number: /\d/.test(formattedValue),
        special: /[@$!%*?&]/.test(formattedValue),
      });
    }

    // DOB validation
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
      }
      if (
        name === "dobYear" &&
        formData.dobDay.length === 2 &&
        formData.dobMonth.length === 2
      ) {
        dobError = validateDOB(
          formData.dobDay,
          formData.dobMonth,
          formattedValue,
          formData.gender
        );
      }
      setErrors((prev) => ({ ...prev, dobDay: dobError }));
    }

    // ✅ Email validation (works with lowercase now)
    if (name === "email") {
      const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
      if (!formattedValue)
        setErrors((prev) => ({ ...prev, email: "Email required" }));
      else if (/[A-Z]/.test(formattedValue))
        setErrors((prev) => ({
          ...prev,
          email: "Uppercase letters are not allowed",
        }));
      else if (!emailRegex.test(formattedValue))
        setErrors((prev) => ({ ...prev, email: "Invalid email format" }));
      else if (existingEmails.includes(formattedValue))
        setErrors((prev) => ({ ...prev, email: "Email already exists" }));
      else setErrors((prev) => ({ ...prev, email: "" }));
    }


    // Mobile validation
    if (name === "mobile") {
      if (!formattedValue)
        setErrors((prev) => ({ ...prev, mobile: "Mobile required" }));
      else if (
        formData.countryCode === "+91" &&
        !/^\d{10}$/.test(formattedValue)
      )
        setErrors((prev) => ({
          ...prev,
          mobile: "Enter valid 10-digit number",
        }));
      else if (!/^\d{6,15}$/.test(formattedValue))
        setErrors((prev) => ({
          ...prev,
          mobile: "Enter valid mobile number",
        }));
      else if (existingMobiles.includes(formData.countryCode + formattedValue))
        setErrors((prev) => ({ ...prev, mobile: "Mobile already exists" }));
      else setErrors((prev) => ({ ...prev, mobile: "" }));
    }
  };

  const handleProfileForChange = (value) => {
    let autoGender = "";
    if (value === "son" || value === "brother") autoGender = "male";
    if (value === "daughter" || value === "sister") autoGender = "female";

    setFormData((prev) => ({
      ...prev,
      profileFor: value,
      gender: autoGender || "",
    }));

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.profileFor; // ✅ remove red message immediately
      if (autoGender) {
        delete updated.gender;
      } else if (value === "myself" || value === "friend") {
        updated.gender = "Please select gender";
      } else {
        delete updated.gender;
      }
      return updated;
    });

    if (autoGender) {
      const dobError = validateDOB(
        formData.dobDay,
        formData.dobMonth,
        formData.dobYear,
        autoGender
      );
      setErrors((prev) => ({ ...prev, dobDay: dobError }));
    }
  };


  const handleGenderSelect = (gender) => {
    setFormData((prev) => ({ ...prev, gender }));
    setErrors((prev) => ({ ...prev, gender: "" }));
    localStorage.setItem("gender", gender);

    const dobError = validateDOB(
      formData.dobDay,
      formData.dobMonth,
      formData.dobYear,
      gender
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

  const handleUsernameToggle = (type) => {
    setFormData((prev) => {
      let updatedSelection = [];
      if (prev.useAsUsername.includes(type)) {
        // Remove if unchecked
        updatedSelection = prev.useAsUsername.filter((t) => t !== type);
      } else {
        // Select the new one (only one at a time)
        updatedSelection = [type];
      }

      // Immediately remove the error if any checkbox is selected
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
    const newErrors = {};
    const {
      profileFor,
      gender,
      firstName,
      lastName,
      dobDay,
      dobMonth,
      dobYear,
      email,
      mobile,
      password,
      confirmPassword,
      useAsUsername,
      countryCode,
    } = formData;

    if (!profileFor)
      newErrors.profileFor = "Please select Matrimony Profile For";
    if ((profileFor === "myself" || profileFor === "friend") && !gender)
      newErrors.gender = "Please select gender";
    if (!firstName.trim()) newErrors.firstName = "First Name required";
    if (!lastName.trim()) newErrors.lastName = "Last Name required";

    const dobError = validateDOB(dobDay, dobMonth, dobYear, gender);
    if (dobError) newErrors.dobDay = dobError;

    if (!useAsUsername.length)
      newErrors.useAsUsername = "Select Email or Mobile as Username";

    // Email & Mobile checks
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (useAsUsername.includes("email")) {
      if (!email) newErrors.email = "Email required";
      else if (/[A-Z]/.test(email))
        newErrors.email = "Uppercase letters are not allowed";
      else if (!emailRegex.test(email))
        newErrors.email = "Invalid email format";
      else if (existingEmails.includes(email))
        newErrors.email = "Email already exists";
    }

    if (useAsUsername.includes("mobile")) {
      if (!mobile) newErrors.mobile = "Mobile required";
      else if (countryCode === "+91" && !/^\d{10}$/.test(mobile))
        newErrors.mobile = "Enter valid 10-digit number";
      else if (!/^\d{6,15}$/.test(mobile))
        newErrors.mobile = "Enter valid mobile number";
      else if (existingMobiles.includes(countryCode + mobile))
        newErrors.mobile = "Mobile already exists";
    }

    const passRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;
    if (!passRegex.test(password || ""))
      newErrors.password =
        "Password must include uppercase, lowercase, number & special char";

    if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  setLoading(true);

  try {
    let mobile = formData.mobile.replace(/\D/g, "");
    if (mobile.startsWith("0")) mobile = mobile.slice(1);
    const phoneNumber = `${formData.countryCode}${mobile}`;

    const payload = {
      firstName: formData.firstName.trim(),
      middleName: formData.middleName?.trim() || "",
      lastName: formData.lastName.trim(),
      gender: formData.gender,
      email: formData.email.toLowerCase().trim(),
      phoneNumber,
      password: formData.password,
      dateOfBirth: `${String(formData.dobDay).padStart(2, "0")}-${String(formData.dobMonth).padStart(2, "0")}-${formData.dobYear}`,
      for_Profile: formData.profileFor,
    };
    console.log('payload', payload)
    const res = await signupUser(payload);
    console.log(res)
    if (res && res.success) {
      const [emailOtpRes, smsOtpRes] = await Promise.all([
        sendEmailOtp({ email: payload.email, type: "signup" }),
        // sendSmsOtp({
        //   countryCode: formData.countryCode,
        //   phoneNumber: mobile,
        // }),
      ]);

      if (emailOtpRes && emailOtpRes.success) {
        navigate("/verify-otp", {
          state: {
            email: payload.email,
            mobile,
            countryCode: formData.countryCode,
            name: `${payload.firstName} ${payload.lastName}`
          },
        });
      } else if (!emailOtpRes.success) {
        alert(emailOtpRes.message || "Failed to send Email OTP");
        return;
      }
      //  else if (!smsOtpRes.success) {
      //   alert(smsOtpRes.message || "Failed to send SMS OTP");
      //   return;
      // }
    } else {
      // Map backend validation errors to form fields so user sees inline messages
      try {
        if (res && res.errors) {
          const newErrors = {};
          if (Array.isArray(res.errors)) {
            res.errors.forEach((err) => {
              const field = err.param || err.field || err.key || err.path || err.location || "form";
              const message = err.msg || err.message || String(err);

              // map common backend field names to our form fields
              const mappedField = (() => {
                if (["phoneNumber", "phone", "mobile"].includes(field)) return "mobile";
                if (["for_Profile", "forProfile", "for_profile"].includes(field)) return "profileFor";
                if (["dateOfBirth", "dob", "date_of_birth"].includes(field)) return "dobDay";
                if (["firstName", "firstname"].includes(field)) return "firstName";
                if (field === "lastName" || field === "lastname") return "lastName";
                if (field === "email") return "email";
                if (field === "password") return "password";
                return field;
              })();

              newErrors[mappedField] = message;
            });
          } else if (typeof res.errors === "object") {
            Object.keys(res.errors).forEach((k) => {
              newErrors[k] = Array.isArray(res.errors[k]) ? res.errors[k].join(" ") : String(res.errors[k]);
            });
          }

          setErrors((prev) => ({ ...prev, ...newErrors }));
        } else {
          alert((res && (res.message || res.error)) || "Signup failed. Try again.");
        }
      } catch (err) {
        console.error("Error mapping signup errors:", err);
        alert(res.message || "Signup failed. Try again.");
      }
    }
  } catch (error) {
    console.error("Signup error:", error.response?.data || error.message);
    alert(error.response?.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen w-full bg-[#F9F7F5] flex justify-center items-center px-4">
      <div className="bg-[#FBFAF7] rounded-3xl shadow-2xl p-8 w-full max-w-xl hover:scale-[1.02] transition-transform duration-300">
        <Link
          to="/"
          className="text-[#D4A052] text-sm flex items-center mb-6 hover:text-[#E4C48A] transition-colors"
        >
          <ArrowLeft className="mr-1" /> Back to Home
        </Link>


        <div className="text-center mb-8">

          <h2 className="inline font-bold text-3xl text-gray-800">Create Your Profile</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile For */}
          <div className="mb-6">
            <label className="block font-semibold mb-2 text-gray-700">
              Matrimony Profile For <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {profileOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleProfileForChange(opt.value)}
                  className={`px-4 py-3 text-sm font-medium shadow-md border transition-all duration-200 
                    ${formData.profileFor === opt.value
                      ? "bg-[#EEEAE6] text-gray-800 border-[#D4A052]"
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
          {(formData.profileFor === "myself" || formData.profileFor === "friend") && (
            <div className="mt-4">
              <label className="block font-semibold mb-2 text-gray-700">
                Gender <span className="text-red-500">*</span>
              </label>

              <div className="flex flex-wrap gap-2">
                {["male", "female"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGenderSelect(g)}
                    className={`px-4 py-3 text-sm font-medium shadow-md border transition-all duration-200
            ${formData.gender === g
                        ? "bg-[#EEEAE6] text-gray-800 border-[#D4A052]" // Pre-selected style
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
            <label className="block font-semibold mb-2 text-gray-700">
              {getNameLabel()} <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name *"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-md border ${errors.firstName ? "border-red-500" : "border-[#E4C48A]"} 
    focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
                />

                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div className="flex flex-col">
                <input
                  type="text"
                  name="middleName"
                  placeholder="Middle Name"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-md border ${errors.middleName ? "border-red-500" : "border-[#E4C48A]"} 
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
                  className={`w-full p-3 rounded-md border ${errors.lastName ? "border-red-500" : "border-[#E4C48A]"} 
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
            <label className="block font-semibold mb-2 text-gray-700">
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
                className={`w-full p-3 rounded-md border ${errors.dobDay ? "border-red-500" : "border-[#E4C48A]"
                  } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />
              <input
                type="text"
                name="dobMonth"
                placeholder="MM"
                maxLength={2}
                value={formData.dobMonth}
                onChange={handleInputChange}
                className={`w-full p-3 rounded-md border ${errors.dobMonth ? "border-red-500" : "border-[#E4C48A]"
                  } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />
              <input
                type="text"
                name="dobYear"
                placeholder="YYYY"
                maxLength={4}
                value={formData.dobYear}
                onChange={handleInputChange}
                className={`w-full p-3 rounded-md border ${errors.dobYear ? "border-red-500" : "border-[#E4C48A]"
                  } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />
            </div>

            {/* ✅ Corrected Error Display */}
            {errors.dobDay && (
              <p className="text-red-500 text-sm mt-1">{errors.dobDay}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col w-full mb-6">
            <label className="block font-semibold mb-2 text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="text"  // ← use text, not email
              name="email"
              placeholder="Enter Your Email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  email: e.target.value.toLowerCase(),
                }))
              }
              className={`w-full p-3 rounded-md border ${errors.email ? "border-red-500" : "border-[#E4C48A]"
                } focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition lowercase placeholder:capitalize`}
            />



            <div className=" mt-1">
              <input
                type="checkbox"
                checked={formData.useAsUsername.includes("email")}
                onChange={() => handleUsernameToggle("email")}
                className="mr-2 accent-[#333230] w-3 h-3"
              />
              <span className="text-sm">
                Use as Username{" "}
                {formData.useAsUsername.includes("email") && (
                  <CheckCircleFill className="inline text-green-500 ml-1" />
                )}
              </span>
            </div>
            {errors.useAsUsername && (
              <p className="text-red-500 text-sm mt-1">{errors.useAsUsername}</p>
            )}
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Mobile Number */}
          <div className="flex flex-col w-full mb-6">
            <label className="text-sm font-medium mb-2">Mobile <span className="text-red-500">*</span></label>

            <div className="flex gap-3">
              {/* Country Code */}
              <div
                className={`relative w-40 rounded-lg border ${errors.mobile ? "border-red-500" : "border-[#E4C48A]"
                  } focus-within:ring-1 focus-within:ring-[#ecc988] overflow-hidden`}
              >
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleInputChange}
                  className={`appearance-none w-full p-3 pr-8 rounded shadow-sm border ${errors.mobile ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-500 text-gray-700 placeholder-gray-400`}
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    outline: "none",
                    boxShadow: "none",
                    backgroundColor: "white",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  India first
                  <option value="+91">+91 India</option>
                  {countryCodes
                    .filter((c) => c.code !== "+91")
                    .map((c) => (
                      <option key={`${c.code}-${c.country}`} value={c.code}>
                        {c.code} {c.country}
                      </option>
                    ))}

                </select>

                {/* Dropdown Arrow */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <input
                type="tel"
                name="mobile"
                placeholder="Enter Mobile Number"
                value={formData.mobile}
                onChange={handleInputChange}
                className={`w-full p-3 rounded-md border ${errors.mobile ? "border-red-500" : "border-[#E4C48A]"} 
    focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
              />

            </div>

            {/* Checkbox */}
            <label className="flex items-center mt-2 cursor-pointer text-sm select-none">
              <input
                type="checkbox"
                checked={formData.useAsUsername.includes("mobile")}
                onChange={() => handleUsernameToggle("mobile")}
                className="mr-2 accent-[#3e3d3a]  w-3 h-3"
              />
              Use as Username
              {formData.useAsUsername.includes("mobile") && (
                <CheckCircleFill className="inline text-green-500 ml-1" />
              )}
            </label>

            {/* Error Messages */}
            {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
            {errors.useAsUsername && <p className="text-red-500 text-sm mt-1">{errors.useAsUsername}</p>}
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full p-3 rounded-md border ${errors.password ? "border-red-500" : "border-[#E4C48A]"} 
    focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeSlashFill /> : <EyeFill />}
            </span>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}

            {/* Password Criteria: show only if password is invalid */}
            {formData.password && !(
              formData.password.length >= 6 &&
              /[A-Z]/.test(formData.password) &&
              /[a-z]/.test(formData.password) &&
              /[0-9]/.test(formData.password) &&
              /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
            ) && (
                <div className="mt-2 text-sm space-y-1">
                  <p className={`${formData.password.length >= 6 ? "text-green-500" : "text-gray-500"}`}>
                    • Minimum 6 characters
                  </p>
                  <p className={`${/[A-Z]/.test(formData.password) ? "text-green-500" : "text-gray-500"}`}>
                    • At least one uppercase letter
                  </p>
                  <p className={`${/[a-z]/.test(formData.password) ? "text-green-500" : "text-gray-500"}`}>
                    • At least one lowercase letter
                  </p>
                  <p className={`${/[0-9]/.test(formData.password) ? "text-green-500" : "text-gray-500"}`}>
                    • At least one number
                  </p>
                  <p className={`${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? "text-green-500" : "text-gray-500"}`}>
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
              className={`w-full p-3 rounded-md border ${errors.confirmPassword ? "border-red-500" : "border-[#E4C48A]"} 
    focus:outline-none focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] transition`}
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeSlashFill /> : <EyeFill />}
            </span>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#D4A052] hover:bg-[#E4C48A] text-white p-3 rounded-full font-semibold shadow-lg transition-colors duration-300 
    ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Creating..." : "Create Profile"}
          </button>


        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
