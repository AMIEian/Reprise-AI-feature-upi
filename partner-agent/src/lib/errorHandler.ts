import { toast } from "sonner";

export interface NormalizedError {
  classification:
    | "auth"
    | "network"
    | "validation"
    | "business"
    | "critical"
    | "partial"
    | "unknown";
  shortMessage: string;
  userMessage: string;
  actionable: string;
  retryable: boolean;
  persistent: boolean;
  originalError?: any;
}

export const normalizeError = (
  error: any,
  context?: string,
): NormalizedError => {
  // Axios error structure
  const isAxiosError = error.response || error.request;
  const status = error.response?.status;
  const data = error.response?.data;

  // Network errors
  if (!isAxiosError || error.code === "NETWORK_ERROR" || !error.response) {
    return {
      classification: "network",
      shortMessage: "Network Error",
      userMessage:
        "We couldn't reach our servers. Check your internet connection and try again.",
      actionable: "Retry",
      retryable: true,
      persistent: false,
      originalError: error,
    };
  }

  // Auth errors
  if (status === 401) {
    return {
      classification: "auth",
      shortMessage: "Session Expired",
      userMessage:
        "Your session has expired. Please sign in again to continue.",
      actionable: "Sign In",
      retryable: false,
      persistent: true,
      originalError: error,
    };
  }

  if (status === 403) {
    // Check if it's account on hold
    if (data?.detail?.includes("hold") || data?.hold_lift_date) {
      return {
        classification: "business",
        shortMessage: "Account on Hold",
        userMessage:
          "Your account has been placed on hold. Please contact support for assistance.",
        actionable: "Contact Support",
        retryable: false,
        persistent: true,
        originalError: error,
      };
    }
    return {
      classification: "auth",
      shortMessage: "Access Denied",
      userMessage: "You don't have permission to perform this action.",
      actionable: "Contact Support",
      retryable: false,
      persistent: true,
      originalError: error,
    };
  }

  // Validation errors
  if (status === 400 || status === 422) {
    // Handle Pydantic validation errors (array of error objects)
    let userMessage = "Please check your input and try again.";

    if (Array.isArray(data?.detail)) {
      // Pydantic validation error - array of error objects
      const errors = data.detail
        .map((err: any) => {
          if (typeof err === "object" && err.msg) {
            const field = err.loc ? err.loc[err.loc.length - 1] : "field";
            return `${field}: ${err.msg}`;
          }
          return "Invalid input";
        })
        .filter((msg: string) => msg);

      userMessage =
        errors.length > 0
          ? errors.slice(0, 3).join(", ") // Show first 3 errors
          : "Please check your input and try again.";
    } else if (typeof data?.detail === "string") {
      // Regular string error message
      userMessage = data.detail;
    } else if (data?.detail) {
      // Fallback for other detail formats
      userMessage = String(data.detail);
    }

    return {
      classification: "validation",
      shortMessage: "Invalid Input",
      userMessage: userMessage,
      actionable: "Review Input",
      retryable: true,
      persistent: false,
      originalError: error,
    };
  }

  // Business logic errors
  if (status === 409 || status === 423) {
    return {
      classification: "business",
      shortMessage: "Action Not Allowed",
      userMessage:
        data?.detail || "This action cannot be completed at this time.",
      actionable: "Contact Support",
      retryable: false,
      persistent: true,
      originalError: error,
    };
  }

  // Critical flow failures (purchases, completions)
  if (context === "purchase" || context === "complete") {
    return {
      classification: "critical",
      shortMessage: "Action Failed",
      userMessage: `We couldn't complete your ${context}. Please try again or contact support.`,
      actionable: "Retry",
      retryable: true,
      persistent: true,
      originalError: error,
    };
  }

  // Not found
  if (status === 404) {
    return {
      classification: "business",
      shortMessage: "Not Found",
      userMessage:
        "The requested item was not found. It may have been removed or you may not have access.",
      actionable: "Refresh",
      retryable: false,
      persistent: false,
      originalError: error,
    };
  }

  // Server errors
  if (status >= 500) {
    return {
      classification: "network",
      shortMessage: "Server Error",
      userMessage:
        "Our servers are experiencing issues. Please try again later.",
      actionable: "Retry",
      retryable: true,
      persistent: false,
      originalError: error,
    };
  }

  // Unknown
  return {
    classification: "unknown",
    shortMessage: "Something Went Wrong",
    userMessage:
      "An unexpected error occurred. Please try again or contact support.",
    actionable: "Contact Support",
    retryable: true,
    persistent: true,
    originalError: error,
  };
};

export const showErrorToast = (
  normalizedError: NormalizedError,
  onRetry?: () => void,
) => {
  const { userMessage, actionable, retryable, persistent } = normalizedError;

  const toastOptions: any = {
    duration: persistent ? Infinity : 8000,
    action:
      retryable && onRetry
        ? {
            label: actionable,
            onClick: onRetry,
          }
        : actionable === "Sign In"
          ? {
              label: actionable,
              onClick: () => (window.location.href = "/partner/login"),
            }
          : actionable === "Contact Support"
            ? {
                label: actionable,
                onClick: () =>
                  window.open("mailto:support@reprise.ai", "_blank"),
              }
            : undefined,
  };

  if (
    normalizedError.classification === "auth" ||
    normalizedError.classification === "critical"
  ) {
    toast.error(userMessage, toastOptions);
  } else if (
    normalizedError.classification === "validation" ||
    normalizedError.classification === "business"
  ) {
    toast.warning(userMessage, toastOptions);
  } else {
    toast.error(userMessage, toastOptions);
  }
};

export const handleApiError = (
  error: any,
  context?: string,
  onRetry?: () => void,
) => {
  const normalized = normalizeError(error, context);
  showErrorToast(normalized, onRetry);
  return normalized;
};
