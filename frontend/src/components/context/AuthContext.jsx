import React, { createContext, useState, useEffect, useCallback } from "react";
import { 
  getAuthToken, 
  setAuthToken, 
  clearAuthToken, 
  initSessionTracking,
  isSessionActive 
} from "../../utils/secureStorage";
import { logoutUser } from "../../api/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export const AuthContextr = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session expiration handler
  const handleSessionExpired = useCallback(() => {
    setToken(null);
    clearAuthToken();
    toast.error("Your session has expired. Please log in again.");
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    // Initialize secure token retrieval with expiry check
    const savedToken = getAuthToken();
    if (savedToken) {
      setToken(savedToken);
    }
    setIsLoading(false);

    // Initialize session activity tracking
    const cleanup = initSessionTracking(handleSessionExpired);

    // Frequent session check (every 1 second) to detect immediate cookie/storage clearing
    const sessionCheckInterval = setInterval(() => {
      const currentToken = getAuthToken();
      const sessionActive = isSessionActive();
      
      // If we had a token but now it's gone or session expired
      if (token && (!currentToken || !sessionActive)) {
        handleSessionExpired();
      }
    }, 1000); // Check every second for immediate detection

    // Listen for storage events (detects clearing in same tab or other tabs)
    const handleStorageChange = (e) => {
      // e.key === null means storage was cleared
      if (e.key === 'authToken' || e.key === null) {
        const currentToken = getAuthToken();
        if (token && !currentToken) {
          handleSessionExpired();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      cleanup();
      clearInterval(sessionCheckInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [token, handleSessionExpired]);

  const login = (userData, rememberMe = false) => {
    if (userData && userData.token) {
      // Use secure token storage with session timeout (cookies only)
      setAuthToken(userData.token, rememberMe);
      setToken(userData.token);
      
      // Store user data in sessionStorage
      if (userData.user) {
        sessionStorage.setItem('user', JSON.stringify(userData.user));
      }
      if (userData.role || userData.Role) {
        sessionStorage.setItem('userRole', userData.role || userData.Role);
      }
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to clear cookies
      await logoutUser();
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // Always clear frontend state regardless of API result
      clearAuthToken();
      setToken(null);
      sessionStorage.clear();
    }
  };

  return (
    <AuthContextr.Provider value={{ 
      token, 
      login, 
      logout, 
      isLoading,
      isAuthenticated: !!token && isSessionActive()
    }}>
      {children}
    </AuthContextr.Provider>
  );
};
