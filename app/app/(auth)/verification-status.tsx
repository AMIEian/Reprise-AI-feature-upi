import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function VerificationStatusScreen() {
  const { user, logout, userType } = useAuth();

  // If somehow not a partner or not logged in, redirect
  if (!user || userType !== "partner") {
    return (
      <View style={styles.container}>
        <Text>Redirecting...</Text>
      </View>
    );
  }

  const getStatusContent = () => {
    // Default to under review if verification_status is missing (legacy compatibility)
    const status = (user as any).verification_status || "under_review";
    const rejectionReason = (user as any).rejection_reason;

    switch (status) {
      case "pending":
      case "under_review":
        return {
          icon: "timer-sand",
          color: "#f59e0b", // Amber/Yellow
          title: "Application Under Review",
          description:
            "Thank you for your application. Our team is currently reviewing your details. This process usually takes 24-48 hours.",
          actionText: "Check Status",
          showContact: true,
        };
      case "clarification_needed":
        return {
          icon: "alert-circle-outline",
          color: "#f97316", // Orange
          title: "Action Required",
          description:
            "We need some more information to process your application. Please check your email for details or contact support.",
          actionText: "Contact Support",
          showContact: true,
        };
      case "rejected":
        return {
          icon: "close-circle-outline",
          color: "#ef4444", // Red
          title: "Application Rejected",
          description: rejectionReason
            ? `Your application has been rejected for the following reason: ${rejectionReason}`
            : "We are sorry, but your application has been rejected. Please contact us for more information.",
          actionText: "Contact Support",
          showContact: true,
        };
      case "suspended":
        return {
          icon: "shield-alert-outline",
          color: "#dc2626", // Dark Red
          title: "Account Suspended",
          description:
            "Your partner account has been suspended. Please contact our support team immediately to resolve this issue.",
          actionText: "Contact Support",
          showContact: true,
        };
      case "approved":
        // Should be redirected, but just in case
        return {
          icon: "check-circle-outline",
          color: "#22c55e", // Green
          title: "Application Approved",
          description:
            "Your account is active. You can now access your dashboard.",
          actionText: "Go to Dashboard",
          showContact: false,
          onAction: () => router.replace("/(tabs)"),
        };
      default:
        return {
          icon: "information-outline",
          color: "#3b82f6", // Blue
          title: "Status Unknown",
          description: `Current status: ${status}`,
          actionText: "Refresh",
          showContact: true,
        };
    }
  };

  const content = getStatusContent();

  const handleContactSupport = () => {
    Linking.openURL("mailto:support@reprise.ai");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${content.color}20` },
            ]}
          >
            <MaterialCommunityIcons
              name={content.icon as any}
              size={64}
              color={content.color}
            />
          </View>

          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.description}>{content.description}</Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Application ID</Text>
            <Text style={styles.infoValue}>#{user.id}</Text>
          </View>

          <View style={styles.buttonContainer}>
            {content.onAction ? (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: content.color },
                ]}
                onPress={content.onAction}
              >
                <Text style={styles.primaryButtonText}>
                  {content.actionText}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: content.color },
                ]}
                onPress={() => {
                  // Refresh logic could go here
                  router.replace("/(auth)/verification-status");
                }}
              >
                <Text style={styles.primaryButtonText}>Refresh Status</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.secondaryButton} onPress={logout}>
              <Text style={styles.secondaryButtonText}>Logout</Text>
            </TouchableOpacity>

            {content.showContact && (
              <TouchableOpacity
                style={styles.textButton}
                onPress={handleContactSupport}
              >
                <Text style={styles.textButtonText}>Contact Support</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#e2e8f0",
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  buttonContainer: {
    width: "100%",
    marginTop: 12,
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    backgroundColor: "#f1f5f9",
  },
  secondaryButtonText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "600",
  },
  textButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  textButtonText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
  },
});
