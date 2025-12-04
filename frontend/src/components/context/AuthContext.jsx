import React, { createContext, useState, useEffect, useCallback } from "react";
import {
  clearClientAuthData,
  initSessionTracking,
} from "../../utils/secureStorage";
import axios from "../../api/http";
import { logoutUser } from "../../api/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export const AuthContextr = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session expiration handler
  const handleSessionExpired = useCallback(() => {
    console.log('[Auth] Frontend session expired after inactivity');
    setUser(null);
    clearClientAuthData();
    toast.error("Your session has expired. Please log in again.");

    // Redirect to login if not already there
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    // On mount, verify session with backend via /auth/me
    let mounted = true;
    const check = async () => {
      try {
        const API = import.meta.env.VITE_API_URL;
        const res = await axios.get(`${API}/auth/me`);
        if (mounted && res?.data?.success) {
          setUser(res.data.user);
        }
      } catch (e) {
        // not authenticated
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    check();

    // Initialize session activity tracking (metadata only)
    const cleanup = initSessionTracking(handleSessionExpired);

    return () => {
      mounted = false;
      cleanup();
    };
  }, [handleSessionExpired]);

  const login = (userData) => {
    // Backend sets httpOnly cookie; frontend should store only minimal user info
    if (userData && userData.user) {
      setUser(userData.user);
      sessionStorage.setItem("user", JSON.stringify(userData.user));
      if (userData.role || userData.Role) {
        sessionStorage.setItem("userRole", userData.role || userData.Role);
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
      clearClientAuthData();
      setUser(null);
      sessionStorage.clear();
      toast.success("Logged out successfully");
    }
  };

  return (
    <AuthContextr.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContextr.Provider>
  );
};
