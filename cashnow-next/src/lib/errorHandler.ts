import { toast } from "sonner";

// Error classification types
export type ErrorClassification =
  | "authentication"
  | "authorization"
  | "network"
  | "user-correctable"
  | "business-logic"
  | "timeout"
  | "state-desync"
  | "dependency"
  | "unknown";

// Centralized error handler
export const handleError = (
  error: any,
  context: string,
  options?: {
    showToast?: boolean;
    retryAction?: () => void;
    contactSupport?: boolean;
  },
): ErrorClassification => {
  const {
    showToast = true,
    retryAction,
    contactSupport = false,
  } = options || {};

  // Classify the error
  const classification = classifyError(error);

  if (showToast) {
    showErrorToast(classification, error, context, retryAction, contactSupport);
  }

  return classification;
};

// Classify error based on type and status
const classifyError = (error: any): ErrorClassification => {
  // Network errors
  if (!error.response && error.message?.includes("Network Error")) {
    return "network";
  }

  // Timeout errors
  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return "timeout";
  }

  const status = error.response?.status;

  if (status === 401) return "authentication";
  if (status === 403) return "authorization";
  if (status === 400 || status === 422) return "user-correctable";
  if (status === 429) return "business-logic"; // Rate limit
  if (status >= 500) return "network"; // Server errors
  if (status === 404) return "business-logic";

  // Logical failures (200 with error data)
  if (error.response?.data?.success === false) return "business-logic";

  return "unknown";
};

// Show appropriate toast based on classification
const showErrorToast = (
  classification: ErrorClassification,
  error: any,
  context: string,
  retryAction?: () => void,
  contactSupport?: boolean,
) => {
  const status = error.response?.status;
  const message =
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message;

  switch (classification) {
    case "authentication":
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
      break;

    case "authorization":
      toast.error("Access denied. You don't have permission for this action.", {
        description: "Please contact support if you believe this is an error.",
        duration: 8000,
      });
      break;

    case "network":
      toast.error(
        "We couldn't reach our servers. Check your internet connection and try again.",
        {
          description: "A network or server error occurred.",
          action: retryAction
            ? {
                label: "Retry",
                onClick: retryAction,
              }
            : undefined,
          duration: 8000,
        },
      );
      break;

    case "user-correctable":
      toast.warning(
        "Invalid input. Please check your information and try again.",
        {
          description: message || "Please review the form fields.",
          duration: 5000,
        },
      );
      break;

    case "business-logic":
      if (status === 422 || message?.includes("validation")) {
        toast.warning(
          "We couldn't process your request. Please check your details.",
          {
            description: message || "Business validation failed.",
            action: retryAction
              ? {
                  label: "Retry",
                  onClick: retryAction,
                }
              : undefined,
            duration: 6000,
          },
        );
      } else {
        toast.warning(
          "Action unavailable. Please try again or contact support.",
          {
            description: message || "A business rule prevented this action.",
            action: contactSupport
              ? {
                  label: "Contact Support",
                  onClick: () =>
                    window.open("mailto:support@example.com", "_blank"),
                }
              : undefined,
            duration: 6000,
          },
        );
      }
      break;

    case "timeout":
      toast.error("Request timed out. Please try again.", {
        description: "The operation took too long to complete.",
        action: retryAction
          ? {
              label: "Retry",
              onClick: retryAction,
            }
          : undefined,
        duration: 8000,
      });
      break;

    case "state-desync":
      toast.info(
        "Data may be out-of-date. Please refresh to see latest information.",
        {
          action: {
            label: "Refresh",
            onClick: () => window.location.reload(),
          },
          duration: 6000,
        },
      );
      break;

    case "dependency":
      toast.error("Service unavailable. Please try again later.", {
        description: "A required service is currently unavailable.",
        duration: 8000,
      });
      break;

    default:
      toast.error(
        "Something went wrong. Please refresh the page or try again.",
        {
          description: "An unexpected error occurred.",
          action: contactSupport
            ? {
                label: "Contact Support",
                onClick: () =>
                  window.open("mailto:support@example.com", "_blank"),
              }
            : undefined,
          duration: 10000,
        },
      );
      break;
  }
};

// Specific handlers for common scenarios
export const handleAuthError = (error: any, retryAction?: () => void) => {
  return handleError(error, "authentication", { retryAction });
};

export const handleNetworkError = (error: any, retryAction?: () => void) => {
  return handleError(error, "network", { retryAction });
};

export const handleOrderCreationError = (
  error: any,
  retryAction?: () => void,
) => {
  toast.error(
    "We couldn't create your order. Your payment was not processed.",
    {
      description: "A server error or validation prevented order creation.",
      action: {
        label: "Retry",
        onClick: retryAction || (() => {}),
      },
      duration: Infinity,
    },
  );
};

export const handleOAuthError = (error: any, retryAction?: () => void) => {
  toast.error("Sign-in failed. Please try signing in again.", {
    description: "Could not complete sign-in or token exchange.",
    action: retryAction
      ? {
          label: "Retry sign-in",
          onClick: retryAction,
        }
      : undefined,
    duration: 8000,
  });
};

export const handlePredictionError = (
  error: any,
  proceedAction?: () => void,
) => {
  toast.warning(
    "We couldn't estimate a final price right now. You can continue to checkout, and an agent will confirm the price.",
    {
      description: "Price prediction service is currently unavailable.",
      action: proceedAction
        ? {
            label: "Continue Anyway",
            onClick: proceedAction,
          }
        : undefined,
      duration: 8000,
    },
  );
};
