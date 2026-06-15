import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api, { tokenManager } from "../lib/api";
import type { User, SignupPayload } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored token on mount
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      const token = await tokenManager.getToken();
      if (token) {
        await fetchUser(true);
      }
    } catch (error) {
      // Silently fail on initial auth check - user may not be logged in
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async (isInitialCheck = false) => {
    try {
      const response = await api.get("/auth/me/details", {
        headers: isInitialCheck ? { "x-skip-auth-redirect": "1" } : {},
      });
      const data = response.data;

      const mappedUser: User = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        name: data.full_name || data.email.split("@")[0],
        phone: data.phone,
        address: data.address,
        pincode: data.pincode,
        role: "customer",
        latitude: data.latitude,
        longitude: data.longitude,
      };

      setUser(mappedUser);
      await tokenManager.setUser(mappedUser);
    } catch (error) {
      if (!isInitialCheck) {
        console.error("Failed to fetch user:", error);
      }
      await tokenManager.clearAuth();
      setUser(null);
      throw error;
    }
  };

  const login = async (identifier: string, password: string) => {
    const response = await api.post(
      "/auth/login",
      { identifier, password },
      { headers: { "x-skip-auth-redirect": "1" } },
    );

    const token = response.data.access_token;
    await tokenManager.setToken(token);
    await fetchUser();
  };

  const signup = async (payload: SignupPayload) => {
    const response = await api.post("/auth/signup", {
      ...payload,
      role: "customer",
    });

    if (response.status === 200 || response.status === 201) {
      // Auto-login after signup
      await login(payload.phone || payload.email, payload.password);
    }
  };

  const logout = async () => {
    await tokenManager.clearAuth();
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoading: loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
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
