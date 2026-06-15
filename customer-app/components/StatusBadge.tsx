import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { getStatusColor, formatStatus } from "../utils/statusColors";

interface StatusBadgeProps {
  status?: string | null;
  size?: "small" | "medium" | "large";
}

export default function StatusBadge({
  status,
  size = "medium",
}: StatusBadgeProps) {
  if (!status) {
    return null;
  }

  const color = getStatusColor(status);
  const displayText = formatStatus(status);

  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  const textSizeStyles = {
    small: styles.textSmall,
    medium: styles.textMedium,
    large: styles.textLarge,
  };

  return (
    <View
      style={[
        styles.badge,
        sizeStyles[size],
        { backgroundColor: color + "20" },
      ]}
    >
      <Text style={[styles.text, textSizeStyles[size], { color }]}>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  text: {
    fontWeight: "600",
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },
});
