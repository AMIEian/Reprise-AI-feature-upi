// Format date to a readable format
export const formatDate = (
  dateStr: string | undefined,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (!dateStr) return "Date unavailable";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(
      "en-IN",
      options || {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    );
  } catch {
    return "Invalid date";
  }
};

export const formatDateTime = (dateStr: string | undefined): string => {
  if (!dateStr) return "Date unavailable";
  try {
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
};

// Format price in INR
export const formatPrice = (price: number | undefined): string => {
  if (price === undefined || price === null) return "₹0";
  return `₹${price.toLocaleString("en-IN")}`;
};

// Validate email format
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validate phone format (Indian 10-digit)
export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return true;
  }
  return cleaned.length === 10;
};

// Normalize phone number
export const normalizePhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  return cleaned;
};

// Validate pincode format (Indian 6-digit)
export const validatePincode = (pincode: string): boolean => {
  return /^\d{6}$/.test(pincode);
};

// Parse RAM from string like "8gb" to number
export const parseRam = (ram: string): number => {
  const match = ram.match(/^(\d+)gb$/i);
  return match ? parseInt(match[1], 10) : 0;
};

// Parse storage from string like "128gb" or "1tb" to number (in GB)
export const parseStorage = (storage: string): number => {
  const gbMatch = storage.match(/^(\d+)gb$/i);
  if (gbMatch) return parseInt(gbMatch[1], 10);
  const tbMatch = storage.match(/^(\d+)tb$/i);
  if (tbMatch) return parseInt(tbMatch[1], 10) * 1024;
  return 0;
};

// Format storage for display
export const formatStorage = (storageGb: number): string => {
  if (storageGb >= 1024) {
    return `${storageGb / 1024}TB`;
  }
  return `${storageGb}GB`;
};

// Get minimum pickup date (tomorrow)
export const getMinPickupDate = (): Date => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
};

// Get available time slots
export const getTimeSlots = (): string[] => {
  return [
    "09:00 AM - 12:00 PM",
    "12:00 PM - 03:00 PM",
    "03:00 PM - 06:00 PM",
    "06:00 PM - 09:00 PM",
  ];
};
