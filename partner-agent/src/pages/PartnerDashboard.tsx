import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { handleApiError } from "../lib/errorHandler";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import { HoldNotificationBanner } from "../components/HoldNotificationBanner";
import PickupDetailsModal from "../components/PickupDetailsModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { formatPrice } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import socket from "../lib/socket";

import { LocalNotifications } from "@capacitor/local-notifications";

interface Lead {
  id: number;
  customer_id: number;
  customer_name: string;
  brand: string;
  model: string;
  ram_gb: number;
  storage_gb: number;
  ai_estimated_price: number;
  final_quoted_price: number;
  ai_reasoning: string;
  status: string;
  created_at: string;
  lead_locked_at?: string;
  lead_lock_expires_at?: string;
  purchased_at?: string;
  assigned_at?: string;
  accepted_at?: string;
  completed_at?: string;
  agent_id?: number;
  agent_name?: string;
  agent_phone?: string;
  pickup_pincode?: string;
  pickup_city?: string;
  pickup_state?: string;
  lead_cost?: number;
  time_remaining?: number;
}

interface Agent {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export default function PartnerDashboard() {
  const { user, logout, refreshUser, switchToAgentPortal } = useAuth();
  const navigate = useNavigate();
  const [switchingToAgent, setSwitchingToAgent] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "lead_locked"
    | "lead_purchased"
    | "accepted_by_agent"
    | "pickup_completed"
    | "credits"
  >("lead_locked");
  const [leadLockedDeals, setLeadLockedDeals] = useState<Lead[]>([]);
  const [leadPurchasedOrders, setLeadPurchasedOrders] = useState<Lead[]>([]);
  const [acceptedByAgentLeads, setAcceptedByAgentLeads] = useState<Lead[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assigningOrder, setAssigningOrder] = useState<number | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [showPickupDetailsModal, setShowPickupDetailsModal] = useState(false);
  const [selectedOrderIdForPickup, setSelectedOrderIdForPickup] = useState<
    number | null
  >(null);

  // Loading states
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [purchasingLoading, setPurchasingLoading] = useState<number | null>(
    null,
  );

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    fetchAllData();
    fetchAgents();
    fetchPaymentRequests();

    // Register agent socket
    socket.emit("register_agent", {
      user_id: user?.id,
      role: "partner",
    });

    // Listen for new orders
    socket.on("new_order", async (data) => {
      console.log("New Order:", data);

      // Native mobile notification
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "New Order Available",
            body: `${data.brand} ${data.model} - ₹${data.quoted_price}`,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: "beep.wav",
          },
        ],
      });

      // Refresh dashboard automatically
      fetchAllData();

      // Optional popup
      alert(`New Order!\n${data.brand} ${data.model}\n₹${data.quoted_price}`);
    });

    return () => {
      socket.off("new_order");
    };
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await api.get("/partner/agents");
      setAgents(response.data || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      handleApiError(error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const lockedResponse = await api.get("/partner/locked-deals");
      setLeadLockedDeals(lockedResponse.data || []);

      const response = await api.get("/partner/orders");
      const orders: Lead[] = response.data;

      setLeadPurchasedOrders(
        orders.filter((order) => order.status === "lead_purchased"),
      );

      setAcceptedByAgentLeads(
        orders.filter(
          (order) =>
            order.status === "assigned_to_agent" ||
            order.status === "accepted_by_agent",
        ),
      );

      setCompletedOrders(
        orders.filter(
          (order) =>
            order.status === "pickup_completed" ||
            order.status === "payment_processed" ||
            order.status === "completed",
        ),
      );
    } catch (error) {
      console.error("Failed to fetch data:", error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const response = await api.get("/partner/payment-requests");
      setPaymentRequests(response.data.requests || []);
    } catch (error) {
      console.error("Failed to fetch payment requests:", error);
    }
  };

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<
    "select_plan" | "payment_proof"
  >("select_plan");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<number | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>("");

  const openBuyModal = async () => {
    try {
      const resp = await api.get("/partner/credit-plans");
      setPlans(resp.data || []);
      setShowBuyModal(true);
    } catch (err) {
      console.error("Failed to load credit plans:", err);
      handleApiError(err);
    }
  };

  const handleBuyPlan = (planId: number) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    // Do NOT create the payment request yet. Only open the payment proof step.
    setSelectedPlan(plan);
    setPaymentStep("payment_proof");
  };

  const handleUploadScreenshot = async () => {
    if (!screenshot) {
      alert("Please select a screenshot");
      return;
    }

    setPurchaseLoading(true);
    try {
      // If a payment request hasn't been created yet, create it now using the selected plan
      let requestId = paymentRequestId;
      if (!requestId) {
        if (!selectedPlan) throw new Error("Selected plan missing");
        const createResp = await api.post(
          "/partner/payment-request",
          new URLSearchParams({ plan_id: selectedPlan.id.toString() }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
        );
        requestId = createResp.data.request_id;
        setPaymentRequestId(requestId);
      }

      const formData = new FormData();
      formData.append("screenshot", screenshot);

      await api.post(
        `/partner/payment-request/${requestId}/upload-screenshot`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      alert(
        "Screenshot uploaded successfully! Admin will review your payment.",
      );
      setShowBuyModal(false);
      setPaymentStep("select_plan");
      setSelectedPlan(null);
      setPaymentRequestId(null);
      setScreenshot(null);
      setScreenshotPreview("");
      await refreshUser();
      await fetchAllData();
    } catch (err: any) {
      console.error("Upload failed:", err);
      handleApiError(err, "upload screenshot");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("File size must be less than 5MB");
      return;
    }

    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAssignAgent = async (orderId: number, agentId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "Assign Agent",
      message: "Assign this order to the selected agent?",
      onConfirm: async () => {
        setAssigningLoading(true);
        try {
          await api.post(
            `/partner/orders/${orderId}/assign?agent_id=${agentId}`,
          );
          alert("Order assigned successfully");
          setAssigningOrder(null);
          setSelectedAgent(null);
          await fetchAllData();
        } catch (err: any) {
          console.error("Assignment failed:", err);
          handleApiError(err);
        } finally {
          setAssigningLoading(false);
          setConfirmDialog({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: () => {},
          });
        }
      },
    });
  };

  const handlePurchaseLockedDeal = async (orderId: number) => {
    try {
      const infoResponse = await api.get(
        `/partner/lead-purchase-info/${orderId}`,
      );
      const info = infoResponse.data;

      if (!info.has_sufficient_credits) {
        alert(
          `Insufficient credits! You need ₹${info.shortage_amount} more credits. Current balance: ₹${info.current_balance}`,
        );
        return;
      }

      const confirmMsg = `Purchase this lead for ₹${info.lead_cost} credits?\n\nPhone: ${info.brand} ${info.model}\nPrice: ₹${info.final_quoted_price}\n\nYour balance will be: ₹${info.balance_after}`;

      setConfirmDialog({
        isOpen: true,
        title: "Purchase Lead",
        message: confirmMsg,
        onConfirm: async () => {
          setPurchasingLoading(orderId);
          try {
            await api.post(`/sell-phone/partner/leads/${orderId}/purchase`);
            alert("Lead purchased successfully!");
            await refreshUser();
            await fetchAllData();
          } catch (err: any) {
            console.error("Purchase failed:", err);
            handleApiError(err, "purchase");
          } finally {
            setPurchasingLoading(null);
            setConfirmDialog({
              isOpen: false,
              title: "",
              message: "",
              onConfirm: () => {},
            });
          }
        },
      });
    } catch (err: any) {
      console.error("Purchase failed:", err);
      handleApiError(err, "purchase");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead_created: "bg-blue-500",
      available_for_partners: "bg-cyan-500",
      lead_locked: "bg-purple-500",
      lead_purchased: "bg-green-500",
      assigned_to_agent: "bg-yellow-500",
      accepted_by_agent: "bg-orange-500",
      pickup_scheduled: "bg-indigo-500",
      pickup_completed: "bg-emerald-500",
      payment_processed: "bg-teal-500",
      pickup_completed_declined: "bg-red-500",
      cancelled: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Check if this partner has self-assigned as an agent
  const isSelfAssigned = user?.email
    ? agents.some((a) => a.email.toLowerCase() === user.email.toLowerCase())
    : false;

  const handleSwitchToAgent = async () => {
    setSwitchingToAgent(true);
    try {
      await switchToAgentPortal();
      navigate("/agent/dashboard");
    } catch {
      // error handled by context
    } finally {
      setSwitchingToAgent(false);
    }
  };

  const LeadCard = ({
    lead,
    showLockButton,
    isCompleted,
  }: {
    lead: Lead;
    showLockButton?: boolean;
    isCompleted?: boolean;
  }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between w-full">
            <div>
              <CardTitle className="text-sm md:text-base font-semibold truncate">
                {lead.brand} {lead.model}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {lead.ram_gb}GB RAM • {lead.storage_gb}GB Storage
              </CardDescription>
            </div>
            <Badge
              className={`${getStatusColor(lead.status)} text-xs px-2 py-0.5 whitespace-nowrap flex-shrink-0`}
            >
              {lead.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 md:space-y-3 flex-grow">
          <div>
            <div className="text-xs text-gray-500">AI Estimated Price</div>
            <div className="text-lg md:text-xl font-bold text-green-600">
              {formatPrice(lead.ai_estimated_price || lead.final_quoted_price)}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Customer</div>
            <div className="font-medium text-xs md:text-sm truncate">
              {lead.customer_name}
            </div>
          </div>

          {lead.agent_name && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Assigned Agent</div>
              <div className="font-medium text-xs md:text-sm truncate">
                {lead.agent_name}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {isCompleted ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-8"
                  onClick={() => navigate(`/partner/lead/${lead.id}`)}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setSelectedOrderIdForPickup(lead.id);
                    setShowPickupDetailsModal(true);
                  }}
                >
                  Pickup Details
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-8"
                  onClick={() => navigate(`/partner/lead/${lead.id}`)}
                >
                  View Details
                </Button>
                {showLockButton && (
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => navigate(`/partner/lead/${lead.id}`)}
                  >
                    Lock Lead
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <>
      <Header
        pageTitle="Partner Dashboard"
        userName={user?.name}
        showLogout={true}
        onLogout={handleLogout}
        onBuyCredits={openBuyModal}
        showDashboardButton={true}
      />
      <div className="min-h-0 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="container mx-auto px-3 md:px-4 py-4 md:py-6">
          {user?.is_on_hold && (
            <HoldNotificationBanner
              reason={user.hold_reason}
              liftDate={user.hold_lift_date}
            />
          )}
          {isSelfAssigned && (
            <div className="mb-4 flex justify-end">
              <Button
                onClick={handleSwitchToAgent}
                disabled={switchingToAgent}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {switchingToAgent ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    Switching...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    Switch to Agent Portal
                  </span>
                )}
              </Button>
            </div>
          )}
          {/* Custom Tabs */}
          <div className="mb-4 md:mb-6 overflow-x-auto">
            <div className="flex gap-1 md:gap-2 p-1 bg-white rounded-lg shadow-sm border border-gray-200 w-fit min-w-full md:w-auto">
              {[
                {
                  key: "lead_locked",
                  label: "Locked Deals",
                  count: leadLockedDeals.length,
                },
                {
                  key: "lead_purchased",
                  label: "Purchased",
                  count: leadPurchasedOrders.length,
                },
                {
                  key: "accepted_by_agent",
                  label: "In Progress",
                  count: acceptedByAgentLeads.length,
                },
                {
                  key: "pickup_completed",
                  label: "Completed",
                  count: completedOrders.length,
                },
                {
                  key: "credits",
                  label: "Credits",
                  count: paymentRequests.filter(
                    (r) => r.approval_status === "pending",
                  ).length,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`relative px-2 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.key
                      ? "text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  aria-pressed={activeTab === tab.key}
                  aria-label={`${tab.label} tab with ${tab.count} items`}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-md"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1 md:gap-2">
                    {tab.label}
                    <span
                      className={`text-xs px-1 md:px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.key
                          ? "bg-white/20"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "lead_locked" && (
              <motion.div
                key="lead_locked"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
                  </div>
                ) : leadLockedDeals.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 mb-4">
                        No locked deals at the moment
                      </p>
                      <Button onClick={() => navigate("/partner/marketplace")}>
                        Go to Marketplace
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {leadLockedDeals.map((lead) => (
                      <motion.div
                        key={lead.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="hover:shadow-xl transition-all duration-300 border-2 border-purple-200 hover:-translate-y-1 h-full flex flex-col">
                          <CardHeader className="pb-2 md:pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm md:text-base font-semibold truncate">
                                  {lead.brand} {lead.model}
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {lead.ram_gb}GB RAM • {lead.storage_gb}GB
                                  Storage
                                </CardDescription>
                              </div>
                              <Badge className="bg-purple-500 text-xs px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                                Locked
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 md:space-y-3 flex-grow">
                            <div>
                              <div className="text-xs text-gray-500">Price</div>
                              <div className="text-lg md:text-xl font-bold text-green-600">
                                {formatPrice(
                                  lead.ai_estimated_price ||
                                    lead.final_quoted_price,
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-gray-500">
                                Lead Cost
                              </div>
                              <div className="text-sm md:text-base font-semibold text-orange-600">
                                {formatPrice(lead.lead_cost || 0)}
                              </div>
                            </div>

                            {lead.time_remaining && lead.time_remaining > 0 && (
                              <div>
                                <div className="text-xs text-gray-500">
                                  Time Remaining
                                </div>
                                <div className="text-xs md:text-sm font-medium text-red-600">
                                  {Math.floor(lead.time_remaining / 60)} min{" "}
                                  {Math.floor(lead.time_remaining % 60)} sec
                                </div>
                              </div>
                            )}

                            <div>
                              <div className="text-xs text-gray-500 mb-1">
                                Customer
                              </div>
                              <div className="font-medium text-xs md:text-sm truncate">
                                {lead.customer_name}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-gray-500 mb-1">
                                Location
                              </div>
                              <div className="text-xs">
                                {lead.pickup_city}, {lead.pickup_state} -{" "}
                                {lead.pickup_pincode}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs h-8"
                                onClick={() =>
                                  navigate(`/partner/lead/${lead.id}`)
                                }
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-8"
                                onClick={() =>
                                  handlePurchaseLockedDeal(lead.id)
                                }
                                disabled={purchasingLoading === lead.id}
                              >
                                {purchasingLoading === lead.id
                                  ? "Purchasing..."
                                  : "Purchase"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "lead_purchased" && (
              <motion.div
                key="lead_purchased"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
                  </div>
                ) : leadPurchasedOrders.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 mb-4">
                        No purchased orders yet
                      </p>
                      <Button onClick={() => navigate("/partner/marketplace")}>
                        Go to Marketplace
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {leadPurchasedOrders.map((lead) => (
                      <motion.div
                        key={lead.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 h-full flex flex-col">
                          <CardHeader className="pb-2 md:pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm md:text-base font-semibold truncate">
                                  {lead.brand} {lead.model}
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {lead.ram_gb}GB RAM • {lead.storage_gb}GB
                                  Storage
                                </CardDescription>
                              </div>
                              <Badge className="bg-green-500 text-xs px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                                Purchased
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 md:space-y-3 flex-grow">
                            <div>
                              <div className="text-xs text-gray-500">Price</div>
                              <div className="text-lg md:text-xl font-bold text-green-600">
                                {formatPrice(
                                  lead.ai_estimated_price ||
                                    lead.final_quoted_price,
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-gray-500 mb-1">
                                Customer
                              </div>
                              <div className="font-medium text-xs md:text-sm truncate">
                                {lead.customer_name}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-gray-500 mb-1">
                                Location
                              </div>
                              <div className="text-xs">
                                {lead.pickup_city}, {lead.pickup_state} -{" "}
                                {lead.pickup_pincode}
                              </div>
                            </div>

                            {assigningOrder === lead.id ? (
                              <div className="space-y-2">
                                <select
                                  className="w-full border rounded px-2 md:px-3 py-2 text-xs md:text-sm"
                                  value={selectedAgent || ""}
                                  onChange={(e) =>
                                    setSelectedAgent(Number(e.target.value))
                                  }
                                >
                                  <option value="">Select an agent</option>
                                  {agents
                                    .filter((a) => a.is_active)
                                    .map((agent) => (
                                      <option key={agent.id} value={agent.id}>
                                        {agent.full_name}
                                      </option>
                                    ))}
                                </select>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button
                                    size="sm"
                                    className="flex-1 text-xs h-8"
                                    onClick={() =>
                                      selectedAgent &&
                                      handleAssignAgent(lead.id, selectedAgent)
                                    }
                                    disabled={
                                      !selectedAgent || assigningLoading
                                    }
                                  >
                                    {assigningLoading
                                      ? "Assigning..."
                                      : "Confirm"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => {
                                      setAssigningOrder(null);
                                      setSelectedAgent(null);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-xs h-8"
                                  onClick={() =>
                                    navigate(`/partner/lead/${lead.id}`)
                                  }
                                >
                                  View Details
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs h-8"
                                  onClick={() => setAssigningOrder(lead.id)}
                                >
                                  Assign Agent
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "accepted_by_agent" && (
              <motion.div
                key="accepted_by_agent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
                  </div>
                ) : acceptedByAgentLeads.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No orders in progress</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {acceptedByAgentLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "pickup_completed" && (
              <motion.div
                key="pickup_completed"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
                  </div>
                ) : completedOrders.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No completed orders</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {completedOrders.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} isCompleted={true} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "credits" && (
              <motion.div
                key="credits"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Requests</CardTitle>
                      <CardDescription>
                        Track your credit purchase payment requests and approval
                        status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {paymentRequests.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500 mb-4">
                            No payment requests yet
                          </p>
                          <Button onClick={openBuyModal}>Buy Credits</Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {paymentRequests.map((req) => (
                            <motion.div
                              key={req.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex-grow">
                                <div className="font-semibold">
                                  {req.credit_amount.toFixed(0)} Credits • ₹
                                  {req.payment_amount.toFixed(0)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(
                                    req.created_at,
                                  ).toLocaleDateString()}
                                </div>
                                {req.approval_notes && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    {req.approval_notes}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                {req.approval_status === "pending" && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-yellow-100 text-yellow-800"
                                  >
                                    ⏳ Pending
                                  </Badge>
                                )}
                                {req.approval_status === "approved" && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-green-100 text-green-800"
                                  >
                                    ✅ Approved
                                  </Badge>
                                )}
                                {req.approval_status === "rejected" && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-red-100 text-red-800"
                                  >
                                    ❌ Rejected
                                  </Badge>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {paymentRequests.length > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">ℹ️</div>
                        <div>
                          <p className="font-semibold text-sm mb-1">
                            About Credit Purchases
                          </p>
                          <p className="text-sm text-gray-700">
                            When you submit a payment screenshot, our admin team
                            will review it within 24 hours. Once approved,
                            credits will be instantly added to your account.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Pickup Details Modal */}
      {selectedOrderIdForPickup && (
        <PickupDetailsModal
          isOpen={showPickupDetailsModal}
          onClose={() => {
            setShowPickupDetailsModal(false);
            setSelectedOrderIdForPickup(null);
          }}
          orderId={selectedOrderIdForPickup}
        />
      )}

      {/* Buy Credits Modal */}
      {showBuyModal && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setShowBuyModal(false);
                setPaymentStep("select_plan");
                setSelectedPlan(null);
                setPaymentRequestId(null);
                setScreenshot(null);
                setScreenshotPreview("");
              }}
            ></div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full md:w-full md:max-w-2xl bg-white rounded-t-xl md:rounded-xl p-4 md:p-6 shadow-2xl max-h-[90vh] md:max-h-[95vh] overflow-y-auto"
            >
              {/* Step 1: Select Plan */}
              {paymentStep === "select_plan" && (
                <>
                  <h2 className="text-xl md:text-2xl font-bold mb-2">
                    Buy Credits
                  </h2>
                  <p className="text-xs md:text-sm text-gray-500 mb-4">
                    Choose a credit plan to purchase
                  </p>

                  <div className="space-y-2 md:space-y-3">
                    {plans.map((p, index) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="hover:shadow-lg transition-all duration-200 hover:border-purple-300">
                          <CardContent className="p-3 md:p-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex-grow">
                                <div className="font-semibold text-sm md:text-base">
                                  {p.plan_name}
                                </div>
                                <div className="text-xs md:text-sm text-gray-500">
                                  {p.description}
                                </div>
                                {p.bonus_percentage > 0 && (
                                  <div className="text-xs mt-1 font-semibold text-green-600">
                                    + {p.bonus_percentage}% bonus
                                  </div>
                                )}
                              </div>
                              <div className="text-right w-full sm:w-auto">
                                <div className="text-lg md:text-xl font-bold">
                                  {p.credit_amount} credits
                                </div>
                                <div className="text-xs md:text-sm text-gray-500">
                                  ₹{p.price}
                                </div>
                                <div className="mt-2">
                                  <Button
                                    size="sm"
                                    className="text-xs h-8 w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
                                    onClick={() => handleBuyPlan(p.id)}
                                    disabled={purchaseLoading}
                                  >
                                    {purchaseLoading
                                      ? "Processing..."
                                      : "Select"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6 text-right">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBuyModal(false);
                        setPaymentStep("select_plan");
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </>
              )}

              {/* Step 2: Payment Proof */}
              {paymentStep === "payment_proof" && selectedPlan && (
                <>
                  <h2 className="text-xl md:text-2xl font-bold mb-2">
                    Scan & Pay via UPI
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600 mb-4">
                    Plan:{" "}
                    <span className="font-semibold">
                      {selectedPlan.plan_name}
                    </span>{" "}
                    • Amount:{" "}
                    <span className="font-semibold">₹{selectedPlan.price}</span>
                  </p>

                  <div className="space-y-4">
                    {/* QR Code Section */}
                    <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
                      <CardContent className="p-6 flex flex-col items-center">
                        <h3 className="text-sm font-semibold mb-3 text-gray-700">
                          Scan to Pay
                        </h3>
                        <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                          <img
                            src="/assets/QR_CODE.jpg"
                            alt="UPI QR Code"
                            className="w-48 h-48 md:w-56 md:h-56 object-cover rounded"
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-3 text-center">
                          Scan this QR code with your UPI app and pay ₹
                          {selectedPlan.price}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Screenshot Upload Section */}
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-sm font-semibold mb-3 text-gray-700">
                          Upload Payment Screenshot
                        </h3>

                        {screenshotPreview ? (
                          <div className="mb-4">
                            <img
                              src={screenshotPreview}
                              alt="Payment screenshot"
                              className="w-full max-h-64 object-contain rounded-lg border-2 border-green-300"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full"
                              onClick={() => {
                                setScreenshot(null);
                                setScreenshotPreview("");
                              }}
                            >
                              Change Screenshot
                            </Button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-purple-400 transition-colors flex items-center justify-center min-h-[140px]">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleScreenshotSelect}
                              className="hidden"
                            />
                            <div className="text-center text-gray-600 flex flex-col items-center gap-1">
                              <div className="text-2xl">📸</div>
                              <p className="font-semibold mb-0">
                                Click to select screenshot
                              </p>
                              <p className="text-xs text-gray-500">
                                or drag and drop
                              </p>
                            </div>
                          </label>
                        )}

                        <p className="text-xs text-gray-500 mt-3">
                          📸 Screenshot should show the successful payment
                          confirmation
                        </p>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setPaymentStep("select_plan");
                          setSelectedPlan(null);
                          setPaymentRequestId(null);
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!screenshot || purchaseLoading}
                        onClick={handleUploadScreenshot}
                      >
                        {purchaseLoading ? "Uploading..." : "Submit Payment"}
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      ✓ Admin will review your payment and credits will be added
                      within 24 hours
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() =>
                setConfirmDialog({ ...confirmDialog, isOpen: false })
              }
            ></div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-lg p-6 shadow-xl max-w-md w-full"
            >
              <h3 className="text-lg font-semibold mb-2">
                {confirmDialog.title}
              </h3>
              <p className="text-gray-600 mb-6 whitespace-pre-line">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    setConfirmDialog({ ...confirmDialog, isOpen: false })
                  }
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDialog.onConfirm}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Confirm
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
