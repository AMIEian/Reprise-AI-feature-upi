import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

const FEATURES = [
  {
    icon: "flash-outline",
    title: "Instant Quotes",
    description: "Get your phone value in seconds",
  },
  {
    icon: "car-outline",
    title: "Free Doorstep Pickup",
    description: "We come to you at your convenience",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Safe & Secure",
    description: "Your data is wiped securely",
  },
  {
    icon: "cash-outline",
    title: "Instant Payment",
    description: "Get paid on the spot",
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Select Your Phone",
    description: "Search and select your phone model",
    icon: "search-outline",
  },
  {
    step: 2,
    title: "Get Instant Quote",
    description: "Answer a few questions about your device",
    icon: "calculator-outline",
  },
  {
    step: 3,
    title: "Schedule Pickup",
    description: "Choose a convenient date and time",
    icon: "calendar-outline",
  },
  {
    step: 4,
    title: "Get Paid",
    description: "Receive instant payment at pickup",
    icon: "wallet-outline",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {isAuthenticated
              ? `Hello, ${user?.name || user?.full_name || "there"}!`
              : "Welcome to CashNow"}
          </Text>
          <Text style={styles.tagline}>
            Sell your old phone for instant cash
          </Text>
        </View>
        {isAuthenticated ? (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons name="person-circle-outline" size={36} color="#2563eb" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Turn Your Old Phone Into Instant Cash
            </Text>
            <Text style={styles.heroSubtitle}>
              Get the best price with free doorstep pickup and guaranteed
              payment
            </Text>
            <TouchableOpacity
              style={styles.sellButton}
              onPress={() => router.push("/(tabs)/sell")}
            >
              <Text style={styles.sellButtonText}>Sell Your Phone</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Us</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name={feature.icon as any}
                    size={28}
                    color="#2563eb"
                  />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* How It Works Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            {HOW_IT_WORKS.map((item, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepNumberContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{item.step}</Text>
                  </View>
                  {index < HOW_IT_WORKS.length - 1 && (
                    <View style={styles.stepLine} />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepIconContainer}>
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color="#2563eb"
                    />
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>{item.title}</Text>
                    <Text style={styles.stepDescription}>
                      {item.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Sell?</Text>
          <Text style={styles.ctaSubtitle}>
            Get an instant quote for your device in just 2 minutes
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push("/(tabs)/sell")}
          >
            <Ionicons name="phone-portrait-outline" size={24} color="#ffffff" />
            <Text style={styles.ctaButtonText}>Start Selling</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  tagline: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: "#2563eb",
    padding: 24,
    margin: 16,
    borderRadius: 16,
  },
  heroContent: {
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  sellButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  sellButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563eb",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
  stepsContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  stepNumberContainer: {
    alignItems: "center",
    width: 32,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#dbeafe",
    marginTop: 4,
    marginBottom: -4,
  },
  stepContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 12,
    paddingBottom: 20,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 13,
    color: "#6b7280",
  },
  ctaSection: {
    backgroundColor: "#1e40af",
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 20,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
  },
});
