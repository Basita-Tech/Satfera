import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { AuthContextr } from "../context/AuthContext";
import { getOnboardingStatus } from "../../api/auth";

export default function TermsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContextr);
  const [logoHighlighted, setLogoHighlighted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountNavLoading, setAccountNavLoading] = useState(false);

  const handleMyAccount = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (accountNavLoading) return;
    setAccountNavLoading(true);
    try {
      const onboarding = await getOnboardingStatus();
      const data = onboarding?.data?.data || onboarding?.data || {};
      const completedSteps = Array.isArray(data.completedSteps) ? data.completedSteps : [];
      const isOnboardingCompleted = typeof data.isOnboardingCompleted !== "undefined" ? data.isOnboardingCompleted : completedSteps.length >= 6;
      const steps = ["personal", "family", "education", "profession", "health", "expectation", "photos"];

      if (!isOnboardingCompleted || !data.profileReviewStatus) {
        const firstUncompletedStep = steps.find((step) => !completedSteps.includes(step)) || "personal";
        navigate(`/onboarding/user?step=${firstUncompletedStep}`, { replace: true });
        return;
      } else if (data.profileReviewStatus === "pending" || data.profileReviewStatus === "rejected") {
        navigate("/onboarding/review", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Failed to route My Account click:", err);
      navigate("/login", { replace: true });
    } finally {
      setAccountNavLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-beige">
      {/* Home Navbar */}
      <header className="sticky top-0 z-50 shadow bg-[#ebe9e6]">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex justify-between items-center py-3 min-h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <img
              src="/logo.png"
              alt="Satfera Logo"
              width={220}
              height={220}
              onClick={() => setLogoHighlighted((v) => !v)}
              className={`${logoHighlighted ? "border-2 border-[#FFD700] shadow-[0_0_12px_#FFD700]" : ""} object-contain rounded-lg transition duration-200 cursor-pointer h-12 sm:h-14 md:h-16 w-auto sm:scale-100 md:scale-125 origin-left`}
            />
          </div>

          <div className="flex">
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 mx-6">
              <a href="/" className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline text-sm lg:text-base">
                Home
              </a>
              <a href="/#membership" className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline text-sm lg:text-base">
                Membership
              </a>
              <a href="/#success-stories" className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline text-sm lg:text-base">
                Success Stories
              </a>
              <a href="/#contact" className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline text-sm lg:text-base">
                Contact
              </a>
            </nav>

            {/* Auth / CTA */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {isAuthenticated ? (
                <button
                  onClick={handleMyAccount}
                  className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md font-semibold text-[#FFFFFF] bg-[#D4A052] hover:opacity-90 transition text-xs sm:text-sm lg:text-base whitespace-nowrap"
                  disabled={accountNavLoading}
                >
                  {accountNavLoading ? "Loading..." : "My Account"}
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md font-semibold text-[#D4A052] border border-[#D4A052] bg-transparent hover:bg-[#D4A052] hover:text-[#800000] transition no-underline inline-block text-xs sm:text-sm lg:text-base whitespace-nowrap"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md font-semibold bg-[#D4A052] text-white hover:opacity-90 transition no-underline inline-block text-xs sm:text-sm lg:text-base whitespace-nowrap"
                  >
                    Register
                  </Link>
                </>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 sm:p-2 rounded-md text-[#800000] bg-transparent hover:bg-[#E4C48A] transition flex-shrink-0 ml-1 sm:ml-2"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div
          className={`md:hidden bg-[#ebe9e6] border-t border-[#D4A052] transition-all duration-300 ease-in-out overflow-hidden ${mobileMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <nav className="flex flex-col gap-0 px-4 py-2 w-full">
            <a href="/" onClick={() => setMobileMenuOpen(false)} className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline py-2.5 px-2 border-b border-[#E4C48A] text-sm">
              Home
            </a>
            <a href="/#membership" onClick={() => setMobileMenuOpen(false)} className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline py-2.5 px-2 border-b border-[#E4C48A] text-sm">
              Membership
            </a>
            <a href="/#success-stories" onClick={() => setMobileMenuOpen(false)} className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline py-2.5 px-2 border-b border-[#E4C48A] text-sm">
              Success Stories
            </a>
            <a href="/#contact" onClick={() => setMobileMenuOpen(false)} className="text-[#800000] hover:text-[#D4A052] font-semibold transition no-underline py-2.5 px-2 text-sm">
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* Terms Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#800000] mb-3">Terms & Conditions</h1>
        <p className="text-sm text-gray-600 mb-10">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-5 text-gray-700 text-base leading-relaxed">
          <p>
            By registering on <strong>SATFERA</strong>, you give us permission to use your photos, profile details, and other shared information on our website, mobile application, and for sharing with suitable profiles for matchmaking purposes.
          </p>
          <p>
            You confirm that all personal details provided by you, including name, age, contact number, education, financial details, and any other information, are true, correct, and updated.
          </p>
          <p>
            <strong>SATFERA</strong> is only a matchmaking platform. We do not guarantee marriage, engagement, or confirmation of any relationship.
          </p>
          <p>
            If you are interested in any profile, it is your sole responsibility to verify their past, present, financial capacity, family background, and other necessary details before making any decision. SATFERA is not responsible for the authenticity of users' claims.
          </p>
          <p>
            SATFERA will not be held responsible for any issues, disputes, frauds, or misunderstandings arising after marriage, engagement, or any personal interactions. We cannot interfere in the personal life of any member.
          </p>
          <p>
            SATFERA strongly advises all members to exercise caution, conduct independent verification, and use their own judgment before sharing personal, financial, or sensitive information with other members.
          </p>
          <p>
            SATFERA does not conduct criminal background checks or financial verifications of its members. Users are responsible for due diligence.
          </p>
          <p>
            SATFERA will not be liable for any loss, damage, fraud, or emotional/financial harm arising out of interactions with other members.
          </p>
          <p>
            Membership fees or charges paid to SATFERA are non-refundable under any circumstances.
          </p>
          <p>
            By using SATFERA, you agree to abide by our Terms & Conditions and Privacy Policy.
          </p>

          <div className="mt-10 pt-6 border-t border-gray-200">
            <Link to="/" className="text-[#D4A052] hover:opacity-80 font-semibold text-base">Return to Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
