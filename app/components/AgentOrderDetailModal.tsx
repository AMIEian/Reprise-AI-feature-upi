import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { Order } from "../types";
import StatusBadge from "./StatusBadge";
import AgentCallControls from "./AgentCallControls";
import PostCallActions, { PostCallAction } from "./PostCallActions";

interface AgentOrderDetailModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onCompletePickup: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}

export default function AgentOrderDetailModal({
  visible,
  order,
  onClose,
  onCompletePickup,
  onReschedule,
  onCancel,
}: AgentOrderDetailModalProps) {
  const [callInProgress, setCallInProgress] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  if (!order) return null;

  // Get pickup address
  const getPickupAddress = () => {
    const parts = [
      order.pickup_address_line || order.address_line,
      order.pickup_city || order.city,
      order.pickup_state || order.state,
      order.pickup_pincode || order.pincode,
    ].filter(Boolean);
    return parts.join(", ") || order.pickup_address || "No address available";
  };

  // Handle map/directions
  const handleViewMap = async () => {
    const address = encodeURIComponent(getPickupAddress());

    let url: string;
    if (Platform.OS === "ios") {
      // Apple Maps
      url = `maps:0,0?q=${address}`;
    } else {
      // Google Maps (Android & Web)
      url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to Google Maps URL
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${address}`;
        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error("Error opening map:", error);
      Alert.alert("Error", "Unable to open maps");
    }
  };

  // Handle post-call action selection
  const handleActionSelect = (action: PostCallAction) => {
    switch (action) {
      case "complete":
        onCompletePickup();
        break;
      case "reschedule":
        onReschedule();
        break;
      case "cancel":
        onCancel();
        break;
    }
    // Reset call state for next time
    setCallEnded(false);
    setCallInProgress(false);
  };

  const handleClose = () => {
    setCallInProgress(false);
    setCallEnded(false);
    onClose();
  };

  // Customer phone
  const customerPhone =
    order.customer_phone || order.phone_number || String(order.phone) || "";

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Order Details</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statusContainer}>
            <StatusBadge status={order.status} size="small" />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Phone Info Card */}
          <View style={styles.phoneCard}>
            <Text style={styles.phoneName}>{order.phone_name}</Text>
            <Text style={styles.phoneSpecs}>
              {order.ram_gb}GB RAM • {order.storage_gb}GB Storage
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Estimated Price:</Text>
              <Text style={styles.priceValue}>
                ₹{order.ai_estimated_price || order.estimated_value}
              </Text>
            </View>
          </View>

          {/* Call Controls */}
          <AgentCallControls
            phoneNumber={customerPhone}
            customerName={order.customer_name || order.customer || "Customer"}
            callInProgress={callInProgress}
            onCallStart={() => setCallInProgress(true)}
            onCallEnd={() => {
              setCallInProgress(false);
              setCallEnded(true);
            }}
          />

          {/* Location & Directions */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationTitle}>📍 Pickup Location</Text>
              <TouchableOpacity
                style={styles.mapButton}
                onPress={handleViewMap}
              >
                <Text style={styles.mapButtonIcon}>🗺️</Text>
                <Text style={styles.mapButtonText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.locationAddress}>{getPickupAddress()}</Text>

            {order.pickup_date && (
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleIcon}>📅</Text>
                <View>
                  <Text style={styles.scheduleLabel}>Scheduled Pickup</Text>
                  <Text style={styles.scheduleValue}>
                    {order.pickup_date} at {order.pickup_time || "TBD"}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Order Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Order Information</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order ID</Text>
              <Text style={styles.detailValue}>#{order.id}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>
                {order.payment_method || order.payment_mode || "Not specified"}
              </Text>
            </View>

            {order.customer_condition_answers && (
              <>
                <Text style={styles.conditionTitle}>
                  Customer Reported Condition
                </Text>
                {Object.entries(order.customer_condition_answers).map(
                  ([key, value]) => (
                    <View key={key} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Text>
                      <Text style={styles.detailValue}>{String(value)}</Text>
                    </View>
                  ),
                )}
              </>
            )}

            {order.ai_reasoning && (
              <View style={styles.aiReasoningContainer}>
                <Text style={styles.aiReasoningLabel}>AI Pricing Notes</Text>
                <Text style={styles.aiReasoningText}>{order.ai_reasoning}</Text>
              </View>
            )}
          </View>

          {/* Post-Call Actions */}
          <PostCallActions
            callEnded={callEnded}
            onActionSelect={handleActionSelect}
          />

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 20,
    color: "#6b7280",
  },
  statusContainer: {
    flexDirection: "row",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Phone card
  phoneCard: {
    backgroundColor: "#9333ea",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  phoneName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  phoneSpecs: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 12,
    borderRadius: 10,
  },
  priceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  // Location card
  locationCard: {
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
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  mapButtonIcon: {
    fontSize: 14,
  },
  mapButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  locationAddress: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
    marginBottom: 12,
  },
  scheduleInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  scheduleIcon: {
    fontSize: 22,
  },
  scheduleLabel: {
    fontSize: 12,
    color: "#15803d",
    fontWeight: "600",
  },
  scheduleValue: {
    fontSize: 15,
    color: "#166534",
    fontWeight: "700",
  },
  // Details card
  detailsCard: {
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
  detailsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    maxWidth: "50%",
    textAlign: "right",
  },
  conditionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  aiReasoningContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  aiReasoningLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  aiReasoningText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 20,
    fontStyle: "italic",
  },
  bottomPadding: {
    height: 40,
  },
});
