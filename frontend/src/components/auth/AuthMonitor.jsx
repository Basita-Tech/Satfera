import { useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContextr } from "../context/AuthContext";
import axios from "../../api/http";

/**
 * AuthMonitor - Global authentication state monitor
 * Detects when cookies/localStorage are cleared and redirects to login
 */
const AuthMonitor = () => {
  const { isAuthenticated, logout } = useContext(AuthContextr);
  const navigate = useNavigate();
  const location = useLocation();

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/signup",
    "/verify-otp",
    "/forgot-password",
    "/forgot-username",
    "/",
    "/success",
  ];

  const isPublicRoute = publicRoutes.includes(location.pathname);

  useEffect(() => {
    // Don't monitor on public routes
    if (isPublicRoute) return;
    const authCheckInterval = setInterval(async () => {
      try {
        const API = import.meta.env.VITE_API_URL;
        await axios.get(`${API}/auth/me`, { withCredentials: true });
      } catch (err) {
        logout();
        navigate("/login", { replace: true });
      }
    }, 5000);

    return () => {
      clearInterval(authCheckInterval);
    };
  }, [isAuthenticated, location.pathname, isPublicRoute, logout, navigate]);

  return null;
};

export default AuthMonitor;
