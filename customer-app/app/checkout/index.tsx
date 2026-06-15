import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "../../lib/api";
import { API_ENDPOINTS } from "../../config";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import LoadingScreen from "../../components/LoadingScreen";
import {
  formatPrice,
  validateEmail,
  validatePhone,
  validatePincode,
  getMinPickupDate,
  getTimeSlots,
  formatDate,
} from "../../utils/helpers";

const TIME_SLOTS = getTimeSlots();

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: "qr-code-outline" },
  { id: "cash", label: "Cash", icon: "cash-outline" },
  { id: "bank_transfer", label: "Bank Transfer", icon: "business-outline" },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  // Phone data from previous screen
  const [phoneData, setPhoneData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [pickupDate, setPickupDate] = useState<Date>(getMinPickupDate());
  const [pickupTime, setPickupTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Validation state
  const [pincodeValid, setPincodeValid] = useState(false);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeError, setPincodeError] = useState("");

  // Field errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPhoneData();
    prefillUserData();
  }, []);

  // Check pincode serviceability with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pincode && pincode.length === 6) {
        checkPincode(pincode);
      } else {
        setPincodeValid(false);
        setPincodeError("");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [pincode]);

  const loadPhoneData = async () => {
    try {
      const data = await AsyncStorage.getItem("checkoutPhoneData");
      if (data) {
        setPhoneData(JSON.parse(data));
      } else {
        Alert.alert(
          "Error",
          "No phone data found. Please select a phone first.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/sell") }],
        );
      }
    } catch (error) {
      console.error("Error loading phone data:", error);
    } finally {
      setLoading(false);
    }
  };

  const prefillUserData = async () => {
    if (user) {
      const nameParts = (user.name || user.full_name || "").split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
      setPhone(user.phone || "");
      setEmail(user.email || "");
      setAddressLine(user.address || "");
      setPincode(user.pincode || "");
    }

    // Try to get more details
    try {
      const response = await api.get(API_ENDPOINTS.ME_DETAILS, {
        headers: { "x-skip-auth-redirect": "1" },
      });
      const userData = response.data;
      if (userData.full_name) {
        const parts = userData.full_name.split(" ");
        setFirstName(parts[0] || firstName);
        setLastName(parts.slice(1).join(" ") || lastName);
      }
      if (userData.phone && !phone) setPhone(userData.phone);
      if (userData.address && !addressLine) setAddressLine(userData.address);
      if (userData.pincode && !pincode) setPincode(userData.pincode);
    } catch (error) {
      // Ignore errors
    }
  };

  const checkPincode = async (pin: string) => {
    setPincodeChecking(true);
    setPincodeError("");

    try {
      const response = await api.get(`${API_ENDPOINTS.CHECK_PINCODE}/${pin}`);
      const data = response.data;

      setPincodeValid(data.serviceable);
      if (!data.serviceable) {
        setPincodeError(
          data.message ||
            "Sorry, we don't service this pincode yet. Order processing may be delayed.",
        );
      } else {
        if (data.city && !city) setCity(data.city);
        if (data.state && !state) setState(data.state);
      }
    } catch (error) {
      console.error("Pincode check failed:", error);
      setPincodeError("Unable to verify pincode. Please continue anyway.");
      setPincodeValid(false);
    } finally {
      setPincodeChecking(false);
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!validatePhone(phone))
      newErrors.phone = "Valid phone number is required";
    if (!validateEmail(email)) newErrors.email = "Valid email is required";
    if (!addressLine.trim()) newErrors.addressLine = "Address is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!state.trim()) newErrors.state = "State is required";
    if (!validatePincode(pincode))
      newErrors.pincode = "Valid 6-digit pincode is required";
    if (!pickupTime) newErrors.pickupTime = "Please select a pickup time";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Submit = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    } else {
      Alert.alert(
        "Please Fix Errors",
        "Please fill in all required fields correctly.",
      );
    }
  };

  const handleSubmitOrder = async () => {
    setSubmitting(true);

    try {
      // Build customer condition answers from stored phone data
      const customerConditionAnswers: any = {};

      if (phoneData.screen_condition) {
        customerConditionAnswers.screen_condition = phoneData.screen_condition;
      }
      if (
        phoneData.device_turns_on !== undefined &&
        phoneData.device_turns_on !== null
      ) {
        customerConditionAnswers.device_turns_on = phoneData.device_turns_on;
      }
      if (
        phoneData.original_box !== undefined &&
        phoneData.original_box !== null
      ) {
        customerConditionAnswers.original_box = phoneData.original_box;
      }
      if (
        phoneData.original_bill !== undefined &&
        phoneData.original_bill !== null
      ) {
        customerConditionAnswers.original_bill = phoneData.original_bill;
      }
      if (phoneData.device_age) {
        customerConditionAnswers.device_age = phoneData.device_age;
      }

      // Build order payload according to OpenAPI OrderCreate schema
      const orderPayload = {
        phone_name: phoneData.name,
        brand: phoneData.brand,
        model: phoneData.model,
        ram_gb: phoneData.ram_gb,
        storage_gb: phoneData.storage_gb,
        variant: phoneData.variant,
        customer_condition_answers:
          Object.keys(customerConditionAnswers).length > 0
            ? customerConditionAnswers
            : null,
        customer_name: `${firstName} ${lastName}`.trim(),
        phone_number: phone,
        email: email,
        address_line: addressLine,
        city: city,
        state: state,
        pincode: pincode,
        pickup_date: pickupDate.toISOString(),
        pickup_time: pickupTime,
        payment_method: paymentMethod,
        quoted_price: phoneData.final_quoted_price,
      };

      const response = await api.post(API_ENDPOINTS.CREATE_ORDER, orderPayload);
      setCreatedOrder(response.data);

      // Clear checkout data
      await AsyncStorage.removeItem("checkoutPhoneData");

      // Refresh user data in case profile was updated
      await refreshUser();

      setCurrentStep(3);
    } catch (error: any) {
      console.error("Order creation failed:", error);
      Alert.alert(
        "Order Failed",
        error.response?.data?.detail ||
          "Failed to create order. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setPickupDate(selectedDate);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading checkout..." />;
  }

  if (!phoneData) {
    return null;
  }

  const renderStep1 = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phone</Text>
              <Text style={styles.summaryValue}>{phoneData.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Variant</Text>
              <Text style={styles.summaryValue}>{phoneData.variant}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Quoted Price</Text>
              <Text style={styles.summaryPrice}>
                {formatPrice(phoneData.final_quoted_price)}
              </Text>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                error={errors.firstName}
                required
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                error={errors.lastName}
                required
              />
            </View>
          </View>
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            error={errors.phone}
            required
            leftIcon={
              <Ionicons name="call-outline" size={20} color="#9ca3af" />
            }
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            required
            leftIcon={
              <Ionicons name="mail-outline" size={20} color="#9ca3af" />
            }
          />
        </View>

        {/* Pickup Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Address</Text>
          <Input
            label="Address Line"
            value={addressLine}
            onChangeText={setAddressLine}
            multiline
            error={errors.addressLine}
            required
            leftIcon={
              <Ionicons name="location-outline" size={20} color="#9ca3af" />
            }
          />
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="City"
                value={city}
                onChangeText={setCity}
                error={errors.city}
                required
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="State"
                value={state}
                onChangeText={setState}
                error={errors.state}
                required
              />
            </View>
          </View>
          <Input
            label="Pincode"
            value={pincode}
            onChangeText={setPincode}
            keyboardType="number-pad"
            maxLength={6}
            error={errors.pincode || pincodeError}
            required
            helperText={
              pincodeChecking
                ? "Checking..."
                : pincodeValid
                  ? "✓ Serviceable"
                  : undefined
            }
          />
        </View>

        {/* Pickup Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Schedule</Text>

          {/* Date Picker */}
          <Text style={styles.fieldLabel}>Pickup Date *</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            <Text style={styles.datePickerText}>
              {formatDate(pickupDate.toISOString(), {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={pickupDate}
              mode="date"
              display="default"
              minimumDate={getMinPickupDate()}
              onChange={handleDateChange}
            />
          )}

          {/* Time Slot */}
          <Text style={styles.fieldLabel}>Pickup Time *</Text>
          <View style={styles.timeSlots}>
            {TIME_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.timeSlot,
                  pickupTime === slot && styles.timeSlotSelected,
                ]}
                onPress={() => setPickupTime(slot)}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    pickupTime === slot && styles.timeSlotTextSelected,
                  ]}
                >
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.pickupTime && (
            <Text style={styles.errorText}>{errors.pickupTime}</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </KeyboardAvoidingView>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Order Review */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review Your Order</Text>

        {/* Phone Details */}
        <View style={styles.reviewCard}>
          <Text style={styles.reviewCardTitle}>Phone Details</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Device</Text>
            <Text style={styles.reviewValue}>{phoneData.name}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Variant</Text>
            <Text style={styles.reviewValue}>{phoneData.variant}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Condition</Text>
            <Text style={styles.reviewValue}>
              {phoneData.screen_condition?.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        {/* Pickup Details */}
        <View style={styles.reviewCard}>
          <Text style={styles.reviewCardTitle}>Pickup Details</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Name</Text>
            <Text style={styles.reviewValue}>{`${firstName} ${lastName}`}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Phone</Text>
            <Text style={styles.reviewValue}>{phone}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Address</Text>
            <Text style={styles.reviewValue}>
              {`${addressLine}, ${city}, ${state} - ${pincode}`}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Date</Text>
            <Text style={styles.reviewValue}>
              {formatDate(pickupDate.toISOString())}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Time</Text>
            <Text style={styles.reviewValue}>{pickupTime}</Text>
          </View>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentMethods}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                paymentMethod === method.id && styles.paymentMethodSelected,
              ]}
              onPress={() => setPaymentMethod(method.id)}
            >
              <Ionicons
                name={method.icon as any}
                size={24}
                color={paymentMethod === method.id ? "#2563eb" : "#6b7280"}
              />
              <Text
                style={[
                  styles.paymentMethodText,
                  paymentMethod === method.id &&
                    styles.paymentMethodTextSelected,
                ]}
              >
                {method.label}
              </Text>
              {paymentMethod === method.id && (
                <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Price Summary */}
      <View style={styles.priceSummary}>
        <Text style={styles.priceSummaryLabel}>You will receive</Text>
        <Text style={styles.priceSummaryValue}>
          {formatPrice(phoneData.final_quoted_price)}
        </Text>
        <Text style={styles.priceSummaryNote}>
          Final amount may vary based on physical inspection
        </Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderStep3 = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
      </View>
      <Text style={styles.successTitle}>Order Placed Successfully!</Text>
      <Text style={styles.successMessage}>
        Your order #{createdOrder?.id} has been placed. An agent will contact
        you soon to schedule the pickup.
      </Text>

      <View style={styles.successDetails}>
        <View style={styles.successRow}>
          <Ionicons name="calendar-outline" size={20} color="#6b7280" />
          <Text style={styles.successText}>
            Pickup: {formatDate(pickupDate.toISOString())} at {pickupTime}
          </Text>
        </View>
        <View style={styles.successRow}>
          <Ionicons name="cash-outline" size={20} color="#6b7280" />
          <Text style={styles.successText}>
            Amount: {formatPrice(phoneData.final_quoted_price)}
          </Text>
        </View>
      </View>

      <Button
        title="View My Orders"
        onPress={() => router.replace("/(tabs)/orders")}
        fullWidth
      />
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.secondaryButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      {currentStep < 3 && (
        <View style={styles.stepIndicator}>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= 1 && styles.stepCircleActive,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  currentStep >= 1 && styles.stepNumberActive,
                ]}
              >
                1
              </Text>
            </View>
            <Text style={styles.stepLabel}>Details</Text>
          </View>
          <View
            style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]}
          />
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= 2 && styles.stepCircleActive,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  currentStep >= 2 && styles.stepNumberActive,
                ]}
              >
                2
              </Text>
            </View>
            <Text style={styles.stepLabel}>Review</Text>
          </View>
        </View>
      )}

      {/* Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {/* Bottom Navigation */}
      {currentStep < 3 && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (currentStep === 1) {
                router.back();
              } else {
                setCurrentStep(currentStep - 1);
              }
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#6b7280" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          {currentStep === 1 ? (
            <Button title="Continue" onPress={handleStep1Submit} />
          ) : (
            <Button
              title="Place Order"
              onPress={handleSubmitOrder}
              loading={submitting}
              disabled={submitting}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#2563eb",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  stepNumberActive: {
    color: "#ffffff",
  },
  stepLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  stepLine: {
    width: 80,
    height: 2,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#2563eb",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563eb",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  datePickerText: {
    fontSize: 16,
    color: "#111827",
    marginLeft: 12,
  },
  timeSlots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  timeSlotSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  timeSlotText: {
    fontSize: 13,
    color: "#374151",
  },
  timeSlotTextSelected: {
    color: "#2563eb",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  reviewLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  paymentMethods: {
    gap: 10,
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  paymentMethodSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  paymentMethodText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  paymentMethodTextSelected: {
    color: "#2563eb",
    fontWeight: "600",
  },
  priceSummary: {
    margin: 16,
    padding: 24,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2563eb",
    alignItems: "center",
  },
  priceSummaryLabel: {
    fontSize: 14,
    color: "#2563eb",
  },
  priceSummaryValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#2563eb",
    marginVertical: 4,
  },
  priceSummaryNote: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: "#6b7280",
    marginLeft: 4,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  successDetails: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    marginBottom: 24,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: "#6b7280",
  },
});
