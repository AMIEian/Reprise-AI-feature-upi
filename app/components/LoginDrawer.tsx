import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";

export default function LoginDrawer({
  slideAnim,
}: {
  slideAnim: Animated.Value;
}) {
  const router = useRouter();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.handle} />

      <View style={styles.content}>
        <Text style={styles.title}>Get Started</Text>
        <Text style={styles.subtitle}>Choose how you want to continue</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.loginButton, styles.partnerButton]}
            onPress={() => router.push("/(auth)/partner-login")}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconWrapper}>
                <Text style={styles.buttonIcon}>🏢</Text>
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>Partner Login</Text>
                <Text style={styles.buttonSubtitle}>
                  Manage orders & agents
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, styles.agentButton]}
            onPress={() => router.push("/(auth)/agent-login")}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconWrapper}>
                <Text style={styles.buttonIcon}>🚀</Text>
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>Agent Login</Text>
                <Text style={styles.buttonSubtitle}>
                  Complete pickups & earn
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "rgba(209, 213, 219, 0.8)",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 28,
  },
  buttonContainer: {
    gap: 14,
  },
  loginButton: {
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  partnerButton: {
    backgroundColor: "#16a34a",
  },
  agentButton: {
    backgroundColor: "#9333ea",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 2,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: "#ffffff",
    opacity: 0.9,
  },
  arrow: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "bold",
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
  },
  footerLink: {
    color: "#2563eb",
    fontWeight: "600",
  },
});
