import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import api from "../../lib/api";
import { Order } from "../../types";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";
import SchedulePickupModal from "../../components/SchedulePickupModal";
import CompletePickupWizard from "../../components/CompletePickupWizard";
import ReschedulePickupModal from "../../components/ReschedulePickupModal";
import CancelPickupModal from "../../components/CancelPickupModal";
import AgentOrderDetailModal from "../../components/AgentOrderDetailModal";
import HoldNotificationBanner from "../../components/HoldNotificationBanner";
import socket from "@/lib/socket";
import * as Notifications from "expo-notifications";

export default function AgentDashboardScreen() {
  const { user, logout, switchToPartnerPortal } = useAuth();
  const router = useRouter();
  const [switchingToPartner, setSwitchingToPartner] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await api.get<Order[]>("/agent/orders");

      setOrders(response.data);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        Alert.alert("Error", "Failed to fetch orders");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const onConnect = () => {
      console.log("SOCKET CONNECTED");

      socket.emit("register_agent", {
        agent_id: user?.id,
        name: user?.name,
      });
    };

    const handleNewOrder = async (data: any) => {
      console.log("NEW AGENT ORDER:", data);

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "New Pickup Assigned",
            body: `${data.brand} ${data.model}`,
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: {
              order_id: data.order_id,
            },
          },
          trigger: null,
        });

        fetchOrders();
      } catch (err) {
        console.log("Notification error:", err);
      }
    };

    socket.off("connect", onConnect);
    socket.on("connect", onConnect);

    socket.off("new_agent_order", handleNewOrder);
    socket.on("new_agent_order", handleNewOrder);

    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }
    
    return () => {
      socket.off("new_agent_order", handleNewOrder);
      socket.off("connect", onConnect);
    };
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (confirmed) {
        await logout();
        window.location.href = "/";
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              // Wait for state to clear
              await new Promise((resolve) => setTimeout(resolve, 150));
              router.replace("/");
            } catch (error) {
              console.error("Logout error:", error);
            }
          },
        },
      ]);
    }
  };

  const handleSchedule = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowScheduleModal(true);
  };

  const handleComplete = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowCompleteModal(true);
  };

  const handleReschedule = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowRescheduleModal(true);
  };

  const handleCancel = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowCancelModal(true);
  };

  const handleViewDetails = (order: Order) => {
    const orderId = order.id || order.order_id;
    setSelectedOrderId(orderId || null);
    setSelectedOrder(order);
    setShowOrderDetailModal(true);
  };

  const closeAllModals = () => {
    setShowScheduleModal(false);
    setShowCompleteModal(false);
    setShowRescheduleModal(false);
    setShowCancelModal(false);
    setShowOrderDetailModal(false);
    setSelectedOrderId(null);
    setSelectedOrder(null);
  };

  const currentOrders = orders.filter((o) =>
    ["assigned_to_agent", "accepted_by_agent", "pickup_scheduled"].includes(
      o.status,
    ),
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Hold Notification Banner */}
      {user?.is_on_hold && (
        <HoldNotificationBanner
          reason={user.hold_reason}
          liftDate={user.hold_lift_date}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.agentName}>{user?.name || "Agent"}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {(user as any)?.is_self_assigned && (
            <TouchableOpacity
              onPress={async () => {
                setSwitchingToPartner(true);
                try {
                  await switchToPartnerPortal();
                  // Navigation handled automatically by root layout
                } catch {
                  Alert.alert("Error", "Failed to switch to Partner Portal.");
                } finally {
                  setSwitchingToPartner(false);
                }
              }}
              disabled={switchingToPartner}
              style={styles.switchToPartnerButton}
            >
              {switchingToPartner ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.switchToPartnerText}>Partner Portal</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{currentOrders.length}</Text>
          <Text style={styles.statLabel}>Current Orders</Text>
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        key={currentOrders.length}
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {currentOrders.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No Current Orders"
            message="You don't have any assigned orders at the moment. Check back soon!"
          />
        ) : (
          <View style={styles.ordersList}>
            {currentOrders.map((order) => (
              <AgentOrderCard
                key={order.id || order.order_id}
                order={order}
                onSchedule={handleSchedule}
                onComplete={handleComplete}
                onViewDetails={handleViewDetails}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {selectedOrderId && (
        <>
          <SchedulePickupModal
            visible={showScheduleModal}
            orderId={selectedOrderId}
            onClose={() => {
              setShowScheduleModal(false);
              setSelectedOrderId(null);
            }}
            onSuccess={() => {
              fetchOrders();
            }}
          />
          <CompletePickupWizard
            visible={showCompleteModal}
            orderId={selectedOrderId}
            estimatedPrice={
              selectedOrder?.ai_estimated_price ||
              selectedOrder?.estimated_value
            }
            onClose={() => {
              setShowCompleteModal(false);
              setSelectedOrderId(null);
            }}
            onSuccess={() => {
              fetchOrders();
            }}
          />
          <ReschedulePickupModal
            visible={showRescheduleModal}
            orderId={selectedOrderId}
            onClose={() => {
              setShowRescheduleModal(false);
              setSelectedOrderId(null);
            }}
            onSuccess={() => {
              fetchOrders();
            }}
          />
          <CancelPickupModal
            visible={showCancelModal}
            orderId={selectedOrderId}
            onClose={() => {
              setShowCancelModal(false);
              setSelectedOrderId(null);
            }}
            onSuccess={() => {
              fetchOrders();
            }}
          />
        </>
      )}

      {/* Order Detail Modal */}
      <AgentOrderDetailModal
        visible={showOrderDetailModal}
        order={selectedOrder}
        onClose={() => {
          setShowOrderDetailModal(false);
          setSelectedOrder(null);
          setSelectedOrderId(null);
        }}
        onCompletePickup={() => {
          setShowOrderDetailModal(false);
          setShowCompleteModal(true);
        }}
        onReschedule={() => {
          setShowOrderDetailModal(false);
          setShowRescheduleModal(true);
        }}
        onCancel={() => {
          setShowOrderDetailModal(false);
          setShowCancelModal(true);
        }}
      />
    </SafeAreaView>
  );
}

function AgentOrderCard({
  order,
  onSchedule,
  onComplete,
  onViewDetails,
}: {
  order: Order;
  onSchedule: (id: number) => void;
  onComplete: (id: number) => void;
  onViewDetails: (order: Order) => void;
}) {
  const orderIdentifier = order.id || order.order_id;
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderModel}>{order.phone_name}</Text>
        </View>
        <StatusBadge status={order.status} size="small" />
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.orderSpec}>{order.specs}</Text>
        <Text style={styles.orderPrice}>{order.estimated_value}</Text>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.infoLabel}>Customer:</Text>
        <Text style={styles.infoValue}>{order.customer_name}</Text>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.infoLabel}>Phone:</Text>
        <Text style={styles.infoValue}>
          {order.customer_phone || order.phone_number}
        </Text>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.infoLabel}>Payment:</Text>
        <Text style={styles.infoValue}>
          {order.payment_method?.toUpperCase() || "N/A"}
        </Text>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.infoLabel}>Location:</Text>
        <Text style={styles.infoValue}>
          {order.pickup_address_line +
            " " +
            order.pickup_city +
            " " +
            order.pickup_state +
            " " +
            order.pickup_pincode}
        </Text>
      </View>

      {order.pickup_schedule_date && (
        <View style={styles.pickupInfo}>
          <Text style={styles.pickupLabel}>📅 Pickup Scheduled</Text>
          <Text style={styles.pickupDate}>
            {order.pickup_schedule_date} at {order.pickup_schedule_time}
          </Text>
        </View>
      )}

      <View style={styles.orderActions}>
        {/* View Details Button - Always shown */}
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => onViewDetails(order)}
        >
          <Text style={styles.viewDetailsButtonText}>📋 View Details</Text>
        </TouchableOpacity>

        {/* Schedule Pickup Button - Only for unscheduled orders */}
        {(order.status === "assigned_to_agent" ||
          order.status === "accepted_by_agent") &&
          !order.pickup_schedule_date && (
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={() => orderIdentifier && onSchedule(orderIdentifier)}
            >
              <Text style={styles.scheduleButtonText}>📅 Schedule</Text>
            </TouchableOpacity>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  welcomeText: {
    fontSize: 14,
    color: "#6b7280",
  },
  agentName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "600",
  },
  switchToPartnerButton: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchToPartnerText: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#9333ea",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  ordersList: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderBrand: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  orderModel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 2,
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  orderSpec: {
    fontSize: 14,
    color: "#6b7280",
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#16a34a",
  },
  orderInfo: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6b7280",
    width: 80,
  },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    flex: 1,
    fontWeight: "500",
  },
  pickupInfo: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  pickupLabel: {
    fontSize: 12,
    color: "#15803d",
    fontWeight: "600",
    marginBottom: 4,
  },
  pickupDate: {
    fontSize: 14,
    color: "#15803d",
    fontWeight: "bold",
  },
  orderActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: "#9333ea",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  viewDetailsButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  scheduleButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  scheduleButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  completeButton: {
    flex: 1,
    backgroundColor: "#9333ea",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
