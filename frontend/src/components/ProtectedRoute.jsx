import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import axios from "../api/http";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children, requireApproval = false }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const API = import.meta.env.VITE_API_URL;
        const response = await axios.get(`${API}/auth/me`, {
          withCredentials: true
        });

        if (response?.data?.success) {
          setUser(response.data.data);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#C8A227] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but onboarding not completed
  if (!user.isOnboardingCompleted) {
    return <Navigate to="/onboarding/user" replace />;
  }

  // If route requires approval and user is not approved
  if (requireApproval && !user.isApproved) {
    return <Navigate to="/onboarding/review" replace />;
  }

  return children;
};

export default ProtectedRoute;
