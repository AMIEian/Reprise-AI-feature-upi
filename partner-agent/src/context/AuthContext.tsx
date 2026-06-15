import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../lib/api";
import { handleApiError } from "../lib/errorHandler";

interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  type: "partner" | "agent";
  credit_balance?: number;
  is_on_hold?: boolean;
  hold_reason?: string;
  hold_lift_date?: string;
  verification_status?: string;
  rejection_reason?: string | null;
  is_active?: boolean;
  created_at?: string;
  is_self_assigned?: boolean;
}

interface HoldInfo {
  reason: string;
  liftDate?: string;
  verificationStatus?: string;
}

interface AuthContextType {
  user: User | null;
  userType: "partner" | "agent" | null;
  loading: boolean;
  holdInfo: HoldInfo | null;
  login: (
    email: string,
    password: string,
    type: "partner" | "agent",
  ) => Promise<void>;
  signup: (
    full_name: string,
    email: string,
    password: string,
    phone: string,
    company_name: string,
    business_address: string,
    udyam_id: string,
    pan_number: string,
    serviceable_pincodes: string[],
    udyamAadharFile?: File | null,
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearHoldInfo: () => void;
  switchToAgentPortal: () => Promise<void>;
  switchToPartnerPortal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<"partner" | "agent" | null>(null);
  const [loading, setLoading] = useState(true);
  const [holdInfo, setHoldInfo] = useState<HoldInfo | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const type = localStorage.getItem("userType") as "partner" | "agent" | null;

    if (token && type) {
      setUserType(type);
      fetchUser(type);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = useCallback(async (type: "partner" | "agent") => {
    try {
      const endpoint = type === "partner" ? "/partner/me" : "/agent/me";
      const response = await api.get(endpoint);
      // normalize name field from backend (`full_name`) to `name` used across frontend
      const data: any = response.data;
      const name = data.full_name ?? data.fullName ?? data.name ?? data.email;
      setUser({ ...data, type, name });
      setUserType(type);
      setHoldInfo(null);
    } catch (error: any) {
      console.error("Failed to fetch user:", error);
      // Check if error is 403 (account on hold/not approved)
      if (error.response?.status === 403) {
        const holdData = error.response?.data;
        setHoldInfo({
          reason: holdData?.detail || "Your account is not yet approved",
          liftDate: holdData?.hold_lift_date,
          verificationStatus: holdData?.verification_status,
        });
        // Keep token but mark user as on hold
        return;
      }
      // Handle other errors with toast
      handleApiError(error, "auth");
      localStorage.removeItem("token");
      localStorage.removeItem("userType");
      setHoldInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (
    email: string,
    password: string,
    type: "partner" | "agent",
  ) => {
    try {
      const endpoint = type === "partner" ? "/partner/login" : "/agent/login";
      const response = await api.post(
        endpoint,
        { email, password },
        {
          headers: { "x-skip-auth-redirect": "true" },
        },
      );

      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("userType", type);
      setUserType(type);
      await fetchUser(type);
    } catch (error: any) {
      // Check if error is 403 (account on hold/not approved)
      if (error.response?.status === 403) {
        const holdData = error.response?.data;
        setHoldInfo({
          reason: holdData?.detail || "Your account is not yet approved",
          liftDate: holdData?.hold_lift_date,
          verificationStatus: holdData?.verification_status,
        });
        // Store the type so we know which portal tried to login
        setUserType(type);
        return;
      }
      // Handle other login errors with toast
      handleApiError(error, "auth");
      throw error;
    }
  };

  const signup = async (
    full_name: string,
    email: string,
    password: string,
    phone: string,
    company_name: string,
    business_address: string,
    udyam_id: string,
    pan_number: string,
    serviceable_pincodes: string[],
    udyamAadharFile?: File | null,
  ) => {
    try {
      const formData = new FormData();
      formData.append("full_name", full_name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("phone", phone);
      formData.append("company_name", company_name);
      formData.append("business_address", business_address);
      if (udyam_id?.trim()) {
        formData.append("udyam_id", udyam_id);
      }
      formData.append("pan_number", pan_number);
      formData.append("serviceable_pincodes", serviceable_pincodes.join(","));
      if (udyamAadharFile) {
        formData.append("udyam_aadhar_image", udyamAadharFile);
      }

      await api.post("/partner/signup", formData, {
        headers: { "x-skip-auth-redirect": "true" },
      });
      // No token issued — partner must wait for admin approval before logging in
    } catch (error: any) {
      handleApiError(error, "auth");
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userType");
    setUser(null);
    setUserType(null);
    setHoldInfo(null);
  };

  const switchToAgentPortal = async () => {
    try {
      const response = await api.post("/partner/switch-to-agent", {});
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("userType", "agent");
      setUserType("agent");
      await fetchUser("agent");
    } catch (error: any) {
      handleApiError(error, "auth");
      throw error;
    }
  };

  const switchToPartnerPortal = async () => {
    try {
      const response = await api.post("/agent/switch-to-partner", {});
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("userType", "partner");
      setUserType("partner");
      await fetchUser("partner");
    } catch (error: any) {
      handleApiError(error, "auth");
      throw error;
    }
  };

  const clearHoldInfo = () => {
    setHoldInfo(null);
  };

  const refreshUser = useCallback(async () => {
    if (userType) {
      await fetchUser(userType);
    }
  }, [userType, fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        loading,
        holdInfo,
        login,
        signup,
        logout,
        refreshUser,
        clearHoldInfo,
        switchToAgentPortal,
        switchToPartnerPortal,
      }}
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
