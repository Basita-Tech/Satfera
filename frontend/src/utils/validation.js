/**
 * Form Validation Utilities
 * Comprehensive validation for all form fields with detailed error messages
 */

/**
 * Validate name field
 * @param {string} name - The name to validate
 * @param {string} fieldName - The field name for error message (e.g., "First Name")
 * @returns {string} - Error message or empty string if valid
 */
export const validateName = (name, fieldName = "Name") => {
  if (!name || !name.trim()) {
    return `${fieldName} is required`;
  }
  
  if (name.length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }
  
  if (name.length > 100) {
    return `${fieldName} must not exceed 100 characters`;
  }
  
  // Only letters, spaces, hyphens, apostrophes allowed
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  }
  
  return "";
};

/**
 * Validate email address
 * @param {string} email - The email to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return "Email is required";
  }
  
  if (email.length > 254) {
    return "Email is too long";
  }
  
  // RFC 5321/5322 compliant email regex with required TLD (domain extension)
  // Must have format: localpart@domain.tld
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    // Check if it's missing the domain extension
    if (email.includes("@") && !email.split("@")[1].includes(".")) {
      return "Email must include a domain extension (e.g., .com, .org)";
    }
    return "Invalid email format";
  }
  
  // Check for common typos in popular domains
  const commonDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
  ];
  
  const domain = email.split("@")[1]?.toLowerCase();
  const commonTypos = {
    "gmial.com": "gmail.com",
    "gmai.com": "gmail.com",
    "yahooo.com": "yahoo.com",
    "yaho.com": "yahoo.com",
    "hotmial.com": "hotmail.com",
    "outlok.com": "outlook.com",
  };
  
  if (commonTypos[domain]) {
    return `Did you mean ${email.split("@")[0]}@${commonTypos[domain]}?`;
  }
  
  return "";
};

/**
 * Validate phone number
 * @param {string} phone - The phone number to validate
 * @param {string} countryCode - The country code (e.g., "+91")
 * @returns {string} - Error message or empty string if valid
 */
export const validatePhone = (phone, countryCode = "") => {
  if (!phone || !phone.trim()) {
    return "Phone number is required";
  }
  
  const cleanPhone = phone.replace(/\D/g, "");
  
  if (countryCode === "+91") {
    // Indian phone validation
    if (cleanPhone.length !== 10) {
      return "Indian phone number must be 10 digits";
    }
    
    // Indian mobile starts with 6-9
    if (!/^[6-9]/.test(cleanPhone)) {
      return "Invalid Indian phone number format";
    }
  } else {
    // Generic phone validation (6-15 digits)
    if (cleanPhone.length < 6 || cleanPhone.length > 15) {
      return "Phone number must be between 6 and 15 digits";
    }
  }
  
  return "";
};

/**
 * Validate date of birth
 * @param {string} day - Day (DD)
 * @param {string} month - Month (MM)
 * @param {string} year - Year (YYYY)
 * @param {string} gender - Gender (male/female)
 * @returns {string} - Error message or empty string if valid
 */
export const validateDateOfBirth = (day, month, year, gender = "") => {
  if (!day || !month || !year) {
    return "Complete Date of Birth is required";
  }
  
  // Validate format
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) {
    return "Date of Birth must be in DD/MM/YYYY format";
  }
  
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  // Validate day
  if (dayNum < 1 || dayNum > 31) {
    return "Day must be between 1 and 31";
  }
  
  // Validate month
  if (monthNum < 1 || monthNum > 12) {
    return "Month must be between 1 and 12";
  }
  
  // Validate day for specific months
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Check for leap year
  const isLeapYear =
    (yearNum % 4 === 0 && yearNum % 100 !== 0) || yearNum % 400 === 0;
  if (isLeapYear) daysInMonth[1] = 29;
  
  if (dayNum > daysInMonth[monthNum - 1]) {
    return `Invalid day for the given month`;
  }
  
  // Create date object
  const birthDate = new Date(yearNum, monthNum - 1, dayNum);
  
  // Validate date object
  if (isNaN(birthDate.getTime())) {
    return "Invalid Date of Birth";
  }
  
  // Calculate age
  const today = new Date();
  const ageDifMs = today - birthDate;
  const ageDate = new Date(ageDifMs);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);
  
  // Age restrictions
  const minAge = gender === "male" ? 21 : gender === "female" ? 20 : 18;
  const maxAge = 40;
  
  if (age < minAge) {
    return `Age must be at least ${minAge} years`;
  }
  
  if (age > maxAge) {
    return `Age must not exceed ${maxAge} years`;
  }
  
  // Check if date is in the future
  if (birthDate > today) {
    return "Date of Birth cannot be in the future";
  }
  
  return "";
};

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {object} - { isValid: boolean, errors: string[], strength: string }
 */
export const validatePassword = (password) => {
  const errors = [];
  let strength = "weak";
  
  if (!password) {
    return {
      isValid: false,
      errors: ["Password is required"],
      strength: "weak",
    };
  }
  
  if (password.length < 6) {
    errors.push("Minimum 6 characters required");
  }
  
  if (password.length < 8) {
    strength = "weak";
  } else if (password.length >= 8 && password.length < 12) {
    strength = "medium";
  } else {
    strength = "strong";
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter required");
  } else {
    strength = strength === "weak" ? "weak" : "medium";
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter required");
  }
  
  if (!/\d/.test(password)) {
    errors.push("At least one number required");
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push("At least one special character (@$!%*?&) required");
  } else if (strength === "medium") {
    strength = "strong";
  }
  
  // Check for common weak passwords
  const commonWeakPasswords = [
    "password",
    "123456",
    "qwerty",
    "abc123",
    "monkey",
    "letmein",
  ];
  
  if (commonWeakPasswords.some((weak) =>
    password.toLowerCase().includes(weak)
  )) {
    errors.push("Password is too common, please choose a stronger password");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
};

/**
 * Validate password match
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirm password
 * @returns {string} - Error message or empty string if valid
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) {
    return "Please confirm your password";
  }
  
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  
  return "";
};

/**
 * Validate country code
 * @param {string} code - The country code (e.g., "+91" or "+91 India")
 * @returns {string} - Error message or empty string if valid
 */
export const validateCountryCode = (code) => {
  if (!code || !code.trim()) {
    return "Country code is required";
  }
  
  // Validation for country code format - supports both "+91" and "+91 India" formats
  if (!/^\+\d{1,4}(\s.+)?$/.test(code)) {
    return "Invalid country code format";
  }
  
  return "";
};

/**
 * Validate profile selection
 * @param {string} profileFor - Selected profile type
 * @returns {string} - Error message or empty string if valid
 */
export const validateProfileFor = (profileFor) => {
  const validProfiles = [
    "myself",
    "son",
    "daughter",
    "brother",
    "sister",
    "friend",
  ];
  
  if (!profileFor) {
    return "Please select who this profile is for";
  }
  
  if (!validProfiles.includes(profileFor)) {
    return "Invalid profile selection";
  }
  
  return "";
};

/**
 * Validate gender selection
 * @param {string} gender - Selected gender
 * @returns {string} - Error message or empty string if valid
 */
export const validateGender = (gender) => {
  if (!gender) {
    return "Please select a gender";
  }
  
  if (!["male", "female", "other"].includes(gender.toLowerCase())) {
    return "Invalid gender selection";
  }
  
  return "";
};

/**
 * Validate entire signup form
 * @param {object} formData - Form data object
 * @returns {object} - { isValid: boolean, errors: object }
 */
export const validateSignupForm = (formData) => {
  const errors = {};
  
  // Profile For validation
  const profileForError = validateProfileFor(formData.profileFor);
  if (profileForError) errors.profileFor = profileForError;
  
  // Gender validation (required for myself and friend)
  if (
    (formData.profileFor === "myself" || formData.profileFor === "friend") &&
    !formData.gender
  ) {
    errors.gender = "Please select a gender";
  } else if (formData.gender) {
    const genderError = validateGender(formData.gender);
    if (genderError) errors.gender = genderError;
  }
  
  // Names validation
  const firstNameError = validateName(formData.firstName, "First Name");
  if (firstNameError) errors.firstName = firstNameError;
  
  const lastNameError = validateName(formData.lastName, "Last Name");
  if (lastNameError) errors.lastName = lastNameError;
  
  // Optional middle name
  if (formData.middleName) {
    const middleNameError = validateName(formData.middleName, "Middle Name");
    if (middleNameError) errors.middleName = middleNameError;
  }
  
  // DOB validation
  const dobError = validateDateOfBirth(
    formData.dobDay,
    formData.dobMonth,
    formData.dobYear,
    formData.gender
  );
  if (dobError) errors.dobDay = dobError;
  
  // Email validation (if selected as username)
  if (formData.useAsUsername?.includes("email")) {
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
  } else if (formData.email) {
    // If email field has value, validate it
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
  }
  
  // Phone validation (if selected as username)
  if (formData.useAsUsername?.includes("mobile")) {
    const countryCodeError = validateCountryCode(formData.countryCode);
    if (countryCodeError) errors.mobile = countryCodeError;
    
    const phoneError = validatePhone(formData.mobile, formData.countryCode);
    if (phoneError) errors.mobile = phoneError;
  } else if (formData.mobile) {
    // If mobile field has value, validate it
    const phoneError = validatePhone(formData.mobile, formData.countryCode);
    if (phoneError) errors.mobile = phoneError;
  }
  
  // Username selection validation
  if (
    !formData.useAsUsername ||
    formData.useAsUsername.length === 0
  ) {
    errors.useAsUsername = "Select Email or Mobile as Username";
  }
  
  // Password validation
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors.join("; ");
  }
  
  // Confirm password validation
  const confirmPasswordError = validatePasswordMatch(
    formData.password,
    formData.confirmPassword
  );
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
  
  // Terms acceptance
  if (!formData.termsAccepted) {
    errors.termsAccepted = "You must agree to the Terms & Conditions";
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Get password strength indicator
 * @param {string} password - The password to check
 * @returns {object} - { strength: string, percent: number, color: string }
 */
export const getPasswordStrength = (password) => {
  const validation = validatePassword(password);
  const { strength } = validation;
  
  const strengthMap = {
    weak: { percent: 33, color: "red" },
    medium: { percent: 66, color: "yellow" },
    strong: { percent: 100, color: "green" },
  };
  
  return {
    strength,
    ...strengthMap[strength],
  };
};

export default {
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
};
