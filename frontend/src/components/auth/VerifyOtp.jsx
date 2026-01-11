import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { verifyEmailOtp, sendEmailOtp } from "../../api/auth";
import toast from "react-hot-toast";
const OTP_VALID_TIME = 180;
const RESEND_AFTER = 60;
const MAX_RESEND = 5;
const LOCK_DURATION = 24 * 60 * 60 * 1000;
const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    email,
    name,
    mobile,
    countryCode,
    fromLogin
  } = location.state || {};
  const [emailOtp, setEmailOtp] = useState(Array(6).fill(""));
  const [emailCountdown, setEmailCountdown] = useState(OTP_VALID_TIME);
  const [resendAttemptsEmail, setResendAttemptsEmail] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(RESEND_AFTER);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const otpRefs = useRef([]); 
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
  useEffect(() => {
    if (!email) {
      // If coming from login, redirect to login, otherwise to signup
      navigate(fromLogin ? "/login" : "/signup");
    }
  }, [email, navigate, fromLogin]);
  useEffect(() => {
    if (emailCountdown > 0 && !isEmailVerified && !isLocked) {
      const t = setInterval(() => setEmailCountdown(p => p - 1), 1000);
      return () => clearInterval(t);
    }
  }, [emailCountdown, isEmailVerified, isLocked]);
  useEffect(() => {
    if (resendCooldown > 0 && !isEmailVerified && !isLocked) {
      const t = setInterval(() => setResendCooldown(prev => Math.max(0, prev - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [resendCooldown, isEmailVerified, isLocked]);
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    if (isVerifying) return;
    const otpArray = [...emailOtp];
    otpArray[index] = value;
    setEmailOtp(otpArray);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (isVerifying) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      const otpArray = [...emailOtp];
      if (otpArray[index]) {
        otpArray[index] = "";
        setEmailOtp(otpArray);
        return;
      }
      if (index > 0) {
        otpArray[index - 1] = ""; 
        setEmailOtp(otpArray);
        otpRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = e => {
    e.preventDefault();
    if (isVerifying) return;
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (!paste.length) return;
    const filled = Array(6).fill("");
    paste.forEach((d, i) => {
      filled[i] = d;
    });
    setEmailOtp(filled);
    const nextIndex = Math.min(paste.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };
  const formatTime = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const handleResend = async () => {
    try {
      if (resendAttemptsEmail >= MAX_RESEND) {
        setError("Email OTP locked for 24 hours");
        return;
      }
      if (resendCooldown > 0) return;
      if (isVerifying) {
        return;
      }
      setIsVerifying(true);
      setError("");
      setSuccessMessage("");
      const res = await sendEmailOtp({
        email,
        type: "signup",
        resendAttempt: resendAttemptsEmail + 1
      });
      const isSuccess = !!(res?.success || res?.data?.success || res?.data?.data?.success);
      if (isSuccess) {
        setEmailCountdown(OTP_VALID_TIME);
        setResendCooldown(RESEND_AFTER);
        setResendAttemptsEmail(prev => prev + 1);
        setEmailOtp(Array(6).fill(""));
        setSuccessMessage("📧 New OTP sent! Please check your email inbox and spam folder.");
        toast.success("📧 OTP resent successfully!");
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        const message = res?.message || res?.data?.message || "Failed to send OTP. Please try again.";
        console.error("❌ Send OTP failed:", message);
        setError(message);
      }
    } catch (err) {
      console.error("❌ Resend OTP Error:", {
        error: err,
        response: err.response?.data,
        status: err.response?.status
      });
      const errorMessage = err.response?.data?.message || "Unable to send OTP. Please check your internet connection and try again.";
      setError(errorMessage);
      if (err.response?.status >= 500) {
        setResendAttemptsEmail(prev => Math.max(0, prev - 1));
      }
    } finally {
      setIsVerifying(false);
    }
  };
  const handleSubmit = async e => {
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
      const res = await verifyEmailOtp({
        email,
        otp: emailValue,
        type: "signup"
      });
      const ok = !!(res?.success || res?.data?.success || res?.data?.data?.success);
      if (ok) {
        setIsEmailVerified(true);
        setSuccessMessage("✅ Email verified successfully!");
        setError("");
        toast.success("✅ Email verified successfully!");
        const token = res?.token || res?.data?.token || res?.data?.data?.token;
        setTimeout(() => {
          navigate("/success", {
            state: {
              name,
              email,
              mobile: countryCode ? `${countryCode}${mobile}`.replace(/\+/, "") : mobile
            }
          });
        }, 1100);
      } else {
        const message = res?.message || res?.data?.message || res?.data?.data?.message || "Incorrect Email OTP";
        setError(message);
        setSuccessMessage("");
      }
      const attempts = res?.failedAttempts || res?.data?.failedAttempts || res?.data?.data?.failedAttempts || 0;
      if (attempts >= MAX_RESEND) {
        setIsLocked(true);
        const lockData = JSON.parse(localStorage.getItem("otpLock")) || {};
        lockData[email] = Date.now();
        localStorage.setItem("otpLock", JSON.stringify(lockData));
        toast.error("❌ Email OTP verification locked for 24 hours");
      }
    } catch (err) {
      console.error("❌ Email OTP Verification Error:", err);
      setError(err.response?.data?.message || "Error verifying OTP");
    } finally {
      setIsVerifying(false);
    }
  };
  return <>
      <style>
        {`\
          .otp-input {\
            width: 2.5rem;\
            height: 2.5rem;\
            border: 1px solid #ccc;\
            border-radius: 0.25rem;\
            text-align: center;\
            font-size: 1.25rem;\
            transition: border 0.2s, box-shadow 0.2s;\
          }\
          .otp-input:focus {\
            outline: none;\
            border: 1px solid #E4C48A;\
            box-shadow: 0 0 5px #E4C48A33;\
          }\
\
          @media (min-width: 640px) {\
            .otp-input {\
              width: 3rem;\
              height: 3rem;\
              font-size: 1.5rem;\
            }\
          }\
        `}
      </style>

      <div className="min-h-screen w-full bg-[#F9F7F5] flex items-center justify-center py-8 px-4">
        <div className="bg-[#FBFAF7] shadow-2xl rounded-3xl w-full max-w-md p-6 sm:p-8">
          <Link to={fromLogin ? "/login" : "/signup"} className="inline-block mb-4 px-3 py-2 bg-[#D4A052] text-white rounded-md font-medium">
            ← Back
          </Link>

          <div className="text-center mb-4">
            <h3 className="text-xl font-semibold mb-2">
              {fromLogin ? "Email Verification Required" : "Verify Email OTP"}
            </h3>
            {fromLogin && <p className="text-sm text-gray-600">
              Your account is not verified. Please verify your email to continue.
            </p>}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <h6 className="font-medium">Email OTP</h6>
              <p className="text-sm text-gray-500">{email}</p>
              <div className="flex justify-center gap-2 mb-2 mt-3">
                {emailOtp.map((digit, idx) => <input
                    key={idx}
                    id={`email-otp-${idx}`}
                    ref={el => {
                    otpRefs.current[idx] = el;
                  }}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    disabled={isEmailVerified || emailCountdown === 0 || isLocked || isVerifying}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="otp-input"
                  />)}
              </div>
              <div className="text-center text-sm mt-2">
                {isVerifying ? <span className="text-blue-600">Verifying...</span> : isEmailVerified ? <span className="text-green-600">✅ Email Verified</span> : isLocked ? <span className="text-red-600">
                    Email OTP locked for 24 hours
                  </span> : emailCountdown <= 0 ? <>
                    <span className="text-red-600 block mb-2">
                      Email OTP expired
                    </span>
                    {resendAttemptsEmail < MAX_RESEND && (resendCooldown > 0 ? <span className="text-xs text-[#8A6F2A]">
                          You can resend in {formatTime(resendCooldown)}
                        </span> : <div className="flex items-center justify-center gap-2">
                          <button type="button" className="inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold transition bg-[#D4A052] text-white border-[#D4A052] hover:bg-[#E4C48A]" onClick={handleResend} disabled={isVerifying}>
                            Resend Email OTP
                          </button>
                        </div>)}
                  </> : <>
                    {resendAttemptsEmail < MAX_RESEND && (resendCooldown > 0 ? <span className="text-xs text-[#8A6F2A]">
                          You can resend in {formatTime(resendCooldown)}
                        </span> : <div className="flex items-center justify-center gap-2">
                          <button type="button" className="inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold transition bg-[#D4A052] text-white border-[#D4A052] hover:bg-[#E4C48A]" onClick={handleResend} disabled={isVerifying || resendCooldown > 0 || isLocked}>
                            Resend Email OTP
                          </button>
                        </div>)}
                    <span className="ml-2 text-gray-500">
                      Valid for {formatTime(emailCountdown)}
                    </span>
                  </>}
              </div>
            </div>

            {successMessage ? <p className="text-green-600 text-center">{successMessage}</p> : error && <p className="text-red-600 text-center">{error}</p>}

            <button type="submit" className="w-full py-3 rounded-xl font-semibold text-white bg-[#D4A052] hover:bg-[#E4C48A] transition" disabled={isLocked || isVerifying}>
              {isVerifying ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        </div>
      </div>
    </>;
};
export default VerifyOTP;