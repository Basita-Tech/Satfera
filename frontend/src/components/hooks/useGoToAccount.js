import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/http";
import { getOnboardingStatus, getProfileReviewStatus } from "../../api/auth";

export const useGoToAccount = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const goToAccount = useCallback(async () => {
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL;
      // Verify session (cookie-based); 401 will be handled by axios interceptor too
      await axios.get(`${API}/auth/me`, { withCredentials: true });

      // Onboarding status
      const os = await getOnboardingStatus();
      const onboardingData = os?.data?.data || os?.data || {};
      const isOnboardingCompleted =
        typeof onboardingData.isOnboardingCompleted !== "undefined"
          ? onboardingData.isOnboardingCompleted
          : Array.isArray(onboardingData.completedSteps)
          ? onboardingData.completedSteps.length >= 6
          : true;

      if (!isOnboardingCompleted) {
        navigate("/onboarding/user");
        return;
      }

      // Profile review status
      const pr = await getProfileReviewStatus();
      if (pr && pr.success && pr.data) {
        const status = pr.data.profileReviewStatus;
        if (status && status !== "approved") {
          navigate("/onboarding/review");
          return;
        }
      }

      // Default: dashboard
      navigate("/dashboard");
    } catch (err) {
      // If session invalid/expired, send to login
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { goToAccount, loading };
};

export default useGoToAccount;
