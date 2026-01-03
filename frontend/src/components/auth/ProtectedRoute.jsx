import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import axios from "../../api/http";
const API = import.meta.env.VITE_API_URL;
const ProtectedRoute = ({
  children
}) => {
  const [status, setStatus] = useState("checking");
  const checkAuth = async () => {
    setStatus("checking");
    try {
      await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setStatus("authed");
    } catch (error) {
      const code = error?.response?.status;
      if (code === 401) {
        setStatus("unauth");
      } else {
        setStatus("offline");
      }
    }
  };
  useEffect(() => {
    checkAuth();
  }, []);
  if (status === "checking") {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8A227]"></div>
      </div>;
  }
  if (status === "unauth") {
    return <Navigate to="/login" replace />;
  }
  if (status === "offline") {
    return <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
        <p className="text-lg font-medium">Connection issue. Please check your network and retry.</p>
        <button type="button" onClick={checkAuth} className="px-4 py-2 rounded bg-[#C8A227] text-white hover:opacity-90">
          Retry
        </button>
      </div>;
  }
  return children;
};
export default ProtectedRoute;