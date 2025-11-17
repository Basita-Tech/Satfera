import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL;

// -------------------------------------------------------------
// 🔹 Helper to get Auth Headers
// -------------------------------------------------------------
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// -------------------------------------------------------------
// 🔹 AUTH APIs
// -------------------------------------------------------------

export const signupUser = async (formData) => {
  try {
    const response = await axios.post(`${API}/auth/signup`, formData);
    return response.data; // ✅ success case
  } catch (error) {
    console.error("❌ Signup Error:", error.response?.data || error.message);

    return (
      error.response?.data || {
        success: false,
        message: "Something went wrong. Please try again.",
      }
    );
  }
};

export const loginUser = async (formData) => {
  try {
    const response = await axios.post(`${API}/auth/login`, formData);
    return response.data;
  } catch (error) {
    toast.error(error.response.data.message);
  }
};

// Send OTP
export const sendEmailOtp = async (data) => {
  try {
    console.log("📧 Sending email OTP request:", {
      email: data.email,
      type: data.type,
      url: `${API}/auth/send-email-otp`,
    });

    const response = await axios.post(`${API}/auth/send-email-otp`, data);
    console.log("✅ Email OTP API Response:", response.data);

    if (!response.data) {
      throw new Error("Empty response from server");
    }

    return response.data;
  } catch (error) {
    console.error("❌ Send Email OTP Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    // Return error response so the UI can handle it
    throw error;
  }
};

export const sendSmsOtp = async (data) => {
  try {
    console.log("📱 Sending SMS OTP request:", {
      mobile: data.mobile,
      countryCode: data.countryCode,
      type: data.type,
      url: `${API}/auth/send-sms-otp`,
    });

    const response = await axios.post(`${API}/auth/send-sms-otp`, data);
    console.log("✅ SMS OTP API Response:", response.data);

    if (!response.data) {
      throw new Error("Empty response from server");
    }

    return response.data;
  } catch (error) {
    console.error("❌ Send SMS OTP Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    // Return error response so the UI can handle it
    throw error;
  }
};
export const verifyEmailOtp = async (data) => {
  try {
    const response = await axios.post(`${API}/auth/verify-email-otp`, data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Verify Email OTP Error:",
      error.response?.data || error.message
    );
    // ✅ Always return a structured object so caller doesn't crash
    return error.response?.data || { success: false, message: "Server error" };
  }
};

export const verifySmsOtp = async (data) => {
  try {
    console.log("📱 Verifying SMS OTP:", {
      mobile: data.mobile,
      type: data.type,
      url: `${API}/auth/verify-sms-otp`,
    });

    const response = await axios.post(`${API}/auth/verify-sms-otp`, data);
    console.log("✅ SMS OTP Verification Response:", response.data);

    return response.data;
  } catch (error) {
    console.error("❌ Verify SMS OTP Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    // Always return a structured object so caller doesn't crash
    return error.response?.data || { success: false, message: "Server error" };
  }
};

// Resend OTP
export const resendOtp = async (data) => {
  try {
    const response = await axios.post(`${API}/auth/resend-otp`, data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Resend OTP Error:",
      error.response?.data || error.message
    );
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await axios.post(`${API}/auth/forgot-password`, {
      email: email,
    });
    return response.data;
  } catch (error) {
    console.error(
      "❌ Forgot Password Error:",
      error.response?.data || error.message
    );
    return error.response?.data || { success: false, message: "Server error" };
  }
};

// -------------------------------------------------------------
// 🔹 USER PERSONAL DETAILS APIs
// -------------------------------------------------------------

export const saveUserPersonal = async (payload) => {
  try {
    const response = await axios.post(`${API}/user-personal/`, payload, {
      headers: getAuthHeaders(),
    });
    return response;
  } catch (error) {
    console.error(
      "❌ Save Personal Details Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const getUserPersonal = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/`, {
      headers: getAuthHeaders(),
    });
    return response;
  } catch (error) {
    console.error(
      "❌ Get Personal Details Error:",
      error.response?.data || error.message
    );
  }
};

export const updateUserPersonal = async (payload) => {
  try {
    const response = await axios.put(`${API}/user-personal/`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(
      "❌ Update Personal Details Error:",
      error.response?.data || error.message
    );
    // Re-throw so the UI knows update failed
    throw error;
  }
};

// -------------------------------------------------------------
// 🔹 USER EXPECTATIONS APIs
// -------------------------------------------------------------
export const saveUserExpectations = async (payload) => {
  try {
    const response = await axios.post(
      `${API}/user-personal/expectations`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response;
  } catch (error) {
    console.error(
      "❌ Save Expectations Error:",
      error.response?.data || error.message
    );
  }
};

export const getUserExpectations = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/expectations`, {
      headers: getAuthHeaders(),
    });
    return response;
  } catch (error) {
    console.error(
      "❌ Get User Expectations Error:",
      error.response?.data || error.message
    );
  }
};

export const updateUserExpectations = async (payload) => {
  try {
    const response = await axios.put(
      `${API}/user-personal/expectations`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Update Expectations Error:",
      error.response?.data || error.message
    );
  }
};

// -------------------------------------------------------------
// 🔹 USER HEALTH APIs
// -------------------------------------------------------------
export const getUserHealth = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/health`, {
      headers: getAuthHeaders(),
    });
    return response;
  } catch (error) {
    console.error(
      "❌ Get User Health Error:",
      error.response?.data || error.message
    );
  }
};

export const saveUserHealth = async (payload) => {
  try {
    const response = await axios.post(`${API}/user-personal/health`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(
      "❌ Save User Health Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const updateUserHealth = async (payload) => {
  try {
    const response = await axios.put(`${API}/user-personal/health`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(
      "❌ Update User Health Error:",
      error.response?.data || error.message
    );
    // Important: rethrow so frontend can handle properly
    throw error;
  }
};

// -------------------------------------------------------------
// 🔹 USER PROFESSION APIs
// -------------------------------------------------------------
export const getUserProfession = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/profession`, {
      headers: getAuthHeaders(),
    });
    return response;
  } catch (error) {
    console.error(
      "❌ Get Profession Error:",
      error.response?.data || error.message
    );
  }
};

export const saveUserProfession = async (payload) => {
  try {
    const response = await axios.post(
      `${API}/user-personal/profession`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response;
  } catch (error) {
    console.error(
      "❌ Save Profession Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const updateUserProfession = async (payload) => {
  try {
    const response = await axios.put(
      `${API}/user-personal/profession`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response;
  } catch (error) {
    console.error(
      "❌ Update Profession Error:",
      error.response?.data || error.message
    );
  }
};

// -------------------------------------------------------------
// 🔹 USER FAMILY DETAILS APIs
// -------------------------------------------------------------
export const getUserFamilyDetails = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/family/`, {
      headers: getAuthHeaders(),
    });
    return response;
  } catch (error) {
    console.error(
      "❌ Get Family Details Error:",
      error.response?.data || error.message
    );
  }
};

export const saveUserFamilyDetails = async (payload) => {
  try {
    const response = await axios.post(`${API}/user-personal/family/`, payload, {
      headers: getAuthHeaders(),
    });
    return response;
  } catch (error) {
    console.error(
      "❌ Save Family Details Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const updateUserFamilyDetails = async (payload) => {
  try {
    const response = await axios.put(`${API}/user-personal/family/`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(
      "❌ Update Family Details Error:",
      error.response?.data || error.message
    );
  }
};

// -------------------------------------------------------------
// 🔹 USER EDUCATION APIs
// -------------------------------------------------------------
export const getEducationalDetails = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/education/`, {
      headers: getAuthHeaders(),
    });
    return response;
  } catch (error) {
    console.error(
      "❌ Get Educational Details Error:",
      error.response?.data || error.message
    );
  }
};

export const saveEducationalDetails = async (payload) => {
  try {
    const response = await axios.post(
      `${API}/user-personal/education/`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response;
  } catch (error) {
    console.error(
      "❌ Save Educational Details Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const updateEducationalDetails = async (payload) => {
  try {
    const response = await axios.put(
      `${API}/user-personal/education/`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Update Educational Details Error:",
      error.response?.data || error.message
    );
  }
};

// -------------------------------------------------------------
// 🔹 USER ONBOARDING STATUS APIs
// -------------------------------------------------------------
export const getOnboardingStatus = async () => {
  try {
    const response = await axios.get(
      `${API}/user-personal/onboarding-status/`,
      {
        headers: getAuthHeaders(),
      }
    );
    return response;
  } catch (error) {
    console.error(
      "❌ Get Onboarding Status Error:",
      error.response?.data || error.message
    );
  }
};

export const updateOnboardingStatus = async (payload) => {
  try {
    const response = await axios.put(
      `${API}/user-personal/onboarding-status/`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Update Onboarding Status Error:",
      error.response?.data || error.message
    );
  }
};

// 📤 Upload normal photo (compulsory1, compulsory2, optional1, etc.)
export const uploadUserPhoto = async (payload) => {
  try {
    const response = await axios.post(
      `${API}/user-personal/upload/photos`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Upload User Photo Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// 📤 Upload Government ID photo
export const uploadGovernmentId = async (payload) => {
  try {
    const response = await axios.post(
      `${API}/user-personal/upload/government-id`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Upload Government ID Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// 📥 Get all uploaded photos
export const getUserPhotos = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/upload/photos`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get User Photos Error:",
      error.response?.data || error.message
    );
  }
};

// 📥 Get government ID
export const getGovernmentId = async () => {
  try {
    const response = await axios.get(
      `${API}/user-personal/upload/government-id`,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get Government ID Error:",
      error.response?.data || error.message
    );
  }
};

// 📋 Get Profile Review Status
export const getProfileReviewStatus = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/review/status`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get Profile Review Status Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// 📤 Submit Profile for Review
export const submitProfileForReview = async () => {
  try {
    const response = await axios.post(
      `${API}/user-personal/review/submit`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Submit Profile for Review Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// ✅ Approve Profile (Admin)
export const approveProfile = async (userId) => {
  try {
    const response = await axios.post(
      `${API}/user-personal/review/approve`,
      { userId },
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Approve Profile Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// ❌ Reject Profile (Admin)
export const rejectProfile = async (userId, reason) => {
  try {
    const response = await axios.post(
      `${API}/user-personal/review/reject`,
      { userId, reason },
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Reject Profile Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};
