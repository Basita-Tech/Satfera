import { useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContextr } from "../context/AuthContext";
import { getAuthToken, isSessionActive } from "../../utils/secureStorage";

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
    "/success"
  ];

  const isPublicRoute = publicRoutes.includes(location.pathname);

  useEffect(() => {
    // Don't monitor on public routes
    if (isPublicRoute) return;

    let lastToken = getAuthToken();
    let lastSessionActive = isSessionActive();

    // Check for auth state changes every second
    const authCheckInterval = setInterval(() => {
      const currentToken = getAuthToken();
      const currentSessionActive = isSessionActive();

      // Detect if token was removed or session expired
      if ((lastToken && !currentToken) || (lastSessionActive && !currentSessionActive)) {
        console.log("Auth state changed - cookie removed or session expired");
        logout();
        navigate("/login", { replace: true });
      }

      lastToken = currentToken;
      lastSessionActive = currentSessionActive;
    }, 1000);

    // Listen for storage events (detects sessionStorage clearing)
    const handleStorageChange = (e) => {
      // Check if cookies still exist when storage is cleared
      const currentToken = getAuthToken();
      
      if (!currentToken && !isPublicRoute) {
        console.log("Cookies cleared - redirecting to login");
        logout();
        navigate("/login", { replace: true });
      }
    };

    // Listen for cookie changes (using polling since there's no native cookie change event)
    let lastCookieString = document.cookie;
    const cookieCheckInterval = setInterval(() => {
      const currentCookieString = document.cookie;
      
      // If cookies changed, check if auth token is still present
      if (currentCookieString !== lastCookieString) {
        const currentToken = getAuthToken();
        
        if (!currentToken && !isPublicRoute) {
          console.log("Cookies cleared - redirecting to login");
          logout();
          navigate("/login", { replace: true });
        }
        
        lastCookieString = currentCookieString;
      }
    }, 1000);

    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(authCheckInterval);
      clearInterval(cookieCheckInterval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [isAuthenticated, location.pathname, isPublicRoute, logout, navigate]);

  // This component doesn't render anything
  return null;
};

export default AuthMonitor;
