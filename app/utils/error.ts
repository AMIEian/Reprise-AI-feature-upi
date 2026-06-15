/**
 * Error handling utilities
 */

export const getErrorMessage = (
  error: any,
  defaultMessage: string = "An error occurred",
): string => {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (Array.isArray(detail)) {
      // FastAPI/Pydantic validation errors return an array of objects
      return detail
        .map((err: any) => err.msg || JSON.stringify(err))
        .join("\n");
    }
    if (typeof detail === "string") {
      return detail;
    }
    return JSON.stringify(detail);
  }
  // Fallback to error message if available and not technical garbage
  if (error.message && typeof error.message === "string") {
    // Clean up "AxiosError: " prefix if present
    return error.message.replace(/^AxiosError: ?/, "");
  }

  return defaultMessage;
};
