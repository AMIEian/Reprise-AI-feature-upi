import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import api from "../lib/api";

interface Admin {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      fetchAdmin();
    } else {
      setLoading(false);
    }
  }, []);

  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem("adminToken");
      setAdmin(null);
      setLoading(false);
      navigate("/login");
    };

    window.addEventListener(
      "unauthorized",
      handleUnauthorized as EventListener,
    );
    return () => {
      window.removeEventListener(
        "unauthorized",
        handleUnauthorized as EventListener,
      );
    };
  }, [navigate]);

  const fetchAdmin = async () => {
    try {
      const response = await api.get("/admin/auth/me");
      setAdmin(response.data);
    } catch (error) {
      console.error("Failed to fetch admin:", error);
      localStorage.removeItem("adminToken");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post("/admin/auth/login", { email, password });
    localStorage.setItem("adminToken", response.data.access_token);
    setAdmin(response.data.admin);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    setAdmin(null);
  };

  const refreshAdmin = async () => {
    await fetchAdmin();
  };

  return (
    <AuthContext.Provider
      value={{ admin, loading, login, logout, refreshAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
