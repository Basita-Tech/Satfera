import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { verifyEmailOtp, sendEmailOtp } from "../../api/auth";

const OTP_VALID_TIME = 180; // 3 minutes
const RESEND_AFTER = 60; // 1 minute
const MAX_RESEND = 5; // max attempts before lock
const LOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, name, mobile, countryCode } = location.state || {};

  const [emailOtp, setEmailOtp] = useState(Array(6).fill(""));
  const [emailCountdown, setEmailCountdown] = useState(OTP_VALID_TIME);
  const [resendAttemptsEmail, setResendAttemptsEmail] = useState(0);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Load lock state from localStorage
  useEffect(() => {
    const lockData = JSON.parse(localStorage.getItem("otpLock")) || {};
    const now = Date.now();

    if (lockData[email] && now - lockData[email] < LOCK_DURATION) {
      setIsLocked(true);
    } else if (lockData[email]) {
      delete lockData[email];
      localStorage.setItem("otpLock", JSON.stringify(lockData));
    }
  }, [email]);

  // Redirect if no email
  useEffect(() => {
    if (!email) navigate("/signup");
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (emailCountdown > 0 && !isEmailVerified && !isLocked) {
      const t = setInterval(() => setEmailCountdown((p) => p - 1), 1000);
      return () => clearInterval(t);
    }
  }, [emailCountdown, isEmailVerified, isLocked]);

  // Redirect after success
  // navigation is handled after showing a short success message (see submit handler)

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    if (isVerifying) return; // prevent changes while verifying
    const otpArray = [...emailOtp];
    otpArray[index] = value;
    setEmailOtp(otpArray);
    if (value && index < 5) {
      document.getElementById(`email-otp-${index + 1}`)?.focus();
    }
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Resend Email OTP
  const handleResend = async () => {
    try {
      // Check for max attempts
      if (resendAttemptsEmail >= MAX_RESEND) {
        setError("Email OTP locked for 24 hours");
        return;
      }

      // Prevent multiple requests
      if (isVerifying) {
        return;
      }

      // Start loading state and clear messages
      setIsVerifying(true);
      setError("");
      setSuccessMessage("");

      // Log the attempt
      console.log("🔄 Attempting to resend OTP to:", email);

      // Send the request with required data
      const res = await sendEmailOtp({ 
        email,
        type: "signup",
        resendAttempt: resendAttemptsEmail + 1
      });

      // Handle various response formats
      const isSuccess = !!(
        res?.success || 
        res?.data?.success || 
        res?.data?.data?.success
      );

      if (isSuccess) {
        // Update UI state for success
        setEmailCountdown(OTP_VALID_TIME);
        setResendAttemptsEmail(prev => prev + 1);
        setEmailOtp(Array(6).fill(""));
        setSuccessMessage("📧 New OTP sent! Please check your email inbox and spam folder.");

        // Show instructions alert
        alert("📧 OTP has been sent! Please:\n1. Check your email inbox\n2. Look in your spam/junk folder\n3. Wait a few minutes if not received immediately");
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        // Handle unsuccessful response
        const message = res?.message || res?.data?.message || "Failed to send OTP. Please try again.";
        console.error("❌ Send OTP failed:", message);
        setError(message);
      }
    } catch (err) {
      // Handle error cases with detailed logging
      console.error("❌ Resend OTP Error:", {
        error: err,
        response: err.response?.data,
        status: err.response?.status
      });

      // Set user-friendly error message
      const errorMessage = err.response?.data?.message || 
        "Unable to send OTP. Please check your internet connection and try again.";
      setError(errorMessage);

      // Reset attempts if there's a server error
      if (err.response?.status >= 500) {
        setResendAttemptsEmail(prev => Math.max(0, prev - 1));
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Verify Email OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (isLocked) {
      setError("Email OTP verification locked for 24 hours");
      return;
    }

    const emailValue = emailOtp.join("");
    if (emailValue.length < 6) {
      setError("Enter 6-digit Email OTP");
      return;
    }

    try {
      if (isVerifying) return;
      setIsVerifying(true);

      const res = await verifyEmailOtp({ email, otp: emailValue, type: "signup" });

      // Defensive checks: API might return different shapes
      const ok = !!(
        res?.success ||
        res?.data?.success ||
        res?.data?.data?.success
      );

      if (ok) {
        setIsEmailVerified(true);
        setSuccessMessage("✅ Email verified successfully!");
        setError("");
        // also show an alert for success
        alert("✅ Email verified successfully!");

        // store token if present in any likely location
        const token = res?.token || res?.data?.token || res?.data?.data?.token;
        if (token) localStorage.setItem("authToken", token);

        // navigate after short delay so user sees the success message
        setTimeout(() => {
          navigate("/success", {
            state: {
              name,
              email,
              mobile: countryCode ? `${countryCode}${mobile}`.replace(/\+/, '') : mobile // Remove + and combine country code with mobile
            }
          });
        }, 1100);
      } else {
        // prefer message from common locations
        const message =
          res?.message || res?.data?.message || res?.data?.data?.message ||
          "Incorrect Email OTP";
        setError(message);
        setSuccessMessage("");
      }

      const attempts = res?.failedAttempts || res?.data?.failedAttempts || res?.data?.data?.failedAttempts || 0;
      if (attempts >= MAX_RESEND) {
        setIsLocked(true);
        const lockData = JSON.parse(localStorage.getItem("otpLock")) || {};
        lockData[email] = Date.now();
        localStorage.setItem("otpLock", JSON.stringify(lockData));
        alert("Email OTP locked for 24 hours");
      }
    } catch (err) {
      console.error("❌ Email OTP Verification Error:", err);
      setError(err.response?.data?.message || "Error verifying OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <style>
        {`
          .otp-input {
            width: 3rem;
            height: 3rem;
            border: 1px solid #ccc;
            border-radius: 0.25rem;
            text-align: center;
            font-size: 1.5rem;
            transition: border 0.2s, box-shadow 0.2s;
          }
          .otp-input:focus {
            outline: none;
            border: 1px solid #E4C48A;
            box-shadow: 0 0 5px #E4C48A33;
          }
        `}
      </style>

      <div
        className="d-flex justify-content-center align-items-center min-vh-100"
        style={{ backgroundColor: "#F9F7F5" }}
      >
        <div
          className="card p-4 shadow rounded-4"
          style={{
            maxWidth: "500px",
            width: "100%",
            backgroundColor: "#FBFAF7",
          }}
        >
          <Link
            to="/signup"
            className="btn mb-3"
            style={{
              backgroundColor: "#D4A052",
              color: "#fff",
              borderRadius: "0.25rem",
            }}
          >
            ← Back
          </Link>

          <h3 className="text-center mb-3">Verify Email OTP</h3>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <h6>Email OTP</h6>
              <p className="text-muted small">{email}</p>
              <div className="d-flex justify-content-between mb-2">
                {emailOtp.map((digit, idx) => (
                    <input
                    key={idx}
                    id={`email-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                      disabled={isEmailVerified || emailCountdown === 0 || isLocked || isVerifying}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="otp-input"
                  />
                ))}
              </div>
              <div className="text-center small mt-2">
                {isVerifying ? (
                  <span className="text-primary">Verifying...</span>
                ) : isEmailVerified ? (
                  <span className="text-success">✅ Email Verified</span>
                ) : isLocked ? (
                  <span className="text-danger">Email OTP locked for 24 hours</span>
                ) : emailCountdown <= 0 ? (
                  <>
                    <span className="text-danger d-block mb-2">Email OTP expired</span>
                    {resendAttemptsEmail < MAX_RESEND && (
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={handleResend}
                        disabled={isVerifying}
                      >
                        Resend Email OTP
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {(emailCountdown <= OTP_VALID_TIME - RESEND_AFTER ||
                      emailCountdown <= 0) &&
                      resendAttemptsEmail < MAX_RESEND && (
                        <button
                          type="button"
                          className="btn btn-link p-0"
                          onClick={handleResend}
                          disabled={isVerifying}
                        >
                          Resend Email OTP
                        </button>
                      )}
                    <span className="ms-2 text-muted">
                      Valid for {formatTime(emailCountdown)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {successMessage ? (
              <p className="text-success text-center">{successMessage}</p>
            ) : (
              error && <p className="text-danger text-center">{error}</p>
            )}

            <button
              type="submit"
              className="btn w-100"
              style={{
                backgroundColor: "#D4A052",
                borderColor: "#D4A052",
                color: "#fff",
              }}
              disabled={isLocked || isVerifying}
            >
              {isVerifying ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default VerifyOTP;
