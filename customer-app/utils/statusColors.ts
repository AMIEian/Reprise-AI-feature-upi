// Status color utility for order statuses
export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    lead_created: "#6b7280", // gray
    available_for_partners: "#3b82f6", // blue
    lead_locked: "#8b5cf6", // purple
    lead_purchased: "#6366f1", // indigo
    assigned_to_agent: "#f59e0b", // yellow
    accepted_by_agent: "#06b6d4", // cyan
    pickup_scheduled: "#f97316", // orange
    pickup_completed: "#22c55e", // green
    pickup_completed_declined: "#ef4444", // red
    payment_processed: "#10b981", // emerald
    cancelled: "#ef4444", // red
  };

  return colorMap[status] || "#f59e0b"; // default yellow
};

export const formatStatus = (status: string): string => {
  const statusLabels: Record<string, string> = {
    lead_created: "Order Created",
    available_for_partners: "Finding Partner",
    lead_locked: "Partner Reviewing",
    lead_purchased: "Partner Assigned",
    assigned_to_agent: "Agent Assigned",
    accepted_by_agent: "Agent Accepted",
    pickup_scheduled: "Pickup Scheduled",
    pickup_completed: "Pickup Completed",
    pickup_completed_declined: "Offer Declined",
    payment_processed: "Payment Complete",
    cancelled: "Cancelled",
  };

  return (
    statusLabels[status] ||
    status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
};

export const isCompletedStatus = (status: string): boolean => {
  return ["pickup_completed", "payment_processed"].includes(status);
};

export const isErrorStatus = (status: string): boolean => {
  return ["pickup_completed_declined", "cancelled"].includes(status);
};

export const isInProgressStatus = (status: string): boolean => {
  return [
    "assigned_to_agent",
    "accepted_by_agent",
    "pickup_scheduled",
  ].includes(status);
};
