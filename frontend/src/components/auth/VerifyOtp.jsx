import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  verifySmsOtp,
  verifyEmailOtp,
  sendSmsOtp,
  sendEmailOtp,
} from "../../api/auth";

const OTP_VALID_TIME = 180; // 3 minutes
const RESEND_AFTER = 60; // 1 minute
const MAX_RESEND = 5; // max attempts before lock
const LOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, mobile, name, countryCode } = location.state || {};

  const [emailOtp, setEmailOtp] = useState(Array(6).fill(""));
  const [mobileOtp, setMobileOtp] = useState(Array(6).fill(""));

  const [emailCountdown, setEmailCountdown] = useState(OTP_VALID_TIME);
  const [mobileCountdown, setMobileCountdown] = useState(OTP_VALID_TIME);

  const [resendAttemptsEmail, setResendAttemptsEmail] = useState(0);
  const [resendAttemptsMobile, setResendAttemptsMobile] = useState(0);

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);

  const [isLocked, setIsLocked] = useState({ email: false, mobile: false });
  const [error, setError] = useState("");

  // Load lock state
  useEffect(() => {
    const lockData = JSON.parse(localStorage.getItem("otpLock")) || {};
    const now = Date.now();
    let updated = false;

    Object.keys(lockData).forEach((key) => {
      if (now - lockData[key] >= LOCK_DURATION) {
        delete lockData[key];
        updated = true;
      }
    });

    if (updated) localStorage.setItem("otpLock", JSON.stringify(lockData));

    if (email && lockData[email])
      setIsLocked((prev) => ({ ...prev, email: true }));
    if (mobile && lockData[mobile])
      setIsLocked((prev) => ({ ...prev, mobile: true }));
  }, [email, mobile]);

  // Redirect if no email or mobile
  useEffect(() => {
    if (!email && !mobile) navigate("/signup");
  }, [email, mobile, navigate]);

  // Countdown timers
  useEffect(() => {
    if (emailCountdown > 0 && !isEmailVerified && !isLocked.email) {
      const t = setInterval(() => setEmailCountdown((p) => p - 1), 1000);
      return () => clearInterval(t);
    }
  }, [emailCountdown, isEmailVerified, isLocked.email]);

  useEffect(() => {
    if (mobileCountdown > 0 && !isMobileVerified && !isLocked.mobile) {
      const t = setInterval(() => setMobileCountdown((p) => p - 1), 1000);
      return () => clearInterval(t);
    }
  }, [mobileCountdown, isMobileVerified, isLocked.mobile]);

  // Redirect when verified
  useEffect(() => {
    if (
      (email && isEmailVerified && !mobile) ||
      (mobile && isMobileVerified && !email) ||
      (isEmailVerified && isMobileVerified)
    ) {
      navigate("/success", {
        state: { name: name, email, mobile },
      });
    }
  }, [isEmailVerified, isMobileVerified, email, mobile, name, navigate]);

  // OTP input handler
  const handleOtpChange = (type, index, value) => {
    if (!/^\d?$/.test(value)) return;
    const otpArray = type === "email" ? [...emailOtp] : [...mobileOtp];
    otpArray[index] = value;
    type === "email" ? setEmailOtp(otpArray) : setMobileOtp(otpArray);

    if (value && index < 5) {
      const nextInput = document.getElementById(`${type}-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ✅ Resend handler (fixed)
  const handleResend = async (type) => {
    try {
      if (type === "email") {
        if (resendAttemptsEmail >= MAX_RESEND)
          return alert("Email OTP locked for 24 hours");

        const res = await sendEmailOtp({ email, type: "signup" });

        if (res.success) {
          alert("📧 Email OTP resent successfully!");
          setEmailCountdown(OTP_VALID_TIME);
          setResendAttemptsEmail(resendAttemptsEmail + 1);
          setEmailOtp(Array(6).fill(""));
        } else {
          alert(res.message || "Failed to resend Email OTP");
        }
      }

      if (type === "mobile") {
        if (resendAttemptsMobile >= MAX_RESEND)
          return alert("Mobile OTP locked for 24 hours");

        const res = await sendSmsOtp({
          countryCode,
          phoneNumber: mobile,
          type: "signup",
        });

        if (res.success) {
          alert("📱 Mobile OTP resent successfully!");
          setMobileCountdown(OTP_VALID_TIME);
          setResendAttemptsMobile(resendAttemptsMobile + 1);
          setMobileOtp(Array(6).fill(""));
        } else {
          alert(res.message || "Failed to resend Mobile OTP");
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error resending OTP");
    }
  };

  // ✅ Verify OTP handler (fixed)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isLocked.email && isLocked.mobile) {
      setError("OTP verification locked for 24 hours");
      return;
    }

    const emailValue = emailOtp.join("");
    const mobileValue = mobileOtp.join("");
    let tempError = "";

    try {
      // 🔹 Email OTP
      if (email && !isEmailVerified && !isLocked.email) {
        if (emailValue.length < 6) {
          tempError = "Enter 6-digit Email OTP";
        } else {
          const res = await verifyEmailOtp({
            email,
            otp: emailValue,
            type: "signup",
          });

          if (res.success) {
            setIsEmailVerified(true);
            alert("✅ Email verified successfully!");
            // ✅ Store token if returned
          if (res.token || res.data?.token) {
            localStorage.setItem("authToken", res.token || res.data.token);
          }
          } else {
            tempError = res.message || "Incorrect Email OTP";
          }

          if (res.failedAttempts >= MAX_RESEND) {
            setIsLocked((prev) => ({ ...prev, email: true }));
            const lockData =
              JSON.parse(localStorage.getItem("otpLock")) || {};
            lockData[email] = Date.now();
            localStorage.setItem("otpLock", JSON.stringify(lockData));
            alert("Email OTP locked for 24 hours");
          }
        }
      }

      // 🔹 Mobile OTP
      if (mobile && !isMobileVerified && !isLocked.mobile) {
        if (mobileValue.length < 6) {
          tempError = tempError
            ? tempError + " | Enter 6-digit Mobile OTP"
            : "Enter 6-digit Mobile OTP";
        } else {
          const res = await verifySmsOtp({
            phoneNumber: mobile,
            code: mobileValue,
            countryCode,
          });

          if (res.success) {
            setIsMobileVerified(true);
            
            alert("✅ Mobile verified successfully!");
            // ✅ Store token if returned
          if (res.token || res.data?.token) {
            localStorage.setItem("authToken", res.token || res.data.token);
          }
          } else {
            tempError =
              tempError +
                " | " +
                (res.message || "Incorrect Mobile OTP") || res.message;
          }

          if (res.failedAttempts >= MAX_RESEND) {
            setIsLocked((prev) => ({ ...prev, mobile: true }));
            const lockData =
              JSON.parse(localStorage.getItem("otpLock")) || {};
            lockData[mobile] = Date.now();
            localStorage.setItem("otpLock", JSON.stringify(lockData));
            alert("Mobile OTP locked for 24 hours");
          }
        }
      }

      if (tempError) setError(tempError);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Error verifying OTP");
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

          <h3 className="text-center mb-3">Verify OTP</h3>

          <form onSubmit={handleSubmit}>
            {/* 🔹 Email OTP */}
            {email && (
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
                      disabled={
                        isEmailVerified || emailCountdown === 0 || isLocked.email
                      }
                      value={digit}
                      onChange={(e) =>
                        handleOtpChange("email", idx, e.target.value)
                      }
                      className="otp-input"
                    />
                  ))}
                </div>
                <div className="text-center small mt-2">
                  {isEmailVerified ? (
                    <span className="text-success">✅ Email Verified</span>
                  ) : isLocked.email ? (
                    <span className="text-danger">
                      Email OTP locked for 24 hours
                    </span>
                  ) : emailCountdown <= 0 ? (
                    <span className="text-danger">Email OTP expired</span>
                  ) : (
                    <>
                      {(emailCountdown <= OTP_VALID_TIME - RESEND_AFTER ||emailCountdown<=0) &&
                        resendAttemptsEmail < MAX_RESEND && (
                          <button
                            type="button"
                            className="btn btn-link p-0"
                            onClick={() => handleResend("email")}
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
            )}

            {/* 🔹 Mobile OTP */}
            {mobile && (
              <div className="mb-4">
                <h6>Mobile OTP</h6>
                <p className="text-muted small">
                  {countryCode} {mobile}
                </p>
                <div className="d-flex justify-content-between mb-2">
                  {mobileOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`mobile-otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      disabled={
                        isMobileVerified ||
                        mobileCountdown === 0 ||
                        isLocked.mobile
                      }
                      value={digit}
                      onChange={(e) =>
                        handleOtpChange("mobile", idx, e.target.value)
                      }
                      className="otp-input"
                    />
                  ))}
                </div>
                <div className="text-center small mt-2">
                  {isMobileVerified ? (
                    <span className="text-success">✅ Mobile Verified</span>
                  ) : isLocked.mobile ? (
                    <span className="text-danger">
                      Mobile OTP locked for 24 hours
                    </span>
                  ) : mobileCountdown <= 0 ? (
                    <span className="text-danger">Mobile OTP expired</span>
                  ) : (
                    <>
                      {(mobileCountdown <= OTP_VALID_TIME - RESEND_AFTER ||mobileCountdown<=0) &&
                        resendAttemptsMobile < MAX_RESEND && (
                          <button
                            type="button"
                            className="btn btn-link p-0"
                            onClick={() => handleResend("mobile")}
                          >
                            Resend Mobile OTP
                          </button>
                        )}
                      <span className="ms-2 text-muted">
                        Valid for {formatTime(mobileCountdown)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {error && <p className="text-danger text-center">{error}</p>}

            <button
              type="submit"
              className="btn w-100"
              style={{
                backgroundColor: "#D4A052",
                borderColor: "#D4A052",
                color: "#fff",
              }}
              disabled={isLocked.email && isLocked.mobile}
            >
              Verify OTP
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default VerifyOTP;
