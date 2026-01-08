import axios from "./http";
import toast from "react-hot-toast";
import { cachedFetch, dataCache } from "../utils/cache";
import { dedupeRequest } from "../utils/optimize";
import { getCSRFToken } from "../utils/csrfProtection";
const API = import.meta.env.VITE_API_URL;
const getAuthHeaders = () => {
  const headers = {};
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }
  return headers;
};
export const signupUser = async formData => {
  try {
    const response = await axios.post(`${API}/auth/signup`, formData);
    return response.data;
  } catch (error) {
    console.error("❌ Signup Error:", error.response?.data || error.message);
    return error.response?.data || {
      success: false,
      message: "Something went wrong. Please try again."
    };
  }
};
export const forgotUsername = async formData => {
  try {
    const response = await axios.post(`${API}/auth/forgot-username`, formData, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data || {};
    if (status === 404 || status === 400) {
      return {
        success: false,
        message: "If an account exists with the provided details, the username will be displayed."
      };
    }
    if (status === 429) {
      return {
        success: false,
        message: "Too many attempts. Please try again later."
      };
    }
    return {
      success: false,
      message: data.message || "Unable to retrieve username. Please try again."
    };
  }
};
export const loginUser = async formData => {
  try {
    const response = await axios.post(`${API}/auth/login`, formData);
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data || {};
    if (status === 401) {
      toast.error("Invalid credentials. Please try again.");
      return {
        success: false,
        message: "Invalid credentials"
      };
    }
    if (status === 403) {
      toast.error(data.message || "Verification required.");
      return {
        success: false,
        message: data.message || "Verification required"
      };
    }
    toast.error(data.message || "Login failed. Please retry.");
    return {
      success: false,
      message: data.message || "Login failed"
    };
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
      message: error.response?.data?.message || "Logout failed"
    };
  }
};
export const sendEmailOtp = async data => {
  try {
    const response = await axios.post(`${API}/auth/send-email-otp`, data);
    if (!response.data) {
      throw new Error("Empty response from server");
    }
    return response.data;
  } catch (error) {
    console.error("❌ Send Email OTP Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};
export const sendSmsOtp = async data => {
  try {
    const response = await axios.post(`${API}/auth/send-sms-otp`, data);
    if (!response.data) {
      throw new Error("Empty response from server");
    }
    return response.data;
  } catch (error) {
    console.error("❌ Send SMS OTP Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};
export const verifyEmailOtp = async data => {
  try {
    const response = await axios.post(`${API}/auth/verify-email-otp`, data);
    return response.data;
  } catch (error) {
    console.error("❌ Verify Email OTP Error:", error.response?.data || error.message);
    return error.response?.data || {
      success: false,
      message: "Server error"
    };
  }
};
export const verifySmsOtp = async data => {
  try {
    const response = await axios.post(`${API}/auth/verify-sms-otp`, data);
    return response.data;
  } catch (error) {
    console.error("❌ Verify SMS OTP Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return error.response?.data || {
      success: false,
      message: "Server error"
    };
  }
};
export const resendOtp = async data => {
  try {
    const response = await axios.post(`${API}/auth/resend-otp`, data);
    return response.data;
  } catch (error) {
    console.error("❌ Resend OTP Error:", error.response?.data || error.message);
  }
};
export const forgotPassword = async email => {
  try {
    const response = await axios.post(`${API}/auth/forgot-password`, {
      email: email
    });
    return response.data;
  } catch (error) {
    console.error("❌ Forgot Password Error:", error.response?.data || error.message);
    return error.response?.data || {
      success: false,
      message: "Server error"
    };
  }
};
export const saveUserPersonal = async payload => {
  try {
    const response = await axios.post(`${API}/user-personal/`, payload, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Save Personal Details Error:", error.response?.data || error.message);
    throw error;
  }
};
export const getUserPersonal = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/`, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Get Personal Details Error:", error.response?.data || error.message);
  }
};
export const updateUserPersonal = async payload => {
  try {
    const response = await axios.put(`${API}/user-personal/`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update Personal Details Error:", error.response?.data || error.message);
    throw error;
  }
};
export const saveUserExpectations = async payload => {
  try {
    const response = await axios.post(`${API}/user-personal/expectations`, payload, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Save Expectations Error:", error.response?.data || error.message);
  }
};
export const getUserExpectations = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/expectations`, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Get User Expectations Error:", error.response?.data || error.message);
  }
};
export const updateUserExpectations = async payload => {
  try {
    const response = await axios.put(`${API}/user-personal/expectations`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update Expectations Error:", error.response?.data || error.message);
  }
};
export const getUserHealth = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/health`, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Get User Health Error:", error.response?.data || error.message);
  }
};
export const saveUserHealth = async payload => {
  try {
    const response = await axios.post(`${API}/user-personal/health`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Save User Health Error:", error.response?.data || error.message);
    throw error;
  }
};
export const updateUserHealth = async payload => {
  try {
    const response = await axios.put(`${API}/user-personal/health`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update User Health Error:", error.response?.data || error.message);
    throw error;
  }
};
export const getUserProfession = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/profession`, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Get Profession Error:", error.response?.data || error.message);
  }
};
export const saveUserProfession = async payload => {
  try {
    const response = await axios.post(`${API}/user-personal/profession`, payload, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Save Profession Error:", error.response?.data || error.message);
    throw error;
  }
};
export const updateUserProfession = async payload => {
  try {
    const response = await axios.put(`${API}/user-personal/profession`, payload, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Update Profession Error:", error.response?.data || error.message);
  }
};
export const getUserFamilyDetails = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/family/`, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Get Family Details Error:", error.response?.data || error.message);
  }
};
export const saveUserFamilyDetails = async payload => {
  try {
    const response = await axios.post(`${API}/user-personal/family/`, payload, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Save Family Details Error:", error.response?.data || error.message);
    throw error;
  }
};
export const updateUserFamilyDetails = async payload => {
  try {
    const response = await axios.put(`${API}/user-personal/family/`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update Family Details Error:", error.response?.data || error.message);
  }
};
export const getEducationalDetails = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/education/`, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Get Educational Details Error:", error.response?.data || error.message);
  }
};
export const saveEducationalDetails = async payload => {
  try {
    const response = await axios.post(`${API}/user-personal/education/`, payload, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Save Educational Details Error:", error.response?.data || error.message);
    throw error;
  }
};
export const updateEducationalDetails = async payload => {
  try {
    const response = await axios.put(`${API}/user-personal/education/`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update Educational Details Error:", error.response?.data || error.message);
  }
};
export const getOnboardingStatus = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/onboarding-status/`, {
      headers: getAuthHeaders()
    });
    return response;
  } catch (error) {
    console.error("❌ Get Onboarding Status Error:", error.response?.data || error.message);
  }
};
export const updateOnboardingStatus = async payload => {
  try {
    const response = await axios.put(`${API}/user-personal/onboarding-status/`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update Onboarding Status Error:", error.response?.data || error.message);
  }
};
export const uploadUserPhoto = async formData => {
  try {
    const response = await axios.post(`${API}/user-personal/upload/photos`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  } catch (error) {
    console.error("❌ Upload User Photo Error:", error.response?.data || error.message);
    throw error;
  }
};
export const uploadGovernmentId = async formData => {
  try {
    const response = await axios.post(`${API}/user-personal/upload/government-id`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  } catch (error) {
    console.error("❌ Upload Government ID Error:", error.response?.data || error.message);
    throw error;
  }
};
export const getUserPhotos = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/upload/photos`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get User Photos Error:", error.response?.data || error.message);
  }
};
export const getGovernmentId = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/upload/government-id`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Government ID Error:", error.response?.data || error.message);
  }
};
export const getProfileReviewStatus = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/review/status`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Profile Review Status Error:", error.response?.data || error.message);
    throw error;
  }
};
export const submitProfileForReview = async () => {
  try {
    const response = await axios.post(`${API}/user-personal/review/submit`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Submit Profile for Review Error:", error.response?.data || error.message);
    throw error;
  }
};
export const approveProfile = async userId => {
  try {
    const response = await axios.post(`${API}/user-personal/review/approve`, {
      userId
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Approve Profile Error:", error.response?.data || error.message);
    throw error;
  }
};
export const rejectProfile = async (userId, reason) => {
  try {
    const response = await axios.post(`${API}/user-personal/review/reject`, {
      userId,
      reason
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Reject Profile Error:", error.response?.data || error.message);
    throw error;
  }
};
export const getUserProfileDetails = async (useCache = true) => {
  const cacheKey = "user_profile";
  if (useCache) {
    return cachedFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${API}/user/profile`, {
          headers: getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error("❌ Get User Profile Error:", error.response?.data || error.message);
        return null;
      }
    }, 60000);
  }
  try {
    const response = await axios.get(`${API}/user/profile`, {
      headers: getAuthHeaders()
    });
    dataCache.set(cacheKey, response.data, 60000);
    return response.data;
  } catch (error) {
    console.error("❌ Get User Profile Error:", error.response?.data || error.message);
    return null;
  }
};
export const getUserContactInfo = async () => {
  try {
    const response = await axios.get(`${API}/user/contact-info`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Contact Info Error:", error.response?.data || error.message);
    return {
      success: false,
      data: null,
      message: error.response?.data?.message || "Failed to fetch contact information"
    };
  }
};
export const requestEmailChange = async newEmail => {
  try {
    const response = await axios.post(`${API}/user/email/request-change`, {
      newEmail
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Request Email Change Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to send OTP. Please try again."
    };
  }
};
export const verifyEmailChange = async (newEmail, otp) => {
  try {
    const response = await axios.post(`${API}/user/email/verify-change`, {
      newEmail,
      otp
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Verify Email Change Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to verify OTP. Please try again."
    };
  }
};
export const requestPhoneChange = async newPhoneNumber => {
  try {
    const response = await axios.post(`${API}/user/phone/request-change`, {
      newPhoneNumber
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Request Phone Change Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to initiate phone change. Please try again."
    };
  }
};
export const verifyPhoneChange = async newPhoneNumber => {
  try {
    const response = await axios.post(`${API}/user/phone/verify-change`, {
      newPhoneNumber
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Verify Phone Change Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to complete phone change. Please try again."
    };
  }
};
export const searchProfiles = async (filters = {}) => {
  try {
    const params = {};
    if (filters.name) params.name = filters.name;
    if (filters.customId) params.customId = filters.customId;
    if (filters.religion) params.religion = filters.religion;
    if (filters.caste) params.caste = filters.caste;
    if (filters.city) params.city = filters.city;
    if (filters.profession) params.profession = filters.profession;
    if (filters.education) params.education = filters.education;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.newProfile) params.newProfile = filters.newProfile;
    if (filters.ageFrom !== undefined && filters.ageFrom !== null) params.ageFrom = filters.ageFrom;
    if (filters.ageTo !== undefined && filters.ageTo !== null) params.ageTo = filters.ageTo;
    if (filters.heightFrom !== undefined && filters.heightFrom !== null) params.heightFrom = filters.heightFrom;
    if (filters.heightTo !== undefined && filters.heightTo !== null) params.heightTo = filters.heightTo;
    if (filters.weightFrom !== undefined && filters.weightFrom !== null) params.weightFrom = filters.weightFrom;
    if (filters.weightTo !== undefined && filters.weightTo !== null) params.weightTo = filters.weightTo;
    params.page = filters.page || 1;
    params.limit = filters.limit || 10;
    const response = await axios.get(`${API}/user/search`, {
      headers: getAuthHeaders(),
      params
    });
    return response.data;
  } catch (error) {
    console.error("❌ Search Profiles Error:", error);
    console.error("❌ Error Response:", error.response?.data);
    console.error("❌ Error Status:", error.response?.status);
    return {
      success: false,
      data: {
        listings: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          hasMore: false
        }
      },
      message: error.response?.data?.message || "Failed to search profiles"
    };
  }
};
export const getMatches = async ({
  useCache = true,
  page = 1,
  limit = 20
} = {}) => {
  const cacheKey = `user_matches_${page}_${limit}`;
  if (useCache) {
    return cachedFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${API}/matches`, {
          headers: getAuthHeaders(),
          params: {
            page,
            limit
          }
        });
        return response.data;
      } catch (error) {
        console.error("❌ Get User Matches Error:", error.response?.data || error.message);
        return {
          success: false,
          data: [],
          message: error.response?.data?.message || "Failed to fetch matches"
        };
      }
    }, 45000);
  }
  try {
    const response = await axios.get(`${API}/matches`, {
      headers: getAuthHeaders(),
      params: {
        page,
        limit
      }
    });
    dataCache.set(cacheKey, response.data, 45000);
    return response.data;
  } catch (error) {
    console.error("❌ Get User Matches Error:", error.response?.data || error.message);
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch matches"
    };
  }
};
export const getViewProfiles = async (id, options = {}) => {
  const cacheKey = `profile_${id}`;
  const requestKey = `profile_request_${id}`;
  const useCache = options?.useCache !== false;
  if (useCache) {
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }
  return dedupeRequest(requestKey, async () => {
    try {
      const config = {
        headers: getAuthHeaders()
      };
      if (options?.signal) {
        config.signal = options.signal;
      }
      const response = await axios.get(`${API}/profile/${id}`, config);
      if (response.data?.success) {
        dataCache.set(cacheKey, response.data, 120000);
      }
      return response.data;
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        console.info("ℹ️ [getViewProfiles] Request canceled by caller");
        return {
          success: false,
          data: null,
          message: "Request canceled"
        };
      }
      const errorStatus = error.response?.status;
      const errorMsg = error.response?.data?.message || error.message;
      if (errorStatus === 404) {
        console.warn(`⚠️ Profile not found (404): ${id}`, errorMsg);
      } else {
        console.error("❌ Get User view  profile details Error:", `ID: ${id}, Status: ${errorStatus},`, error.response?.data || error.message);
      }
      return {
        success: false,
        data: [],
        message: errorMsg || "Failed to fetch user view profile details"
      };
    }
  });
};
export const getNotifications = async (page = 1, limit = 20, useCache = true) => {
  const cacheKey = `notifications_${page}_${limit}`;
  if (useCache) {
    return cachedFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${API}/user/notifications`, {
          headers: getAuthHeaders(),
          params: {
            page,
            limit
          }
        });
        return response.data;
      } catch (error) {
        console.error("❌ Get Notifications Error:", error.response?.data || error.message);
        return {
          success: false,
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            hasMore: false
          },
          message: error.response?.data?.message || "Failed to fetch notifications"
        };
      }
    }, 20000);
  }
  try {
    const response = await axios.get(`${API}/user/notifications`, {
      headers: getAuthHeaders(),
      params: {
        page,
        limit
      }
    });
    dataCache.set(cacheKey, response.data, 20000);
    return response.data;
  } catch (error) {
    console.error("❌ Get Notifications Error:", error.response?.data || error.message);
    return {
      success: false,
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false
      },
      message: error.response?.data?.message || "Failed to fetch notifications"
    };
  }
};
export const getUnreadNotificationsCount = async () => {
  try {
    const response = await axios.get(`${API}/user/notifications/count`, {
      headers: getAuthHeaders()
    });
    return {
      success: response.data.success,
      count: response.data.data?.unreadCount || 0
    };
  } catch (error) {
    console.error("❌ Get Unread Count Error:", error.response?.data || error.message);
    return {
      success: false,
      count: 0,
      message: error.response?.data?.message || "Failed to fetch unread count"
    };
  }
};
export const getSessions = async () => {
  try {
    const response = await axios.get(`${API}/sessions`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Sessions Error:", error.response?.data || error.message);
    return {
      success: false,
      data: {
        sessions: [],
        total: 0
      },
      message: error.response?.data?.message || "Failed to fetch sessions"
    };
  }
};
export const logoutSession = async sessionId => {
  try {
    if (!sessionId) {
      return {
        success: false,
        message: "Session ID is required"
      };
    }
    const response = await axios.delete(`${API}/sessions/${sessionId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Logout Session Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to logout session"
    };
  }
};
export const logoutAllSessions = async () => {
  try {
    const response = await axios.post(`${API}/sessions/logout-all`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Logout All Sessions Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to logout all sessions"
    };
  }
};
export const markNotificationAsRead = async notificationId => {
  try {
    const response = await axios.patch(`${API}/user/notifications/${notificationId}/read`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Mark as Read Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to mark as read"
    };
  }
};
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await axios.patch(`${API}/user/notifications/mark-all-read`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Mark All as Read Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to mark all as read"
    };
  }
};
export const getNotificationSettings = async () => {
  try {
    const response = await axios.get(`${API}/user/notification-settings`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Notification Settings Error:", error.response?.data || error.message);
    return {
      success: false,
      data: null,
      message: error.response?.data?.message || "Failed to fetch notification settings"
    };
  }
};
export const updateNotificationSettings = async settings => {
  try {
    const response = await axios.patch(`${API}/user/notification-settings`, settings, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update Notification Settings Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to update notification settings"
    };
  }
};
export const addToFavorites = async profileId => {
  try {
    const idStr = String(profileId);
    const response = await axios.post(`${API}/requests/favorites/add`, {
      profileId: idStr
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Add to Favorites Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to add to favorites"
    };
  }
};
export const removeFromFavorites = async profileId => {
  try {
    const idStr = String(profileId);
    const response = await axios.post(`${API}/requests/favorites/remove`, {
      profileId: idStr
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Remove from Favorites Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to remove from favorites"
    };
  }
};
export const getFavorites = async () => {
  try {
    const response = await axios.get(`${API}/requests/favorites`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Favorites Error:", error.response?.data || error.message);
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch favorites"
    };
  }
};
export const getAllProfiles = async (page = 1, limit = 10) => {
  try {
    const response = await axios.get(`${API}/profiles?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get All Profiles Error:", error.response?.data || error.message);
    return {
      success: false,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        hasMore: false
      },
      message: error.response?.data?.message || "Failed to fetch profiles"
    };
  }
};
export const sendConnectionRequest = async receiverId => {
  try {
    const idStr = String(receiverId);
    const response = await axios.post(`${API}/requests/send`, {
      receiverId: idStr
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Send Request Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to send connection request"
    };
  }
};
export const getSentRequests = async () => {
  try {
    const response = await axios.get(`${API}/requests/all`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Sent Requests Error:", error.response?.data || error.message);
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch sent requests"
    };
  }
};
export const getReceivedRequests = async () => {
  try {
    const response = await axios.get(`${API}/requests/all/received`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Received Requests Error:", error.response?.data || error.message);
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch received requests"
    };
  }
};
export const acceptConnectionRequest = async requestId => {
  try {
    const idStr = String(requestId);
    const response = await axios.post(`${API}/requests/accept`, {
      requestId: idStr
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Accept Request Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to accept connection request"
    };
  }
};
export const rejectConnectionRequest = async requestId => {
  try {
    const idStr = String(requestId);
    const response = await axios.post(`${API}/requests/reject`, {
      requestId: idStr
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Reject Request Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to reject connection request"
    };
  }
};
export const rejectAcceptedConnection = async requestId => {
  try {
    const idStr = String(requestId);
    const response = await axios.post(`${API}/requests/accepted/reject`, {
      requestId: idStr
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Reject Accepted Connection Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to change connection status to rejected"
    };
  }
};
export const acceptRejectedConnection = async requestId => {
  try {
    const idStr = String(requestId);
    const response = await axios.post(`${API}/requests/rejected/accept`, {
      requestId: idStr
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Accept Rejected Connection Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to change connection status to accepted"
    };
  }
};
export const withdrawConnectionRequest = async connectionId => {
  try {
    const idStr = String(connectionId);
    const response = await axios.post(`${API}/requests/withdraw`, {
      connectionId: idStr
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Withdraw Request Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to withdraw connection request"
    };
  }
};
export const getApprovedConnections = async (page = 1, limit = 20) => {
  try {
    const response = await axios.get(`${API}/requests/approve?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Approved Connections Error:", error.response?.data || error.message);
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch approved connections"
    };
  }
};
export const getCompare = async () => {
  try {
    const response = await axios.get(`${API}/user/compare`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ getCompare error:", error.response?.data || error.message);
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch compare list"
    };
  }
};
export const addToCompare = async profileIdOrIds => {
  try {
    const ids = Array.isArray(profileIdOrIds) ? profileIdOrIds.map(String) : [String(profileIdOrIds)];
    const response = await axios.post(`${API}/user/compare`, {
      profilesIds: ids
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ addToCompare error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to add to compare"
    };
  }
};
export const removeFromCompare = async profileIdOrIds => {
  try {
    const ids = Array.isArray(profileIdOrIds) ? profileIdOrIds.map(String) : [String(profileIdOrIds)];
    const response = await axios.delete(`${API}/user/compare`, {
      headers: getAuthHeaders(),
      data: {
        profilesIds: ids
      }
    });
    return response.data;
  } catch (error) {
    console.error("❌ removeFromCompare error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to remove from compare"
    };
  }
};
export const changePassword = async (oldPassword, newPassword, confirmPassword) => {
  try {
    const response = await axios.post(`${API}/user/change-password`, {
      oldPassword,
      newPassword,
      confirmPassword
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ changePassword error:", error.response?.data || error.message);
    throw error;
  }
};
export const blockUserProfile = async customId => {
  try {
    if (!customId || typeof customId !== "string") {
      return {
        success: false,
        message: "Invalid customId provided"
      };
    }
    const response = await axios.post(`${API}/user/block`, {
      customId
    }, {
      headers: getAuthHeaders()
    });
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
    return {
      success: false,
      message
    };
  }
};
export const unblockUserProfile = async customId => {
  try {
    if (!customId || typeof customId !== "string") {
      return {
        success: false,
        message: "Invalid customId provided"
      };
    }
    const response = await axios.post(`${API}/user/unblock`, {
      customId
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const rawMsg = error?.response?.data?.message || error.message;
    let message = rawMsg;
    if (status === 429 || /24 hours/i.test(rawMsg)) {
      message = "You can change block status for this profile after 24 hours";
    } else if (/not in your blocked list/i.test(rawMsg) || /NotBlocked/i.test(rawMsg)) {
      message = "User is not in your blocked list";
    }
    console.error("❌ unblockUserProfile error:", rawMsg);
    return {
      success: false,
      message
    };
  }
};
export const getBlockedUsers = async (useCache = true) => {
  const cacheKey = "blocked_users";
  if (useCache) {
    return cachedFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${API}/user/blocked`, {
          headers: getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error("❌ getBlockedUsers error:", error.response?.data || error.message);
        return {
          success: false,
          data: [],
          message: error.response?.data?.message || "Failed to fetch blocked users"
        };
      }
    }, 30000);
  }
  try {
    const response = await axios.get(`${API}/user/blocked`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ getBlockedUsers error:", error.response?.data || error.message);
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch blocked users"
    };
  }
};
export const getProfileViews = async (page = 1, limit = 10, useCache = false) => {
  const cacheKey = `profile_views_${page}_${limit}`;
  if (useCache) {
    return cachedFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${API}/user/profile-views`, {
          params: {
            page,
            limit
          },
          headers: getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error("❌ getProfileViews error:", error.response?.data || error.message);
        return {
          success: false,
          data: [],
          message: error.response?.data?.message || "Failed to fetch profile views",
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
          }
        };
      }
    }, 15000);
  }
  try {
    const response = await axios.get(`${API}/user/profile-views`, {
      params: {
        page,
        limit
      },
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ getProfileViews error:", error.response?.data || error.message);
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Failed to fetch profile views",
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      }
    };
  }
};
export const downloadUserPdf = async () => {
  try {
    const response = await axios.get(`${API}/user/download-pdf`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    if (response.status !== 200 || !response.data?.success) {
      throw new Error("Failed to fetch user data");
    }
    const userData = response.data.data;
    const {
      jsPDF
    } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const leftCol = margin + 3;
    let yPosition = 18;
    doc.setDrawColor(200, 162, 39);
    doc.setLineWidth(3);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    yPosition = 20;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 162, 39);
    doc.text("BIODATA", pageWidth / 2, yPosition, {
      align: "center"
    });
    yPosition += 10;
    const addProfilePhoto = async photoUrl => {
      if (!photoUrl) return false;
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        return new Promise(resolve => {
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);
              const imgData = canvas.toDataURL("image/jpeg");
              const imgWidth = 38;
              const imgHeight = 48;
              const imgX = pageWidth - margin - imgWidth - 3;
              const imgY = yPosition;
              doc.addImage(imgData, "JPEG", imgX, imgY, imgWidth, imgHeight);
              doc.setDrawColor(200, 162, 39);
              doc.setLineWidth(2.5);
              doc.rect(imgX, imgY, imgWidth, imgHeight);
              resolve(true);
            } catch (e) {
              console.warn("Error processing image:", e);
              resolve(false);
            }
          };
          img.onerror = () => resolve(false);
          img.src = photoUrl;
        });
      } catch (e) {
        console.warn("Could not load profile photo:", e);
        return false;
      }
    };
    const addSectionHeader = title => {
      yPosition += 5;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(200, 162, 39);
      doc.text(title, leftCol, yPosition);
      yPosition += 6;
    };
    const addFieldTwoColumn = (label1, value1, label2, value2) => {
      const col1X = leftCol;
      const col2X = pageWidth / 2 + 5;
      const labelWidth = 35;
      const maxValueWidth = pageWidth / 2 - labelWidth - 15;
      doc.setFontSize(9);
      if (value1) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(label1, col1X, yPosition);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const lines1 = doc.splitTextToSize(String(value1), maxValueWidth);
        doc.text(lines1, col1X, yPosition + 4);
      }
      if (value2 && label2) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(label2, col2X, yPosition);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const lines2 = doc.splitTextToSize(String(value2), maxValueWidth);
        doc.text(lines2, col2X, yPosition + 4);
      }
      yPosition += 10;
    };
    const addFieldThreeColumn = (label1, value1, label2, value2, label3, value3) => {
      const leftMargin = leftCol;
      const rightMargin = margin + 3;
      const availableWidth = pageWidth - leftMargin - rightMargin;
      const colWidth = availableWidth / 3;
      const col1X = leftCol;
      const col2X = col1X + colWidth;
      const col3X = col2X + colWidth;
      doc.setFontSize(9);
      if (label1) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(String(label1), col1X, yPosition);
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const lines1 = value1 !== undefined && value1 !== null && value1 !== "" ? doc.splitTextToSize(String(value1), colWidth - 2) : [];
      if (lines1.length) doc.text(lines1, col1X, yPosition + 4);
      if (label2) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(String(label2), col2X, yPosition);
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const lines2 = value2 !== undefined && value2 !== null && value2 !== "" ? doc.splitTextToSize(String(value2), colWidth - 2) : [];
      if (lines2.length) doc.text(lines2, col2X, yPosition + 4);
      if (label3) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(String(label3), col3X, yPosition);
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const lines3 = value3 !== undefined && value3 !== null && value3 !== "" ? doc.splitTextToSize(String(value3), colWidth - 2) : [];
      if (lines3.length) doc.text(lines3, col3X, yPosition + 4);
      const maxLines = Math.max(lines1.length || 1, lines2.length || 1, lines3.length || 1);
      const rowHeight = 10 + Math.max(0, (maxLines - 1) * 4);
      yPosition += rowHeight;
    };
    const addFieldSingle = (label, value) => {
      if (!value) return;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(label, leftCol, yPosition);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const maxWidth = pageWidth - leftCol - 60;
      const lines = doc.splitTextToSize(String(value), maxWidth);
      doc.text(lines, leftCol, yPosition + 3);
      yPosition += lines.length > 1 ? 8 + lines.length * 3 : 10;
    };
    const photoUrl = userData.profile?.url || userData.closerPhoto?.url;
    if (photoUrl) {
      await addProfilePhoto(photoUrl);
    }
    addSectionHeader("Personal Information");
    if (userData.user) {
      const user = userData.user;
      const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
      addFieldSingle("Name", fullName);
      let age = "";
      let birthdate = "";
      if (user.dateOfBirth) {
        const birthDate = new Date(user.dateOfBirth);
        age = `${new Date().getFullYear() - birthDate.getFullYear()} years`;
        birthdate = birthDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        });
      }
      const gender = user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : "";
      addFieldTwoColumn("Age", age, "Gender", gender);
      addFieldTwoColumn("Birthdate", birthdate, "Contact No.", user.phoneNumber);
      addFieldSingle("Email", user.email);
    }
    addSectionHeader("Personal Details");
    if (userData.userPersonal) {
      const personal = userData.userPersonal;
      const birthPlace = personal.birthPlace && personal.birthState ? `${personal.birthPlace}, ${personal.birthState}` : personal.birthPlace || personal.birthState;
      addFieldSingle("Birth Place", birthPlace);
      addFieldTwoColumn("Height", personal.height, "Weight", personal.weight);
      addFieldTwoColumn("Religion", personal.religion, "Caste", personal.subCaste);
      if (personal.bloodGroup || personal.complexion) {
        addFieldTwoColumn("Blood Group", personal.bloodGroup, "Complexion", personal.complexion);
      }
      addFieldTwoColumn("Astrological Sign", personal.astrologicalSign, "Dosh", personal.dosh);
      addFieldTwoColumn("Marital Status", personal.marriedStatus, "Mother Tongue", personal.motherTongue);
      if (personal.isHaveChildren) {
        const childrenInfo = personal.numberOfChildren ? `Yes (${personal.numberOfChildren})` : "Yes";
        addFieldTwoColumn("Have Children", childrenInfo, "Living With", personal.isChildrenLivingWithYou ? "Yes" : "No");
      }
    }
    addSectionHeader("Education & Profession");
    const edu = userData.educations?.[0] || {};
    const prof = userData.profession || {};
    addFieldTwoColumn("Education", edu.HighestEducation && edu.FieldOfStudy ? `${edu.HighestEducation} in ${edu.FieldOfStudy}` : edu.HighestEducation || edu.FieldOfStudy, "School / College", edu.SchoolName);
    addFieldTwoColumn("University", edu.University, "Country of Education", edu.CountryOfEducation);
    addFieldTwoColumn("Occupation", prof.Occupation, "Employment Status", prof.EmploymentStatus);
    addFieldTwoColumn("Organization Name", prof.OrganizationName, "Annual Income", prof.AnnualIncome);
    addSectionHeader("Family Details");
    if (userData.family) {
      const family = userData.family;
      addFieldTwoColumn("Father Name", family.fatherName, "Occupation", family.fatherOccupation);
      if (family.motherName || family.motherOccupation) {
        addFieldTwoColumn("Mother Name", family.motherName, "Occupation", family.motherOccupation);
      }
      if (family.fatherNativePlace) {
        addFieldSingle("Native Place", family.fatherNativePlace);
      }
      if (family.siblingDetails && family.siblingDetails.length > 0) {
        const sisters = family.siblingDetails.filter(s => s.gender === "female" || s.relation === "sister");
        const brothers = family.siblingDetails.filter(s => s.gender === "male" || s.relation === "brother");
        let sistersInfo = "0";
        let brothersInfo = "0";
        if (sisters.length > 0) {
          const marriedCount = sisters.filter(s => s.marriedStatus === "Married").length;
          sistersInfo = marriedCount > 0 ? `${sisters.length} (${marriedCount} Married)` : `${sisters.length}`;
        }
        if (brothers.length > 0) {
          const marriedCount = brothers.filter(s => s.marriedStatus === "Married").length;
          brothersInfo = marriedCount > 0 ? `${brothers.length} (${marriedCount} Married)` : `${brothers.length}`;
        }
        addFieldTwoColumn("Sisters", sistersInfo, "Brothers", brothersInfo);
      } else if (family.haveSibling === false) {
        addFieldSingle("Siblings", "No siblings");
      }
    }
    addSectionHeader("Address & Residence");
    if (userData.userPersonal?.full_address) {
      const addr = userData.userPersonal.full_address;
      const address = [addr.street1, addr.street2, addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ");
      if (address) {
        addFieldSingle("Address", address);
      }
    }
    if (userData.userPersonal) {
      const personal = userData.userPersonal;
      const ownHome = userData.userPersonal?.full_address?.isYourHome !== undefined ? userData.userPersonal.full_address.isYourHome ? "Yes" : "No" : "";
      addFieldTwoColumn("Nationality", personal.nationality, "Own Home", ownHome);
      const residentOfIndia = personal.isResidentOfIndia !== undefined ? personal.isResidentOfIndia ? "Yes" : "No" : "";
      if (personal.residingCountry || residentOfIndia || personal.visaType) {
        addFieldThreeColumn("Residing Country", personal.residingCountry || "", "Resident of India", residentOfIndia || "", "Visa Type", personal.visaType || "");
      }
    }
    const fileName = userData.user ? `${userData.user.firstName}_${userData.user.lastName}_Biodata_${Date.now()}.pdf`.replace(/\s+/g, "_") : `User_Biodata_${Date.now()}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded successfully!");
  } catch (error) {
    console.error("Download PDF error:", error);
    toast.error(error.response?.data?.message || "Failed to download PDF.");
  }
};
export const updateGovernmentId = async formData => {
  try {
    const response = await axios.put(`${API}/user-personal/upload/government-id`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update Government ID Error:", error.response?.data || error.message);
    throw error;
  }
};
export const updateUserPhoto = async formData => {
  try {
    const response = await axios.put(`${API}/user-personal/upload/photos`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  } catch (error) {
    console.error("❌ Update User Photo Error:", error.response?.data || error.message);
    throw error;
  }
};

export const activateAccount = async (token) => {
  try {
    // If token is not provided, just reactivate the authenticated user
    const response = await axios.post(`${API}/user/account/activate`, token ? { token } : {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Account Activation Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Account activation failed. Please try again."
    };
  }
};

export const getAccountStatus = async () => {
  try {
    const response = await axios.get(`${API}/user/account/status`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Account Status Error:", error.response?.data || error.message);
    return {
      success: false,
      status: 'active',
      message: error.response?.data?.message || "Failed to fetch account status"
    };
  }
};

export const deactivateAccount = async (reason) => {
  try {
    const response = await axios.post(`${API}/user/account/deactivate`, { reason }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Account Deactivation Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Account deactivation failed. Please try again."
    };
  }
};

export const deleteUserAccount = async (reason) => {
  try {
    const response = await axios.delete(`${API}/user/account`, {
      headers: getAuthHeaders(),
      data: { reason }
    });
    return response.data;
  } catch (error) {
    console.error("❌ Delete User Account Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to delete account. Please try again."
    };
  }
};


export const createSupportTicket = async (subject, message, category) => {
  try {
    const payload = { subject, message, description: message, category };
    console.log("Creating ticket with payload:", payload);
    
    const response = await axios.post(`${API}/support/tickets`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Create Support Ticket Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to create support ticket."
    };
  }
};

export const getSupportTickets = async () => {
  try {
    const response = await axios.get(`${API}/support/tickets`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Support Tickets Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to fetch support tickets."
    };
  }
};

export const getSupportTicketDetails = async (ticketId) => {
  try {
    const response = await axios.get(`${API}/support/tickets/${ticketId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get Ticket Details Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to fetch ticket details."
    };
  }
};

export const getFAQs = async () => {
  try {
    const response = await axios.get(`${API}/support/faqs`);
    return response.data;
  } catch (error) {
    console.error("❌ Get FAQs Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to fetch FAQs."
    };
  }
};



export const addTicketMessage = async (ticketId, text) => {
  try {
    const response = await axios.post(`${API}/support/tickets/${ticketId}/messages`, { text }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("❌ Add Ticket Message Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to add message to ticket."
    };
  }
};

export const reportProfile = async (customId, reason, description, reportType) => {
  try {
    // Validate input
    if (!customId || !reason || !description || !reportType) {
      return {
        success: false,
        message: "All fields are required."
      };
    }

    if (description.length < 6 || description.length > 500) {
      return {
        success: false,
        message: "Description must be between 6 and 500 characters."
      };
    }

    const validReportTypes = ['spam', 'abuse', 'hate', 'other'];
    if (!validReportTypes.includes(reportType)) {
      return {
        success: false,
        message: "Invalid report type."
      };
    }

    const response = await axios.post(
      `${API}/report`,
      {
        customId,
        reason,
        description,
        reportType
      },
      {
        headers: getAuthHeaders()
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Report Profile Error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to submit report."
    };
  }
};
