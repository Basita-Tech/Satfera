import React, { useState, useEffect, useContext, useRef } from "react";
import { EyeFill, EyeSlashFill } from "react-bootstrap-icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  loginUser,
  getOnboardingStatus,
  getProfileReviewStatus,
} from "../../api/auth";
import toast from "react-hot-toast";
import { AuthContextr } from "../context/AuthContext";
import axios from "../../api/http";

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toastShownRef = useRef(false);
  const { login: ctxLogin, token: ctxToken } = useContext(AuthContextr);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleUrlToken = () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const redirectTo = params.get("redirectTo");

      if (token) {
        // ✅ Token is now stored in HTTP-only cookie by backend
        // No need to store in localStorage (XSS protection)

        try {
          // Update context if needed for UI state
          if (ctxLogin) ctxLogin({ token });
        } catch (e) {}

        navigate(redirectTo || "/");
        return true;
      }

      return false;
    };

    const checkLoggedInAndRedirect = async () => {
      if (handleUrlToken()) return;

      try {
        // First, verify if user is already authenticated; if not, exit quietly
        const API = import.meta.env.VITE_API_URL;
        try {
          const me = await axios.get(`${API}/auth/me`, {
            withCredentials: true,
          });

          if (!me?.data?.success) {
            return; // not logged in, stay on login page without noise
          }
        } catch (err) {
          // Ignore expected 401s on the login page; only log unexpected issues
          if (err?.response?.status !== 401) {
            console.warn("Pre-login auth check failed:", err);
          }
          return;
        }

        // ✅ Check authentication via API call (cookie sent automatically)
        // No localStorage check needed - more secure!
        const os = await getOnboardingStatus();
        const onboardingData = os?.data?.data || os?.data || {};
        const isOnboardingCompleted =
          typeof onboardingData.isOnboardingCompleted !== "undefined"
            ? onboardingData.isOnboardingCompleted
            : Array.isArray(onboardingData.completedSteps)
            ? onboardingData.completedSteps.length >= 6
            : true;

        if (!isOnboardingCompleted) {
          navigate("/onboarding/user", { replace: true });
          return;
        }

        // Even if review is pending, route to user dashboard by default
        try {
          const pr = await getProfileReviewStatus();
          console.log("Profile review status (login):", pr?.data?.profileReviewStatus);
        } catch (e) {
          console.warn("Review status check failed; continuing to dashboard.", e?.message || e);
        }

        // Default destination (admin dashboard not implemented)
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Error checking logged-in redirect:", err);
      }
    };

    const initialParams = new URLSearchParams(location.search);
    const googleExistsFlag = initialParams.get("googleExists");
    if (googleExistsFlag === "false") {
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast.error(
          "No account found for this Google account. Please sign up or use email/phone login."
        );
      }

      navigate("/login", { replace: true });
      return;
    }

    checkLoggedInAndRedirect();
  }, [ctxToken]);

  const handleAuthResponse = async (apiResponse) => {
    try {
      const resp = apiResponse || {};

      // Update auth context with user data
      if (resp.user) {
        ctxLogin(resp);
      }

      if (resp.redirectTo) {
        navigate(resp.redirectTo);
        return;
      }

      // Default navigation after successful auth
      if (resp.success) {
        navigate("/dashboard");
      }
    } catch (e) {
      console.error("Error handling auth response:", e);
    }
  };

  const handleInputChange = (e) => {
    let value = e.target.value;
    if (e.target.name === "username") value = value.toLowerCase();
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Import sanitization at component level for clarity
    const {
      sanitizeEmail,
      sanitizePhone,
      sanitizePassword,
      containsXSSPatterns,
    } = await import("../../utils/sanitization");

    // Check for XSS attempts
    if (
      containsXSSPatterns(formData.username) ||
      containsXSSPatterns(formData.password)
    ) {
      setError("Invalid input detected. Please remove special characters.");
      setLoading(false);
      return;
    }

    const isEmail = formData.username.includes("@");
    const isPhone = /^[0-9+\-\s()]+$/.test(formData.username);

    if (!isEmail && !isPhone) {
      setError("Enter a valid email or phone number");
      setLoading(false);
      return;
    }

    // Sanitize inputs before sending
    const sanitizedUsername = isEmail
      ? sanitizeEmail(formData.username)
      : sanitizePhone(formData.username);

    const sanitizedPassword = sanitizePassword(formData.password);

    if (!sanitizedUsername || !sanitizedPassword) {
      setError("Invalid credentials format");
      setLoading(false);
      return;
    }

    const payload = {
      password: sanitizedPassword,
      ...(isEmail
        ? { email: sanitizedUsername }
        : { phoneNumber: sanitizedUsername }),
    };

    try {
      const response = await loginUser(payload);
      await handleAuthResponse(response);
    } catch (err) {
      console.error("Login error:", err);
      // Generic error message to prevent user enumeration
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full p-3 text-sm border border-[#D4A052] rounded-md focus:ring-1 focus:ring-[#E4C48A] focus:border-[#E4C48A] outline-none transition";

  return (
    <div className="min-h-screen flex justify-center items-center px-4 bg-gradient-to-br from-background via-cream to-secondary">
      <div className="w-full max-w-sm shadow-xl rounded-2xl p-6 border-t-4 border-[#F9F7F5]">
        {/* Header */}
        <div className="text-center mb-3">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            Welcome Back!
          </h2>
          <p className="text-[#D4A052] text-sm font-medium">
            Sign in to continue your journey
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label
              htmlFor="username"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter Your Username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className={inputClass}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          {/* Password */}
          <div className="mb-3 relative">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Password
            </label>

            {/* ✅ Make this wrapper relative for positioning */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Enter Your Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className={inputClass + " pr-10"}
              />

              {/* ✅ Eye icon perfectly centered vertically */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute w-11 right-0 top-0 bottom-0 p-0 flex justify-center items-center text-gray-500 "
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeSlashFill size={18} />
                ) : (
                  <EyeFill size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          {/* Forgot Links */}
          <div className="flex justify-between text-sm mb-3">
            <Link
              to="/forgot-password"
              className="text-[#D4A052] font-medium hover:underline"
            >
              Forgot Password?
            </Link>
            <Link
              to="/forgot-username"
              className="text-[#D4A052] font-medium hover:underline"
            >
              Forgot Username?
            </Link>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4A052] hover:bg-[#b38b40] text-white font-semibold py-3 text-sm rounded-full shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          {/* Divider */}
          <div className="text-center my-3 text-gray-400 text-sm">OR</div>

          <button
            onClick={() =>
              (window.location.href = `${
                import.meta.env.VITE_API_URL
              }/auth/google/start`)
            }
            className="w-full bg-white gap-2 border rounded-lg flex items-center justify-center py-2 hover:bg-gray-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              x="0px"
              y="0px"
              width="18"
              height="18"
              viewBox="0 0 48 48"
            >
              <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
              ></path>
              <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
              ></path>
              <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
              ></path>
              <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
              ></path>
            </svg>
            Continue with Google
          </button>
        </form>

        {/* Signup link */}
        <p className="text-center text-sm mt-4 text-gray-600">
          Don’t have an account?{" "}
          <Link
            to="/signup"
            className="text-[#D4A052] font-semibold hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
