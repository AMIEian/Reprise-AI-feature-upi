import { View, Text, StyleSheet, StatusBar, Animated } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef } from "react";
import OnboardingCarousel from "@/components/OnboardingCarousel";
import LoginDrawer from "@/components/LoginDrawer";

export default function HomePage() {
  const router = useRouter();
  const { user, userType, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect authenticated users to their respective dashboards
      if (userType === "partner") {
        router.replace("/(tabs)" as any);
      } else if (userType === "agent") {
        router.replace("/(agent-tabs)" as any);
      }
    }
  }, [isAuthenticated, isLoading, user, userType]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // shared animated value to move drawer and shift content up
  const slideAnim = useRef(new Animated.Value(300)).current;

  // animate drawer up on mount
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <OnboardingCarousel slideAnim={slideAnim} />
      <LoginDrawer slideAnim={slideAnim} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2563eb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
});
