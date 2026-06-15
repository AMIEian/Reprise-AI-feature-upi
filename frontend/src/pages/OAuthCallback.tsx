import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // First attempt to read token from URL fragment (backend includes it there)
        const hash = window.location.hash || "";
        const params = new URLSearchParams(hash.replace(/^#/, ""));
        const tokenFromHash = params.get("access_token");

        if (tokenFromHash) {
          const success = await loginWithToken(tokenFromHash);
          if (success) {
            navigate("/sell-phone");
            return;
          } else {
            setError("Failed to authenticate with token");
            setTimeout(() => navigate("/login"), 3000);
            return;
          }
        }

        // Fallback: if no token in fragment, try the session exchange endpoint
        const response = await api.post(
          "/auth/google/token",
          {},
          { headers: { "x-skip-auth-redirect": "1" } },
        );
        const { access_token } = response.data;
        if (access_token) {
          const success = await loginWithToken(access_token);
          if (success) {
            navigate("/sell-phone");
            return;
          }
        }

        setError("No access token received");
        setTimeout(() => navigate("/login"), 3000);
      } catch (err) {
        console.error(err);
        let errorMessage = "OAuth authentication failed";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "object" && err !== null) {
          const axiosError = err as {
            response?: { data?: { detail?: string } };
          };
          errorMessage = axiosError?.response?.data?.detail || errorMessage;
        }
        setError(errorMessage);
        toast.error("Sign-in failed. Please try signing in again.", {
          description: "Could not complete sign-in or token exchange.",
          action: {
            label: "Retry sign-in",
            onClick: () => navigate("/login"),
          },
          duration: 8000,
        });
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="text-center">
        {error ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Authentication Failed
            </h2>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-2xl font-bold text-gray-900">
              Completing Sign In...
            </h2>
            <p className="text-gray-600">Please wait while we log you in</p>
          </div>
        )}
      </div>
    </div>
  );
}
