import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Smartphone,
  MapPin,
  Calendar,
  CheckCircle, 
  Clock,
  AlertCircle,
  User,
  Phone as PhoneIcon,
  Mail,
  Package,
  IndianRupee,
} from "lucide-react";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useEffect } from "react";

// Define Order interface based on backend OrderOut schema
interface Order {
  id: number;
  customer_id?: number;
  partner_id?: number;
  agent_id?: number;
  phone_name: string;
  brand?: string;
  model?: string;
  ram_gb?: number;
  storage_gb?: number;
  variant?: string;
  ai_estimated_price?: number;
  ai_reasoning?: string;
  final_quoted_price: number;
  final_offered_price?: number;
  payment_amount?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  pickup_address_line?: string;
  pickup_city?: string;
  pickup_state?: string;
  pickup_pincode?: string;
  pickup_date?: string; // Assuming ISO string from backend
  pickup_time?: string;
  payment_method?: string;
  status: string;
  lead_locked_at?: string;
  lead_lock_expires_at?: string;
  purchased_at?: string;
  assigned_at?: string;
  accepted_at?: string;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  created_at: string;
  updated_at?: string;
}

const fetchOrders = async (): Promise<Order[]> => {
  const res = await api.get("/sell-phone/my-orders");
  return res.data;
};

// Safe date formatting helper
const safeFormatDate = (dateStr: string | undefined, formatStr: string) => {
  if (!dateStr) return "Date unavailable";
  try {
    return format(new Date(dateStr), formatStr);
  } catch {
    return "Invalid date";
  }
};

export default function MyOrders() {
  const { user, token } = useAuth();
  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useQuery<Order[], Error>({
    queryKey: ["orders", token || localStorage.getItem("accessToken")],
    queryFn: fetchOrders,
    enabled: !!(token || localStorage.getItem("accessToken")),
  });

  // Show toast on error
  useEffect(() => {
    if (error) {
      toast.error(
        "We couldn't load your orders. Check your internet connection and try again.",
        {
          description: error.message || "A network or server error occurred.",
          action: {
            label: "Retry",
            onClick: () => window.location.reload(),
          },
          duration: 8000,
        },
      );
    }
  }, [error]);

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      lead_created: "bg-gray-100 text-gray-800 border-gray-200",
      available_for_partners: "bg-blue-100 text-blue-800 border-blue-200",
      lead_locked: "bg-purple-100 text-purple-800 border-purple-200",
      lead_purchased: "bg-indigo-100 text-indigo-800 border-indigo-200",
      assigned_to_agent: "bg-yellow-100 text-yellow-800 border-yellow-200",
      accepted_by_agent: "bg-cyan-100 text-cyan-800 border-cyan-200",
      pickup_scheduled: "bg-orange-100 text-orange-800 border-orange-200",
      pickup_completed: "bg-green-100 text-green-800 border-green-200",
      pickup_completed_declined: "bg-red-100 text-red-800 border-red-200",
      payment_processed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return (
      statusMap[status] || "bg-yellow-100 text-yellow-800 border-yellow-200"
    );
  };

  const getStatusIcon = (status: string) => {
    const completedStatuses = ["pickup_completed", "payment_processed"];
    const inProgressStatuses = [
      "assigned_to_agent",
      "accepted_by_agent",
      "pickup_scheduled",
    ];
    const errorStatuses = ["pickup_completed_declined", "cancelled"];

    if (completedStatuses.includes(status)) {
      return <CheckCircle size={16} aria-label="Completed" />;
    } else if (errorStatuses.includes(status)) {
      return <AlertCircle size={16} aria-label="Error or Cancelled" />;
    } else if (inProgressStatuses.includes(status)) {
      return <Clock size={16} aria-label="In Progress" />;
    }
    return <Package size={16} aria-label="Pending" />;
  };

  const formatStatus = (status: string) => {
    // Customer-friendly status labels
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header />
        <main className="flex-grow py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  My Orders
                </h1>
                <p className="text-gray-600 text-lg">
                  Track and manage your device sales
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Card
                      key={i}
                      className="bg-white/80 backdrop-blur-sm shadow-xl border-0"
                    >
                      <CardHeader className="pb-4">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl">
            <AlertCircle
              size={48}
              className="text-red-500 mx-auto mb-4"
              aria-label="Error"
            />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Unable to Load Orders
            </h2>
            <p className="text-gray-600 mb-4">
              We're having trouble loading your orders right now. Please check
              your connection and try again.
            </p>
            <Button
              onClick={() => refetch()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              Try Again
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />

      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                My Orders
              </h1>
              <p className="text-gray-600 text-lg">
                Track and manage your device sales
              </p>
            </div>

            {orders?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                {orders.map((order: Order) => (
                  <Card
                    key={order.id}
                    className="bg-white/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                            <Smartphone
                              size={22}
                              className="text-blue-600"
                              aria-label="Phone"
                            />
                            {order.phone_name ||
                              (order.brand && order.model
                                ? `${order.brand} ${order.model}`
                                : "Unknown Phone")}
                          </CardTitle>
                          <p className="text-sm text-gray-500">
                            Order ID: ORD-{order.id} •{" "}
                            {safeFormatDate(order.created_at, "PPp")}
                          </p>
                        </div>
                        <Badge
                          className={`flex items-center gap-1.5 px-3 py-1 ${getStatusColor(
                            order.status,
                          )}`}
                          aria-describedby={`status-desc-${order.id}`}
                        >
                          {getStatusIcon(order.status)}
                          {formatStatus(order.status)}
                        </Badge>
                        <div id={`status-desc-${order.id}`} className="sr-only">
                          Order status: {formatStatus(order.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Phone Details */}
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">RAM:</span>
                            <span className="ml-2 font-medium">
                              {order.ram_gb ? `${order.ram_gb}GB` : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Storage:</span>
                            <span className="ml-2 font-medium">
                              {order.storage_gb
                                ? `${order.storage_gb}GB`
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">
                              Quoted Price
                            </p>
                            <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                              <IndianRupee size={18} />
                              {order.final_quoted_price
                                ? order.final_quoted_price.toLocaleString()
                                : "Contact Support"}
                            </p>
                          </div>
                          {order.ai_estimated_price && (
                            <div>
                              <p className="text-xs text-gray-500">
                                AI Estimate
                              </p>
                              <p className="text-sm font-semibold text-gray-700 flex items-center">
                                <IndianRupee size={14} />
                                {order.ai_estimated_price.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                        {(order.final_offered_price ||
                          order.payment_amount) && (
                          <div className="border-t border-blue-200 pt-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600">
                                  Deal Price
                                </p>
                                <p className="text-lg font-bold text-emerald-600 flex items-center">
                                  <IndianRupee size={16} />
                                  {order.payment_amount ||
                                  order.final_offered_price
                                    ? (
                                        order.payment_amount ||
                                        order.final_offered_price ||
                                        0
                                      ).toLocaleString()
                                    : "Pending"}
                                </p>
                              </div>
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                Completed
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Pickup Details */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                          <MapPin size={16} className="text-blue-600" />
                          Pickup Information
                        </h4>
                        <div className="space-y-1.5 text-sm pl-6">
                          <p className="text-gray-600">
                            {order.pickup_address_line ||
                              order.customer_name ||
                              "Address not available"}
                          </p>
                          <p className="text-gray-600">
                            {order.pickup_city || "City not available"},{" "}
                            {order.pickup_state || "State not available"} -{" "}
                            {order.pickup_pincode || "Pincode not available"}
                          </p>
                          {(order.pickup_date || order.pickup_time) && (
                            <div className="flex items-center gap-2 text-gray-700 font-medium mt-2">
                              <Calendar
                                size={14}
                                className="text-orange-600"
                                aria-label="Pickup Date"
                              />
                              {safeFormatDate(order.pickup_date, "PP")}
                              {order.pickup_time && (
                                <span>• {order.pickup_time}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Agent Details */}
                      {order.agent_id &&
                        order.agent_name &&
                        (order.agent_phone || order.agent_email) && (
                          <>
                            <Separator />
                            <div className="space-y-2 bg-green-50 rounded-lg p-3">
                              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                <User
                                  size={16}
                                  className="text-green-600"
                                  aria-label="Agent"
                                />
                                Assigned Agent
                              </h4>
                              <div className="space-y-1.5 text-sm pl-6">
                                {order.agent_name && (
                                  <p className="font-medium text-gray-900">
                                    {order.agent_name}
                                  </p>
                                )}
                                {order.agent_phone && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <PhoneIcon
                                      size={14}
                                      className="text-green-600"
                                      aria-label="Phone"
                                    />
                                    <a
                                      href={`tel:${order.agent_phone}`}
                                      className="hover:underline"
                                    >
                                      {order.agent_phone}
                                    </a>
                                  </div>
                                )}
                                {order.agent_email && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <Mail
                                      size={14}
                                      className="text-green-600"
                                      aria-label="Email"
                                    />
                                    <a
                                      href={`mailto:${order.agent_email}`}
                                      className="hover:underline text-xs"
                                    >
                                      {order.agent_email}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                      {/* Payment Info */}
                      {order.status === "payment_processed" &&
                        order.payment_amount && (
                          <>
                            <Separator />
                            <div className="bg-emerald-50 rounded-lg p-3">
                              <h4 className="font-semibold text-sm text-gray-700 mb-2">
                                Payment Processed
                              </h4>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                  Amount Paid:
                                </span>
                                <span className="text-lg font-bold text-emerald-700 flex items-center">
                                  <IndianRupee size={16} />
                                  {order.payment_amount.toLocaleString()}
                                </span>
                              </div>
                              {order.payment_method && (
                                <p className="text-xs text-gray-500 mt-1">
                                  via {order.payment_method}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Smartphone size={64} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Orders Found
                </h3>
                <p className="text-gray-600 mb-6">
                  You haven't placed any orders yet. Start by selling your
                  phone!
                </p>
                <Link to="/sell-phone">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <Smartphone className="mr-2" size={18} />
                    Start Selling
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
