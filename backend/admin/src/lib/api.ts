import axios from "axios";
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

if (!BASE_URL) {
  console.warn("VITE_API_BASE_URL is not set. API requests may fail.");
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser set multipart boundaries when sending FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        window.dispatchEvent(new CustomEvent("unauthorized"));
      } catch (e) {
        localStorage.removeItem("adminToken");
        window.location.href = "/login";
        console.error(e);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
