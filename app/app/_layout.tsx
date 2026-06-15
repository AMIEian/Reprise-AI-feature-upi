import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

function RootLayoutNav() {
  const { user, userType, isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        const orderId = data?.order_id;

        if (orderId) {
          router.push(`/lead-detail/${orderId}` as any);
        }
      },
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const currentSegment = String(segments[0] || "");

    const inAuthGroup = currentSegment === "(auth)";
    const inPartnerTabs = currentSegment === "(tabs)";
    const inAgentTabs = currentSegment === "(agent-tabs)";
    const atRoot = currentSegment === "";

    if (!isAuthenticated) {
      // Not authenticated - redirect to home if trying to access protected routes
      if (inPartnerTabs || inAgentTabs) {
        router.replace("/");
      }
      // If at root or auth pages, allow it
    } else if (isAuthenticated && user) {
      // Check for partner verification status
      /*if (userType === "partner") {
        const status = (user as any).verification_status;
        const isApproved = status === "approved";
        const secondSegment = segments.length > 1 ? String(segments[1]) : "";

        const isOnStatusPage =
          String(segments[0]) === "(auth)" &&
          secondSegment === "verification-status";

        if (!isApproved) {
          // If not approved, force redirection to status page
          if (!isOnStatusPage) {
            router.replace("/(auth)/verification-status" as any);
          }
          return;
        }

        // If approved but on status page, redirect to dashboard
        if (isOnStatusPage) {
          router.replace("/(tabs)" as any);
          return;
        }
      }*/

      // Authenticated - route based on userType
      if (atRoot) {
        // At root while authenticated, redirect to appropriate dashboard
        if (userType === "partner") {
          router.replace("/(tabs)" as any);
        } else if (userType === "agent") {
          router.replace("/(agent-tabs)" as any);
        }
      } else if (inAuthGroup) {
        // Already logged in, redirect to appropriate dashboard
        if (userType === "partner") {
          router.replace("/(tabs)" as any);
        } else if (userType === "agent") {
          router.replace("/(agent-tabs)" as any);
        }
      } else if (inPartnerTabs && userType !== "partner") {
        // Wrong user type trying to access partner dashboard
        router.replace("/(agent-tabs)" as any);
      } else if (inAgentTabs && userType !== "agent") {
        // Wrong user type trying to access agent dashboard
        router.replace("/(tabs)" as any);
      }
    }
  }, [isAuthenticated, isLoading, segments, user, userType]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
});
