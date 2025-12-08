import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { forgotUsername } from "../../api/auth";
import { AuthContextr } from "../context/AuthContext";
import toast from "react-hot-toast";

const ForgotUsername = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContextr);

  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
  });
  const [username, setUsername] = useState("");
  const [usernameType, setUsernameType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Input sanitization
    let sanitizedValue = value;
    if (name === "fullName") {
      // Only allow letters, spaces, and common name characters
      sanitizedValue = value.replace(/[^a-zA-Z\s'-]/g, "").slice(0, 100);
    }
    
    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    setError("");
    
    // Clear username on any input change
    if (username) {
      setUsername("");
      setUsernameType("");
    }
  };

  const validateForm = () => {
    const { fullName, dateOfBirth } = formData;

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return false;
    }

    if (fullName.trim().length < 3) {
      setError("Name must be at least 3 characters long.");
      return false;
    }

    if (!dateOfBirth) {
      setError("Please select your date of birth.");
      return false;
    }

    // Validate age (must be at least 18 years old)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      setError("You must be at least 18 years old.");
      return false;
    }

    if (age > 120) {
      setError("Please enter a valid date of birth.");
      return false;
    }

    return true;
  };

  const maskEmail = (email) => {
    if (!email || !email.includes("@")) return email;
    const [local, domain] = email.split("@");
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${"*".repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}@${domain}`;
  };

  const maskMobile = (mobile) => {
    if (!mobile) return "";
    // Format: +91 9876543210 → +91 ******3210
    return mobile.replace(/(\+\d{1,3})\s?(\d+)(\d{4})$/, (match, code, middle, last) => {
      return `${code} ${"*".repeat(Math.min(middle.length, 6))}${last}`;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Rate limiting on client side (basic protection)
    if (submitAttempts >= 5) {
      setError("Too many attempts. Please wait a few minutes before trying again.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSubmitAttempts((prev) => prev + 1);

    try {
      const response = await forgotUsername({
        fullName: formData.fullName.trim(),
        dateOfBirth: formData.dateOfBirth,
      });

      if (response.success && response.data?.username) {
        const { username: retrievedUsername, type } = response.data;
        setUsername(retrievedUsername);
        setUsernameType(type);
        toast.success("Username retrieved successfully!");
      } else {
        // Security: Don't reveal whether account exists
        setError(
          response.message || 
          "If an account exists with the provided details, the username will be displayed."
        );
      }
    } catch (err) {
      console.error("Forgot username error:", err);
      setError("Unable to process your request. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Get max date for DOB (18 years ago)
  const getMaxDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4EEE4] via-white to-[#F4EEE4] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <Link
              to="/login"
              className="inline-flex items-center text-gray-600 hover:text-[#D4A052] transition-colors mb-4 text-sm font-medium"
              aria-label="Back to login page"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back to Login
            </Link>
            
            <div className="flex justify-center items-center mb-2">
              <Heart 
                size={28} 
                className="text-[#D4A052] mr-2" 
                fill="#D4A052"
                aria-hidden="true"
              />
              <h1 className="text-2xl font-bold text-gray-800">
                Forgot Username
              </h1>
            </div>
            
            <p className="text-sm text-gray-600 mt-2">
              Enter your details to retrieve your username
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label 
                htmlFor="fullName" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                name="fullName"
                autoComplete="name"
                required
                aria-required="true"
                aria-invalid={error && !formData.fullName ? "true" : "false"}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4A052] focus:border-transparent outline-none transition-all text-sm"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                disabled={loading}
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label 
                htmlFor="dateOfBirth" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                autoComplete="bday"
                required
                aria-required="true"
                aria-invalid={error && !formData.dateOfBirth ? "true" : "false"}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4A052] focus:border-transparent outline-none transition-all text-sm"
                value={formData.dateOfBirth}
                onChange={handleChange}
                max={getMaxDate()}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                You must be at least 18 years old
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div 
                role="alert" 
                aria-live="assertive"
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4A052] hover:bg-[#c8a227] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label={loading ? "Retrieving username" : "Retrieve username"}
            >
              {loading ? (
                <>
                  <svg 
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
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
                  Retrieving...
                </>
              ) : (
                "Retrieve Username"
              )}
            </button>
          </form>

          {/* Success Result */}
          {username && (
            <div 
              role="alert"
              aria-live="polite"
              className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4"
            >
              <div className="text-center">
                <div className="text-green-600 font-semibold mb-2">
                  ✅ Username Retrieved Successfully
                </div>
                <div className="text-gray-800 mb-1">
                  Your username is:
                </div>
                <div className="text-lg font-bold text-gray-900 mb-2 break-all">
                  {usernameType === "mobile" ? maskMobile(username) : maskEmail(username)}
                </div>
                <div className="text-xs text-gray-600">
                  ({usernameType === "mobile" ? "Mobile" : "Email"} based login)
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className="mt-4 w-full bg-[#D4A052] hover:bg-[#c8a227] text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Proceed to Login
                </button>
              </div>
            </div>
          )}

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Remembered your username?{" "}
              <Link 
                to="/login" 
                className="text-[#D4A052] hover:text-[#c8a227] font-semibold transition-colors"
              >
                Log In
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Forgot your password?{" "}
              <Link 
                to="/forgot-password" 
                className="text-[#D4A052] hover:text-[#c8a227] font-semibold transition-colors"
              >
                Reset Password
              </Link>
            </p>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Need help?{" "}
            <a 
              href="mailto:support@satfera.com" 
              className="text-[#D4A052] hover:text-[#c8a227] underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotUsername;
