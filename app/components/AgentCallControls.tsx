import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  Alert,
  Clipboard,
} from "react-native";

interface AgentCallControlsProps {
  phoneNumber: string;
  customerName: string;
  callInProgress: boolean;
  onCallStart: () => void;
  onCallEnd: () => void;
}

export default function AgentCallControls({
  phoneNumber,
  customerName,
  callInProgress,
  onCallStart,
  onCallEnd,
}: AgentCallControlsProps) {
  const handleCallCustomer = async () => {
    if (!phoneNumber) {
      Alert.alert("Error", "Customer phone number is not available");
      return;
    }

    // Clean the phone number
    const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, "");
    const phoneUrl = Platform.select({
      ios: `telprompt:${cleanedNumber}`,
      android: `tel:${cleanedNumber}`,
      default: `tel:${cleanedNumber}`,
    });

    try {
      // First try to check if URL is supported
      const supported = await Linking.canOpenURL(phoneUrl);

      if (supported) {
        onCallStart();
        await Linking.openURL(phoneUrl);
      } else {
        // If not supported, try opening directly (works on some simulators)
        try {
          onCallStart();
          await Linking.openURL(phoneUrl);
        } catch (directError) {
          // If direct opening fails, provide fallback options
          handleCallFallback(cleanedNumber);
        }
      }
    } catch (error) {
      console.error("Error checking call support:", error);
      // Try direct opening as fallback
      try {
        onCallStart();
        await Linking.openURL(phoneUrl);
      } catch (directError) {
        console.error("Error making direct call:", directError);
        handleCallFallback(cleanedNumber);
      }
    }
  };

  const handleCallFallback = (cleanedNumber: string) => {
    if (Platform.OS === "web") {
      // On web, copy number to clipboard and show message
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(cleanedNumber)
          .then(() => {
            Alert.alert(
              "Phone Call",
              `Phone number copied to clipboard: ${cleanedNumber}\n\nPlease paste and call manually.`,
              [{ text: "OK" }],
            );
          })
          .catch(() => {
            Alert.alert("Phone Call", `Please call: ${cleanedNumber}`, [
              { text: "OK" },
            ]);
          });
      } else {
        Alert.alert("Phone Call", `Please call: ${cleanedNumber}`, [
          { text: "OK" },
        ]);
      }
      onCallStart();
    } else {
      // On mobile devices, show options
      Alert.alert(
        "Call Customer",
        `Phone: ${cleanedNumber}\n\nChoose an option:`,
        [
          {
            text: "Copy Number",
            onPress: async () => {
              await Clipboard.setString(cleanedNumber);
              Alert.alert("Copied!", "Phone number copied to clipboard", [
                { text: "OK" },
              ]);
              onCallStart();
            },
          },
          {
            text: "Call Manually",
            onPress: () => {
              onCallStart();
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
      );
    }
  };

  const handleEndCall = () => {
    onCallEnd();
  };

  return (
    <View style={styles.container}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerLabel}>Customer</Text>
        <Text style={styles.customerName}>{customerName || "Customer"}</Text>
        <Text style={styles.phoneNumber}>
          {phoneNumber || "No phone number"}
        </Text>
      </View>

      <View style={styles.callControls}>
        {!callInProgress ? (
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCallCustomer}
            disabled={!phoneNumber}
          >
            <Text style={styles.callIcon}>📞</Text>
            <Text style={styles.callButtonText}>Call Customer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleEndCall}
          >
            <Text style={styles.endCallIcon}>📴</Text>
            <Text style={styles.endCallButtonText}>End Call</Text>
          </TouchableOpacity>
        )}
      </View>

      {callInProgress && (
        <View style={styles.callStatus}>
          <View style={styles.callIndicator} />
          <Text style={styles.callStatusText}>Call in progress...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  customerInfo: {
    marginBottom: 16,
  },
  customerLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  customerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 14,
    color: "#4b5563",
  },
  callControls: {
    flexDirection: "row",
    gap: 12,
  },
  callButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  callIcon: {
    fontSize: 18,
  },
  callButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  endCallButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  endCallIcon: {
    fontSize: 18,
  },
  endCallButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  callStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  callIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16a34a",
    marginRight: 8,
  },
  callStatusText: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "500",
  },
});
