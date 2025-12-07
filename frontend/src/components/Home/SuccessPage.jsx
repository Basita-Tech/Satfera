import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get user data from previous page (VerifyOTP)
  const { name, email, mobile } = location.state || {};

  const [userData, setUserData] = useState({
    name: name || "",
    email: email || "",
    mobile: mobile || "",
  });

  useEffect(() => {
    // If no user data, redirect back safely
    if (!userData.name && !userData.email && !userData.mobile) {
      navigate("/signup");
    }
  }, [userData, navigate]);

  const handleCompleteProfile = () => {
    navigate("/onboarding/user", { state: userData }); // ✅ Pass user data to next page
  };
console.log('userData', userData)
  const handleSkip = () => {
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div
        className="shadow-xl rounded-3xl max-w-lg w-full p-8 md:p-10 text-center"
        style={{ backgroundColor: "#FBFAF7" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <img
            src="/logo.png"
            alt="Satfera"
            className="h-20 md:h-24 w-auto drop-shadow-sm"
            style={{ filter: "brightness(1) saturate(1)" }}
            loading="lazy"
          />
        </div>

        {/* Success Icon */}
        <div className="mb-6">
          <div className="inline-flex p-4 rounded-full" style={{ backgroundColor: "#FFF3D6" }}>
            <i className="bi bi-check-circle-fill text-4xl" style={{ color: "#D4A052" }}></i>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            Welcome, {userData?.name}!
          </h2>
          <h3 className="text-[#D4A052] font-semibold mb-2">
            Account Created Successfully!
          </h3>
          <p className="text-gray-600">
            Your account is now active with Satfera. Let’s complete your profile
            to find the best matches.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={handleCompleteProfile}
            style={{ backgroundColor: "#D4A052" }}
            className="hover:opacity-90 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md"
          >
            Complete Profile <i className="bi bi-arrow-right"></i>
          </button>
          <button
            onClick={handleSkip}
            className="border-2 border-[#D4A052] bg-white text-[#D4A052] hover:bg-[#D4A052] hover:text-white py-3 rounded-lg transition-all font-semibold shadow-sm"
          >
            Skip for Now
          </button>
        </div>

        {/* User Info */}
        <div className="text-left p-4 bg-white/70 rounded-lg shadow-inner mb-4 max-h-64 overflow-y-auto">
          <h4 className="font-semibold text-gray-800 mb-2">
            Next Steps to Complete Your Profile:
          </h4>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              <strong>Full Name:</strong> {userData.name}
            </li>
            <li>
              <strong>Email:</strong> {userData.email || "Not Provided"}
            </li>
            <li>
              <strong>Mobile:</strong>{" "}
              {userData.mobile ? `+${userData.mobile}` : "Not Provided"}
            </li>
            <li>Login to your SATFERA account using these details.</li>
            <li>Upload your ID proof (Aadhar, Driving Licence, or Passport).</li>
            <li>Upload clear face & full-length photographs.</li>
            <li>
              Complete personal details – education, profession, lifestyle, etc.
            </li>
          </ul>
          <p className="text-gray-500 mt-2 text-sm">
            ✅ A verified profile increases your chances of better matches.
          </p>
        </div>

        {/* Email Notification */}
        <div className="bg-[#FFF6E5] text-[#D4A052] rounded-lg p-3 text-sm">
          📧 We’ve sent a welcome email to your registered email address.
        </div>
      </div>
    </main>
  );
};

export default SuccessPage;
