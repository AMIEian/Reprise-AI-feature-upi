/**
 * Formatting Utilities
 * Reference: SPEC Section - UI/UX Specifications
 */

// Format price in INR
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
};

// Format date
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format time
export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  return timeString;
};

// Format status for display
export const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').toUpperCase();
};

// Capitalize first letter
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Parse comma-separated pincodes
export const parsePincodes = (pincodes: string): string[] => {
  return pincodes
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
};

// Format countdown timer (seconds to MM:SS)
export const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
