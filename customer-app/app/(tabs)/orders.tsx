import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../lib/api";
import { API_ENDPOINTS } from "../../config";
import { useAuth } from "../../context/AuthContext";
import OrderCard from "../../components/OrderCard";
import EmptyState from "../../components/EmptyState";
import LoadingScreen from "../../components/LoadingScreen";
import StatusBadge from "../../components/StatusBadge";
import Button from "../../components/Button";
import { formatPrice, formatDate, formatDateTime } from "../../utils/helpers";
import type { Order } from "../../types";

export default function MyOrdersScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await api.get(API_ENDPOINTS.MY_ORDERS);
      setOrders(response.data || []);
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load orders. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    fetchOrders(true);
  };

  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon="🔐"
          title="Login Required"
          message="Please login to view your orders"
          actionLabel="Login"
          onAction={() => router.push("/(auth)/login")}
        />
      </View>
    );
  }

  if (loading) {
    return <LoadingScreen message="Loading orders..." />;
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Try Again" onPress={() => fetchOrders()} />
      </View>
    );
  }

  const renderOrder = ({ item }: { item: Order }) => (
    <OrderCard order={item} onPress={() => handleOrderPress(item)} />
  );

  const renderOrderDetailModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Order Details</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Order Status */}
            <View style={styles.statusSection}>
              <StatusBadge status={selectedOrder.status} size="large" />
              <Text style={styles.orderNumber}>Order #{selectedOrder.id}</Text>
              <Text style={styles.orderDate}>
                Placed on {formatDateTime(selectedOrder.created_at)}
              </Text>
            </View>

            {/* Phone Details */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Phone Details</Text>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={20}
                    color="#6b7280"
                  />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Device</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.phone_name ||
                        (selectedOrder.brand && selectedOrder.model
                          ? `${selectedOrder.brand} ${selectedOrder.model}`
                          : "Unknown")}
                    </Text>
                  </View>
                </View>
                {selectedOrder.variant && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="hardware-chip-outline"
                      size={20}
                      color="#6b7280"
                    />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Variant</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.variant}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Pickup Details */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Pickup Details</Text>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={20} color="#6b7280" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.customer_name || "-"}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={20} color="#6b7280" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.customer_phone || "-"}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={20} color="#6b7280" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue}>
                      {[
                        selectedOrder.pickup_address_line,
                        selectedOrder.pickup_city,
                        selectedOrder.pickup_state,
                        selectedOrder.pickup_pincode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </Text>
                  </View>
                </View>
                {selectedOrder.pickup_date && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#6b7280"
                    />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Pickup Date</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedOrder.pickup_date)}
                        {selectedOrder.pickup_time &&
                          ` at ${selectedOrder.pickup_time}`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Agent Details (if assigned) */}
            {selectedOrder.agent_name && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Agent Details</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="person-circle-outline"
                      size={20}
                      color="#6b7280"
                    />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Agent Name</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.agent_name}
                      </Text>
                    </View>
                  </View>
                  {selectedOrder.agent_phone && (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={20} color="#6b7280" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Agent Phone</Text>
                        <Text style={styles.detailValue}>
                          {selectedOrder.agent_phone}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Payment Details */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Payment Details</Text>
              <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Quoted Price</Text>
                  <Text style={styles.priceValue}>
                    {formatPrice(selectedOrder.final_quoted_price)}
                  </Text>
                </View>
                {selectedOrder.final_offered_price && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Final Offered</Text>
                    <Text style={styles.priceValue}>
                      {formatPrice(selectedOrder.final_offered_price)}
                    </Text>
                  </View>
                )}
                {selectedOrder.payment_amount && (
                  <View style={[styles.priceRow, styles.priceRowFinal]}>
                    <Text style={styles.priceLabelFinal}>Amount Paid</Text>
                    <Text style={styles.priceValueFinal}>
                      {formatPrice(selectedOrder.payment_amount)}
                    </Text>
                  </View>
                )}
                {selectedOrder.payment_method && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Payment Method</Text>
                    <Text style={styles.priceValue}>
                      {selectedOrder.payment_method.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* AI Reasoning (if available) */}
            {selectedOrder.ai_reasoning && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Price Analysis</Text>
                <View style={styles.reasoningCard}>
                  <Text style={styles.reasoningText}>
                    {selectedOrder.ai_reasoning}
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No Orders Yet"
          message="You haven't sold any phones yet. Start selling to see your orders here."
          actionLabel="Sell a Phone"
          onAction={() => router.push("/(tabs)/sell")}
        />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#2563eb"]}
            />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {orders.length} order{orders.length !== 1 ? "s" : ""}
            </Text>
          }
        />
      )}

      {renderOrderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginVertical: 16,
  },
  list: {
    padding: 16,
  },
  listHeader: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalContent: {
    flex: 1,
  },
  statusSection: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
  },
  orderDate: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  detailSection: {
    padding: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  priceCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  priceRowFinal: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: "#2563eb",
  },
  priceLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  priceLabelFinal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563eb",
  },
  priceValueFinal: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2563eb",
  },
  reasoningCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
  },
  reasoningText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
});
