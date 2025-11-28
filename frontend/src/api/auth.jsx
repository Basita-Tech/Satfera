import axios from "./http";
import toast from "react-hot-toast";
import { cachedFetch, dataCache } from "../utils/cache";
import { dedupeRequest } from "../utils/optimize";
import { clearClientAuthData, updateActivity } from "../utils/secureStorage";
import { getCSRFToken } from "../utils/csrfProtection";

const API = import.meta.env.VITE_API_URL;

// ✅ Configure axios defaults for HTTP-only cookie security
axios.defaults.withCredentials = true; // CRITICAL: Send cookies with every request

// Create global axios interceptors with enhanced security
axios.interceptors.request.use(
  (config) => {
    try {
      config.headers = config.headers || {};

      // Set default Content-Type if not already set
      if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }

      // Add CSRF token for state-changing requests (NOT for GET requests)
      if (
        ["post", "put", "patch", "delete"].includes(
          config.method?.toLowerCase()
        )
      ) {
        const csrfToken = getCSRFToken();
        console.log(
          "🌐 [auth] Adding CSRF token to request headers",
          csrfToken
        );
        if (csrfToken) {
          config.headers["X-CSRF-Token"] = csrfToken;
        }
      }

      // Update activity timestamp on each request
      updateActivity();

      // Do NOT set Authorization header from frontend storage. Authentication
      // is handled via httpOnly cookie sent automatically by the browser.
    } catch (e) {
      console.error("Error in request interceptor:", e);
    }
    return config;
  },
  (err) => Promise.reject(err)
);

axios.interceptors.response.use(
  (res) => res,
  (error) => {
    try {
      if (error?.response?.status === 401) {
        console.warn(
          "🌐 [auth] Global 401 response detected:",
          error.response?.data || error.message
        );
        // Clear auth token securely and redirect to login
        clearClientAuthData();

        // Redirect to login if not already there
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    } catch (e) {
      console.error("Error in response interceptor:", e);
    }
    return Promise.reject(error);
  }
);

// -------------------------------------------------------------
// 🔹 Helper to get Auth Headers
// NOTE: With HTTP-only cookies, Authorization header is NOT needed
// The token is automatically sent via secure cookie
// -------------------------------------------------------------
const getAuthHeaders = () => {
  const headers = {};

  // Add CSRF token for state-changing requests
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return headers;
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
    return response.data; // Always return data (may have success:false with redirectTo)
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data || {};

    // Distinguish credential vs other errors
    if (status === 401) {
      toast.error("Invalid credentials. Please try again.");
      return { success: false, message: "Invalid credentials" };
    }

    if (status === 403) {
      toast.error(data.message || "Verification required.");
      return {
        success: false,
        message: data.message || "Verification required",
      };
    }

    toast.error(data.message || "Login failed. Please retry.");
    return { success: false, message: data.message || "Login failed" };
  }
};

export const logoutUser = async () => {
  try {
    const response = await axios.post(`${API}/auth/logout`);
    return response.data;
  } catch (error) {
    console.error("❌ Logout Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Logout failed",
    };
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

// 📥 Get User Profile Details
export const getUserProfileDetails = async (useCache = true) => {
  const cacheKey = "user_profile";

  if (useCache) {
    return cachedFetch(
      cacheKey,
      async () => {
        try {
          const response = await axios.get(`${API}/user/profile`, {
            headers: getAuthHeaders(),
          });
          return response.data;
        } catch (error) {
          console.error(
            "❌ Get User Profile Error:",
            error.response?.data || error.message
          );
          return null;
        }
      },
      60000
    ); // Cache for 60 seconds
  }

  try {
    const response = await axios.get(`${API}/user/profile`, {
      headers: getAuthHeaders(),
    });
    dataCache.set(cacheKey, response.data, 60000);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get User Profile Error:",
      error.response?.data || error.message
    );
    return null;
  }
};

// 📧 Get User Contact Information (Email & Phone)
// Success response: { success: true, data: { email, phoneNumber } }
export const getUserContactInfo = async () => {
  try {
    console.log("📧 Fetching user contact information...");
    const response = await axios.get(`${API}/user/contact-info`, {
      headers: getAuthHeaders(),
    });
    console.log("✅ Get Contact Info Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get Contact Info Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: null,
      message:
        error.response?.data?.message || "Failed to fetch contact information",
    };
  }
};

// -------------------------------------------------------------
// 🔹 EMAIL CHANGE APIs
// -------------------------------------------------------------

// 📧 Request Email Change (Send OTP to new email)
// Success response: { success: true, message: "OTP sent to new email address. Valid for 5 minutes." }
export const requestEmailChange = async (newEmail) => {
  try {
    console.log("📧 Requesting email change to:", newEmail);
    const response = await axios.post(
      `${API}/user/email/request-change`,
      { newEmail },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Request Email Change Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Request Email Change Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to send OTP. Please try again.",
    };
  }
};

// ✅ Verify Email Change OTP and Update Email
// Success response: { success: true, message: "Email changed successfully" }
export const verifyEmailChange = async (newEmail, otp) => {
  try {
    console.log("✅ Verifying email change with OTP...");
    const response = await axios.post(
      `${API}/user/email/verify-change`,
      { newEmail, otp },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Verify Email Change Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Verify Email Change Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to verify OTP. Please try again.",
    };
  }
};

// -------------------------------------------------------------
// 🔹 PHONE CHANGE APIs
// -------------------------------------------------------------

// 📱 Request Phone Number Change
// Success response: { success: true, message: "Please verify your new phone number using the SMS verification endpoint" }
export const requestPhoneChange = async (newPhoneNumber) => {
  try {
    console.log("📱 Requesting phone change to:", newPhoneNumber);
    const response = await axios.post(
      `${API}/user/phone/request-change`,
      { newPhoneNumber },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Request Phone Change Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Request Phone Change Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to initiate phone change. Please try again.",
    };
  }
};

// ✅ Verify Phone Change (After SMS OTP verification via Twilio)
// Success response: { success: true, message: "Phone number changed successfully" }
export const verifyPhoneChange = async (newPhoneNumber) => {
  try {
    console.log("✅ Completing phone number change...");
    const response = await axios.post(
      `${API}/user/phone/verify-change`,
      { newPhoneNumber },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Verify Phone Change Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Verify Phone Change Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to complete phone change. Please try again.",
    };
  }
};

// 🔍 Search Profiles by Name or ID
export const searchProfiles = async (query) => {
  try {
    console.log("🔍 Searching profiles for:", query);
    console.log("🔍 API URL:", `${API}/user/search`);
    const response = await axios.get(`${API}/user/search`, {
      headers: getAuthHeaders(),
      params: { name: query, limit: 10 },
    });
    console.log("✅ Search Results - Full Response:", response);
    console.log("✅ Search Results - Data:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Search Profiles Error:", error);
    console.error("❌ Error Response:", error.response?.data);
    console.error("❌ Error Status:", error.response?.status);
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to search profiles",
    };
  }
};

// 📥 Get User Matched Profiles
export const getMatches = async ({
  useCache = true,
  page = 1,
  limit = 20,
} = {}) => {
  const cacheKey = `user_matches_${page}_${limit}`;

  if (useCache) {
    return cachedFetch(
      cacheKey,
      async () => {
        try {
          const response = await axios.get(`${API}/matches`, {
            headers: getAuthHeaders(),
            params: { page, limit },
          });
          console.log("✅ Matches API Response:", response.data);
          return response.data;
        } catch (error) {
          console.error(
            "❌ Get User Matches Error:",
            error.response?.data || error.message
          );
          return {
            success: false,
            data: [],
            message: error.response?.data?.message || "Failed to fetch matches",
          };
        }
      },
      45000
    ); // Cache for 45 seconds
  }

  try {
    const response = await axios.get(`${API}/matches`, {
      headers: getAuthHeaders(),
      params: { page, limit },
    });
    console.log("✅ Matches API Response:", response.data);
    dataCache.set(cacheKey, response.data, 45000);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get User Matches Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch matches",
    };
  }
};

// 📥 Get User view Profiles details
export const getViewProfiles = async (id, options = {}) => {
  const cacheKey = `profile_${id}`;
  const requestKey = `profile_request_${id}`;
  const useCache = options?.useCache !== false;

  if (useCache) {
    const cached = dataCache.get(cacheKey);
    if (cached) {
      console.log("✅ [getViewProfiles] Using cached data for ID:", id);
      return cached;
    }
  }

  // Deduplicate concurrent requests for the same profile
  return dedupeRequest(requestKey, async () => {
    try {
      console.log("🔍 [getViewProfiles] Fetching profile for ID:", id);
      console.log("🔍 [getViewProfiles] Request URL:", `${API}/profile/${id}`);

      const config = {
        headers: getAuthHeaders(),
      };

      // Support passing fetch AbortController signal for canceling the request
      if (options?.signal) {
        config.signal = options.signal;
      }

      const response = await axios.get(`${API}/profile/${id}`, config);

      console.log("✅ [getViewProfiles] Raw API Response:", response);
      console.log("✅ [getViewProfiles] Response Data:", response.data);
      console.log("✅ [getViewProfiles] Response Data Structure:", {
        success: response.data?.success,
        hasData: !!response.data?.data,
        dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
        message: response.data?.message,
      });

      // Cache the successful response
      if (response.data?.success) {
        dataCache.set(cacheKey, response.data, 120000); // Cache for 2 minutes
      }

      return response.data;
    } catch (error) {
      // If request was canceled (component unmounted), don't treat as an error
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        console.info("ℹ️ [getViewProfiles] Request canceled by caller");
        return { success: false, data: null, message: "Request canceled" };
      }

      console.error(
        "❌ Get User view  profile details Error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        data: [],
        message:
          error.response?.data?.message ||
          "Failed to fetch user view profile details",
      };
    }
  });
};

// -------------------------------------------------------------
// 🔹 NOTIFICATION APIs
// -------------------------------------------------------------

// 📥 Get All Notifications with pagination
export const getNotifications = async (
  page = 1,
  limit = 20,
  useCache = true
) => {
  const cacheKey = `notifications_${page}_${limit}`;

  if (useCache) {
    return cachedFetch(
      cacheKey,
      async () => {
        try {
          const response = await axios.get(`${API}/user/notifications`, {
            headers: getAuthHeaders(),
            params: { page, limit },
          });
          console.log("✅ Notifications API Response:", response.data);
          return response.data;
        } catch (error) {
          console.error(
            "❌ Get Notifications Error:",
            error.response?.data || error.message
          );
          return {
            success: false,
            data: [],
            pagination: { page: 1, limit: 20, total: 0, hasMore: false },
            message:
              error.response?.data?.message || "Failed to fetch notifications",
          };
        }
      },
      20000
    ); // Cache for 20 seconds
  }

  try {
    const response = await axios.get(`${API}/user/notifications`, {
      headers: getAuthHeaders(),
      params: { page, limit },
    });
    console.log("✅ Notifications API Response:", response.data);
    dataCache.set(cacheKey, response.data, 20000);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get Notifications Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, hasMore: false },
      message: error.response?.data?.message || "Failed to fetch notifications",
    };
  }
};

// 📥 Get Unread Notifications Count
export const getUnreadNotificationsCount = async () => {
  try {
    const response = await axios.get(`${API}/user/notifications/count`, {
      headers: getAuthHeaders(),
    });
    console.log("✅ Unread Count API Response:", response.data);
    // Backend returns: { success: true, data: { unreadCount: number } }
    return {
      success: response.data.success,
      count: response.data.data?.unreadCount || 0,
    };
  } catch (error) {
    console.error(
      "❌ Get Unread Count Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      count: 0,
      message: error.response?.data?.message || "Failed to fetch unread count",
    };
  }
};

// -------------------------------------------------------------
// 🔹 SESSIONS/APPS & DEVICES APIs
// -------------------------------------------------------------
export const getSessions = async () => {
  try {
    const response = await axios.get(`${API}/sessions`, {
      headers: getAuthHeaders(),
    });
    console.log("✅ Sessions API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Get Sessions Error:", error.response?.data || error.message);
    return {
      success: false,
      data: { sessions: [], total: 0 },
      message: error.response?.data?.message || "Failed to fetch sessions",
    };
  }
};

export const logoutSession = async (sessionId) => {
  try {
    if (!sessionId) {
      return { success: false, message: "Session ID is required" };
    }
    const response = await axios.delete(`${API}/sessions/${sessionId}`, {
      headers: getAuthHeaders(),
    });
    console.log("✅ Logout Session Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Logout Session Error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || "Failed to logout session" };
  }
};

export const logoutAllSessions = async () => {
  try {
    const response = await axios.post(`${API}/sessions/logout-all`, {}, {
      headers: getAuthHeaders(),
    });
    console.log("✅ Logout All Sessions Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Logout All Sessions Error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || "Failed to logout all sessions" };
  }
};

// 📝 Mark a Notification as Read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await axios.patch(
      `${API}/user/notifications/${notificationId}/read`,
      {},
      { headers: getAuthHeaders() }
    );
    console.log("✅ Mark as Read Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Mark as Read Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message: error.response?.data?.message || "Failed to mark as read",
    };
  }
};

// 📝 Mark All Notifications as Read
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await axios.patch(
      `${API}/user/notifications/mark-all-read`,
      {},
      { headers: getAuthHeaders() }
    );
    console.log("✅ Mark All as Read Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Mark All as Read Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message: error.response?.data?.message || "Failed to mark all as read",
    };
  }
};

// -------------------------------------------------------------
// 🔹 NOTIFICATION SETTINGS APIs
// -------------------------------------------------------------

// 📥 Get User Notification Settings
// Success response: { success: true, data: { emailNotifications, pushNotifications, smsNotifications } }
export const getNotificationSettings = async () => {
  try {
    console.log("📥 Fetching notification settings...");
    const response = await axios.get(`${API}/user/notification-settings`, {
      headers: getAuthHeaders(),
    });
    console.log("✅ Get Notification Settings Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get Notification Settings Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: null,
      message:
        error.response?.data?.message ||
        "Failed to fetch notification settings",
    };
  }
};

// 📝 Update User Notification Settings
// Accepts partial updates: { emailNotifications?: boolean, pushNotifications?: boolean, smsNotifications?: boolean }
export const updateNotificationSettings = async (settings) => {
  try {
    console.log("📝 Updating notification settings:", settings);
    const response = await axios.patch(
      `${API}/user/notification-settings`,
      settings,
      { headers: getAuthHeaders() }
    );
    console.log("✅ Update Notification Settings Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Update Notification Settings Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to update notification settings",
    };
  }
};

// -------------------------------------------------------------
// 🔹 FAVORITES/SHORTLIST APIs
// -------------------------------------------------------------

// ⭐ Add Profile to Favorites
export const addToFavorites = async (profileId) => {
  try {
    const idStr = String(profileId);
    console.log("⭐ Adding to favorites:", idStr);
    console.log("⭐ Request body:", { profileId: idStr });

    const response = await axios.post(
      `${API}/requests/favorites/add`,
      { profileId: idStr },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Add to Favorites Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Add to Favorites Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message: error.response?.data?.message || "Failed to add to favorites",
    };
  }
};

// ⭐ Remove Profile from Favorites
export const removeFromFavorites = async (profileId) => {
  try {
    const idStr = String(profileId);
    console.log("🗑️ Removing from favorites:", idStr);
    console.log("🗑️ Request body:", { profileId: idStr });

    const response = await axios.post(
      `${API}/requests/favorites/remove`,
      { profileId: idStr },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Remove from Favorites Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Remove from Favorites Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to remove from favorites",
    };
  }
};

// 📥 Get All Favorites
export const getFavorites = async () => {
  try {
    console.log("📥 Fetching favorites...");
    const response = await axios.get(`${API}/requests/favorites`, {
      headers: getAuthHeaders(),
    });
    console.log("✅ Get Favorites Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get Favorites Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch favorites",
    };
  }
};

// 📥 Get All Favorites
export const getAllProfiles = async (page = 1, limit = 10) => {
  try {
    console.log("📥 Fetching profiles...", { page, limit });
    const response = await axios.get(
      `${API}/profiles?page=${page}&limit=${limit}`,
      {
        headers: getAuthHeaders(),
      }
    );
    console.log("✅ Get All Profile Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get All Profiles Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: [],
      pagination: { page, limit, total: 0, hasMore: false },
      message: error.response?.data?.message || "Failed to fetch profiles",
    };
  }
};

// -------------------------------------------------------------
// 🔹 CONNECTION REQUEST APIs
// -------------------------------------------------------------

// 📤 Send Connection Request
export const sendConnectionRequest = async (receiverId) => {
  try {
    const idStr = String(receiverId);
    console.log("📤 Sending connection request to:", idStr);

    const response = await axios.post(
      `${API}/requests/send`,
      { receiverId: idStr },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Send Request Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Send Request Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to send connection request",
    };
  }
};

// 📥 Get Sent Connection Requests
export const getSentRequests = async () => {
  try {
    console.log("📥 Fetching sent connection requests...");
    const response = await axios.get(`${API}/requests/all`, {
      headers: getAuthHeaders(),
    });
    console.log("✅ Get Sent Requests Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get Sent Requests Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch sent requests",
    };
  }
};

// 📥 Get Received Connection Requests
export const getReceivedRequests = async () => {
  try {
    console.log("📥 Fetching received connection requests...");
    const response = await axios.get(`${API}/requests/all/received`, {
      headers: getAuthHeaders(),
    });
    console.log("✅ Get Received Requests Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get Received Requests Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: [],
      message:
        error.response?.data?.message || "Failed to fetch received requests",
    };
  }
};

// ✅ Accept Connection Request
export const acceptConnectionRequest = async (requestId) => {
  try {
    const idStr = String(requestId);
    console.log("✅ Accepting connection request:", idStr);

    const response = await axios.post(
      `${API}/requests/accept`,
      { requestId: idStr },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Accept Request Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Accept Request Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to accept connection request",
    };
  }
};

// ❌ Reject Connection Request
export const rejectConnectionRequest = async (requestId) => {
  try {
    const idStr = String(requestId);
    console.log("❌ Rejecting connection request:", idStr);

    const response = await axios.post(
      `${API}/requests/reject`,
      { requestId: idStr },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Reject Request Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Reject Request Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to reject connection request",
    };
  }
};

// 🗑️ Withdraw Connection Request
export const withdrawConnectionRequest = async (connectionId) => {
  try {
    const idStr = String(connectionId);
    console.log("🗑️ Withdrawing connection request:", idStr);

    const response = await axios.post(
      `${API}/requests/withdraw`,
      { connectionId: idStr },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Withdraw Request Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Withdraw Request Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to withdraw connection request",
    };
  }
};

// 📥 Get Approved/Accepted Connections
export const getApprovedConnections = async (page = 1, limit = 20) => {
  try {
    console.log("📥 Fetching approved connections...");
    const response = await axios.get(
      `${API}/requests/approve?page=${page}&limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    console.log("✅ Get Approved Connections Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get Approved Connections Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: [],
      message:
        error.response?.data?.message || "Failed to fetch approved connections",
    };
  }
};

// -------------------------------------------------------------
// 🔹 COMPARE APIs
// Backend endpoints expected:
// GET  /user/compare  -> returns { success: true, data: [ { userId:..., ... }, ... ] }
// POST /user/compare  -> body: { profilesIds: ["..."] }
// DELETE /user/compare -> body: { profilesIds: ["..."] }
// -------------------------------------------------------------
export const getCompare = async () => {
  try {
    console.log("📥 Fetching compare list from server");
    const response = await axios.get(`${API}/user/compare`, {
      headers: getAuthHeaders(),
    });
    console.log("✅ getCompare response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ getCompare error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch compare list",
    };
  }
};

export const addToCompare = async (profileIdOrIds) => {
  try {
    const ids = Array.isArray(profileIdOrIds)
      ? profileIdOrIds.map(String)
      : [String(profileIdOrIds)];
    console.log("📤 Adding to compare:", ids);
    const response = await axios.post(
      `${API}/user/compare`,
      { profilesIds: ids },
      { headers: getAuthHeaders() }
    );
    console.log("✅ addToCompare response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ addToCompare error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message: error.response?.data?.message || "Failed to add to compare",
    };
  }
};

export const removeFromCompare = async (profileIdOrIds) => {
  try {
    const ids = Array.isArray(profileIdOrIds)
      ? profileIdOrIds.map(String)
      : [String(profileIdOrIds)];
    console.log("🗑️ Removing from compare:", ids);
    // axios.delete supports sending a request body via the config.data property
    const response = await axios.delete(`${API}/user/compare`, {
      headers: getAuthHeaders(),
      data: { profilesIds: ids },
    });
    console.log("✅ removeFromCompare response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ removeFromCompare error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message: error.response?.data?.message || "Failed to remove from compare",
    };
  }
};

// -------------------------------------------------------------
// 🔹 Change Password
// -------------------------------------------------------------
export const changePassword = async (
  oldPassword,
  newPassword,
  confirmPassword
) => {
  try {
    console.log("🔐 Changing password...");
    const response = await axios.post(
      `${API}/user/change-password`,
      { oldPassword, newPassword, confirmPassword },
      { headers: getAuthHeaders() }
    );
    console.log("✅ changePassword response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ changePassword error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// -------------------------------------------------------------
// 🔹 BLOCKED USERS APIs
// -------------------------------------------------------------

// 🚫 Block a user by customId
// Success response (backend): { success: true, data: { blocked: { name, customId } }, message: "User blocked successfully" }
// Possible error messages include:
// - "You can change block status for this profile after 24 hours" (cooldown / 429)
// - "User is already in your blocked list" (400)
// - "You cannot block your own profile" (400)
// - Generic: "Failed to block user"
export const blockUserProfile = async (customId) => {
  try {
    if (!customId || typeof customId !== "string") {
      return { success: false, message: "Invalid customId provided" };
    }
    console.log("🚫 Blocking user:", customId);
    const response = await axios.post(
      `${API}/user/block`,
      { customId },
      { headers: getAuthHeaders() }
    );
    console.log("✅ blockUserProfile response:", response.data);
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const rawMsg = error?.response?.data?.message || error.message;
    let message = rawMsg;
    if (status === 429 || /24 hours/i.test(rawMsg)) {
      message = "You can change block status for this profile after 24 hours";
    } else if (/already/i.test(rawMsg)) {
      message = "User is already in your blocked list";
    } else if (/cannot block yourself/i.test(rawMsg)) {
      message = "You cannot block your own profile";
    }
    console.error("❌ blockUserProfile error:", rawMsg);
    return { success: false, message };
  }
};

// ♻️ Unblock a user by customId
// Success response (backend): { success: true, data: { unblocked: { customId } }, message: "User unblocked successfully" }
// Possible error messages include:
// - "You can change block status for this profile after 24 hours" (cooldown / 429)
// - "User is not in your blocked list" (400)
export const unblockUserProfile = async (customId) => {
  try {
    if (!customId || typeof customId !== "string") {
      return { success: false, message: "Invalid customId provided" };
    }
    console.log("♻️ Unblocking user:", customId);
    const response = await axios.post(
      `${API}/user/unblock`,
      { customId },
      { headers: getAuthHeaders() }
    );
    console.log("✅ unblockUserProfile response:", response.data);
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const rawMsg = error?.response?.data?.message || error.message;
    let message = rawMsg;
    if (status === 429 || /24 hours/i.test(rawMsg)) {
      message = "You can change block status for this profile after 24 hours";
    } else if (
      /not in your blocked list/i.test(rawMsg) ||
      /NotBlocked/i.test(rawMsg)
    ) {
      message = "User is not in your blocked list";
    }
    console.error("❌ unblockUserProfile error:", rawMsg);
    return { success: false, message };
  }
};

// 📋 Get list of blocked users
// Success response (backend): { success: true, data: [ { name, customId }, ... ] }
export const getBlockedUsers = async (useCache = true) => {
  const cacheKey = "blocked_users";
  if (useCache) {
    return cachedFetch(
      cacheKey,
      async () => {
        try {
          console.log("📋 Fetching blocked users list");
          const response = await axios.get(`${API}/user/blocked`, {
            headers: getAuthHeaders(),
          });
          return response.data;
        } catch (error) {
          console.error(
            "❌ getBlockedUsers error:",
            error.response?.data || error.message
          );
          return {
            success: false,
            data: [],
            message:
              error.response?.data?.message || "Failed to fetch blocked users",
          };
        }
      },
      30000
    ); // 30s cache
  }
  try {
    console.log("📋 Fetching blocked users list (no cache)");
    const response = await axios.get(`${API}/user/blocked`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(
      "❌ getBlockedUsers error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch blocked users",
    };
  }
};

// 👁️ Get profile views (who viewed my profile)
// Returns deduplicated profile viewers ordered by latest view time
// Supports pagination via page and limit query parameters
export const getProfileViews = async (
  page = 1,
  limit = 10,
  useCache = false
) => {
  const cacheKey = `profile_views_${page}_${limit}`;
  if (useCache) {
    return cachedFetch(
      cacheKey,
      async () => {
        try {
          console.log(
            `👁️ Fetching profile views - page: ${page}, limit: ${limit}`
          );
          const response = await axios.get(`${API}/user/profile-views`, {
            params: { page, limit },
            headers: getAuthHeaders(),
          });
          return response.data;
        } catch (error) {
          console.error(
            "❌ getProfileViews error:",
            error.response?.data || error.message
          );
          return {
            success: false,
            data: [],
            message:
              error.response?.data?.message || "Failed to fetch profile views",
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          };
        }
      },
      15000
    ); // 15s cache
  }
  try {
    console.log(
      `👁️ Fetching profile views (no cache) - page: ${page}, limit: ${limit}`
    );
    const response = await axios.get(`${API}/user/profile-views`, {
      params: { page, limit },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(
      "❌ getProfileViews error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch profile views",
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
};
