import React, { useState, useEffect } from "react";
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
import api from "../../lib/api";
import { API_ENDPOINTS } from "../../config";
import Input from "../../components/Input";
import Button from "../../components/Button";
import {
  validateEmail,
  validatePhone,
  validatePincode,
  normalizePhone,
} from "../../utils/helpers";

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation state
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);
  const [pincodeValid, setPincodeValid] = useState(false);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState("");

  // Debounced email availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email && validateEmail(email)) {
        checkEmailAvailability(email);
      } else {
        setEmailAvailable(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  // Debounced phone availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phone && validatePhone(phone)) {
        checkPhoneAvailability(phone);
      } else {
        setPhoneAvailable(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [phone]);

  // Debounced pincode check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pincode && validatePincode(pincode)) {
        checkPincode(pincode);
      } else {
        setPincodeValid(false);
        setPincodeMessage("");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [pincode]);

  const checkEmailAvailability = async (emailToCheck: string) => {
    try {
      const response = await api.get(
        `${API_ENDPOINTS.CHECK_EMAIL}/${emailToCheck}`,
      );
      setEmailAvailable(response.data.available);
    } catch (error) {
      setEmailAvailable(null);
    }
  };

  const checkPhoneAvailability = async (phoneToCheck: string) => {
    try {
      const normalized = normalizePhone(phoneToCheck);
      const response = await api.get(
        `${API_ENDPOINTS.CHECK_PHONE}/${normalized}`,
      );
      setPhoneAvailable(response.data.available);
    } catch (error) {
      setPhoneAvailable(null);
    }
  };

  const checkPincode = async (pin: string) => {
    setPincodeChecking(true);
    try {
      const response = await api.get(`${API_ENDPOINTS.CHECK_PINCODE}/${pin}`);
      const data = response.data;
      setPincodeValid(data.serviceable);
      setPincodeMessage(
        data.serviceable
          ? `✓ Serviceable - ${data.city || ""}, ${data.state || ""}`.trim()
          : data.message || "We don't service this area yet",
      );
    } catch (error) {
      setPincodeValid(false);
      setPincodeMessage("");
    } finally {
      setPincodeChecking(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!validateEmail(email)) newErrors.email = "Valid email is required";
    else if (emailAvailable === false)
      newErrors.email = "Email is already registered";

    if (!validatePhone(phone))
      newErrors.phone = "Valid phone number is required";
    else if (phoneAvailable === false)
      newErrors.phone = "Phone is already registered";

    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters";

    if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords don't match";

    if (!validatePincode(pincode))
      newErrors.pincode = "Valid 6-digit pincode is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await signup({
        email,
        password,
        full_name: fullName,
        phone: normalizePhone(phone),
        role: "customer",
        address: address || undefined,
        pincode,
        referral_code: referralCode || undefined,
      });
      router.replace("/(tabs)");
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        error.message ||
        "Signup failed. Please try again.";
      Alert.alert("Signup Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const getEmailHelperText = () => {
    if (!email) return undefined;
    if (!validateEmail(email)) return undefined;
    if (emailAvailable === true) return "✓ Available";
    if (emailAvailable === false) return "✗ Already registered";
    return "Checking...";
  };

  const getPhoneHelperText = () => {
    if (!phone) return undefined;
    if (!validatePhone(phone)) return undefined;
    if (phoneAvailable === true) return "✓ Available";
    if (phoneAvailable === false) return "✗ Already registered";
    return "Checking...";
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
          <Ionicons name="person-add-outline" size={48} color="#2563eb" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up to start selling your old phones
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            error={errors.fullName}
            required
            leftIcon={
              <Ionicons name="person-outline" size={20} color="#9ca3af" />
            }
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            helperText={getEmailHelperText()}
            required
            leftIcon={
              <Ionicons name="mail-outline" size={20} color="#9ca3af" />
            }
          />

          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            error={errors.phone}
            helperText={getPhoneHelperText()}
            required
            leftIcon={
              <Ionicons name="call-outline" size={20} color="#9ca3af" />
            }
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password (min 8 characters)"
            secureTextEntry={!showPassword}
            error={errors.password}
            required
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

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry={!showPassword}
            error={errors.confirmPassword}
            required
            leftIcon={
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
            }
          />

          <Input
            label="Pincode"
            value={pincode}
            onChangeText={setPincode}
            placeholder="Enter your pincode"
            keyboardType="number-pad"
            maxLength={6}
            error={errors.pincode}
            helperText={
              pincodeChecking ? "Checking..." : pincodeMessage || undefined
            }
            required
            leftIcon={
              <Ionicons name="location-outline" size={20} color="#9ca3af" />
            }
          />

          <Input
            label="Address (Optional)"
            value={address}
            onChangeText={setAddress}
            placeholder="Enter your address"
            multiline
            leftIcon={
              <Ionicons name="home-outline" size={20} color="#9ca3af" />
            }
          />

          <Input
            label="Referral Code (Optional)"
            value={referralCode}
            onChangeText={setReferralCode}
            placeholder="Enter referral code if you have one"
            autoCapitalize="characters"
            leftIcon={
              <Ionicons name="gift-outline" size={20} color="#9ca3af" />
            }
          />

          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            disabled={loading}
            fullWidth
            size="large"
          />
        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          By signing up, you agree to our{" "}
          <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 32,
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
  termsText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  termsLink: {
    color: "#2563eb",
    fontWeight: "500",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    color: "#6b7280",
  },
  loginLink: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
    marginLeft: 4,
  },
});
