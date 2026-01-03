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
      try {
        await axios.get(`${API}/auth/me`, {
          withCredentials: true
        });
      } catch (authError) {
        if (authError?.response?.status === 401) {
          navigate("/login");
          setLoading(false);
          return;
        }
        navigate("/login");
        setLoading(false);
        return;
      }
      try {
        const os = await getOnboardingStatus();
        const onboardingData = os?.data?.data || os?.data || {};
        const isOnboardingCompleted = typeof onboardingData.isOnboardingCompleted !== "undefined" ? onboardingData.isOnboardingCompleted : Array.isArray(onboardingData.completedSteps) ? onboardingData.completedSteps.length >= 6 : true;
        if (!isOnboardingCompleted) {
          navigate("/onboarding/user");
          return;
        }
      } catch (err) {
        console.warn("Error checking onboarding status:", err);
      }
      try {
        const pr = await getProfileReviewStatus();
        if (pr && pr.success && pr.data) {
          const status = pr.data.profileReviewStatus;
          if (status && status !== "approved") {
            navigate("/onboarding/review");
            return;
          }
        }
      } catch (err) {
        console.warn("Error checking profile review status:", err);
      }
      navigate("/dashboard");
    } catch (err) {
      console.error("Error in goToAccount:", err);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);
  return {
    goToAccount,
    loading
  };
};
export default useGoToAccount;