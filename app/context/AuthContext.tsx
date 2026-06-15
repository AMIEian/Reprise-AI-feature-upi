import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api, { tokenManager } from "../lib/api";
import type { User } from "../types";
import { registerForPushNotificationsAsync } from "../lib/notifications";

interface AuthContextType {
  user: User | null;
  userType: "partner" | "agent" | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
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
    udyamImageUri?: string | null,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchToAgentPortal: () => Promise<void>;
  switchToPartnerPortal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<"partner" | "agent" | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored token on mount
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      const [token, storedType] = await Promise.all([
        tokenManager.getToken(),
        tokenManager.getUserType(),
      ]);

      if (token && storedType) {
        setUserType(storedType);
        await fetchUser(storedType, true);
      }
    } catch (error) {
      // Silently fail on initial auth check - user may not be logged in
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async (
    type: "partner" | "agent",
    isInitialCheck = false,
  ) => {
    try {
      const endpoint = type === "partner" ? "/partner/me" : "/agent/me";
      const response = await api.get(endpoint);
      const data = response.data;

      // Normalize name field from backend (full_name) to name
      const name = data.full_name ?? data.fullName ?? data.name ?? data.email;
      console.log("FETCH USER RESPONSE:", data);
      setUser({
        ...data,
        id: data.id,
        type,
        name,
      });
      setUserType(type);
    } catch (error) {
      // Only log errors if not during initial check (user interaction)
      if (!isInitialCheck) {
        console.error("Failed to fetch user:", error);
      }
      await tokenManager.clearAuth();
      throw error;
    }
  };

  const login = async (
    email: string,
    password: string,
    type: "partner" | "agent",
  ) => {
    const endpoint = type === "partner" ? "/partner/login" : "/agent/login";
    const response = await api.post(endpoint, { email, password });

    const token = response.data.access_token;
    await tokenManager.setToken(token);
    await tokenManager.setUserType(type);

    setUserType(type);
    await fetchUser(type);

    setTimeout(async () => {
      try {
        console.log("STARTING PUSH TOKEN REGISTRATION");

        const expoPushToken = await registerForPushNotificationsAsync();

        console.log("EXPO TOKEN RECEIVED:", expoPushToken);

        if (!expoPushToken) {
          console.log("NO EXPO TOKEN GENERATED");
          return;
        }

        const endpoint =
          type === "partner"
            ? "/partner/save-fcm-token"
            : "/agent/save-fcm-token";

        console.log("SAVING TOKEN TO:", endpoint);

        const response = await api.post(endpoint, {
          token: expoPushToken,
        });

        console.log("TOKEN SAVE RESPONSE:", response.data);
      } catch (err) {
        console.log("PUSH TOKEN ERROR:", err);
      }
    }, 1000);
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
    udyamImageUri?: string | null,
  ) => {
    const formData = new FormData();
    formData.append("full_name", full_name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("phone", phone);
    formData.append("company_name", company_name);
    formData.append("business_address", business_address);
    formData.append("udyam_id", udyam_id);
    formData.append("pan_number", pan_number);
    formData.append("serviceable_pincodes", serviceable_pincodes.join(","));
    if (udyamImageUri) {
      const filename = udyamImageUri.split("/").pop() ?? "udyam.jpg";
      const match = /\.([a-zA-Z]+)$/.exec(filename);
      const mimeType = match ? `image/${match[1].toLowerCase()}` : "image/jpeg";
      formData.append("udyam_aadhar_image", {
        uri: udyamImageUri,
        name: filename,
        type: mimeType,
      } as any);
    }

    await api.post("/partner/signup", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // No token issued — partner must wait for admin approval before logging in
  };

  const logout = async () => {
    // Clear auth immediately
    await tokenManager.clearAuth();
    // Force state update synchronously
    setUser(null);
    setUserType(null);
    // Brief loading state to ensure UI updates
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 50);
  };

  const refreshUser = async () => {
    if (userType) {
      await fetchUser(userType);
    }
  };

  const switchToAgentPortal = async () => {
    const response = await api.post("/partner/switch-to-agent", {});
    const token = response.data.access_token;
    await tokenManager.setToken(token);
    await tokenManager.setUserType("agent");
    setUserType("agent");
    await fetchUser("agent");
  };

  const switchToPartnerPortal = async () => {
    const response = await api.post("/agent/switch-to-partner", {});
    const token = response.data.access_token;
    await tokenManager.setToken(token);
    await tokenManager.setUserType("partner");
    setUserType("partner");
    await fetchUser("partner");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        loading,
        isLoading: loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
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
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export default AuthProvider;
