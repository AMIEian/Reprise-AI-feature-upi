/**
 * Status Badge Colors
 * Reference: SPEC Section - UI/UX Specifications > Status Badge Colors
 */

export const statusColors: Record<string, string> = {
  lead_created: "#3b82f6", // Blue
  partner_locked: "#9333ea", // Purple
  lead_purchased: "#16a34a", // Green
  assigned_to_agent: "#eab308", // Yellow
  accepted_by_agent: "#16a34a", // Green
  pickup_completed: "#6366f1", // Indigo
  payment_processed: "#10b981", // Emerald
  completed: "#10b981", // Emerald
};

export const getStatusColor = (status: string): string => {
  return statusColors[status] || "#6b7280"; // Default gray
};

// Status text formatting
export const getStatusLabel = (status: string): string => {
  return status.replace(/_/g, " ").toUpperCase();
};
