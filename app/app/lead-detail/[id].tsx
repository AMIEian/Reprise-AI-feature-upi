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

export default function LeadDetailScreen() {
  const { id, source } = useLocalSearchParams();
  const router = useRouter();
  const [lead, setLead] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchLeadDetail();
  }, [id]);

  const fetchLeadDetail = async () => {
    try {
      const response = await api.get(`/sell-phone/partner/leads/${id}`);
      const leadData = response.data;

      // Map order_id to id for consistency
      const lead = {
        ...leadData,
        id: leadData.order_id || leadData.id,
      };

      setLead(lead);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.detail || "Failed to fetch lead details",
      );
      console.error("this is the error ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    if (!lead) return;

    setLocking(true);
    try {
      await api.post(`/sell-phone/partner/leads/${lead.id}/lock`);
      Alert.alert("Success", "Lead locked for 15 minutes", [
        {
          text: "Purchase Now",
          onPress: () => router.push(`/lead-purchase/${lead.id}`),
        },
        {
          text: "View Dashboard",
          onPress: () => router.push("/(tabs)/dashboard"),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.detail || "Failed to lock lead",
      );
    } finally {
      setLocking(false);
    }
  };

  const handlePurchase = () => {
    if (!lead) return;
    router.push(`/lead-purchase/${lead.id}`);
  };

  const handleAssignAgent = () => {
    if (!lead) return;
    router.push(`/order-detail/${lead.id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!lead) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Lead Not Found</Text>
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Device Info Card */}
        <View style={[styles.card, styles.deviceCard]}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{lead.phone_name}</Text>
              <StatusBadge status={lead.status} size="small" />
            </View>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Est. Price</Text>
            <Text style={styles.priceValue}>
              {formatPrice(lead.quoted_price)}
            </Text>
          </View>

          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <Text style={styles.specValueLarge}>{lead.ram_gb}GB</Text>
              <Text style={styles.specLabelSmall}>RAM</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specValueLarge}>{lead.storage_gb}GB</Text>
              <Text style={styles.specLabelSmall}>Storage</Text>
            </View>
          </View>
        </View>

        {/* Customer Info Card */}
        <View style={[styles.card, styles.customerCard]}>
          <Text style={styles.sectionTitle}>Customer Details</Text>

          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockValue}>{lead.customer_name}</Text>
            <Text style={styles.infoBlockLabel}>Name</Text>
          </View>

          <View style={styles.twoColumnGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockValue}>{lead.customer_phone}</Text>
              <Text style={styles.infoBlockLabel}>Phone</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockValue}>{lead.pickup_city}</Text>
              <Text style={styles.infoBlockLabel}>City</Text>
            </View>
          </View>

          <View style={styles.twoColumnGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockValue}>
                {lead.pickup_state || "—"}
              </Text>
              <Text style={styles.infoBlockLabel}>State</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockValue}>{lead.pickup_pincode}</Text>
              <Text style={styles.infoBlockLabel}>Pincode</Text>
            </View>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockValue}>
              {lead.customer_email || "—"}
            </Text>
            <Text style={styles.infoBlockLabel}>Email</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockValue}>
              {lead.pickup_address_line}
            </Text>
            <Text style={styles.infoBlockLabel}>Address</Text>
          </View>
        </View>

        {/* Additional Info & AI Card */}
        <View style={[styles.card, { margin: 16, marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Additional Info</Text>

          <View style={styles.twoColumnGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockValue}>#{lead.id}</Text>
              <Text style={styles.infoBlockLabel}>Lead ID</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockValue}>
                {(lead as any).agent_name || "—"}
              </Text>
              <Text style={styles.infoBlockLabel}>Agent</Text>
            </View>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockValue}>
              {formatDate(lead.created_at)}
            </Text>
            <Text style={styles.infoBlockLabel}>Created</Text>
          </View>
        </View>

        {/* AI Analysis Card */}
        <View style={[styles.card, styles.aiCard]}>
          <Text style={styles.sectionTitle}>AI Analysis</Text>
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockValue}>
              {(lead as any).ai_reasoning || "—"}
            </Text>
            <Text style={styles.infoBlockLabel}>Reasoning</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
            Device Condition
          </Text>
          {lead.customer_condition_answers ? (
            <View style={styles.conditionGrid}>
              {Object.entries(lead.customer_condition_answers).map(([k, v]) => (
                <View style={styles.conditionTag} key={k}>
                  <Text style={styles.conditionLabel}>
                    {k.replace(/_/g, " ")}
                  </Text>
                  <Text style={styles.conditionValue}>{String(v)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.infoBlockLabel}>No data</Text>
          )}
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      {(source === "marketplace" ||
        source === "locked" ||
        source === "purchased") && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerLabel}>Lead Price</Text>
            <Text style={styles.footerPrice}>
              {formatPrice(lead.quoted_price)}
            </Text>
          </View>
          {source === "marketplace" && (
            <TouchableOpacity
              style={[styles.lockButton, locking && styles.lockButtonDisabled]}
              onPress={handleLock}
              disabled={locking}
            >
              {locking ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.lockButtonText}>🔒 Lock Deal</Text>
              )}
            </TouchableOpacity>
          )}
          {source === "locked" && (
            <TouchableOpacity
              style={[
                styles.lockButton,
                purchasing && styles.lockButtonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.lockButtonText}>💳 Purchase Deal</Text>
              )}
            </TouchableOpacity>
          )}
          {source === "purchased" && (
            <TouchableOpacity
              style={[
                styles.lockButton,
                assigning && styles.lockButtonDisabled,
              ]}
              onPress={handleAssignAgent}
              disabled={assigning}
            >
              {assigning ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.lockButtonText}> Assign Agent</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
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
  card: {
    backgroundColor: "#ffffff",
    margin: 12,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  brand: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  model: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 4,
  },
  priceSection: {
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#16a34a",
  },
  specsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  specBox: {
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
  specDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#16a34a",
  },
  lockButton: {
    flex: 2,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  lockButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  lockButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
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
  deviceCard: {
    borderTopWidth: 4,
    borderTopColor: "#2563eb",
  },
  customerCard: {
    borderTopWidth: 4,
    borderTopColor: "#16a34a",
  },
  aiCard: {
    borderTopWidth: 4,
    borderTopColor: "#9333ea",
  },
  deviceHeader: {
    marginBottom: 20,
  },
  deviceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
    marginRight: 12,
  },

  specValueLarge: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  specLabelSmall: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 14,
  },
  infoBlock: {
    marginBottom: 12,
  },
  infoBlockValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  infoBlockLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  conditionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  conditionTag: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  conditionLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  conditionValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
});
