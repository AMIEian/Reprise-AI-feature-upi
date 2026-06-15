import axios from "axios";
import { handleApiError } from "./errorHandler";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let browser set Content-Type with boundary when sending FormData
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if request has skip auth redirect header
    const skipRedirect = error.config?.headers?.["x-skip-auth-redirect"];

    if (error.response?.status === 401 && !skipRedirect) {
      // Show auth error toast and redirect after a delay
      handleApiError(error, "auth");
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("userType");
        window.location.href = "/partner/login";
      }, 3000); // Give user time to see the toast
    } else if (error.response?.status === 403 && !skipRedirect) {
      // Handle account on hold or permission errors
      handleApiError(error, "auth");
    } else {
      // For other errors, let the caller handle with toasts
      // Don't show toast here, let individual calls decide
    }
    return Promise.reject(error);
  },
);

export default api;
