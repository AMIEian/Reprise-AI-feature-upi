import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "../../lib/api";
import { Order } from "../../types";
import { formatPrice, formatDate } from "../../utils/formatting";
import StatusBadge from "../../components/StatusBadge";

export default function DiagnosticDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      const response = await api.get<Order>(`/agent/orders/${id}`);
      setOrder(response.data);
    } catch (error: any) {
      Alert.alert("Error", "Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Device Information */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Device Information</Text>
          <StatusBadge status={order.status} size="small" />
        </View>

        <View style={styles.deviceInfo}>
          <Text style={styles.brand}>{order.brand}</Text>
          <Text style={styles.model}>{order.model}</Text>
          <Text style={styles.variant}>
            {order.ram_gb}GB RAM • {order.storage_gb}GB Storage
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>AI Estimated Price</Text>
          <Text style={styles.priceValue}>
            {formatPrice(order.ai_estimated_price)}
          </Text>
        </View>
      </View>

      {/* Customer Condition Answers */}
      {order.customer_condition_answers && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Reported Condition</Text>

          <View style={styles.conditionGrid}>
            <View style={styles.conditionItem}>
              <Text style={styles.conditionLabel}>Screen Condition</Text>
              <Text style={styles.conditionValue}>
                {order.customer_condition_answers.screen_condition}
              </Text>
            </View>

            <View style={styles.conditionItem}>
              <Text style={styles.conditionLabel}>Device Turns On</Text>
              <Text style={styles.conditionValue}>
                {order.customer_condition_answers.device_turns_on
                  ? "✅ Yes"
                  : "❌ No"}
              </Text>
            </View>

            <View style={styles.conditionItem}>
              <Text style={styles.conditionLabel}>Original Box</Text>
              <Text style={styles.conditionValue}>
                {order.customer_condition_answers.has_original_box
                  ? "✅ Yes"
                  : "❌ No"}
              </Text>
            </View>

            <View style={styles.conditionItem}>
              <Text style={styles.conditionLabel}>Original Bill</Text>
              <Text style={styles.conditionValue}>
                {order.customer_condition_answers.has_original_bill
                  ? "✅ Yes"
                  : "❌ No"}
              </Text>
            </View>

            {order.customer_condition_answers.device_age && (
              <View style={styles.conditionItem}>
                <Text style={styles.conditionLabel}>Device Age</Text>
                <Text style={styles.conditionValue}>
                  {order.customer_condition_answers.device_age}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* AI Reasoning */}
      {order.ai_reasoning && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Price Reasoning</Text>
          <Text style={styles.reasoningText}>{order.ai_reasoning}</Text>
        </View>
      )}

      {/* Customer Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Customer Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{order.customer_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{order.customer_phone}</Text>
        </View>

        {order.customer_email && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{order.customer_email}</Text>
          </View>
        )}
      </View>

      {/* Pickup Address */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pickup Address</Text>

        <Text style={styles.addressText}>{order.pickup_address_line}</Text>
        <Text style={styles.addressText}>
          {order.pickup_city}, {order.pickup_state} - {order.pickup_pincode}
        </Text>

        {order.pickup_date && (
          <View style={styles.pickupSchedule}>
            <Text style={styles.pickupLabel}>📅 Scheduled:</Text>
            <Text style={styles.pickupDate}>
              {formatDate(order.pickup_date)} at {order.pickup_time}
            </Text>
          </View>
        )}
      </View>

      {/* Actual Condition (if completed) */}
      {order.actual_condition && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verified Condition</Text>
          <Text style={styles.conditionText}>{order.actual_condition}</Text>

          {order.final_offered_price && (
            <View style={styles.finalPriceRow}>
              <Text style={styles.finalPriceLabel}>Final Offered Price:</Text>
              <Text style={styles.finalPriceValue}>
                {formatPrice(order.final_offered_price)}
              </Text>
            </View>
          )}

          {order.customer_accepted_offer !== null && (
            <View style={styles.acceptanceRow}>
              <Text style={styles.acceptanceLabel}>Customer Accepted:</Text>
              <Text
                style={[
                  styles.acceptanceValue,
                  order.customer_accepted_offer
                    ? styles.acceptedText
                    : styles.declinedText,
                ]}
              >
                {order.customer_accepted_offer ? "✅ Yes" : "❌ No"}
              </Text>
            </View>
          )}

          {order.pickup_notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{order.pickup_notes}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#0d9488",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#ffffff",
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  deviceInfo: {
    marginBottom: 12,
  },
  brand: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  model: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 4,
  },
  variant: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  priceLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#16a34a",
  },
  conditionGrid: {
    gap: 12,
  },
  conditionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  conditionLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  conditionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  reasoningText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  pickupSchedule: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  pickupLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginRight: 8,
  },
  pickupDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0d9488",
  },
  conditionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  finalPriceRow: {
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
  },
  finalPriceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#16a34a",
  },
  acceptanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  acceptanceLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  acceptanceValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  acceptedText: {
    color: "#16a34a",
  },
  declinedText: {
    color: "#dc2626",
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
});
