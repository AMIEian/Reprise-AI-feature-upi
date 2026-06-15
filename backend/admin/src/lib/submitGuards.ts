/**
 * Utility hooks for preventing double-submit and debouncing
 */

import { useCallback, useRef } from "react";

/**
 * Hook to prevent double-submission of forms
 * Returns a wrapper function that can only be called once until reset
 */
export const useSubmitGuard = () => {
  const submittingRef = useRef(false);

  const withGuard = useCallback((fn: () => Promise<void>) => {
    return async () => {
      if (submittingRef.current) {
        return;
      }
      submittingRef.current = true;
      try {
        await fn();
      } finally {
        submittingRef.current = false;
      }
    };
  }, []);

  return { withGuard, isSubmitting: submittingRef.current };
};

/**
 * Hook for debouncing callbacks with a given delay
 * Useful for filter changes, sort changes, etc.
 */
export const useDebounce = (callback: () => void, delay: number = 500) => {
  const timeoutRef = useRef<number | null>(null);

  const debounced = useCallback(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);
  }, [callback, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { debounced, cancel };
};

/**
 * Hook to cancel pending requests on component unmount
 */
export const useAbortController = () => {
  const abortControllerRef = useRef<AbortController>(new AbortController());

  const getSignal = useCallback(() => {
    return abortControllerRef.current.signal;
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current.abort();
    // Create new controller for potential future requests
    abortControllerRef.current = new AbortController();
  }, []);

  return { getSignal, cancel };
};
