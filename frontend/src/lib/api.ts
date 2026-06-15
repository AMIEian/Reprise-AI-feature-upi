import axios, { AxiosHeaders } from "axios";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Http } from "@capacitor-community/http";

// Create axios instance with base URL
const api = axios.create({
  baseURL: (
    import.meta.env.VITE_API_BASE_URL
  ).replace(/\/$/, ""), // Adjust as needed
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable sending cookies with requests
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // use the same storage key as AuthContext ("accessToken")
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers = config.headers || new AxiosHeaders();
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (Capacitor.isNativePlatform()) {
      const baseURL = config.baseURL || "";
      let url = config.url || "";
      if (url.startsWith("/")) {
        url = baseURL + url;
      } else if (!url.startsWith("http")) {
        url = baseURL + "/" + url;
      }

      // Convert headers to Record<string, string> format required by Capacitor Http
      const headersConfig: Record<string, string> = {};
      if (config.headers) {
        Object.entries(config.headers).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            headersConfig[key] = String(value);
          }
        });
      }

      const methodConfig = config.method?.toUpperCase() || "GET";
      const dataConfig = config.data;

      const requestOptions: any = {
        method: methodConfig,
        url: url,
        headers: headersConfig,
        params: config.params || {}
      };

      if (["POST", "PUT", "PATCH"].includes(methodConfig)) {
        requestOptions.data = dataConfig;
      }

      const response = await Http.request(requestOptions);

      // Reject the promise with the native response to bypass normal Axios network request
      return Promise.reject({
        isNativeResponse: true,
        data: response.data,
        status: response.status
      });
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Intercept our specially crafted native rejection object 
    if (error?.isNativeResponse) {
      // If the native request succeeded, dynamically convert it back to a standard resolved promise
      if (error.status >= 200 && error.status < 300) {
        return Promise.resolve({
          data: error.data,
          status: error.status,
          statusText: "OK",
          headers: {},
          config: error.config || {},
          request: {}
        });
      }
      
      // If it failed natively, transform it into a standard AxiosError structure
      const nativeError = new Error(`Native Request Failed with status ${error.status}`) as any;
      nativeError.response = {
        data: error.data,
        status: error.status,
        headers: {},
      };
      nativeError.isNativeResponse = true;
      error = nativeError;
    }

    if (error.response?.status === 401) {
      // Allow callers to opt out of the global redirect by setting
      // the request header `x-skip-auth-redirect`.
      const headers = error.config?.headers as any;
      const skipHeader =
        headers &&
        (headers["x-skip-auth-redirect"] ||
          headers["X-Skip-Auth-Redirect"] ||
          (typeof headers.get === "function" &&
            (headers.get("x-skip-auth-redirect") ||
              headers.get("X-Skip-Auth-Redirect"))));
      if (!skipHeader) {
        // Show auth error toast instead of silent redirect
        toast.error("Session expired. Please sign in again to continue.", {
          description: "Your login expired or is invalid.",
          action: {
            label: "Sign In",
            onClick: () => {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("currentUser");
              window.location.href = "/login";
            },
          },
          duration: Infinity,
        });
        // Auto-redirect after 10 seconds if user doesn't click
        setTimeout(() => {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("currentUser");
          window.location.href = "/login";
        }, 10000);
      }
    }
    return Promise.reject(error);
  },
);

// keep named export for existing imports and add default export for AuthContext default import
export { api };
export default api;
