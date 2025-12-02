import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import axios from "../../api/http";

const API = import.meta.env.VITE_API_URL;

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const me = await axios.get(`${API}/auth/me`, { withCredentials: true });
        console.log(me, "protected route me");
        setIsAuthenticated(true);
      } catch (error) {
        // Only redirect on 401, not on network errors
        if (error?.response?.status === 401) {
          setIsAuthenticated(false);
        } else {
          // Network error - keep current auth state, don't redirect
          console.warn('Auth check failed (network error):', error.message);
          setIsAuthenticated(true); // Assume still authenticated on network errors
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Check auth less frequently (every 5 minutes instead of 30 seconds)
    const authCheckInterval = setInterval(async () => {
      try {
        await axios.get(`${API}/auth/me`, { withCredentials: true });
        setIsAuthenticated(true);
      } catch (e) {
        // Only update on actual 401 errors
        if (e?.response?.status === 401) {
          setIsAuthenticated(false);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(authCheckInterval);
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
