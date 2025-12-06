import React, { createContext, useState, useEffect, useCallback } from "react";
import {
  clearClientAuthData,
  initSessionTracking,
} from "../../utils/secureStorage";
import axios from "../../api/http";
import { logoutUser } from "../../api/auth";
import toast from "react-hot-toast";

export const AuthContextr = createContext();

const publicRoutes = [
  "/login",
  "/signup",
  "/verify-otp",
  "/forgot-password",
  "/forgot-username",
  "/",
];

const isPublicRoute = (pathname) => publicRoutes.includes(pathname);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session expiration handler
  const handleSessionExpired = useCallback(() => {
    setUser(null);
    clearClientAuthData();
    toast.error("Your session has expired. Please log in again.");

    const currentPath = window.location.pathname;
    if (currentPath !== "/login" && !isPublicRoute(currentPath)) {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
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
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, []);

  // Separate effect to handle session tracking only when user is authenticated
  useEffect(() => {
    if (!user || isLoading) return; // Only track if user is authenticated and done loading

    // Initialize session activity tracking
    const cleanup = initSessionTracking(handleSessionExpired);

    return () => {
      cleanup();
    };
  }, [user, isLoading, handleSessionExpired]);

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

  const logout = async (redirectPath = "/") => {
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
      // Send users to a public page after logout (defaults to the landing page)
      if (redirectPath) {
        window.location.href = redirectPath;
      }
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