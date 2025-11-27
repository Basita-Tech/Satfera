import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import axios from "../../api/http";
import { getAuthToken, isSessionActive } from "../../utils/secureStorage";

const API = import.meta.env.VITE_API_URL;

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if token exists locally
        const token = getAuthToken();
        const sessionActive = isSessionActive();
        
        if (!token || !sessionActive) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // ✅ Verify authentication via API call
        // Cookie is sent automatically with request (withCredentials: true)
        await axios.get(`${API}/user/profile`);
        setIsAuthenticated(true);
      } catch (error) {
        // If 401 or any error, user is not authenticated
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Continuously monitor for cookie/storage clearing (every 2 seconds)
    const authCheckInterval = setInterval(() => {
      const token = getAuthToken();
      const sessionActive = isSessionActive();
      
      // If token is gone, immediately redirect
      if (!token || !sessionActive) {
        setIsAuthenticated(false);
      }
    }, 2000);

    // Listen for storage events (checks cookies when storage changes)
    const handleStorageChange = (e) => {
      const token = getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(authCheckInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8A227]"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
