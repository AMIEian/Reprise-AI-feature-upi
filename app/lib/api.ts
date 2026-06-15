/**
 * API Client Configuration
 * Authentication: JWT Bearer tokens
 * Reference: SPEC Section - Authentication & Authorization
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_BASE_URL } from '../config';
const TOKEN_KEY = 'token';
const USER_TYPE_KEY = 'userType';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
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
      console.error('Error reading token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear tokens and redirect to home
      try {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_TYPE_KEY]);
        router.replace('/');
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
    }
    return Promise.reject(error);
  }
);

// Token management utilities
export const tokenManager = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getUserType(): Promise<'partner' | 'agent' | null> {
    const userType = await AsyncStorage.getItem(USER_TYPE_KEY);
    return userType as 'partner' | 'agent' | null;
  },

  async setUserType(type: 'partner' | 'agent'): Promise<void> {
    await AsyncStorage.setItem(USER_TYPE_KEY, type);
  },

  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_TYPE_KEY]);
  },
};

export default api;
