import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../lib/api";
import { API_ENDPOINTS } from "../../config";
import Button from "../../components/Button";
import {
  formatPrice,
  parseRam,
  parseStorage,
  formatStorage,
} from "../../utils/helpers";
import type {
  Phone,
  PhoneVariants,
  PricePredictionResponse,
} from "../../types";
import { useAuth } from "../../context/AuthContext";

// Screen condition options
const SCREEN_CONDITIONS = [
  { id: "excellent", label: "Excellent", description: "No scratches or marks" },
  {
    id: "good",
    label: "Good",
    description: "Minor scratches, not visible when screen is on",
  },
  {
    id: "fair",
    label: "Fair",
    description: "Visible scratches when screen is on",
  },
  {
    id: "poor",
    label: "Poor",
    description: "Cracked or severely damaged screen",
  },
];

export default function PhoneDetailScreen() {
  const { phoneId } = useLocalSearchParams<{ phoneId: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // State
  const [phone, setPhone] = useState<Phone | null>(null);
  const [variants, setVariants] = useState<PhoneVariants | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRam, setSelectedRam] = useState<string>("");
  const [selectedStorage, setSelectedStorage] = useState<string>("");
  const [selectedScreenCondition, setSelectedScreenCondition] =
    useState<string>("");
  const [deviceTurnsOn, setDeviceTurnsOn] = useState<boolean | null>(null);
  const [hasOriginalBox, setHasOriginalBox] = useState<boolean | null>(null);
  const [hasOriginalBill, setHasOriginalBill] = useState<boolean | null>(null);
  const [deviceAge, setDeviceAge] = useState<string>("");

  // Base price and predicted price
  const [basePrice, setBasePrice] = useState<number>(0);
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Check if phone is Apple (Apple phones skip RAM selection)
  const isApplePhone = phone?.Brand?.toLowerCase() === "apple";
  const totalSteps = isApplePhone ? 3 : 4;

  useEffect(() => {
    fetchPhoneData();
  }, [phoneId]);

  // Fetch variant price when RAM and storage are selected
  useEffect(() => {
    if (phone && selectedRam && selectedStorage) {
      fetchVariantPrice();
    }
  }, [phone, selectedRam, selectedStorage]);

  // Fetch predicted price when on final step
  useEffect(() => {
    const isFinalStep = isApplePhone ? currentStep === 3 : currentStep === 4;
    if (
      isFinalStep &&
      phone &&
      selectedRam &&
      selectedStorage &&
      selectedScreenCondition &&
      deviceTurnsOn !== null &&
      hasOriginalBox !== null &&
      hasOriginalBill !== null &&
      deviceAge !== ""
    ) {
      fetchPredictedPrice();
    }
  }, [
    currentStep,
    phone,
    selectedRam,
    selectedStorage,
    selectedScreenCondition,
    deviceTurnsOn,
    hasOriginalBox,
    hasOriginalBill,
    deviceAge,
  ]);

  const fetchPhoneData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch phone details
      const phoneResponse = await api.get(
        `${API_ENDPOINTS.PHONE_DETAIL}/${phoneId}`,
      );
      const phoneData = phoneResponse.data;
      setPhone(phoneData);
      setBasePrice(phoneData.Selling_Price || 0);

      // For Apple phones, auto-set RAM
      if (phoneData.Brand?.toLowerCase() === "apple") {
        if (phoneData.RAM_GB && phoneData.RAM_GB > 0) {
          setSelectedRam(`${phoneData.RAM_GB}gb`);
        } else {
          setSelectedRam("na");
        }
      }

      // Fetch variants
      const variantsResponse = await api.get(
        `${API_ENDPOINTS.PHONE_VARIANTS}/${phoneId}/variants`,
      );
      setVariants(variantsResponse.data);
    } catch (err: any) {
      console.error("Error fetching phone data:", err);
      setError(err.message || "Failed to load phone details");
    } finally {
      setLoading(false);
    }
  };

  const fetchVariantPrice = async () => {
    try {
      const ramGb = parseRam(selectedRam);
      const storageGb = parseStorage(selectedStorage);

      const response = await api.get(
        `${API_ENDPOINTS.PHONE_PRICE}/${phoneId}/price?ram_gb=${ramGb}&storage_gb=${storageGb}`,
      );
      setBasePrice(response.data.base_price || phone?.Selling_Price || 0);
    } catch (err: any) {
      // Suppress 404 errors as requested
      if (err.response?.status === 404) {
        return;
      }
      console.error("Error fetching variant price:", err);
    }
  };

  const fetchPredictedPrice = async () => {
    try {
      setPredictionLoading(true);

      const response = await api.post(API_ENDPOINTS.PREDICT_PRICE, {
        phone_details: {
          brand: phone?.Brand,
          model: phone?.Model,
          ram_gb: parseRam(selectedRam),
          storage_gb: parseStorage(selectedStorage),
          screen_condition: selectedScreenCondition,
          device_turns_on: deviceTurnsOn,
          has_original_box: hasOriginalBox,
          has_original_bill: hasOriginalBill,
          device_age: deviceAge || null,
        },
      });

      setPredictedPrice(response.data.predicted_price);
    } catch (err) {
      console.error("Error fetching prediction:", err);
      // Use base price as fallback
      setPredictedPrice(basePrice);
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.replace("/(tabs)/sell");
    }
  };

  const canProceed = () => {
    if (isApplePhone) {
      switch (currentStep) {
        case 1:
          return !!selectedStorage;
        case 2:
          return (
            !!selectedScreenCondition &&
            deviceTurnsOn !== null &&
            hasOriginalBox !== null &&
            hasOriginalBill !== null &&
            deviceAge !== ""
          );
        default:
          return true;
      }
    } else {
      switch (currentStep) {
        case 1:
          return !!selectedRam;
        case 2:
          return !!selectedStorage;
        case 3:
          return (
            !!selectedScreenCondition &&
            deviceTurnsOn !== null &&
            hasOriginalBox !== null &&
            hasOriginalBill !== null &&
            deviceAge !== ""
          );
        default:
          return true;
      }
    }
  };

  const handleProceedToCheckout = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Login Required",
        "Please login to proceed with selling your phone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Login",
            onPress: () => router.push("/(auth)/login"),
          },
        ],
      );
      return;
    }

    // Save phone data to AsyncStorage for checkout
    const phoneData = {
      id: phone?.id,
      name: `${phone?.Brand} ${phone?.Model}`,
      brand: phone?.Brand,
      model: phone?.Model,
      ram_gb: parseRam(selectedRam),
      storage_gb: parseStorage(selectedStorage),
      variant: `${formatStorage(parseStorage(selectedStorage))} / ${
        isApplePhone ? "" : selectedRam.toUpperCase()
      }`.trim(),
      screen_condition: selectedScreenCondition,
      device_turns_on: deviceTurnsOn,
      original_box: hasOriginalBox,
      original_bill: hasOriginalBill,
      device_age: deviceAge || null,
      ai_estimated_price: predictedPrice || basePrice,
      final_quoted_price: predictedPrice || basePrice,
      image: phone?.image_blob || phone?.image_url,
    };

    await AsyncStorage.setItem("checkoutPhoneData", JSON.stringify(phoneData));
    router.push("/checkout");
  };

  const getImageSource = () => {
    if (phone?.image_blob) {
      return { uri: phone.image_blob };
    }
    if (phone?.image_url) {
      return { uri: phone.image_url };
    }
    return {
      uri: `https://placehold.co/300x300/e2e8f0/475569?text=${encodeURIComponent(
        phone?.Brand || "Phone",
      )}`,
    };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading phone details...</Text>
      </View>
    );
  }

  if (error || !phone) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error || "Phone not found"}</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View key={index} style={styles.stepDot}>
          <View
            style={[
              styles.dot,
              index + 1 <= currentStep ? styles.dotActive : styles.dotInactive,
            ]}
          >
            {index + 1 < currentStep ? (
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            ) : (
              <Text
                style={[
                  styles.dotText,
                  index + 1 === currentStep && styles.dotTextActive,
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
          {index < totalSteps - 1 && (
            <View
              style={[
                styles.stepLine,
                index + 1 < currentStep
                  ? styles.stepLineActive
                  : styles.stepLineInactive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderRAMStep = () => {
    let rams = variants?.rams || [];

    // Filter valid RAMs first (numbers > 0)
    let validRams = rams.filter(
      (r) => r !== null && typeof r === "number" && r > 0,
    );

    // If no valid RAMs found, use default options
    if (validRams.length === 0) {
      validRams = [4, 6, 8, 12, 16];
    }

    const ramOptions = validRams.map((ram) => ({
      id: `${ram}gb`,
      label: `${ram}GB`,
    }));

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Select RAM</Text>
        <Text style={styles.stepSubtitle}>
          Choose your phone&apos;s RAM capacity
        </Text>
        <View style={styles.optionsGrid}>
          {ramOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionButton,
                selectedRam === option.id && styles.optionButtonSelected,
              ]}
              onPress={() => setSelectedRam(option.id)}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedRam === option.id && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderStorageStep = () => {
    const storageOptions = (variants?.storages || [])
      .filter((s) => typeof s === "number" && s > 0)
      .map((storage) => ({
        id: `${storage}gb`,
        label: formatStorage(storage),
      }));

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Select Storage</Text>
        <Text style={styles.stepSubtitle}>
          Choose your phone&apos;s storage capacity
        </Text>
        <View style={styles.optionsGrid}>
          {storageOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionButton,
                selectedStorage === option.id && styles.optionButtonSelected,
              ]}
              onPress={() => setSelectedStorage(option.id)}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedStorage === option.id && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderConditionStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Phone Condition</Text>
      <Text style={styles.stepSubtitle}>
        Tell us about your phone&apos;s condition
      </Text>

      {/* Screen Condition */}
      <Text style={styles.questionLabel}>Screen Condition</Text>
      <View style={styles.conditionOptions}>
        {SCREEN_CONDITIONS.map((condition) => (
          <TouchableOpacity
            key={condition.id}
            style={[
              styles.conditionOption,
              selectedScreenCondition === condition.id &&
                styles.conditionOptionSelected,
            ]}
            onPress={() => setSelectedScreenCondition(condition.id)}
          >
            <Text
              style={[
                styles.conditionLabel,
                selectedScreenCondition === condition.id &&
                  styles.conditionLabelSelected,
              ]}
            >
              {condition.label}
            </Text>
            <Text style={styles.conditionDescription}>
              {condition.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Device Turns On */}
      <Text style={styles.questionLabel}>Does the device turn on?</Text>
      <View style={styles.yesNoOptions}>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            deviceTurnsOn === true && styles.yesNoButtonSelected,
          ]}
          onPress={() => setDeviceTurnsOn(true)}
        >
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={deviceTurnsOn === true ? "#22c55e" : "#9ca3af"}
          />
          <Text
            style={[
              styles.yesNoText,
              deviceTurnsOn === true && styles.yesNoTextSelected,
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            deviceTurnsOn === false && styles.yesNoButtonSelectedNo,
          ]}
          onPress={() => setDeviceTurnsOn(false)}
        >
          <Ionicons
            name="close-circle"
            size={24}
            color={deviceTurnsOn === false ? "#ef4444" : "#9ca3af"}
          />
          <Text
            style={[
              styles.yesNoText,
              deviceTurnsOn === false && { color: "#ef4444" },
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
      </View>

      {/* Original Box */}
      <Text style={styles.questionLabel}>Do you have the original box?</Text>
      <View style={styles.yesNoOptions}>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            hasOriginalBox === true && styles.yesNoButtonSelected,
          ]}
          onPress={() => setHasOriginalBox(true)}
        >
          <Ionicons
            name="cube-outline"
            size={24}
            color={hasOriginalBox === true ? "#22c55e" : "#9ca3af"}
          />
          <Text
            style={[
              styles.yesNoText,
              hasOriginalBox === true && styles.yesNoTextSelected,
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            hasOriginalBox === false && styles.yesNoButtonSelectedNo,
          ]}
          onPress={() => setHasOriginalBox(false)}
        >
          <Ionicons
            name="cube"
            size={24}
            color={hasOriginalBox === false ? "#ef4444" : "#9ca3af"}
          />
          <Text
            style={[
              styles.yesNoText,
              hasOriginalBox === false && { color: "#ef4444" },
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
      </View>

      {/* Original Bill */}
      <Text style={styles.questionLabel}>Do you have the original bill?</Text>
      <View style={styles.yesNoOptions}>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            hasOriginalBill === true && styles.yesNoButtonSelected,
          ]}
          onPress={() => setHasOriginalBill(true)}
        >
          <Ionicons
            name="receipt-outline"
            size={24}
            color={hasOriginalBill === true ? "#22c55e" : "#9ca3af"}
          />
          <Text
            style={[
              styles.yesNoText,
              hasOriginalBill === true && styles.yesNoTextSelected,
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            hasOriginalBill === false && styles.yesNoButtonSelectedNo,
          ]}
          onPress={() => setHasOriginalBill(false)}
        >
          <Ionicons
            name="receipt"
            size={24}
            color={hasOriginalBill === false ? "#ef4444" : "#9ca3af"}
          />
          <Text
            style={[
              styles.yesNoText,
              hasOriginalBill === false && { color: "#ef4444" },
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
      </View>

      {/* Device Age */}
      <Text style={styles.questionLabel}>How old is your device?</Text>
      <View style={styles.conditionOptions}>
        {(
          [
            {
              id: "0-3 months",
              label: "0 – 3 months",
              description: "Almost new",
            },
            {
              id: "3-6 months",
              label: "3 – 6 months",
              description: "Lightly used",
            },
            {
              id: "6-11 months",
              label: "6 – 11 months",
              description: "Moderately used",
            },
            {
              id: "above 11 months",
              label: "Above 11 months",
              description: "More than a year",
            },
          ] as { id: string; label: string; description: string }[]
        ).map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.conditionOption,
              deviceAge === option.id && styles.conditionOptionSelected,
            ]}
            onPress={() => setDeviceAge(option.id)}
          >
            <Text
              style={[
                styles.conditionLabel,
                deviceAge === option.id && styles.conditionLabelSelected,
              ]}
            >
              {option.label}
            </Text>
            <Text style={styles.conditionDescription}>
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFinalQuoteStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your Quote</Text>
      <Text style={styles.stepSubtitle}>
        Here&apos;s what we can offer for your phone
      </Text>

      {/* Phone Summary */}
      <View style={styles.quoteSummary}>
        <Image
          source={getImageSource()}
          style={styles.quoteImage}
          resizeMode="contain"
        />
        <Text style={styles.quoteName}>
          {phone.Brand} {phone.Model}
        </Text>
        <Text style={styles.quoteVariant}>
          {formatStorage(parseStorage(selectedStorage))}
          {!isApplePhone && ` / ${selectedRam.toUpperCase()}`}
        </Text>
      </View>

      {/* Condition Summary */}
      <View style={styles.conditionSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Screen Condition</Text>
          <Text style={styles.summaryValue}>
            {
              SCREEN_CONDITIONS.find((c) => c.id === selectedScreenCondition)
                ?.label
            }
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Device Turns On</Text>
          <Text style={styles.summaryValue}>
            {deviceTurnsOn ? "Yes" : "No"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Original Box</Text>
          <Text style={styles.summaryValue}>
            {hasOriginalBox ? "Yes" : "No"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Original Bill</Text>
          <Text style={styles.summaryValue}>
            {hasOriginalBill ? "Yes" : "No"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Device Age</Text>
          <Text style={styles.summaryValue}>
            {deviceAge || "Not specified"}
          </Text>
        </View>
      </View>

      {/* Price */}
      <View style={styles.priceContainer}>
        {predictionLoading ? (
          <ActivityIndicator size="large" color="#2563eb" />
        ) : (
          <>
            <Text style={styles.priceLabel}>Estimated Value</Text>
            <Text style={styles.priceValue}>
              {formatPrice(predictedPrice || basePrice)}
            </Text>
            <Text style={styles.priceNote}>
              Final price may vary based on physical inspection
            </Text>
          </>
        )}
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    if (isApplePhone) {
      switch (currentStep) {
        case 1:
          return renderStorageStep();
        case 2:
          return renderConditionStep();
        case 3:
          return renderFinalQuoteStep();
      }
    } else {
      switch (currentStep) {
        case 1:
          return renderRAMStep();
        case 2:
          return renderStorageStep();
        case 3:
          return renderConditionStep();
        case 4:
          return renderFinalQuoteStep();
      }
    }
  };

  const isFinalStep = currentStep === totalSteps;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: `${phone.Brand} ${phone.Model}`,
        }}
      />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Phone Header */}
          <View style={styles.phoneHeader}>
            <Image
              source={getImageSource()}
              style={styles.phoneImage}
              resizeMode="contain"
            />
            <Text style={styles.phoneName}>
              {phone.Brand} {phone.Model}
            </Text>
            <Text style={styles.phonePrice}>
              Up to {formatPrice(phone.Selling_Price)}
            </Text>
          </View>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Current Step Content */}
          {renderCurrentStep()}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#6b7280" />
            <Text style={styles.backButtonText}>
              {currentStep === 1 ? "Cancel" : "Back"}
            </Text>
          </TouchableOpacity>

          {isFinalStep ? (
            <Button
              title="Proceed to Checkout"
              onPress={handleProceedToCheckout}
              disabled={predictionLoading}
              loading={predictionLoading}
            />
          ) : (
            <Button
              title="Next"
              onPress={handleNext}
              disabled={!canProceed()}
              icon={<Ionicons name="arrow-forward" size={18} color="#ffffff" />}
            />
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginVertical: 16,
  },
  scrollView: {
    flex: 1,
  },
  phoneHeader: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  phoneImage: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  phoneName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  phonePrice: {
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "600",
    marginTop: 4,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  stepDot: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: {
    backgroundColor: "#2563eb",
  },
  dotInactive: {
    backgroundColor: "#e5e7eb",
  },
  dotText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  dotTextActive: {
    color: "#ffffff",
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: "#2563eb",
  },
  stepLineInactive: {
    backgroundColor: "#e5e7eb",
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  optionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    minWidth: 80,
    alignItems: "center",
  },
  optionButtonSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  optionTextSelected: {
    color: "#2563eb",
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 20,
    marginBottom: 12,
  },
  conditionOptions: {
    gap: 10,
  },
  conditionOption: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  conditionOptionSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  conditionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  conditionLabelSelected: {
    color: "#2563eb",
  },
  conditionDescription: {
    fontSize: 13,
    color: "#6b7280",
  },
  yesNoOptions: {
    flexDirection: "row",
    gap: 12,
  },
  yesNoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    gap: 8,
  },
  yesNoButtonSelected: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  yesNoButtonSelectedNo: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  yesNoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  yesNoTextSelected: {
    color: "#22c55e",
  },
  quoteSummary: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
  },
  quoteImage: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  quoteName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  quoteVariant: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  conditionSummary: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
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
  },
  priceContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  priceLabel: {
    fontSize: 14,
    color: "#2563eb",
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#2563eb",
  },
  priceNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
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
});
