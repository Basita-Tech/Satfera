import axios from "axios";

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
    return response;
  } catch (error) {
    console.error("❌ Signup Error:", error.response?.data || error.message);
  }
};

export const loginUser = async (formData) => {
  try {
    const response = await axios.post(`${API}/auth/login`, formData);
    return response.data;
  } catch (error) {
    console.error("❌ Login Error:", error.response?.data || error.message);
  }
};

export const googleAuth = async (data) => {
  try {
    const response = await axios.post(`${API}/auth/google`, data);
    // include HTTP status so frontend can make decisions based on it
    return { ...(response.data || {}), status: response.status };
  } catch (error) {
    // Return backend payload including HTTP status so frontend can react to 403/401 explicitly
    console.error(
      "❌ Google Auth Check Error:",
      error.response?.data || error.message
    );
    if (error.response && error.response.data) {
      return { ...(error.response.data || {}), status: error.response.status };
    }
    return { success: false, message: error.message, status: null };
  }
};

// Send OTP
export const sendEmailOtp = async (data) => {
  try {
    const response = await axios.post(`${API}/auth/send-email-otp`, data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Send Email OTP Error:",
      error.response?.data || error.message
    );
  }
};

export const sendSmsOtp = async (data) => {
  try {
    const response = await axios.post(`${API}/auth/send-sms-otp`, data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Send SMS OTP Error:",
      error.response?.data || error.message
    );
  }
};

// Verify OTP
export const verifyEmailOtp = async (data) => {
  try {
    const response = await axios.post(`${API}/auth/verify-email-otp`, data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Verify Email OTP Error:",
      error.response?.data || error.message
    );
  }
};

export const verifySmsOtp = async (data) => {
  try {
    const response = await axios.post(`${API}/auth/verify-sms-otp`, data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Verify SMS OTP Error:",
      error.response?.data || error.message
    );
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

// -------------------------------------------------------------
// 🔹 USER PERSONAL DETAILS APIs
// -------------------------------------------------------------

export const saveUserPersonal = async (payload) => {
  try {
    const response = await axios.post(`${API}/user-personal/`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(
      "❌ Save Personal Details Error:",
      error.response?.data || error.message
    );
  }
};

export const getUserPersonal = async () => {
  try {
    const response = await axios.get(`${API}/user-personal/`, {
      headers: getAuthHeaders(),
<<<<<<< HEAD
    }); 
    return response;
=======
    });
    return response.data;
>>>>>>> 80be7a6bfc8fb52d09af7289588fee218622af10
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
<<<<<<< HEAD
    console.error("❌ Update Personal Details Error:", error.response?.data || error.message);
  
=======
    console.error(
      "❌ Update Personal Details Error:",
      error.response?.data || error.message
    );
>>>>>>> 80be7a6bfc8fb52d09af7289588fee218622af10
  }
};

export const saveUserExpectations = async (payload) => {
  try{
  const response= await axios.post(`${API}/user-personal/expectations`, payload, {
    headers: getAuthHeaders(),
  });
  return response
}catch(err){
console.error("❌ Save Expectations Error:", err.response?.data || err.message);
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

export const getUserHealth = async () => {
  try {
    const res = await axios.get(`${API}/user-personal/health`, {
      headers: getAuthHeaders(),
    });
    return res;
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
    return response;
  } catch (error) {
    console.error(
      "❌ Save User Health Error:",
      error.response?.data || error.message
    );
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
  }
};

export const getUserProfession = async () => {
  try {
    const res = await axios.get(`${API}/user-personal/profession`, {
      headers: getAuthHeaders(),
    });
    return res;
  } catch (error) {
    console.error(
      "❌ Get Profession Error:",
      error.response?.data || error.message
    );
  }
};

export const saveUserProfession = async (payload) => {
  try {
    const res = await axios.post(`${API}/user-personal/profession`, payload, {
      headers: getAuthHeaders(),
    });

    return res;
  } catch (error) {
    console.error(
      "❌ Save Profession Error:",
      error.response?.data || error.message
    );
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
    return response.data;
  } catch (error) {
    console.error(
      "❌ Update Profession Error:",
      error.response?.data || error.message
    );
  }
};

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
    console.error("❌ Save Family Details Error:", error.response?.data || error.message);
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

export const saveEducationalDetails = async (data) => {
  try {
    const response = await axios.post(`${API}/user-personal/education/`, data, {
      headers: getAuthHeaders(),
    });
    return response;
  } catch (error) {
    console.error("❌ Save Educational Details Error:", error.response?.data || error.message);
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
// ✅ Update onboarding progress (PUT request)
export const updateOnboardingStatus = async (payload) => {
  try {
    const response = await axios.put(
      `${API}/user-personal/onboarding-status/`,
      payload,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Update Onboarding Status Error:",
      error.response?.data || error.message
    );
  }
};

// ✅ Get onboarding progress (GET request — no payload in GET)
export const getOnboardingStatus = async () => {
  try {
    const response = await axios.get(
      `${API}/user-personal/onboarding-status/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ Get Onboarding Status Error:",
      error.response?.data || error.message
    );
  }
};
