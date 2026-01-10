import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { resetPasswordWithToken } from "@/api/auth";
import toast from "react-hot-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token");
      navigate("/forgot-password");
    }
  }, [token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return "Password must contain at least one special character";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate new password
    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check if passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await resetPasswordWithToken(token, formData.newPassword, formData.confirmPassword);
      
      if (response.success) {
        setSuccess(true);
        toast.success("Password reset successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(response.message || "Failed to reset password");
        toast.error(response.message || "Failed to reset password");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to reset password. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md bg-[#FBFAF7] rounded-lg shadow-2xl p-8">
          <div className="text-center">
            <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-green-600 mb-3">
              Password Reset Successful!
            </h3>
            <p className="text-gray-600 mb-6">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <Link
              to="/login"
              className="inline-block w-full py-3 rounded-md bg-[#D4A052] text-white font-semibold hover:bg-[#B3863F] transition"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-[#FBFAF7] rounded-lg shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center items-center mb-2">
            <Lock size={28} className="text-[#D4A052] mr-2" />
            <h1 className="text-3xl font-bold text-gray-800">
              Reset Password
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                placeholder="Enter new password"
                className="w-full px-4 py-3 pr-10 rounded-md border border-[#D4A052] focus:ring-2 focus:ring-[#D4A052] outline-none text-gray-800"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute w-11 right-0 top-0 bottom-0 p-0 flex justify-center items-center text-white "
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 pr-10 rounded-md border border-[#D4A052] focus:ring-2 focus:ring-[#D4A052] outline-none text-gray-800"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute w-11 right-0 top-0 bottom-0 p-0 flex justify-center items-center text-white "
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-md bg-[#D4A052] text-white font-semibold hover:bg-[#B3863F] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Resetting Password...
              </span>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-gray-700 hover:underline font-medium"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
