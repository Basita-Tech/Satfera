import React, { createContext, useState, useEffect, Children } from "react";

export const AuthContextr = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    if (savedToken) setToken(savedToken);
  }, []);

  const login = (userData) => {
    if (userData && userData.token) {
      localStorage.setItem("authToken", userData.token);
      setToken(userData.token);
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
  };

  return (
    <AuthContextr.Provider value={{ token, login, logout }}>
      {children}
    </AuthContextr.Provider>
  );
};
