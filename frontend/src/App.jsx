import { Routes, Route } from "react-router-dom";

// 🏠 Home Pages
import HomePage from "./components/Home/HomePage";
import SuccessPage from "./components/Home/SuccessPage";

// 🔐 Auth Pages
import LoginPage from "./components/auth/LoginPage";
import SignUpPage from "./components/auth/SignUpPage";
import VerifyOtp from "./components/auth/VerifyOtp";
import ForgotPassword from "./components/auth/ForgotPassword";
import ForgotUsername from "./components/auth/ForgotUsername";
import { UserDashboard } from "./components/pages/UserDashboard";
// 📋 Form Pages
import ProfileCompletion from "./components/forms/ProfileCompletion";
import MultiStepForm from "./components/MultiStepForm";


// 🧭 Layout Components
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import "./App.css";


function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* 🏠 Home Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/success" element={<SuccessPage />} />

        {/* 🔐 Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-username" element={<ForgotUsername />} />

        {/* 🧾 Profile & Forms */}
        <Route path="/complete-profile" element={<ProfileCompletion />} />
        <Route path="/onboarding/user" element={<MultiStepForm />} />
        {/* <Route
          path="/onboarding/review"
          element={
            <ProtectedRoute>
              <ReviewPage />
            </ProtectedRoute>
          } /> */}

        {/* 👤 Dashboard Route (wildcard handles index + nested) */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        {/* Alias legacy /userdashboard to /dashboard/* if still referenced */}
        <Route
          path="/userdashboard/*"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* ProfileDetails is now handled by nested route inside UserDashboard with proper props */}

      </Routes>
    </>
  );
}

export default App;
