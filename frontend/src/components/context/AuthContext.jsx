import React, { createContext, useState, useEffect } from "react";
import axios from "../../api/http";
import { logoutUser } from "../../api/auth";
import toast from "react-hot-toast";
export const AuthContextr = createContext();
const publicRoutes = ["/login", "/signup", "/verify-otp", "/forgot-password", "/reset-password", "/forgot-username", "/"];
const isPublicRoute = pathname => publicRoutes.includes(pathname);
export const AuthProvider = ({
  children
}) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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
  const login = userData => {
    if (userData && userData.user) {
      setUser(userData.user);
    }
  };
  const logout = async (redirectPath = "/") => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      setUser(null);
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("userRole");
      toast.success("Logged out successfully");
      if (redirectPath) {
        window.location.href = redirectPath;
      }
    }
  };
  return <AuthContextr.Provider value={{
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user
  }}>
      {children}
    </AuthContextr.Provider>;
};