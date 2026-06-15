import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export type PostCallAction = "complete" | "reschedule" | "cancel";

interface PostCallActionsProps {
  callEnded: boolean;
  onActionSelect: (action: PostCallAction) => void;
}

const ACTIONS = [
  {
    id: "complete" as PostCallAction,
    title: "Complete Pickup",
    description: "Customer is ready. Proceed with device inspection.",
    icon: "✅",
    color: "#16a34a",
    bgColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  {
    id: "reschedule" as PostCallAction,
    title: "Reschedule Pickup",
    description: "Customer needs a different time or date.",
    icon: "📅",
    color: "#d97706",
    bgColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  {
    id: "cancel" as PostCallAction,
    title: "Cancel (Not Interested)",
    description: "Customer no longer wants to sell the device.",
    icon: "❌",
    color: "#dc2626",
    bgColor: "#fef2f2",
    borderColor: "#fecaca",
  },
];

export default function PostCallActions({
  callEnded,
  onActionSelect,
}: PostCallActionsProps) {
  if (!callEnded) {
    return (
      <View style={styles.warningContainer}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningTitle}>Call Customer First</Text>
        <Text style={styles.warningText}>
          You must call the customer before selecting an action. Use the Call
          Customer button above to proceed.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What happened?</Text>
      <Text style={styles.subtitle}>
        Select the appropriate action based on your call with the customer
      </Text>

      <View style={styles.actionsGrid}>
        {ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.actionCard,
              {
                backgroundColor: action.bgColor,
                borderColor: action.borderColor,
              },
            ]}
            onPress={() => onActionSelect(action.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={[styles.actionTitle, { color: action.color }]}>
              {action.title}
            </Text>
            <Text style={styles.actionDescription}>{action.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  warningContainer: {
    backgroundColor: "#fffbeb",
    borderWidth: 2,
    borderColor: "#fde68a",
    borderRadius: 12,
    padding: 20,
    margin: 16,
    alignItems: "center",
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#d97706",
    marginBottom: 8,
    textAlign: "center",
  },
  warningText: {
    fontSize: 14,
    color: "#92400e",
    textAlign: "center",
    lineHeight: 20,
  },
});
