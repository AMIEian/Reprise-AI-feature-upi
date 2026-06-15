import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { formatPrice } from "../lib/utils";
import { handleApiError } from "../lib/errorHandler";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import { HoldNotificationBanner } from "../components/HoldNotificationBanner";
import CompletePickupChecklist from "../components/CompletePickupChecklist";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

import { Badge } from "../components/ui/badge";

import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Package,
  IndianRupee,
  CheckCircle2,
  Eye,
  PhoneCall,
  Map as MapIcon,
  XCircle,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Order {
  id?: number;
  phone_name?: string;
  specs?: string;
  status: string;
  estimated_value?: string | number;
  customer?: string;
  customer_name?: string;
  phone?: string;
  customer_phone?: string;
  pickup_address?: string;
  pickup_address_line?: string;
  pickup_city?: string;
  pickup_state?: string;
  pickup_pincode?: string;
  pickup_schedule_date?: string;
  pickup_date?: string | Date;
  pickup_schedule_time?: string;
  pickup_time?: string;
  payment_mode?: string;
  payment_method?: string;
  // Legacy fields (keeping for backward compatibility)
  customer_email?: string;
  agent_name?: string;
  agent_id?: number;
  brand?: string;
  model?: string;
  ram_gb?: number;
  storage_gb?: number;
  ai_estimated_price?: number;
  final_quoted_price?: number;
  ai_reasoning?: string;
  accepted_at?: string;
  completed_at?: string;
}

export default function AgentDashboard() {
  const { user, logout, switchToPartnerPortal } = useAuth();
  const navigate = useNavigate();
  const [switchingToPartner, setSwitchingToPartner] = useState(false);
  const [currentOrders, setCurrentOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [showActionModal, setShowActionModal] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [showCompletePickupChecklist, setShowCompletePickupChecklist] =
    useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    new_date: "",
    new_time: "",
    reschedule_reason: "",
    notes: "",
  });
  const [cancelForm, setCancelForm] = useState({
    cancellation_reason: "",
    notes: "",
  });

  // Helper function to parse DD/MM/YYYY date format
  const parseDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput === "string") {
      const parts = dateInput.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
      return new Date(dateInput); // Fallback for other formats
    }
    return null;
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get("/agent/orders");
      const orders: Order[] = response.data;

      // Filter orders into current and completed
      // Normalize status for comparison (handle both spaces and underscores)
      setCurrentOrders(
        orders.filter((order) => {
          const normalizedStatus = order.status
            .toLowerCase()
            .replace(/ /g, "_");
          return normalizedStatus === "accepted_by_agent";
        }),
      );

      setCompletedOrders(
        orders.filter((order) => {
          const normalizedStatus = order.status
            .toLowerCase()
            .replace(/ /g, "_");
          return (
            normalizedStatus === "pickup_completed" ||
            normalizedStatus === "payment_processed" ||
            normalizedStatus === "completed" ||
            normalizedStatus === "pickup_completed_declined" ||
            normalizedStatus === "cancelled"
          );
        }),
      );
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePickup = async (data: {
    phone_conditions: any;
    photos: File[];
    final_offered_price: number;
    customer_accepted: boolean;
    pickup_notes: string;
    payment_method: string;
  }) => {
    setActionLoading(true);
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();
      formData.append("actual_condition", "Inspected");
      formData.append(
        "final_offered_price",
        data.final_offered_price.toString(),
      );
      formData.append("customer_accepted", data.customer_accepted.toString());
      formData.append("pickup_notes", data.pickup_notes);
      formData.append("payment_method", data.payment_method);

      // Add photos
      console.log(`Uploading ${data.photos.length} photos...`);
      data.photos.forEach((photo, index) => {
        console.log(`Photo ${index}: ${photo.name} (${photo.size} bytes)`);
        formData.append(`photos`, photo, `photo_${index}.jpg`);
      });

      // Add phone conditions
      formData.append(
        "phone_conditions",
        JSON.stringify(data.phone_conditions),
      );

      const response = await api.post(
        `/agent/orders/${selectedOrder!.id}/complete-pickup`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      console.log("Pickup response:", response.data);

      await fetchOrders();
      setSelectedOrder(null);
      setShowCompletePickupChecklist(false);
      alert("Pickup completed successfully!");
    } catch (error: any) {
      console.error("Error completing pickup:", error);
      handleApiError(error, "complete");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallCustomer = () => {
    const phoneNumber =
      selectedOrder?.customer_phone || selectedOrder?.phone || "";
    if (phoneNumber) {
      // Copy to clipboard — navigator.clipboard requires a secure context (HTTPS)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(phoneNumber)
          .then(() => {
            alert(`Phone number copied: ${phoneNumber}`);
          })
          .catch(() => {
            alert(`Phone number: ${phoneNumber}`);
          });
      } else {
        // Fallback for non-secure contexts
        try {
          const textarea = document.createElement("textarea");
          textarea.value = phoneNumber;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          alert(`Phone number copied: ${phoneNumber}`);
        } catch {
          alert(`Phone number: ${phoneNumber}`);
        }
      }
    }
    setCallInProgress(true);
  };

  const handleEndCall = () => {
    setCallInProgress(false);
    setCallEnded(true);
  };

  const handleViewMap = (order: Order) => {
    const getPickupAddress = () =>
      order.pickup_address ||
      `${order.pickup_address_line || ""}, ${order.pickup_city || ""}, ${order.pickup_state || ""} - ${order.pickup_pincode || ""}`.trim();

    const address = encodeURIComponent(getPickupAddress());
    // Open Google Maps with directions to customer address
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${address}`,
      "_blank",
    );
  };

  const handleActionSelect = (action: string) => {
    setSelectedAction(action);
    setShowActionModal(true);
  };

  const handleReschedulePickup = async () => {
    if (
      !rescheduleForm.new_date ||
      !rescheduleForm.new_time ||
      !rescheduleForm.reschedule_reason
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setActionLoading(true);
    try {
      await api.post(
        `/agent/orders/${selectedOrder!.id}/reschedule-pickup`,
        rescheduleForm,
      );
      await fetchOrders();
      setShowActionModal(false);
      setSelectedOrder(null);
      setRescheduleForm({
        new_date: "",
        new_time: "",
        reschedule_reason: "",
        notes: "",
      });
      alert("Pickup rescheduled successfully!");
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPickup = async () => {
    if (!cancelForm.cancellation_reason) {
      alert("Please provide a cancellation reason");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to cancel this pickup? The order will be marked as cancelled (customer does not want to sell).",
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      await api.post(
        `/agent/orders/${selectedOrder!.id}/cancel-pickup`,
        cancelForm,
      );
      await fetchOrders();
      setShowActionModal(false);
      setSelectedOrder(null);
      setCancelForm({
        cancellation_reason: "",
        notes: "",
      });
      alert("Pickup cancelled. Order marked as cancelled.");
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSwitchToPartner = async () => {
    setSwitchingToPartner(true);
    try {
      await switchToPartnerPortal();
      navigate("/partner/dashboard");
    } catch {
      // error handled by context
    } finally {
      setSwitchingToPartner(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      accepted_by_agent: "bg-blue-100 text-blue-800 border border-blue-200",
      pickup_completed: "bg-green-100 text-green-800 border border-green-200",
      payment_processed:
        "bg-emerald-100 text-emerald-800 border border-emerald-200",
      pickup_completed_declined:
        "bg-orange-100 text-orange-800 border border-orange-200",
      cancelled: "bg-red-100 text-red-800 border border-red-200",
      completed: "bg-green-100 text-green-800 border border-green-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border border-gray-200";
  };

  const OrderCard = ({
    order,
    showActions,
  }: {
    order: Order;
    showActions?: boolean;
  }) => {
    // Helper functions to get values from either new or legacy fields
    const getPhoneName = () =>
      order.phone_name || `${order.brand || ""} ${order.model || ""}`.trim();
    const getSpecs = () =>
      order.specs ||
      `${order.ram_gb || 0}GB RAM • ${order.storage_gb || 0}GB Storage`;
    const getCustomerName = () => order.customer || order.customer_name || "";
    const getCustomerPhone = () => order.phone || order.customer_phone || "";
    const getPickupAddress = () =>
      order.pickup_address ||
      `${order.pickup_address_line || ""}, ${order.pickup_city || ""}, ${order.pickup_state || ""} - ${order.pickup_pincode || ""}`.trim();
    const getEstimatedValue = () => {
      if (order.estimated_value) return order.estimated_value;
      const price = order.ai_estimated_price || order.final_quoted_price || 0;
      return formatPrice(price);
    };
    const getPickupDate = () =>
      order.pickup_schedule_date ||
      (order.pickup_date
        ? parseDate(order.pickup_date)?.toLocaleDateString()
        : "");
    const getPickupTime = () =>
      order.pickup_schedule_time || order.pickup_time || "TBD";
    const getPaymentMethod = () => {
      if (order.payment_mode) {
        return order.payment_mode.replace("payment mode - ", "");
      }
      return order.payment_method || "";
    };

    return (
      <Card className="hover:shadow-lg transition-all duration-200 border">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-gray-600" />
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {getPhoneName()}
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                {getSpecs()}
              </CardDescription>
            </div>
            <Badge
              className={`${getStatusColor(order.status)} px-2.5 py-0.5 text-xs font-medium`}
            >
              {order.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <IndianRupee className="w-4 h-4 text-green-700" />
                <div className="text-xs font-medium text-green-700">
                  Estimated Value
                </div>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {getEstimatedValue()}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-md border">
                <User className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-0.5">Customer</div>
                  <div className="font-medium text-gray-900 text-sm">
                    {getCustomerName()}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <div className="text-xs text-gray-600">
                      {getCustomerPhone()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-md border">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-0.5">
                    Pickup Address
                  </div>
                  <div className="text-xs text-gray-700">
                    {getPickupAddress()}
                  </div>
                </div>
              </div>

              {getPickupDate() && (
                <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-md border">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-0.5">
                      Pickup Schedule
                    </div>
                    <div className="font-medium text-gray-900 flex items-center gap-1.5 text-sm">
                      {getPickupDate()}
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {getPickupTime()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {getPaymentMethod() && (
                <div className="flex items-start gap-2 p-2.5 bg-green-50 rounded-md border border-green-200">
                  <IndianRupee className="w-4 h-4 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-green-700 mb-0.5">
                      Payment Method
                    </div>
                    <div className="font-medium text-gray-900 text-sm">
                      {getPaymentMethod()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showActions && (
              <div className="space-y-2 pt-2 border-t">
                {order.status === "accepted_by_agent" && (
                  <>
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleViewMap(order)}
                    >
                      <MapIcon className="w-3.5 h-3.5 mr-1" />
                      View Map
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedOrder(order);
                        setCallInProgress(false);
                        setCallEnded(false);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View Details & Take Action
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Header
        pageTitle="Agent Dashboard"
        userName={user?.name}
        showLogout={true}
        onLogout={handleLogout}
        showDashboardButton={true}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {user?.is_on_hold && (
            <HoldNotificationBanner
              reason={user.hold_reason}
              liftDate={user.hold_lift_date}
            />
          )}
          {user?.is_self_assigned && (
            <div className="mb-4 flex justify-end">
              <Button
                onClick={handleSwitchToPartner}
                disabled={switchingToPartner}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                {switchingToPartner ? (
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
                    Switch to Partner Portal
                  </span>
                )}
              </Button>
            </div>
          )}
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white p-1 border">
              <TabsTrigger
                value="current"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Current Orders ({currentOrders.length})
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Completed ({completedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent"></div>
                  <p className="mt-3 text-gray-600">Loading orders...</p>
                </div>
              ) : currentOrders.length === 0 ? (
                <Card className="border-2 border-dashed">
                  <CardContent className="py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      No current orders assigned
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      New orders will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentOrders.map((order) => (
                    <OrderCard key={order.id} order={order} showActions />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent"></div>
                  <p className="mt-3 text-gray-600">Loading orders...</p>
                </div>
              ) : completedOrders.length === 0 ? (
                <Card className="border-2 border-dashed">
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      No completed orders
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Completed orders will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
              <CardHeader className="bg-gray-50 border-b sticky top-0 z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-3">
                      Order Details
                    </CardTitle>
                    {/* Call and Map Buttons */}
                    <div className="flex gap-2">
                      {!callInProgress && !callEnded && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={handleCallCustomer}
                        >
                          <PhoneCall className="w-3.5 h-3.5 mr-1" />
                          Call Customer
                        </Button>
                      )}
                      {callInProgress && (
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={handleEndCall}
                        >
                          <PhoneCall className="w-3.5 h-3.5 mr-1" />
                          End Call
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedOrder(null);
                      setShowActionModal(false);
                      setSelectedAction("");
                      setCallInProgress(false);
                      setCallEnded(false);
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-gray-600" />
                    <Label className="text-gray-700 font-medium">Device</Label>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {selectedOrder.brand && selectedOrder.model
                      ? `${selectedOrder.brand} ${selectedOrder.model}`
                      : selectedOrder.phone_name || "Device"}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedOrder.ram_gb}GB RAM • {selectedOrder.storage_gb}GB
                    Storage
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-gray-500" />
                      <Label className="text-gray-600 text-xs">
                        Customer Name
                      </Label>
                    </div>
                    <div className="font-medium text-gray-900 text-sm">
                      {selectedOrder.customer_name ||
                        selectedOrder.customer ||
                        "-"}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <Label className="text-gray-600 text-xs">
                        Customer Phone
                      </Label>
                    </div>
                    <div className="font-medium text-gray-900 text-sm">
                      {selectedOrder.customer_phone ||
                        selectedOrder.phone ||
                        "-"}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <Label className="text-gray-700 font-medium text-sm">
                      Pickup Address
                    </Label>
                  </div>
                  <div className="text-sm text-gray-900">
                    {selectedOrder.pickup_address ||
                      `${selectedOrder.pickup_address_line || ""}, ${selectedOrder.pickup_city || ""}, ${selectedOrder.pickup_state || ""} - ${selectedOrder.pickup_pincode || ""}`.trim() ||
                      "-"}
                  </div>
                </div>

                {(selectedOrder.pickup_date ||
                  selectedOrder.pickup_schedule_date) && (
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <Label className="text-gray-700 font-medium text-sm">
                        Scheduled Pickup
                      </Label>
                    </div>
                    <div className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                      {(selectedOrder.pickup_date
                        ? parseDate(
                            selectedOrder.pickup_date,
                          )?.toLocaleDateString()
                        : selectedOrder.pickup_schedule_date) || "-"}
                      <Clock className="w-3 h-3 text-gray-500" />
                      {selectedOrder.pickup_time ||
                        selectedOrder.pickup_schedule_time ||
                        "TBD"}
                    </div>
                  </div>
                )}

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <IndianRupee className="w-4 h-4 text-green-700" />
                    <Label className="text-green-700 font-medium text-sm">
                      Estimated Price
                    </Label>
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    {formatPrice(
                      selectedOrder.ai_estimated_price ||
                        selectedOrder.final_quoted_price,
                    )}
                  </div>
                </div>

                {/* Complete Pickup Checklist is handled by CompletePickupChecklist component */}

                <div className="flex gap-3 pt-4 border-t">
                  {selectedOrder.status === "accepted_by_agent" &&
                    !showActionModal &&
                    !callEnded && (
                      <div className="text-center w-full py-4 text-gray-500 text-sm">
                        <div className="mb-4">
                          Please call the customer first to discuss the pickup
                          and get confirmation
                        </div>
                        <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                          The customer must confirm they are willing to sell
                          before you can proceed with the pickup.
                        </div>
                      </div>
                    )}
                  {selectedOrder.status === "accepted_by_agent" &&
                    !showActionModal &&
                    callEnded && (
                      <>
                        <div className="w-full space-y-3">
                          <Label className="text-gray-900 font-semibold text-sm block">
                            📋 Choose action after call:
                          </Label>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <Select onValueChange={handleActionSelect}>
                                <SelectTrigger className="w-full h-11 bg-white border-2 border-blue-300 hover:border-blue-400 focus:border-blue-500 text-gray-900 font-medium text-base rounded-md shadow-sm">
                                  <SelectValue placeholder="Select an action..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-2 border-blue-300 shadow-lg rounded-md">
                                  <SelectItem
                                    value="pickup"
                                    className="py-3 px-3 text-base font-medium cursor-pointer hover:bg-green-50 focus:bg-green-50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                                      <span>Complete Pickup</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem
                                    value="reschedule"
                                    className="py-3 px-3 text-base font-medium cursor-pointer hover:bg-blue-50 focus:bg-blue-50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-5 h-5 text-blue-600" />
                                      <span>Reschedule</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem
                                    value="cancel"
                                    className="py-3 px-3 text-base font-medium cursor-pointer hover:bg-red-50 focus:bg-red-50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <XCircle className="w-5 h-5 text-red-600" />
                                      <span>Cancel (Not Interested)</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              size="lg"
                              onClick={() => {
                                setSelectedOrder(null);
                                setSelectedAction("");
                                setCallInProgress(false);
                                setCallEnded(false);
                              }}
                              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium"
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  {showActionModal && (
                    <>
                      {selectedAction === "pickup" && callEnded && (
                        <>
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            size="lg"
                            onClick={() => setShowCompletePickupChecklist(true)}
                            disabled={actionLoading}
                          >
                            Start Pickup Process
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                              setShowActionModal(false);
                              setSelectedAction("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {selectedAction === "reschedule" && (
                        <>
                          <div className="w-full space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <Calendar className="w-4 h-4 text-amber-600" />
                              <h3 className="font-semibold text-base text-gray-900">
                                Reschedule Pickup
                              </h3>
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="new_date"
                                className="text-gray-700 font-medium text-sm"
                              >
                                New Pickup Date *
                              </Label>
                              <Input
                                id="new_date"
                                type="date"
                                value={rescheduleForm.new_date}
                                onChange={(e) =>
                                  setRescheduleForm((prev) => ({
                                    ...prev,
                                    new_date: e.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="new_time"
                                className="text-gray-700 font-medium text-sm"
                              >
                                New Pickup Time *
                              </Label>
                              <Input
                                id="new_time"
                                type="time"
                                value={rescheduleForm.new_time}
                                onChange={(e) =>
                                  setRescheduleForm((prev) => ({
                                    ...prev,
                                    new_time: e.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="reschedule_reason"
                                className="text-gray-700 font-medium text-sm"
                              >
                                Reason for Rescheduling *
                              </Label>
                              <Textarea
                                id="reschedule_reason"
                                value={rescheduleForm.reschedule_reason}
                                onChange={(e) =>
                                  setRescheduleForm((prev) => ({
                                    ...prev,
                                    reschedule_reason: e.target.value,
                                  }))
                                }
                                placeholder="Please provide a reason for rescheduling"
                                rows={3}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="reschedule_notes"
                                className="text-gray-700 font-medium text-sm"
                              >
                                Additional Notes (Optional)
                              </Label>
                              <Textarea
                                id="reschedule_notes"
                                value={rescheduleForm.notes}
                                onChange={(e) =>
                                  setRescheduleForm((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                  }))
                                }
                                placeholder="Any additional notes"
                              />
                            </div>

                            <div className="flex gap-3">
                              <Button
                                className="flex-1 bg-amber-600 hover:bg-amber-700"
                                size="lg"
                                onClick={handleReschedulePickup}
                                disabled={
                                  actionLoading ||
                                  !rescheduleForm.new_date ||
                                  !rescheduleForm.new_time ||
                                  !rescheduleForm.reschedule_reason
                                }
                              >
                                {actionLoading
                                  ? "Processing..."
                                  : "Confirm Reschedule"}
                              </Button>
                              <Button
                                variant="outline"
                                size="lg"
                                onClick={() => {
                                  setShowActionModal(false);
                                  setSelectedAction("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                      {selectedAction === "cancel" && (
                        <>
                          <div className="w-full space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <h3 className="font-semibold text-base text-gray-900">
                                Cancel Pickup
                              </h3>
                            </div>

                            <div className="bg-red-50 p-3 rounded-md border border-red-200">
                              <p className="text-sm text-red-800">
                                <strong>Important:</strong> Canceling this
                                pickup means the customer is not willing to
                                sell. The order will be marked as cancelled.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="cancellation_reason"
                                className="text-gray-700 font-medium text-sm"
                              >
                                Reason for Cancellation *
                              </Label>
                              <Textarea
                                id="cancellation_reason"
                                value={cancelForm.cancellation_reason}
                                onChange={(e) =>
                                  setCancelForm((prev) => ({
                                    ...prev,
                                    cancellation_reason: e.target.value,
                                  }))
                                }
                                placeholder="Please provide a detailed reason for canceling this pickup"
                                rows={3}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="cancel_notes"
                                className="text-gray-700 font-medium text-sm"
                              >
                                Additional Notes (Optional)
                              </Label>
                              <Textarea
                                id="cancel_notes"
                                value={cancelForm.notes}
                                onChange={(e) =>
                                  setCancelForm((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                  }))
                                }
                                placeholder="Any additional notes"
                              />
                            </div>

                            <div className="flex gap-3">
                              <Button
                                className="flex-1 bg-red-600 hover:bg-red-700"
                                size="lg"
                                onClick={handleCancelPickup}
                                disabled={
                                  actionLoading ||
                                  !cancelForm.cancellation_reason
                                }
                              >
                                {actionLoading
                                  ? "Processing..."
                                  : "Confirm Cancellation"}
                              </Button>
                              <Button
                                variant="outline"
                                size="lg"
                                onClick={() => {
                                  setShowActionModal(false);
                                  setSelectedAction("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Complete Pickup Checklist Modal */}
        {selectedOrder && showCompletePickupChecklist && (
          <CompletePickupChecklist
            isOpen={showCompletePickupChecklist}
            onClose={() => {
              setShowCompletePickupChecklist(false);
              setSelectedOrder(null);
              setShowActionModal(false);
              setSelectedAction("");
            }}
            onComplete={handleCompletePickup}
            isLoading={actionLoading}
            estimatedPrice={
              selectedOrder.ai_estimated_price ||
              selectedOrder.final_quoted_price ||
              0
            }
            deviceName={
              selectedOrder.phone_name ||
              `${selectedOrder.brand || ""} ${selectedOrder.model || ""}`.trim()
            }
          />
        )}
      </div>
    </>
  );
}
