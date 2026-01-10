import { useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContextr } from "../context/AuthContext";
import axios from "../../api/http";
const AuthMonitor = () => {
  const {
    isAuthenticated,
    logout
  } = useContext(AuthContextr);
  const navigate = useNavigate();
  const location = useLocation();
  const publicRoutes = ["/login", "/signup", "/verify-otp", "/forgot-password", "/reset-password", "/forgot-username", "/"];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  useEffect(() => {
    if (isPublicRoute) return;
    const authCheckInterval = setInterval(async () => {
      try {
        const API = import.meta.env.VITE_API_URL;
        await axios.get(`${API}/auth/me`, {
          withCredentials: true
        });
      } catch (err) {
        if (err?.response?.status === 401) {
          logout("/login");
        } else {
          console.warn("Auth monitor network error:", err?.message || err);
        }
      }
    }, 10 * 60 * 1000);
    return () => {
      clearInterval(authCheckInterval);
    };
  }, [isAuthenticated, location.pathname, isPublicRoute, logout, navigate]);
  return null;
};
export default AuthMonitor;