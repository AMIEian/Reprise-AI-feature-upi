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
import { formatPrice, formatDate, formatTime } from "../../utils/formatting";
import StatusBadge from "../../components/StatusBadge";
import AssignAgentModal from "../../components/AssignAgentModal";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      // Fetch partner orders and find the specific one
      const response = await api.get<Order[]>("/partner/orders");
      const foundOrder = response.data.find((o) => o.id.toString() === id);
      setOrder(foundOrder || null);
    } catch (error: any) {
      Alert.alert("Error", "Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    // Navigate to dashboard - it will auto-refresh due to useFocusEffect
    router.replace("/(tabs)/dashboard?tab=in_progress");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
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
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Check if order can have an agent assigned
  const canAssignAgent =
    order.status === "lead_purchased" || order.status === "purchased";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={styles.backIcon}
        >
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Assign Agent Action */}
        {canAssignAgent && (
          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.assignAgentButton}
              onPress={() => setShowAssignModal(true)}
            >
              <Text style={styles.assignAgentButtonText}> Assign Agent</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Order Status</Text>
            <StatusBadge status={order.status} size="large" />
          </View>

          <View style={styles.timeline}>
            <TimelineItem
              icon="📝"
              title="Created"
              date={formatDate(order.created_at)}
              time={formatTime(order.created_at)}
              completed
            />

            {order.locked_at && (
              <TimelineItem
                icon="🔒"
                title="Locked"
                date={formatDate(order.locked_at)}
                time={formatTime(order.locked_at)}
                completed
              />
            )}

            {order.purchased_at && (
              <TimelineItem
                icon="💳"
                title="Purchased"
                date={formatDate(order.purchased_at)}
                time={formatTime(order.purchased_at)}
                completed
              />
            )}

            {order.assigned_at && (
              <TimelineItem
                icon="👤"
                title="Assigned to Agent"
                date={formatDate(order.assigned_at)}
                time={formatTime(order.assigned_at)}
                completed
              />
            )}

            {order.accepted_at && (
              <TimelineItem
                icon="✅"
                title="Accepted by Agent"
                date={formatDate(order.accepted_at)}
                time={formatTime(order.accepted_at)}
                completed
              />
            )}

            {order.scheduled_pickup_time && (
              <TimelineItem
                icon="📅"
                title="Pickup Scheduled"
                date={formatDate(order.scheduled_pickup_time)}
                time={formatTime(order.scheduled_pickup_time)}
                completed={order.status !== "scheduled"}
              />
            )}

            {order.completed_at && (
              <TimelineItem
                icon="🎉"
                title="Completed"
                date={formatDate(order.completed_at)}
                time={formatTime(order.completed_at)}
                completed
              />
            )}
          </View>
        </View>

        {/* Device Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Device Information</Text>

          <View style={styles.deviceHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.model}>{order.phone_name}</Text>
              {order.ai_reasoning && (
                <Text style={styles.aiReasoning}>{order.ai_reasoning}</Text>
              )}
            </View>
            <Text style={styles.estimatedPrice}>
              {formatPrice(order.ai_estimated_price)}
            </Text>
          </View>

          <View style={styles.specs}>
            <SpecItem label="RAM" value={`${order.ram_gb}GB`} />
            <SpecItem label="Storage" value={`${order.storage_gb}GB`} />
          </View>
        </View>

        {/* Customer Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Information</Text>

          <InfoRow label="Name" value={order.customer_name} />
          {order.customer_phone && (
            <InfoRow label="Phone" value={order.customer_phone} />
          )}
          {order.customer_email && (
            <InfoRow label="Email" value={order.customer_email} />
          )}
          {order.pickup_city && (
            <InfoRow label="City" value={order.pickup_city} />
          )}
          {order.pickup_pincode && (
            <InfoRow label="Pincode" value={order.pickup_pincode} />
          )}

          {order.pickup_address_line && (
            <View style={styles.addressRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.addressValue}>
                {order.pickup_address_line}
              </Text>
            </View>
          )}
        </View>

        {/* Agent Info Card */}
        {order.agent_name && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned Agent</Text>

            <InfoRow label="Name" value={order.agent_name} />
            {order.agent_phone && (
              <InfoRow label="Phone" value={order.agent_phone} />
            )}
            {order.agent_email && (
              <InfoRow label="Email" value={order.agent_email} />
            )}
          </View>
        )}

        {/* Pickup Details Card */}
        {order.scheduled_pickup_time && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pickup Details</Text>

            <InfoRow
              label="Scheduled Time"
              value={`${formatDate(order.scheduled_pickup_time)} ${formatTime(
                order.scheduled_pickup_time,
              )}`}
            />
          </View>
        )}

        {/* Condition Assessment Card */}
        {order.customer_condition_answers && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Device Condition Assessment</Text>

            {order.customer_condition_answers.screen_condition && (
              <InfoRow
                label="Screen Condition"
                value={order.customer_condition_answers.screen_condition.replace(
                  /-/g,
                  " ",
                )}
              />
            )}
            {order.customer_condition_answers.device_turns_on && (
              <InfoRow
                label="Device Turns On"
                value={order.customer_condition_answers.device_turns_on}
              />
            )}

            <View style={styles.checkboxes}>
              {order.customer_condition_answers.has_original_box !==
                undefined && (
                <CheckItem
                  label="Original Box"
                  checked={
                    order.customer_condition_answers.has_original_box === "yes"
                  }
                />
              )}
              {order.customer_condition_answers.has_original_bill !==
                undefined && (
                <CheckItem
                  label="Original Bill"
                  checked={
                    order.customer_condition_answers.has_original_bill === "yes"
                  }
                />
              )}
            </View>
            {order.customer_condition_answers.device_age && (
              <InfoRow
                label="Device Age"
                value={order.customer_condition_answers.device_age}
              />
            )}
          </View>
        )}

        {/* Payment Info Card */}
        {order.final_price && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Information</Text>

            <View style={styles.finalPriceRow}>
              <Text style={styles.finalPriceLabel}>Final Price</Text>
              <Text style={styles.finalPriceValue}>
                {formatPrice(order.final_price)}
              </Text>
            </View>

            <InfoRow
              label="Payment Method"
              value={order.payment_method || "N/A"}
            />

            {order.completion_notes && (
              <View style={styles.notesSection}>
                <Text style={styles.infoLabel}>Notes:</Text>
                <Text style={styles.notesValue}>{order.completion_notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Add some bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Assign Agent Modal */}
      {order && (
        <AssignAgentModal
          visible={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          orderId={order.id}
          onSuccess={handleAssignSuccess}
        />
      )}
    </SafeAreaView>
  );
}

// Helper Components
const TimelineItem = ({
  icon,
  title,
  date,
  time,
  completed,
}: {
  icon: string;
  title: string;
  date: string;
  time: string;
  completed: boolean;
}) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineIconContainer}>
      <Text
        style={[styles.timelineIcon, !completed && styles.timelineIconInactive]}
      >
        {icon}
      </Text>
      <View
        style={[styles.timelineLine, !completed && styles.timelineLineInactive]}
      />
    </View>
    <View style={styles.timelineContent}>
      <Text
        style={[
          styles.timelineTitle,
          !completed && styles.timelineTitleInactive,
        ]}
      >
        {title}
      </Text>
      <Text style={styles.timelineDate}>
        {date} {time}
      </Text>
    </View>
  </View>
);

const SpecItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.specItem}>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={styles.specValue}>{value}</Text>
  </View>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const CheckItem = ({
  label,
  checked,
  alert,
}: {
  label: string;
  checked?: boolean;
  alert?: boolean;
}) => (
  <View style={styles.checkItem}>
    <Text style={styles.checkIcon}>
      {checked ? (alert ? "⚠️" : "✅") : "❌"}
    </Text>
    <Text style={styles.checkLabel}>{label}</Text>
  </View>
);

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
    marginBottom: 24,
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
  backIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backIconText: {
    fontSize: 24,
    color: "#111827",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  actionCard: {
    margin: 16,
    marginBottom: 0,
  },
  assignAgentButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignAgentButtonText: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  timeline: {
    marginLeft: 8,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineIconContainer: {
    alignItems: "center",
    marginRight: 12,
  },
  timelineIcon: {
    fontSize: 24,
    width: 40,
    height: 40,
    textAlign: "center",
    lineHeight: 40,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
  },
  timelineIconInactive: {
    opacity: 0.4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#d1d5db",
    marginTop: 4,
  },
  timelineLineInactive: {
    opacity: 0.3,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 8,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  timelineTitleInactive: {
    color: "#9ca3af",
  },
  timelineDate: {
    fontSize: 14,
    color: "#6b7280",
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  brand: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  aiReasoning: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  model: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 4,
  },
  estimatedPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#16a34a",
  },
  specs: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  specItem: {
    alignItems: "center",
  },
  specLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  specValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  addressRow: {
    marginBottom: 12,
  },
  addressValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    marginTop: 4,
    lineHeight: 20,
  },
  checkboxes: {
    marginTop: 8,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  checkLabel: {
    fontSize: 14,
    color: "#111827",
  },
  finalPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  finalPriceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  finalPriceValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#16a34a",
  },
  notesSection: {
    marginTop: 12,
  },
  notesValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    marginTop: 4,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
