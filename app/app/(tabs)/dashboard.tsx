import { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useRouter, useLocalSearchParams, type Router } from "expo-router";
import api from "../../lib/api";
import { Order } from "../../types";
import { formatPrice, formatCountdown } from "../../utils/formatting";
import { getStatusColor } from "../../utils/statusColors";
import BuyCreditsModal from "../../components/BuyCreditsModal";
import socket from "@/lib/socket";
import { Audio } from "expo-av";

type TabType =
  | "locked"
  | "purchased"
  | "in_progress"
  | "completed"
  | "marketplace";

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(
    (params.tab as TabType) || "locked",
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [lockedDeals, setLockedDeals] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationData, setNotificationData] = useState<any>(null);

  useEffect(() => {
    if (params.tab) {
      setActiveTab(params.tab as TabType);
    }
  }, [params.tab]);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, lockedRes, partnerRes] = await Promise.all([
        api.get<Order[]>("/partner/orders"),
        api.get<Order[]>("/partner/locked-deals"),
        api.get("/partner/me"),
      ]);
      setOrders(ordersRes.data);
      setLockedDeals(lockedRes.data);
      setCreditBalance(partnerRes.data.credit_balance || 0);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        Alert.alert("Error", "Failed to fetch data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await fetchData();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handlePurchase = (orderId: number) => {
    router.push(`/lead-purchase/${orderId}`);
  };

  const handleLogout = async () => {
    try {
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
              } catch (e) {
                Alert.alert("Error", "Failed to logout");
              }
            },
          },
        ]);
      }
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "An error occurred during logout");
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const getFilteredOrders = () => {
    switch (activeTab) {
      case "locked":
        return lockedDeals;
      case "purchased":
        return orders.filter((o) => o.status === "lead_purchased");
      case "in_progress":
        return orders.filter((o) =>
          ["assigned_to_agent", "accepted_by_agent"].includes(o.status),
        );
      case "completed":
        return orders.filter((o) =>
          ["pickup_completed", "payment_processed", "completed"].includes(
            o.status,
          ),
        );
      case "marketplace":
        return [];
      default:
        return [];
    }
  };

  const filteredOrders = getFilteredOrders();

  const tabs = [
    {
      id: "locked" as TabType,
      label: "Locked Deals",
      count: lockedDeals.length,
    },
    {
      id: "purchased" as TabType,
      label: "Purchased",
      count: orders.filter((o) => o.status === "lead_purchased").length,
    },
    {
      id: "in_progress" as TabType,
      label: "In Progress",
      count: orders.filter((o) =>
        ["assigned_to_agent", "accepted_by_agent"].includes(o.status),
      ).length,
    },
    {
      id: "completed" as TabType,
      label: "Completed",
      count: orders.filter((o) =>
        ["pickup_completed", "payment_processed", "completed"].includes(
          o.status,
        ),
      ).length,
    },
    { id: "marketplace" as TabType, label: "Marketplace", count: 0 },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {notificationVisible && notificationData && (
        <TouchableOpacity
          style={styles.notificationPopup}
          onPress={() => {
            setNotificationVisible(false);

            router.push(`/lead-detail/${notificationData.order_id}`);
          }}
        >
          <Text style={styles.notificationTitle}>New Order Available</Text>

          <Text style={styles.notificationText}>
            {notificationData.brand} {notificationData.model}
          </Text>

          <Text style={styles.notificationSubtext}>Tap to view details</Text>
        </TouchableOpacity>
      )}
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.partnerName}>{user?.name || "Partner"}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.creditBadge}>
            <Text style={styles.creditLabel}>Credits</Text>
            <Text style={styles.creditValue}>{creditBalance}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Buy Credits Button */}
      <View style={styles.buyCreditsContainer}>
        <TouchableOpacity
          style={styles.buyCreditsButton}
          onPress={() => setShowBuyCredits(true)}
        >
          <Text style={styles.buyCreditsText}>💳 Buy Credits</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsContent}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "marketplace" ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🏪</Text>
            <Text style={styles.emptyStateTitle}>Browse Marketplace</Text>
            <Text style={styles.emptyStateText}>
              View the marketplace tab for available leads
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.replace("/marketplace")}
            >
              <Text style={styles.emptyStateButtonText}>Go to Marketplace</Text>
            </TouchableOpacity>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📦</Text>
            <Text style={styles.emptyStateTitle}>
              No {tabs.find((t) => t.id === activeTab)?.label}
            </Text>
            <Text style={styles.emptyStateText}>
              {activeTab === "locked" &&
                "Lock leads from the marketplace to see them here"}
              {activeTab === "purchased" &&
                "Purchase locked leads to see them here"}
              {activeTab === "in_progress" &&
                "Assign orders to agents to see them here"}
              {activeTab === "completed" && "Completed orders will appear here"}
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.order_id || order.id}
                order={order}
                activeTab={activeTab}
                onPurchase={handlePurchase}
                router={router}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <BuyCreditsModal
        visible={showBuyCredits}
        onClose={() => setShowBuyCredits(false)}
        onSuccess={() => {
          fetchData();
          // The modal already calls refreshUser internally
        }}
      />
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  activeTab,
  onPurchase,
  router,
}: {
  order: Order;
  activeTab: TabType;
  onPurchase: (id: number) => void;
  router: Router;
}) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === "locked" && order.lead_lock_expires_at) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const lockEnd = new Date(order.lead_lock_expires_at!).getTime();
        const diff = Math.max(0, Math.floor((lockEnd - now) / 1000));
        setTimeRemaining(diff);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [order.lead_lock_expires_at, activeTab]);

  const statusColor = getStatusColor(order.status);

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderModel}>{order.phone_name}</Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
            {order.status.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.orderSpec}>
          {order.ram_gb}GB RAM • {order.storage_gb}GB
        </Text>
        <Text style={styles.orderPrice}>
          {formatPrice(order.ai_estimated_price)}
        </Text>
      </View>

      <View style={styles.orderMeta}>
        <Text style={styles.orderMetaText}>📍 {order.pickup_city}</Text>
        <Text style={styles.orderMetaText}>📱 {order.customer_phone}</Text>
      </View>

      <View style={styles.orderActions}>
        {activeTab === "locked" && (
          <TouchableOpacity
            style={styles.actionButtonPrimary}
            onPress={() => onPurchase(order.order_id || order.id)}
          >
            <Text style={styles.actionButtonTextPrimary}>Purchase Lead</Text>
          </TouchableOpacity>
        )}
        {activeTab === "purchased" && (
          <TouchableOpacity
            style={styles.actionButtonPrimary}
            onPress={() => router.push(`/order-detail/${order.id}`)}
          >
            <Text style={styles.actionButtonTextPrimary}>Assign to Agent</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() =>
            router.push(
              `/lead-detail/${order.order_id || order.id}?source=${activeTab}`,
            )
          }
        >
          <Text style={styles.actionButtonTextSecondary}>View Details</Text>
        </TouchableOpacity>
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
  partnerName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  creditBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  creditLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "600",
  },
  creditValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563eb",
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
  buyCreditsContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
  },
  buyCreditsButton: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  buyCreditsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  tabsContainer: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f9fafb",
    marginRight: 8,
    marginBottom: 8,
  },
  activeTab: {
    backgroundColor: "#2563eb",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  activeTabLabel: {
    color: "#ffffff",
  },
  badge: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2563eb",
  },
  content: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyStateButton: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  ordersList: {
    padding: 16,
    gap: 16,
  },
  orderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderSpec: {
    fontSize: 14,
    color: "#6b7280",
  },
  orderPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#16a34a",
  },
  orderMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orderMetaText: {
    fontSize: 12,
    color: "#6b7280",
  },
  timerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  timerLabel: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
  },
  timerValue: {
    fontSize: 14,
    color: "#92400e",
    fontWeight: "bold",
  },
  orderActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  actionButtonTextPrimary: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  actionButtonTextSecondary: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  notificationPopup: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    padding: 16,
    zIndex: 9999,
    elevation: 10,
  },

  notificationTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },

  notificationText: {
    color: "#ffffff",
    fontSize: 14,
    marginTop: 4,
  },

  notificationSubtext: {
    color: "#dbeafe",
    fontSize: 12,
    marginTop: 6,
  },
});
