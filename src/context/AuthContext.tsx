"use client";

import {
  createContext, 
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api from "../lib/api"; // Adjust the import based on your project structure
import { toast } from "sonner";
import { Http } from "@capacitor-community/http";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "agent" | "customer" | "admin";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (
    identifier: string,
    password: string,
    role?: "user" | "agent" | "customer",
    name?: string,
  ) => Promise<boolean>;
  loginWithToken: (token: string) => Promise<boolean>;
  signup: (
    email: string,
    password: string,
    role?: "user" | "agent" | "customer",
    name?: string,
    phone?: string,
    address?: string,
    latitude?: number | null,
    longitude?: number | null,
    pincode?: string,
    referralCode?: string,
  ) => Promise<boolean>;
  logout: () => void;
  refreshCurrentUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = (
  (process.env.NEXT_PUBLIC_API_BASE_URL as string)
).replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load user & token from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    const savedToken = localStorage.getItem("accessToken");
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setToken(savedToken);
      } catch (e) {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("accessToken");
      }
    }
  }, []);

  async function fetchMe(token: string) {
    const res = await Http.request({
      method: "GET",
      url: `${API_URL}/auth/me`,
      params: {},
      headers: { 
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      },
    });
    if (res.status >= 400) throw new Error("Failed to fetch user");
    return res.data;
  }

  const login = async (
    identifier: string,
    password: string,
    role?: "user" | "agent" | "customer",
    name?: string,
  ): Promise<boolean> => {
    try {
      const response = await api.post("/auth/login", {
        identifier,
        password,
      }, {
        headers: { "x-skip-auth-redirect": "1" },
      });
      const token = response.data.access_token;
      localStorage.setItem("accessToken", token);
      setToken(token);

      // Fetch user data after login
      const userResponse = await api.get("/auth/me");
      const mappedUser: User = {
        id: String(userResponse.data.id),
        name:
          userResponse.data.full_name ||
          name ||
          userResponse.data.email.split("@")[0],
        email: userResponse.data.email,
        phone: userResponse.data.phone,
        role: (userResponse.data.role as User["role"]) || "customer",
      };
      localStorage.setItem("currentUser", JSON.stringify(mappedUser));
      setUser(mappedUser);
      return true;
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(
        "Login failed. Please check your credentials and try again.",
        {
          description:
            error.response?.data?.detail || "Invalid username or password.",
          duration: 5000,
        },
      );
      return false;
    }
  };

  const signup = async (
    email: string,
    password: string,
    role: "user" | "agent" | "customer" = "customer",
    name?: string,
    phone?: string,
    address?: string,
    latitude?: number | null,
    longitude?: number | null,
    pincode?: string,
    referralCode?: string,
  ): Promise<boolean> => {
    try {
      const payload = {
        email,
        password,
        full_name: name,
        phone,
        role: role === "user" ? "customer" : role,
        address,
        latitude,
        longitude,
        pincode,
        referral_code: referralCode,
      };
      const res = await api.post("/auth/signup", payload);
      if (res.status !== 201 && res.status !== 200) {
        toast.error("Signup failed. Please try again.", {
          description: res.data?.detail || "Unable to create account.",
          duration: 5000,
        });
        return false;
      }
      // auto-login after signup
      return await login(phone || email, password, role, name);
    } catch (error: any) {
      console.error("Signup error:", error.response?.data || error);
      toast.error(
        "Signup failed. Please check your information and try again.",
        {
          description:
            error.response?.data?.detail || "Unable to create account.",
          duration: 5000,
        },
      );
      return false;
    }
  };

  const loginWithToken = async (accessToken: string): Promise<boolean> => {
    try {
      localStorage.setItem("accessToken", accessToken);
      setToken(accessToken);

      // Fetch full user details (includes role) with the token (axios).
      // Skip global 401 redirect so this function can handle failures itself.
      const userResponse = await api.get("/auth/me/details", {
        headers: { "x-skip-auth-redirect": "1" },
      });

      const mappedUser: User = {
        id: String(userResponse.data.id),
        name:
          userResponse.data.full_name || userResponse.data.email.split("@")[0],
        email: userResponse.data.email,
        phone: userResponse.data.phone,
        role: (userResponse.data.role as User["role"]) || "customer",
      };
      localStorage.setItem("currentUser", JSON.stringify(mappedUser));
      setUser(mappedUser);
      return true;
    } catch (err) {
      console.error("loginWithToken axios /auth/me error:", err);

      // Fallback: try using fetch directly (bypasses axios interceptors)
      try {
        // fetch fallback: use /auth/me/details to get role as well
        const fallbackRes = await Http.request({
          method: "GET",
          url: `${API_URL}/auth/me/details`,
          params: {},
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json"
          },
        });
        const userResponseData = fallbackRes.data;

        const mappedUser: User = {
          id: String(userResponseData.id),
          name:
            userResponseData.full_name || userResponseData.email.split("@")[0],
          email: userResponseData.email,
          phone: userResponseData.phone,
          role: (userResponseData.role as User["role"]) || "customer",
        };
        localStorage.setItem("currentUser", JSON.stringify(mappedUser));
        setUser(mappedUser);
        return true;
      } catch (err2) {
        console.error("loginWithToken fetch fallback failed:", err2);
        localStorage.removeItem("accessToken");
        setToken(null);
        toast.error("Authentication failed. Please sign in again.", {
          description: "Could not verify your session.",
          action: {
            label: "Sign In",
            onClick: () => (window.location.href = "/login"),
          },
          duration: 8000,
        });
        return false;
      }
    }
  };

  const refreshCurrentUser = async (): Promise<boolean> => {
    try {
      const res = await api.get("/auth/me/details", {
        headers: { "x-skip-auth-redirect": "1" },
      });
      const data = res.data;
      const mappedUser: User = {
        id: String(data.id),
        name: data.full_name || data.email.split("@")[0],
        email: data.email,
        phone: data.phone,
        role: (data.role as User["role"]) || "customer",
      };
      localStorage.setItem("currentUser", JSON.stringify(mappedUser));
      setUser(mappedUser);
      return true;
    } catch (err) {
      console.error("refreshCurrentUser failed", err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!user,
        login,
        loginWithToken,
        refreshCurrentUser,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
