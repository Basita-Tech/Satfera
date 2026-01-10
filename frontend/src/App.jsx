import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthMonitor from "./components/auth/AuthMonitor";
import "./App.css";
import HomePage from "./components/Home/HomePage";
import SuccessPage from "./components/Home/SuccessPage";
import LoginPage from "./components/auth/LoginPage";
import SignUpPage from "./components/auth/SignUpPage";
import VerifyOtp from "./components/auth/VerifyOtp";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import ForgotUsername from "./components/auth/ForgotUsername";
import TermsPage from "./components/pages/TermsPage";
import PrivacyPolicyPage from "./components/pages/PrivacyPolicyPage";
const ProfileCompletion = lazy(() => import("./components/forms/ProfileCompletion"));
const MultiStepForm = lazy(() => import("./components/MultiStepForm"));
const ReviewPage = lazy(() => import("./components/pages/ReviewPage"));
const UserDashboard = lazy(() => import("./components/pages/UserDashboard").then(module => ({
  default: module.UserDashboard
})));
const PageLoader = () => <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin text-[#C8A227] mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>;
function App() {
  return <>
      <ScrollToTop />
      <AuthMonitor />
      <Routes>
        {}
        <Route path="/" element={<HomePage />} />
        <Route path="/success" element={<SuccessPage />} />

        {}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-username" element={<ForgotUsername />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {}
        <Route path="/complete-profile" element={<Suspense fallback={<PageLoader />}>
            <ProfileCompletion />
          </Suspense>} />
        <Route path="/onboarding/user" element={<Suspense fallback={<PageLoader />}>
            <MultiStepForm />
          </Suspense>} />
        <Route path="/onboarding/review" element={<ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ReviewPage />
              </Suspense>
            </ProtectedRoute>} /> 

        {}
        <Route path="/dashboard/*" element={<ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <UserDashboard />
              </Suspense>
            </ProtectedRoute>} />
        {}
        <Route path="/userdashboard/*" element={<ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <UserDashboard />
              </Suspense>
            </ProtectedRoute>} />

        {}

      </Routes>
    </>;
}
export default App;