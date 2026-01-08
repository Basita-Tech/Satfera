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
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  }
  return "";
};
export const validateEmail = email => {
  if (!email || !email.trim()) {
    return "Email is required";
  }
  if (email.length > 254) {
    return "Email is too long";
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    if (email.includes("@") && !email.split("@")[1].includes(".")) {
      return "Email must include a domain extension (e.g., .com, .org)";
    }
    return "Invalid email format";
  }
  const commonDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"];
  const domain = email.split("@")[1]?.toLowerCase();
  const commonTypos = {
    "gmial.com": "gmail.com",
    "gmai.com": "gmail.com",
    "yahooo.com": "yahoo.com",
    "yaho.com": "yahoo.com",
    "hotmial.com": "hotmail.com",
    "outlok.com": "outlook.com"
  };
  if (commonTypos[domain]) {
    return `Did you mean ${email.split("@")[0]}@${commonTypos[domain]}?`;
  }
  return "";
};
export const validatePhone = (phone, countryCode = "") => {
  if (!phone || !phone.trim()) {
    return "Phone number is required";
  }
  const cleanPhone = phone.replace(/\D/g, "");
  if (countryCode === "+91") {
    if (cleanPhone.length !== 10) {
      return "Indian phone number must be 10 digits";
    }
    if (!/^[6-9]/.test(cleanPhone)) {
      return "Invalid Indian phone number format";
    }
  } else {
    if (cleanPhone.length < 6 || cleanPhone.length > 15) {
      return "Phone number must be between 6 and 15 digits";
    }
  }
  return "";
};
export const validateDateOfBirth = (day, month, year, gender = "") => {
  if (!day || !month || !year) {
    return "Complete Date of Birth is required";
  }
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) {
    return "Date of Birth must be in DD/MM/YYYY format";
  }
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  if (dayNum < 1 || dayNum > 31) {
    return "Day must be between 1 and 31";
  }
  if (monthNum < 1 || monthNum > 12) {
    return "Month must be between 1 and 12";
  }
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapYear = yearNum % 4 === 0 && yearNum % 100 !== 0 || yearNum % 400 === 0;
  if (isLeapYear) daysInMonth[1] = 29;
  if (dayNum > daysInMonth[monthNum - 1]) {
    return `Invalid day for the given month`;
  }
  const birthDate = new Date(yearNum, monthNum - 1, dayNum);
  if (isNaN(birthDate.getTime())) {
    return "Invalid Date of Birth";
  }
  const today = new Date();
  const ageDifMs = today - birthDate;
  const ageDate = new Date(ageDifMs);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);
  const minAge = gender === "male" ? 21 : gender === "female" ? 20 : 18;
  const maxAge = 40;
  if (age < minAge) {
    return `Age must be at least ${minAge} years`;
  }
  if (age > maxAge) {
    return `Age must not exceed ${maxAge} years`;
  }
  if (birthDate > today) {
    return "Date of Birth cannot be in the future";
  }
  return "";
};
export const validatePassword = password => {
  const errors = [];
  let strength = "weak";
  if (!password) {
    return {
      isValid: false,
      errors: ["Password is required"],
      strength: "weak"
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
  const commonWeakPasswords = ["password", "123456", "qwerty", "abc123", "monkey", "letmein"];
  if (commonWeakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push("Password is too common, please choose a stronger password");
  }
  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
};
export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) {
    return "Please confirm your password";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return "";
};
export const validateCountryCode = code => {
  if (!code || !code.trim()) {
    return "Country code is required";
  }
  if (!/^\+\d{1,4}(\s.+)?$/.test(code)) {
    return "Invalid country code format";
  }
  return "";
};
export const validateProfileFor = profileFor => {
  const validProfiles = ["myself", "son", "daughter", "brother", "sister", "friend"];
  if (!profileFor) {
    return "Please select who this profile is for";
  }
  if (!validProfiles.includes(profileFor)) {
    return "Invalid profile selection";
  }
  return "";
};
export const validateGender = gender => {
  if (!gender) {
    return "Please select a gender";
  }
  if (!["male", "female", "other"].includes(gender.toLowerCase())) {
    return "Invalid gender selection";
  }
  return "";
};
export const validateSignupForm = formData => {
  const errors = {};
  const profileForError = validateProfileFor(formData.profileFor);
  if (profileForError) errors.profileFor = profileForError;
  
  // Require gender for "myself" and "friend" profiles
  if ((formData.profileFor === "myself" || formData.profileFor === "friend") && !formData.gender) {
    errors.gender = "Please select gender";
  } else if (formData.gender) {
    const genderError = validateGender(formData.gender);
    if (genderError) errors.gender = genderError;
  }
  const firstNameError = validateName(formData.firstName, "First Name");
  if (firstNameError) errors.firstName = firstNameError;
  const lastNameError = validateName(formData.lastName, "Last Name");
  if (lastNameError) errors.lastName = lastNameError;
  if (formData.middleName) {
    const middleNameError = validateName(formData.middleName, "Middle Name");
    if (middleNameError) errors.middleName = middleNameError;
  }
  const dobError = validateDateOfBirth(formData.dobDay, formData.dobMonth, formData.dobYear, formData.gender);
  if (dobError) errors.dobDay = dobError;
  
  // Always validate email
  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;
  
  // Always validate mobile and country code
  const countryCodeError = validateCountryCode(formData.countryCode);
  if (countryCodeError) errors.mobile = countryCodeError;
  
  const phoneError = validatePhone(formData.mobile, formData.countryCode);
  if (phoneError) errors.mobile = phoneError;
  
  if (!formData.useAsUsername || formData.useAsUsername.length === 0) {
    errors.useAsUsername = "Select Email or Mobile as Username";
  }
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors.join("; ");
  }
  const confirmPasswordError = validatePasswordMatch(formData.password, formData.confirmPassword);
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
  if (!formData.termsAccepted) {
    errors.termsAccepted = "You must agree to the Terms & Conditions";
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
export const getPasswordStrength = password => {
  const validation = validatePassword(password);
  const {
    strength
  } = validation;
  const strengthMap = {
    weak: {
      percent: 33,
      color: "red"
    },
    medium: {
      percent: 66,
      color: "yellow"
    },
    strong: {
      percent: 100,
      color: "green"
    }
  };
  return {
    strength,
    ...strengthMap[strength]
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
  getPasswordStrength
};