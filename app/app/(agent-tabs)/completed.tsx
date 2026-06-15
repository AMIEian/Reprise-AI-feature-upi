import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../lib/api";
import { Order } from "../../types";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";

export default function CompletedOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await api.get<Order[]>("/agent/orders");
      const completed = response.data.filter((o) =>
        ["pickup completed", "payment_processed", "completed"].includes(
          o.status,
        ),
      );
      setOrders(completed);
      console.log("customer orders", orders);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        Alert.alert("Error", "Failed to fetch completed orders");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Completed Orders</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{orders.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {orders.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No Completed Orders"
            message="Completed orders will appear here once you finish pickups."
          />
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <CompletedOrderCard
                key={order.id || order.order_id}
                order={order}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CompletedOrderCard({ order }: { order: Order }) {
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
        <Text style={styles.infoLabel}>Location:</Text>
        <Text style={styles.infoValue}>{order.pickup_address_line + " " + order.pickup_city + " " + order.pickup_state + " " + order.pickup_pincode}</Text>
      </View>

      {order.pickup_schedule_date && (
        <View style={styles.completedInfo}>
          <Text style={styles.completedLabel}>✅ Picked Up</Text>
          <Text style={styles.completedDate}>
            {order.pickup_schedule_date} at {order.pickup_schedule_time}
          </Text>
        </View>
      )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  countBadge: {
    backgroundColor: "#9333ea",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
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
    color: "#6b7280",
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
  completedInfo: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completedLabel: {
    fontSize: 12,
    color: "#15803d",
    fontWeight: "600",
  },
  completedDate: {
    fontSize: 12,
    color: "#15803d",
  },
  finalPriceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  finalPriceLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  finalPriceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#16a34a",
  },
});
