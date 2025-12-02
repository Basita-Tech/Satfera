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

// 🔄 Change Accepted Connection to Rejected (receiver only)
export const rejectAcceptedConnection = async (requestId) => {
  try {
    const idStr = String(requestId);
    console.log("🔄 Changing accepted connection to rejected:", idStr);

    const response = await axios.post(
      `${API}/requests/accepted/reject`,
      { requestId: idStr },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Reject Accepted Connection Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Reject Accepted Connection Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to change connection status to rejected",
    };
  }
};

// 🔄 Change Rejected Connection to Accepted (receiver only)
export const acceptRejectedConnection = async (requestId) => {
  try {
    const idStr = String(requestId);
    console.log("🔄 Changing rejected connection to accepted:", idStr);

    const response = await axios.post(
      `${API}/requests/rejected/accept`,
      { requestId: idStr },
      { headers: getAuthHeaders() }
    );
    console.log("✅ Accept Rejected Connection Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Accept Rejected Connection Error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to change connection status to accepted",
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


// -------------------------------------------------------------
// // Usage: await downloadUserPdf();
export const downloadUserPdf = async () => {
  try {
    const response = await axios.get(`${API}/user/download-pdf`, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (response.status !== 200 || !response.data?.success) {
      throw new Error('Failed to fetch user data');
    }

    const userData = response.data.data;

    // Dynamically import jsPDF
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Set up PDF styling
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const leftCol = margin + 3;
    const valueCol = 45;
    let yPosition = 18;

    // Draw decorative outer border (golden)
    doc.setDrawColor(200, 162, 39);
    doc.setLineWidth(3);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

    yPosition = 20;

    // Title - BIODATA
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 162, 39);
    doc.text('BIODATA', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Helper function to add profile photo
    const addProfilePhoto = async (photoUrl) => {
      if (!photoUrl) return false;

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        return new Promise((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const imgData = canvas.toDataURL('image/jpeg');

              // Add photo at top right with border
              const imgWidth = 38;
              const imgHeight = 48;
              const imgX = pageWidth - margin - imgWidth - 3;
              const imgY = yPosition;

              // Add image first
              doc.addImage(imgData, 'JPEG', imgX, imgY, imgWidth, imgHeight);

              // Draw golden border touching the photo
              doc.setDrawColor(200, 162, 39);
              doc.setLineWidth(2.5);
              doc.rect(imgX, imgY, imgWidth, imgHeight);

              resolve(true);
            } catch (e) {
              console.warn('Error processing image:', e);
              resolve(false);
            }
          };
          img.onerror = () => resolve(false);
          img.src = photoUrl;
        });
      } catch (e) {
        console.warn('Could not load profile photo:', e);
        return false;
      }
    };

    // Helper function to add section header
    const addSectionHeader = (title) => {
      yPosition += 5;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 162, 39);
      doc.text(title, leftCol, yPosition);
      yPosition += 6;
    };

    // Helper function to add field in two-column layout
    const addFieldTwoColumn = (label1, value1, label2, value2) => {
      const col1X = leftCol;
      const col2X = pageWidth / 2 + 5;
      const labelWidth = 35;
      const maxValueWidth = (pageWidth / 2) - labelWidth - 15;

      doc.setFontSize(9);

      // Left column
      if (value1) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(label1, col1X, yPosition);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const lines1 = doc.splitTextToSize(String(value1), maxValueWidth);
        doc.text(lines1, col1X, yPosition + 4);
      }

      // Right column
      if (value2 && label2) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(label2, col2X, yPosition);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const lines2 = doc.splitTextToSize(String(value2), maxValueWidth);
        doc.text(lines2, col2X, yPosition + 4);
      }

      yPosition += 10;
    };

    // Helper: three equal-width columns with wrapping, label above value
    const addFieldThreeColumn = (label1, value1, label2, value2, label3, value3) => {
      const leftMargin = leftCol;
      const rightMargin = margin + 3; // mirror of leftCol offset
      const availableWidth = pageWidth - leftMargin - rightMargin;
      const colWidth = availableWidth / 3;

      const col1X = leftCol;
      const col2X = col1X + colWidth;
      const col3X = col2X + colWidth;

      doc.setFontSize(9);

      // Column 1
      if (label1) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(String(label1), col1X, yPosition);
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const lines1 = value1 !== undefined && value1 !== null && value1 !== ''
        ? doc.splitTextToSize(String(value1), colWidth - 2)
        : [];
      if (lines1.length) doc.text(lines1, col1X, yPosition + 4);

      // Column 2
      if (label2) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(String(label2), col2X, yPosition);
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const lines2 = value2 !== undefined && value2 !== null && value2 !== ''
        ? doc.splitTextToSize(String(value2), colWidth - 2)
        : [];
      if (lines2.length) doc.text(lines2, col2X, yPosition + 4);

      // Column 3
      if (label3) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(String(label3), col3X, yPosition);
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const lines3 = value3 !== undefined && value3 !== null && value3 !== ''
        ? doc.splitTextToSize(String(value3), colWidth - 2)
        : [];
      if (lines3.length) doc.text(lines3, col3X, yPosition + 4);

      // Row height: base 10 (like two-column) + extra per wrapped line
      const maxLines = Math.max(lines1.length || 1, lines2.length || 1, lines3.length || 1);
      const rowHeight = 10 + Math.max(0, (maxLines - 1) * 4);
      yPosition += rowHeight; // advance once after the whole row
    };

    // Helper function for single field (full width)
    const addFieldSingle = (label, value) => {
      if (!value) return;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(label, leftCol, yPosition);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const maxWidth = pageWidth - leftCol - 60;
      const lines = doc.splitTextToSize(String(value), maxWidth);
      doc.text(lines, leftCol, yPosition + 3);

      yPosition += lines.length > 1 ? 8 + (lines.length * 3) : 10;
    };

    // Add profile photo if available
    const photoUrl = userData.profile?.url || userData.closerPhoto?.url;
    if (photoUrl) {
      await addProfilePhoto(photoUrl);
    }

    // SECTION 1: PERSONAL INFORMATION
    addSectionHeader('Personal Information');

    if (userData.user) {
      const user = userData.user;
      const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
      addFieldSingle('Name', fullName);

      let age = '';
      let birthdate = '';
      if (user.dateOfBirth) {
        const birthDate = new Date(user.dateOfBirth);
        age = `${new Date().getFullYear() - birthDate.getFullYear()} years`;
        birthdate = birthDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      }

      const gender = user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '';

      addFieldTwoColumn('Age', age, 'Gender', gender);
      addFieldTwoColumn('Birthdate', birthdate, 'Contact No.', user.phoneNumber);
      addFieldSingle('Email', user.email);
    }

    // SECTION 2: PERSONAL DETAILS
    addSectionHeader('Personal Details');

    if (userData.userPersonal) {
      const personal = userData.userPersonal;

      const birthPlace = personal.birthPlace && personal.birthState
        ? `${personal.birthPlace}, ${personal.birthState}`
        : personal.birthPlace || personal.birthState;

      addFieldSingle('Birth Place', birthPlace);
      addFieldTwoColumn('Height', personal.height, 'Weight', personal.weight);
      addFieldTwoColumn('Religion', personal.religion, 'Caste', personal.subCaste);

      if (personal.bloodGroup || personal.complexion) {
        addFieldTwoColumn('Blood Group', personal.bloodGroup, 'Complexion', personal.complexion);
      }

      addFieldTwoColumn('Astrological Sign', personal.astrologicalSign, 'Dosh', personal.dosh);
      addFieldTwoColumn('Marital Status', personal.marriedStatus, 'Mother Tongue', personal.motherTongue);

      // Children Information
      if (personal.isHaveChildren) {
        const childrenInfo = personal.numberOfChildren ? `Yes (${personal.numberOfChildren})` : 'Yes';
        addFieldTwoColumn('Have Children', childrenInfo, 'Living With', personal.isChildrenLivingWithYou ? 'Yes' : 'No');
      }
    }

    addSectionHeader('Education & Profession');

    const edu = userData.educations?.[0] || {};
    const prof = userData.profession || {};

    // -------- Row 1 --------
    addFieldTwoColumn(
      'Education',
      edu.HighestEducation && edu.FieldOfStudy
        ? `${edu.HighestEducation} in ${edu.FieldOfStudy}`
        : edu.HighestEducation || edu.FieldOfStudy,
      'School / College',
      edu.SchoolName
    );

    addFieldTwoColumn(
      'University',
      edu.University,
      'Country of Education',
      edu.CountryOfEducation
    );

    // -------- Row 2 --------
    addFieldTwoColumn(
      'Occupation',
      prof.Occupation,
      'Employment Status',
      prof.EmploymentStatus
    );

    // -------- Row 3 --------
    addFieldTwoColumn(
      'Organization Name',
      prof.OrganizationName,
      'Annual Income',
      prof.AnnualIncome
    );


    // SECTION 4: FAMILY DETAILS
    addSectionHeader('Family Details');

    if (userData.family) {
      const family = userData.family;

      addFieldTwoColumn('Father Name', family.fatherName, 'Occupation', family.fatherOccupation);

      if (family.motherName || family.motherOccupation) {
        addFieldTwoColumn('Mother Name', family.motherName, 'Occupation', family.motherOccupation);
      }

      if (family.fatherNativePlace) {
        addFieldSingle('Native Place', family.fatherNativePlace);
      }

      // Siblings
      if (family.siblingDetails && family.siblingDetails.length > 0) {
        const sisters = family.siblingDetails.filter(s => s.gender === 'female' || s.relation === 'sister');
        const brothers = family.siblingDetails.filter(s => s.gender === 'male' || s.relation === 'brother');

        let sistersInfo = '0';
        let brothersInfo = '0';

        if (sisters.length > 0) {
          const marriedCount = sisters.filter(s => s.marriedStatus === 'Married').length;
          sistersInfo = marriedCount > 0 ? `${sisters.length} (${marriedCount} Married)` : `${sisters.length}`;
        }

        if (brothers.length > 0) {
          const marriedCount = brothers.filter(s => s.marriedStatus === 'Married').length;
          brothersInfo = marriedCount > 0 ? `${brothers.length} (${marriedCount} Married)` : `${brothers.length}`;
        }

        addFieldTwoColumn('Sisters', sistersInfo, 'Brothers', brothersInfo);
      } else if (family.haveSibling === false) {
        addFieldSingle('Siblings', 'No siblings');
      }
    }

    // SECTION 5: ADDRESS & RESIDENCE
    addSectionHeader('Address & Residence');

    if (userData.userPersonal?.full_address) {
      const addr = userData.userPersonal.full_address;
      const address = [addr.street1, addr.street2, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ');
      if (address) {
        addFieldSingle('Address', address);
      }
    }

    if (userData.userPersonal) {
      const personal = userData.userPersonal;

      const ownHome = userData.userPersonal?.full_address?.isYourHome !== undefined
        ? (userData.userPersonal.full_address.isYourHome ? 'Yes' : 'No')
        : '';

      addFieldTwoColumn('Nationality', personal.nationality, 'Own Home', ownHome);

      const residentOfIndia = personal.isResidentOfIndia !== undefined
        ? (personal.isResidentOfIndia ? 'Yes' : 'No')
        : '';

      if (personal.residingCountry || residentOfIndia || personal.visaType) {
        addFieldThreeColumn(
          'Residing Country', personal.residingCountry || '',
          'Resident of India', residentOfIndia || '',
          'Visa Type', personal.visaType || ''
        );
      }


    }

    // Save the PDF
    const fileName = userData.user
      ? `${userData.user.firstName}_${userData.user.lastName}_Biodata_${Date.now()}.pdf`.replace(/\s+/g, '_')
      : `User_Biodata_${Date.now()}.pdf`;
    doc.save(fileName);

    toast.success('PDF downloaded successfully!');
  } catch (error) {
    console.error('Download PDF error:', error);
    toast.error(error.response?.data?.message || 'Failed to download PDF.');
  }
};


export const updateGovernmentId = async (formData) => {
  try {
    const response = await axios.put(
      `${API}/user-personal/upload/government-id`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Update Government ID Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};