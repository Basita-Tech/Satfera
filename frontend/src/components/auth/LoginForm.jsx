import React, { useState, useEffect } from "react";
import { EyeFill, EyeSlashFill } from "react-bootstrap-icons";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../api/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const LoginForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleUser, setGoogleUser] = useState(null);

  // Load Google script for login
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInDiv"),
          { theme: "outline", size: "large", text: "continue_with", width: 320 }
        );
      }
    };
  }, []);

  // Decode Google JWT
  const parseJwt = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const handleGoogleResponse = (response) => {
    const decoded = parseJwt(response.credential);
    setGoogleUser(decoded);
    console.log("Google User:", decoded);
    // Optionally send decoded info to backend for login/signup
  };

 // Handle input changes
  const handleInputChange = (e) => {
    let value = e.target.value;
    if (e.target.name === "username") value = value.toLowerCase();
    setFormData({ ...formData, [e.target.name]: value });
  };
 // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Determine if username is email or phone
    const isEmail = formData.username.includes("@");
    const isPhone = /^[0-9]+$/.test(formData.username);

    if (!isEmail && !isPhone) {
      setError("Enter a valid email or phone number");
      setLoading(false);
      return;
    }

    const payload = {
      password: formData.password,
      ...(isEmail ? { email: formData.username } : { phoneNumber: formData.username }),
    };

    try {
      const response = await loginUser(payload);
      console.log("Login response:", response);
      console.log("Login successful:", response.data);
      localStorage.setItem("authToken", response.token);

      navigate(response?.redirectTo || "/");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-[#D4A052] rounded-lg focus:ring-1 focus:ring-[#D4A052] focus:border-[#D4A052] outline-none transition";

  return (
    <div className="min-h-screen flex justify-center items-center px-4 bg-gradient-to-br from-background via-cream to-secondary">
      <div className="w-full max-w-sm shadow-xl rounded-2xl p-6 border-t-4 border-[#F9F7F5]">
        {/* Header */}
        <div className="text-center mb-3">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome Back!</h2>
          <p className="text-[#D4A052] text-sm font-medium">Sign in to continue your journey</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
  <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1">
    Username
  </label>
  <input
    type="text"
    id="username"
    name="username"
    placeholder="Enter Your Username"  // ✅ Capitalized here
    value={formData.username}
    onChange={handleInputChange}
    required
    className={inputClass }
    autoCapitalize="none"
    autoCorrect="off"
    spellCheck="false"
  />
</div>


          {/* Password */}
<div className="mb-3 relative">
  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
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
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 focus:outline-none"
      tabIndex={-1}
    >
      {showPassword ? <EyeSlashFill size={18} /> : <EyeFill size={18} />}
    </button>
  </div>
</div>


          {/* Error message */}
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          {/* Forgot Links */}
          <div className="flex justify-between text-sm mb-3">
            <Link to="/forgot-password" className="text-[#D4A052] font-medium hover:underline">
              Forgot Password?
            </Link>
            <Link to="/forgot-username" className="text-[#D4A052] font-medium hover:underline">
              Forgot Username?
            </Link>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4A052] hover:bg-[#b38b40] text-white font-semibold py-2 rounded-full shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          {/* Divider */}
          <div className="text-center my-3 text-gray-400 text-sm">OR</div>

          {/* Google Login */}
          {!googleUser && <div id="googleSignInDiv" className="flex justify-center mb-4"></div>}

          {googleUser && (
            <div className="text-center mt-4 text-gray-700">
              <div className="w-14 h-14 rounded-full bg-[#D4A052] text-white flex items-center justify-center mb-2 text-lg font-bold mx-auto">
                {googleUser.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <h6 className="font-bold">{googleUser.name}</h6>
              <p className="text-sm text-gray-600">{googleUser.email}</p>
              <button
                type="button"
                onClick={() => setGoogleUser(null)}
                className="mt-2 px-4 py-1 border border-[#D4A052] text-[#D4A052] rounded-full text-sm hover:bg-[#FFF8EE] transition-colors"
              >
                Logout Google
              </button>
            </div>
          )}
        </form>

        {/* Signup link */}
        <p className="text-center text-sm mt-4 text-gray-600">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-[#D4A052] font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
