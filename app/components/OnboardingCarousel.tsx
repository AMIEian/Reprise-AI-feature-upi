import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
} from "react-native";
import { useEffect, useRef, useState } from "react";

const { width } = Dimensions.get("window");

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: "Welcome to CashItNow",
    description: "India's Leading Phone Trade-In Platform",
    icon: "📱",
    color: "#2563eb",
  },
  {
    id: 2,
    title: "Manage Leads Efficiently",
    description:
      "Lock and purchase high-quality leads with transparent pricing",
    icon: "🎯",
    color: "#16a34a",
  },
  {
    id: 3,
    title: "Build Your Network",
    description: "Connect with agents and grow your business effortlessly",
    icon: "👥",
    color: "#9333ea",
  },
  {
    id: 4,
    title: "Earn & Grow",
    description: "Complete pickups, manage orders, and maximize your earnings",
    icon: "💰",
    color: "#ea580c",
  },
];

export default function OnboardingCarousel({
  slideAnim,
}: {
  slideAnim?: Animated.Value;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out and scale down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Update index
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);

        // Fade in and scale up
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const currentSlide = slides[currentIndex];

  // map drawer animation (0 -> 300) to a smaller upward shift (-180 -> 0)
  // use increasing inputRange to satisfy Animated requirements
  const translateY = slideAnim
    ? slideAnim.interpolate
      ? slideAnim.interpolate({ inputRange: [0, 300], outputRange: [-180, 0] })
      : 0
    : 0;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { backgroundColor: currentSlide.color },
        { transform: [{ translateY }] },
      ]}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          {currentSlide.id === 1 ? (
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.icon}>{currentSlide.icon}</Text>
          )}
        </View>
        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.description}>{currentSlide.description}</Text>
      </Animated.View>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentIndex === index && styles.activeDot]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    borderCurve: "circular",
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  icon: {
    fontSize: 64,
  },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 22,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 18,
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 28,
    opacity: 0.95,
    maxWidth: 320,
  },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 200,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  activeDot: {
    width: 24,
    backgroundColor: "#ffffff",
  },
});
