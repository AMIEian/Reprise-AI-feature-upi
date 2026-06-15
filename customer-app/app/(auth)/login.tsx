import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { validateEmail, validatePhone } from "../../utils/helpers";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!identifier.trim()) {
      newErrors.identifier =
        loginMethod === "email"
          ? "Email is required"
          : "Phone number is required";
    } else if (loginMethod === "email" && !validateEmail(identifier)) {
      newErrors.identifier = "Enter a valid email address";
    } else if (loginMethod === "phone" && !validatePhone(identifier)) {
      newErrors.identifier = "Enter a valid 10-digit phone number";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await login(identifier, password);
      router.replace("/(tabs)");
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        error.message ||
        "Login failed. Please check your credentials.";
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSwitch = (method: "email" | "phone") => {
    setLoginMethod(method);
    setIdentifier("");
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="phone-portrait-outline" size={48} color="#2563eb" />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue selling your phones
          </Text>
        </View>

        {/* Login method toggle */}
        <View style={styles.methodToggle}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              loginMethod === "email" && styles.methodButtonActive,
            ]}
            onPress={() => handleMethodSwitch("email")}
          >
            <Ionicons
              name="mail-outline"
              size={16}
              color={loginMethod === "email" ? "#ffffff" : "#6b7280"}
            />
            <Text
              style={[
                styles.methodButtonText,
                loginMethod === "email" && styles.methodButtonTextActive,
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.methodButton,
              loginMethod === "phone" && styles.methodButtonActive,
            ]}
            onPress={() => handleMethodSwitch("phone")}
          >
            <Ionicons
              name="call-outline"
              size={16}
              color={loginMethod === "phone" ? "#ffffff" : "#6b7280"}
            />
            <Text
              style={[
                styles.methodButtonText,
                loginMethod === "phone" && styles.methodButtonTextActive,
              ]}
            >
              Phone Number
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={loginMethod === "email" ? "Email" : "Phone Number"}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={
              loginMethod === "email"
                ? "Enter your email address"
                : "Enter your 10-digit phone number"
            }
            keyboardType={
              loginMethod === "email" ? "email-address" : "phone-pad"
            }
            autoCapitalize="none"
            error={errors.identifier}
            leftIcon={
              <Ionicons
                name={loginMethod === "email" ? "mail-outline" : "call-outline"}
                size={20}
                color="#9ca3af"
              />
            }
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            error={errors.password}
            leftIcon={
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
            }
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            }
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            fullWidth
            size="large"
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login */}
        <View style={styles.socialButtons}>
          <TouchableOpacity style={styles.socialButton}>
            <Ionicons name="logo-google" size={20} color="#db4437" />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don&apos;t have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Skip for now */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.skipButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  methodToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 24,
  },
  methodButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  methodButtonActive: {
    backgroundColor: "#2563eb",
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  methodButtonTextActive: {
    color: "#ffffff",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  form: {
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#6b7280",
  },
  socialButtons: {
    marginBottom: 32,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 14,
    gap: 12,
  },
  socialButtonText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  signUpText: {
    fontSize: 14,
    color: "#6b7280",
  },
  signUpLink: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
    marginLeft: 4,
  },
  skipButton: {
    alignItems: "center",
    padding: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: "#6b7280",
    textDecorationLine: "underline",
  },
});
