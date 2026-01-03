import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { allCountries } from "country-telephone-data";
import { forgotPassword, verifyEmailOtp } from "@/api/auth";
import toast from "react-hot-toast";
const ForgotPassword = () => {
  const [resetType, setResetType] = useState("email");
  const [formData, setFormData] = useState({
    emailOrPhone: "",
    countryCode: "+91",
    otp: ""
  });
  const [step, setStep] = useState("input");
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(180);
  const [error, setError] = useState("");
  const intervalRef = useRef(null);
  useEffect(() => {
    if (otpSent && otpExpiry > 0 && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setOtpExpiry(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [otpSent, otpExpiry]);
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "emailOrPhone" && resetType === "email" ? value.toLowerCase() : value
    }));
  };
  const handleSendOtp = async e => {
    if (e) e.preventDefault();
    let emailOrPhone = formData.emailOrPhone;
    if (resetType === "email") emailOrPhone = emailOrPhone.toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (resetType === "email" && !emailRegex.test(emailOrPhone)) {
      setError("Enter a valid email address");
      return;
    }
    const data = await forgotPassword(emailOrPhone);
    if (!data.success) {
      toast.error(data.message);
      return;
    }
    if (data.message) {
      toast.success(data.message);
      setStep("otp");
      setError("");
      setOtpExpiry(180);
      return;
    }
    if (resetType === "mobile" && !/^\d{10}$/.test(emailOrPhone)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setFormData({
      ...formData,
      emailOrPhone,
      otp: ""
    });
    setError("");
    setStep("otp");
    setOtpSent(true);
    setOtpExpiry(180);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };
  const handleVerifyOtp = async e => {
    e.preventDefault();
    if (otpExpiry <= 0) {
      setError("OTP Expired. Please resend OTP.");
      return;
    }
    const data = {
      otp: formData.otp,
      email: resetType === "email" ? formData.emailOrPhone : undefined,
      type: "forgot-password"
    };
    const res = await verifyEmailOtp(data);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success(res.data.message);
    setError("");
    setStep("success");
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };
  const maskEmail = email => {
    if (!email) return "";
    const [user, domain] = email.split("@");
    return user[0] + "****@" + domain;
  };
  const maskPhone = phone => "****" + phone.slice(-4);
  return <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-[#FBFAF7] rounded-lg shadow-2xl p-8">
        {}
        {step === "input" && <>
            <h3 className="text-3xl font-bold text-center text-gray-800 mb-2">
              Forgot Password
            </h3>
            <p className="text-center text-gray-500 mb-6 text-sm">
              Select how you want to receive your OTP.
            </p>

            {}
            <div className="flex justify-center mb-6 gap-2 rounded-md p-1">
              {["email", "mobile"].map(type => <button key={type} onClick={() => {
            setResetType(type);
            setFormData(prev => ({
              ...prev,
              emailOrPhone: ""
            }));
            setError("");
          }} className={`px-6 py-2 rounded-md font-semibold text-sm md:text-base transition ${resetType === type ? "bg-[#D4A052] text-white" : "text-[#D4A052] hover:bg-[#D4A052] bg-transparent border border-[#D4A052]"}`}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>)}
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              {resetType === "email" ? <input type="email" name="emailOrPhone" placeholder="Enter your email" value={formData.emailOrPhone} onChange={handleChange} required autoCapitalize="none" autoComplete="email" style={{
            textTransform: "lowercase"
          }} className="w-full px-4 py-3 rounded-md border border-[#D4A052] focus:ring-2 focus:ring-[#D4A052] outline-none text-gray-800" /> : <div className="flex flex-col sm:flex-row gap-2">
                  <select name="countryCode" value={formData.countryCode} onChange={handleChange} className="w-full sm:w-1/3 px-4 py-3 rounded-md border border-[#D4A052] focus:ring-2 focus:ring-[#D4A052] outline-none text-gray-800">
                    {allCountries.map(c => <option key={c.iso2} value={`+${c.dialCode}`}>
                        {`+${c.dialCode} (${c.name})`}
                      </option>)}
                  </select>
                  <input type="tel" name="emailOrPhone" placeholder="Enter 10-digit mobile number" value={formData.emailOrPhone} onChange={handleChange} required className="w-full sm:w-2/3 px-4 py-3 rounded-md border border-[#D4A052] focus:ring-2 focus:ring-[#D4A052] outline-none text-gray-800" />
                </div>}

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button type="submit" className="w-full py-3 rounded-md bg-[#D4A052] text-white font-semibold hover:bg-[#B3863F] transition">
                Send OTP
              </button>
            </form>
          </>}

        {}
        {step === "otp" && <>
            <h3 className="text-3xl font-bold text-center text-gray-800 mb-2">
              Verify OTP
            </h3>
            <p className="text-gray-500 text-center mb-4 text-sm">
              An OTP has been sent to{" "}
              {resetType === "email" ? maskEmail(formData.emailOrPhone) : maskPhone(formData.emailOrPhone)}
            </p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input type="text" name="otp" placeholder="Enter OTP" value={formData.otp} onChange={handleChange} required disabled={otpExpiry <= 0} className="w-full px-4 py-3 rounded-md border border-[#D4A052] focus:ring-2 focus:ring-[#D4A052] outline-none text-gray-800" />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" disabled={otpExpiry <= 0} className="w-full py-3 rounded-md bg-[#D4A052] text-white font-semibold hover:bg-[#B3863F] transition">
                Verify OTP
              </button>
            </form>
            <div className="text-center mt-2">
              {otpExpiry > 0 ? <p className="text-gray-500 text-sm">
                  OTP expires in {Math.floor(otpExpiry / 60)}m {otpExpiry % 60}s
                </p> : <button onClick={() => handleSendOtp(null)} className="text-[#D4A052] text-sm underline">
                  OTP Expired. Resend OTP
                </button>}
            </div>
          </>}

        {}
        {step === "success" && <div className="text-center">
            <h3 className="text-3xl font-bold text-green-600 mb-3">
              OTP Verified!
            </h3>
            {resetType === "email" ? <>
                <p className="text-gray-500 mb-4">
                  A reset password link has been sent to your registered email.
                </p>
                <a href={`mailto:${formData.emailOrPhone}?subject=Password Reset&body=Click the reset link`} className="w-full inline-block py-3 rounded-md bg-[#D4A052] text-white font-semibold hover:bg-[#B3863F] transition">
                  Open Email
                </a>
              </> : <>
                <p className="text-gray-500 mb-4">
                  A reset password link has been sent via SMS to your mobile
                  number.
                </p>
                <button className="w-full py-3 rounded-md bg-[#D4A052] text-white font-semibold cursor-not-allowed">
                  Check your SMS
                </button>
              </>}
          </div>}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-gray-700 hover:underline font-medium">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>;
};
export default ForgotPassword;