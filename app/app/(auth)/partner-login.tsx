import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import api, { tokenManager } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";
import { parsePincodes } from "../../utils/formatting";
import {
  validateEmail,
  validateUdyamId,
  validatePAN,
  validatePassword,
  validatePhone,
  validatePincodes,
  validateFullName,
  validateCompanyName,
  validateBusinessAddress,
  checkEmailExists,
  checkPhoneExists,
  sanitizeInput,
  formatPhoneNumber,
  formatUppercase,
} from "../../utils/validation";

export default function PartnerLoginScreen() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [generalSuccess, setGeneralSuccess] = useState("");
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusModalType, setStatusModalType] = useState<
    "success" | "warning" | "error"
  >("warning");
  const [statusModalContent, setStatusModalContent] = useState({
    title: "",
    message: "",
  });
  // const [otp, setOtp] = useState("");
  // const [otpSent, setOtpSent] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    company_name: "",
    business_address: "",
    udyam_id: "",
    pan_number: "",
    serviceable_pincodes: "",
  });

  const normalizePhone = (phone: string) => {
    return phone.replace(/\D/g, "");
  };

  // Udyam Aadhaar certificate image
  const [udyamAadharImage, setUdyamAadharImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const pickUdyamAadharImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library to upload the certificate.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setUdyamAadharImage(result.assets[0]);
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    // Common validations
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    // Signup-only validations
    if (!isLogin) {
      const nameError = validateFullName(formData.full_name);
      if (nameError) newErrors.full_name = nameError;

      const phoneError = validatePhone(formData.phone);
      if (phoneError) newErrors.phone = phoneError;

      const companyError = validateCompanyName(formData.company_name);
      if (companyError) newErrors.company_name = companyError;

      const addressError = validateBusinessAddress(formData.business_address);
      if (addressError) newErrors.business_address = addressError;

      const panError = validatePAN(formData.pan_number);
      if (panError) newErrors.pan_number = panError;

      if (formData.udyam_id.trim()) {
        const udyamError = validateUdyamId(formData.udyam_id);

        if (udyamError) {
          newErrors.udyam_id = udyamError;
        }
      }

      const pincodesError = validatePincodes(formData.serviceable_pincodes);
      if (pincodesError) newErrors.serviceable_pincodes = pincodesError;

      // Async validations - check email and phone uniqueness
      if (!emailError) {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) newErrors.email = "This email is already registered";
      }

      if (!phoneError) {
        const phoneExists = await checkPhoneExists(formData.phone);
        if (phoneExists)
          newErrors.phone = "This phone number is already registered";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /*const sendOtp = async () => {
    setGeneralError("");
    setGeneralSuccess("");

    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      setGeneralError("Enter valid 10-digit phone number");
      return;
    }

    try {
      const res = await api.post("/auth/send-otp", {
        phone: normalizePhone(formData.phone),
      });

      if (res.data.success) {
        setOtpSent(true);
        setGeneralSuccess("OTP sent successfully");
      }
    } catch (err) {
      setGeneralError("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await api.post("/auth/verify-otp", {
        phone: normalizePhone(formData.phone),
        otp,
        role: "partner",
      });

      if (res.data?.access_token) {
        await tokenManager.setToken(res.data.access_token);
        await tokenManager.setUserType("partner");

        router.replace("/(tabs)");
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;

      if (Array.isArray(detail)) {
        setGeneralError(detail[0]?.msg || "OTP verification failed");
      } else {
        setGeneralError(detail || "OTP verification failed");
      }
    }
  }; */

  const directPartnerLogin = async () => {
    try {
      setLoading(true);
      setGeneralError("");

      const response = await api.post("/partner/login", {
        email: formData.email,
        password: formData.password,
      });

      const token = response.data.access_token;

      if (!token) {
        setGeneralError("Token not received");
        return;
      }

      // Save auth
      await tokenManager.setToken(token);
      await tokenManager.setUserType("partner");

      // IMPORTANT
      await login(formData.email, formData.password, "partner");

      // Navigate
      router.replace("/(tabs)");
    } catch (err: any) {
      console.log(err?.response?.data);

      setGeneralError(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    setLoading(true);
    try {
      if (isLogin) {
        await directPartnerLogin();
        return;
      } else {
        const pincodes = parsePincodes(formData.serviceable_pincodes);
        await signup(
          formData.full_name,
          formData.email,
          formData.password,
          formData.phone,
          formData.company_name,
          formData.business_address,
          formData.udyam_id,
          formData.pan_number,
          pincodes,
          udyamAadharImage?.uri ?? null,
        );

        // Show success modal for signup as requested
        setStatusModalContent({
          title: "Application Submitted",
          message:
            "Your application has been submitted successfully and is currently under review. You will be notified once it is approved.",
        });
        setStatusModalType("success");
        setStatusModalVisible(true);
      }
    } catch (error: any) {
      // Clean error handling - no console noise
      const errorMessage = getErrorMessage(error, "An error occurred.");
      const lowerError = errorMessage.toLowerCase();

      // Check for REJECTED/SUSPENDED status errors
      if (
        lowerError.includes("reject") ||
        lowerError.includes("suspend") ||
        lowerError.includes("block")
      ) {
        setStatusModalContent({
          title: lowerError.includes("suspend")
            ? "Account Suspended"
            : "Application Rejected",
          message: lowerError.includes("suspend")
            ? "Your account has been suspended. Please contact support."
            : "Your application was rejected. Please check your email for details or contact support.",
        });
        setStatusModalType("error");
        setStatusModalVisible(true);
      }
      // Check for PENDING/REVIEW status errors
      else if (
        lowerError.includes("review") ||
        lowerError.includes("approval") ||
        lowerError.includes("pending") ||
        lowerError.includes("verify") ||
        lowerError.includes("active")
      ) {
        setStatusModalContent({
          title: "Application Under Review",
          message:
            "Your partner application is currently under review by our administrators. Please check back later.",
        });
        setStatusModalType("warning");
        setStatusModalVisible(true);
      } else {
        // Generic error - show alert but clean message (no AxiosError junk)
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
  };

  // For Login Mode - Simple form
  if (isLogin) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Checkered Pattern Background */}
            <View style={styles.checkeredBackground} />

            <View style={styles.contentContainer}>
              {/* Back Button */}
              <TouchableOpacity
                onPress={() => router.push("/")}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={24} color="#475569" />
              </TouchableOpacity>

              {/* Logo/Icon */}
              <View style={styles.logoContainer}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons
                    name="briefcase-outline"
                    size={48}
                    color="#2563eb"
                  />
                </View>
              </View>

              {/* Title Section */}
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Partner Login</Text>
                <Text style={styles.subtitle}>
                  Log in to manage your leads and agents
                </Text>
              </View>

              {/* Form Container */}
              <View style={styles.formCard}>
                {/* OTP Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>

                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color="#64748b"
                      style={styles.inputIcon}
                    />

                    <TextInput
                      style={styles.input}
                      /*placeholder="Enter phone number"
                      placeholderTextColor="#94a3b8"
                      value={formData.phone}
                      onChangeText={(text) =>
                        setFormData({
                          ...formData,
                          phone: formatPhoneNumber(text),
                        })
                      }
                      keyboardType="phone-pad"
                      maxLength={10}*/
                      placeholder="Enter your email"
                      placeholderTextColor="#94a3b8"
                      value={formData.email}
                      onChangeText={(text) =>
                        setFormData({
                          ...formData,
                          email: sanitizeInput(text.trim()),
                        })
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* {otpSent && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>OTP</Text>

                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter OTP"
                        placeholderTextColor="#94a3b8"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>
                )} */}

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>

                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#64748b"
                      style={styles.inputIcon}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      value={formData.password}
                      onChangeText={(text) =>
                        setFormData({
                          ...formData,
                          password: text,
                        })
                      }
                      secureTextEntry
                    />
                  </View>
                </View>

                {generalError ? (
                  <Text style={styles.errorText}>{generalError}</Text>
                ) : null}

                {generalSuccess ? (
                  <Text
                    style={{
                      color: "green",
                      marginBottom: 10,
                    }}
                  >
                    {generalSuccess}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={styles.loginButton}
                  activeOpacity={0.8}
                  /*onPress={() => {
                    if (!otpSent) {
                      sendOtp();
                    } else {
                      verifyOtp();
                    }
                  }}*/
                  onPress={directPartnerLogin}
                >
                  <Text style={styles.loginButtonText}>
                    {/*{!otpSent ? "Send OTP" : "Verify OTP"}*/}
                    Login
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Toggle to Signup */}
              <TouchableOpacity
                onPress={toggleMode}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleText}>
                  Do not have an account?{" "}
                  <Text style={styles.toggleTextBold}>Apply now</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {/* Status Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={statusModalVisible}
          onRequestClose={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View
                style={[
                  styles.modalIconContainer,
                  {
                    backgroundColor:
                      statusModalType === "error"
                        ? "#fee2e2"
                        : statusModalType === "success"
                          ? "#dcfce7"
                          : "#fef3c7",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    statusModalType === "error"
                      ? "close-circle-outline"
                      : statusModalType === "success"
                        ? "check-circle-outline"
                        : "clock-time-four-outline"
                  }
                  size={48}
                  color={
                    statusModalType === "error"
                      ? "#dc2626"
                      : statusModalType === "success"
                        ? "#16a34a"
                        : "#d97706"
                  }
                />
              </View>
              <Text style={styles.modalTitle}>{statusModalContent.title}</Text>
              <Text style={styles.modalMessage}>
                {statusModalContent.message}
              </Text>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor:
                      statusModalType === "error"
                        ? "#dc2626"
                        : statusModalType === "success"
                          ? "#16a34a"
                          : "#d97706",
                  },
                ]}
                onPress={() => setStatusModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // For Signup Mode - Full form
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            paddingBottom: 100,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "bold",
                color: "#111827",
                textAlign: "center",
              }}
            >
              Partner Application
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6b7280",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Apply to become a verified partner. Your application will be
              reviewed by our team.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 6 }}>
              Full Name *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.full_name ? "#dc2626" : "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
              }}
              value={formData.full_name}
              onChangeText={(text) =>
                setFormData({ ...formData, full_name: sanitizeInput(text) })
              }
              placeholder="Enter your full name"
              maxLength={100}
            />
            {errors.full_name && (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.full_name}
              </Text>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 6 }}>
              Phone Number *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.phone ? "#dc2626" : "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
              }}
              value={formData.phone}
              onChangeText={(text) =>
                setFormData({ ...formData, phone: formatPhoneNumber(text) })
              }
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />
            {errors.phone && (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.phone}
              </Text>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 6 }}>
              Company/Business Name *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.company_name ? "#dc2626" : "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
              }}
              value={formData.company_name}
              onChangeText={(text) =>
                setFormData({ ...formData, company_name: sanitizeInput(text) })
              }
              placeholder="Enter company name"
              maxLength={200}
            />
            {errors.company_name && (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.company_name}
              </Text>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 6 }}>
              Business Address *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.business_address ? "#dc2626" : "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
                minHeight: 80,
                textAlignVertical: "top",
              }}
              value={formData.business_address}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  business_address: sanitizeInput(text),
                })
              }
              placeholder="Complete business address"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            {errors.business_address && (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.business_address}
              </Text>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 6 }}>
              PAN Number *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.pan_number ? "#dc2626" : "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
              }}
              value={formData.pan_number}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  pan_number: formatUppercase(sanitizeInput(text)),
                })
              }
              placeholder="ABCDE1234F"
              maxLength={10}
              autoCapitalize="characters"
            />
            {errors.pan_number && (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.pan_number}
              </Text>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 6 }}>
              Udyam Registration Number (Optional)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.udyam_id ? "#dc2626" : "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
              }}
              value={formData.udyam_id}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  udyam_id: formatUppercase(sanitizeInput(text)),
                })
              }
              placeholder="UDYAM-XX-00-0000000"
              maxLength={19}
              autoCapitalize="characters"
            />
            <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              16-digit MSME Udyam Registration ID (e.g. UDYAM-DL-14-0004089)
            </Text>
            {errors.udyam_id && (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.udyam_id}
              </Text>
            )}
          </View>

          {/* Udyam Aadhaar Certificate Upload */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 6 }}>
              Udyam Aadhaar Certificate (Optional)
            </Text>
            <TouchableOpacity
              onPress={pickUdyamAadharImage}
              style={{
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: udyamAadharImage ? "#16a34a" : "#d1d5db",
                borderRadius: 8,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: udyamAadharImage ? "#f0fdf4" : "#f9fafb",
              }}
            >
              <Ionicons
                name={
                  udyamAadharImage ? "checkmark-circle" : "cloud-upload-outline"
                }
                size={22}
                color={udyamAadharImage ? "#16a34a" : "#6b7280"}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: udyamAadharImage ? "#15803d" : "#6b7280",
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {udyamAadharImage
                  ? udyamAadharImage.uri.split("/").pop()
                  : "Tap to upload certificate photo"}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              JPEG or PNG image · max 5 MB
            </Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 6 }}>
              Email *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.email ? "#dc2626" : "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
              }}
              value={formData.email}
              onChangeText={(text) =>
                setFormData({ ...formData, email: sanitizeInput(text.trim()) })
              }
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              maxLength={255}
            />
            {errors.email && (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.email}
              </Text>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 6 }}>
              Password *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.password ? "#dc2626" : "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
                color: "#1e293b",
              }}
              value={formData.password}
              onChangeText={(text) =>
                setFormData({ ...formData, password: sanitizeInput(text) })
              }
              placeholder="Create a password (min 8 characters)"
              secureTextEntry
              maxLength={128}
            />
            {errors.password && (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.password}
              </Text>
            )}
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 6 }}>
              Serviceable Pincodes (Comma separated) *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.serviceable_pincodes
                  ? "#dc2626"
                  : "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
                minHeight: 80,
                textAlignVertical: "top",
              }}
              value={formData.serviceable_pincodes}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  serviceable_pincodes: sanitizeInput(text),
                })
              }
              placeholder="e.g. 110001, 110002"
              multiline
              numberOfLines={3}
              keyboardType="number-pad"
            />
            <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              List the pincodes where you can provide service.
            </Text>
            {errors.serviceable_pincodes && (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {errors.serviceable_pincodes}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: "#2563eb",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginBottom: 16,
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text
              style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold" }}
            >
              {loading ? "Submitting..." : "Submit Application"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleMode}
            style={{ alignItems: "center", padding: 10 }}
          >
            <Text style={{ color: "#2563eb", fontSize: 14 }}>
              Already have an account? Login
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Status Modal - Reused for Signup Screen */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={[
                styles.modalIconContainer,
                {
                  backgroundColor:
                    statusModalType === "error"
                      ? "#fee2e2"
                      : statusModalType === "success"
                        ? "#dcfce7"
                        : "#fef3c7",
                },
              ]}
            >
              <MaterialCommunityIcons
                name={
                  statusModalType === "error"
                    ? "close-circle-outline"
                    : statusModalType === "success"
                      ? "check-circle-outline"
                      : "clock-time-four-outline"
                }
                size={48}
                color={
                  statusModalType === "error"
                    ? "#dc2626"
                    : statusModalType === "success"
                      ? "#16a34a"
                      : "#d97706"
                }
              />
            </View>
            <Text style={styles.modalTitle}>{statusModalContent.title}</Text>
            <Text style={styles.modalMessage}>
              {statusModalContent.message}
            </Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor:
                    statusModalType === "error"
                      ? "#dc2626"
                      : statusModalType === "success"
                        ? "#16a34a"
                        : "#d97706",
                },
              ]}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  checkeredBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: "#f1f5f9",
    opacity: 0.5,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#2563eb",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#0f172a",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotPasswordText: {
    color: "#64748b",
    fontSize: 14,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#94a3b8",
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButton: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  toggleText: {
    fontSize: 14,
    color: "#64748b",
  },
  toggleTextBold: {
    color: "#2563eb",
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
