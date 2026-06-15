/**
 * API Client Configuration for Customer App
 * Authentication: JWT Bearer tokens
 */

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { API_BASE_URL } from "../config";

const TOKEN_KEY = "customerToken";
const USER_KEY = "customerUser";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor: Add Authorization header
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error reading token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor: Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Check for skip header
      const skipRedirect =
        error.config?.headers?.["x-skip-auth-redirect"] ||
        error.config?.headers?.["X-Skip-Auth-Redirect"];

      if (!skipRedirect) {
        // Clear tokens and redirect to login
        try {
          await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
          router.replace("/(auth)/login");
        } catch (storageError) {
          console.error("Error clearing storage:", storageError);
        }
      }
    }
    return Promise.reject(error);
  },
);

// Token management utilities
export const tokenManager = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getUser(): Promise<any | null> {
    const user = await AsyncStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  async setUser(user: any): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  },
};

export default api;
