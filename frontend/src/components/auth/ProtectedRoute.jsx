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
        // If 401 or any error, user is not authenticated
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const authCheckInterval = setInterval(async () => {
      try {
        await axios.get(`${API}/auth/me`, { withCredentials: true });
        setIsAuthenticated(true);
      } catch (e) {
        setIsAuthenticated(false);
      }
    }, 30000);

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
