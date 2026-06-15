import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "./Colors";

interface HoldNotificationBannerProps {
  reason?: string;
  liftDate?: string;
}

export default function HoldNotificationBanner({
  reason,
  liftDate,
}: HoldNotificationBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name="alert-circle"
          size={24}
          color={Colors.danger}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Account on Hold</Text>
          <Text style={styles.message}>
            Your account has been placed on hold. You cannot make new deals or
            purchases until the hold is lifted.
          </Text>
          {reason && <Text style={styles.reason}>Reason: {reason}</Text>}
          {liftDate && (
            <Text style={styles.liftDate}>
              Will be lifted on: {new Date(liftDate).toLocaleDateString()}
            </Text>
          )}
          {!liftDate && (
            <Text style={styles.adminDecides}>
              Will be lifted when admin decides to lift it.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FEE2E2",
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.danger,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: "#991B1B",
    marginBottom: 8,
    lineHeight: 20,
  },
  reason: {
    fontSize: 13,
    color: "#7F1D1D",
    marginBottom: 4,
    fontStyle: "italic",
  },
  liftDate: {
    fontSize: 13,
    color: "#7F1D1D",
    marginBottom: 2,
  },
  adminDecides: {
    fontSize: 13,
    color: "#7F1D1D",
  },
});
