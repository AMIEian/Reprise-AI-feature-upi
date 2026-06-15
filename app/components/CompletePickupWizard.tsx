import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import api from "../lib/api";
import ProgressIndicator from "./ProgressIndicator";

interface CompletePickupWizardProps {
  visible: boolean;
  orderId: number;
  estimatedPrice?: number;
  onClose: () => void;
  onSuccess: () => void;
}

// Wizard steps definition
const WIZARD_STEPS = [
  { id: 1, title: "Inspect", icon: "🔍" },
  { id: 2, title: "Guide", icon: "📷" },
  { id: 3, title: "Photos", icon: "🖼️" },
  { id: 4, title: "Details", icon: "📝" },
  { id: 5, title: "Review", icon: "✅" },
];

// Inspection checklist items
const PHYSICAL_CHECKLIST = [
  { id: "screen_intact", label: "Screen is intact and working" },
  { id: "buttons_working", label: "All buttons are working" },
  { id: "speaker_working", label: "Speaker is working" },
  { id: "camera_working", label: "Camera is working" },
  { id: "charging_works", label: "Device charges properly" },
];

const ACCESSORIES_CHECKLIST = [
  { id: "original_box", label: "Has Original Box" },
  { id: "charger", label: "Has Charger" },
  { id: "original_bill", label: "Has Original Bill" },
];

// Photo guide items
const PHOTO_GUIDES = [
  {
    id: 1,
    title: "Front View",
    description: "Take a clear photo of the front of the device",
  },
  {
    id: 2,
    title: "Back View",
    description: "Capture the back panel and camera area",
  },
  {
    id: 3,
    title: "Screen On",
    description: "Show the screen powered on with display",
  },
  {
    id: 4,
    title: "Sides & Ports",
    description: "Capture all ports and side conditions",
  },
];

// Condition options
const BATTERY_OPTIONS = [
  { value: "excellent", label: "Excellent (80%+)", color: "#16a34a" },
  { value: "good", label: "Good (60-79%)", color: "#2563eb" },
  { value: "fair", label: "Fair (40-59%)", color: "#d97706" },
  { value: "poor", label: "Poor (Below 40%)", color: "#dc2626" },
];

const BODY_OPTIONS = [
  { value: "excellent", label: "Excellent - No scratches", color: "#16a34a" },
  { value: "good", label: "Good - Minor scratches", color: "#2563eb" },
  { value: "fair", label: "Fair - Visible wear", color: "#d97706" },
  { value: "poor", label: "Poor - Significant damage", color: "#dc2626" },
];

const PAYMENT_OPTIONS = [
  { value: "Cash", label: "💵 Cash" },
  { value: "UPI", label: "📱 UPI" },
  { value: "Bank Transfer", label: "🏦 Bank Transfer" },
  { value: "Cheque", label: "📄 Cheque" },
];

interface PhotoData {
  uri: string;
  filename?: string;
  type?: string;
}

export default function CompletePickupWizard({
  visible,
  orderId,
  estimatedPrice = 0,
  onClose,
  onSuccess,
}: CompletePickupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Physical inspection
  const [physicalChecks, setPhysicalChecks] = useState<Record<string, boolean>>(
    {},
  );
  const [accessoryChecks, setAccessoryChecks] = useState<
    Record<string, boolean>
  >({});

  // Step 3: Photos
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Step 4: Details
  const [batteryHealth, setBatteryHealth] = useState("");
  const [bodyCondition, setBodyCondition] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customerAccepted, setCustomerAccepted] = useState(false);
  const [notes, setNotes] = useState("");

  // Toggle check items
  const togglePhysicalCheck = (id: string) => {
    setPhysicalChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAccessoryCheck = (id: string) => {
    setAccessoryChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Photo handling
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to take photos.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto: PhotoData = {
          uri: result.assets[0].uri,
          filename: `photo_${photos.length + 1}.jpg`,
          type: "image/jpeg",
        };
        setPhotos((prev) => [...prev, newPhoto]);
        if (currentPhotoIndex < 3) {
          setCurrentPhotoIndex((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Gallery permission is required to select photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto: PhotoData = {
          uri: result.assets[0].uri,
          filename: `photo_${photos.length + 1}.jpg`,
          type: "image/jpeg",
        };
        setPhotos((prev) => [...prev, newPhoto]);
        if (currentPhotoIndex < 3) {
          setCurrentPhotoIndex((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error("Error picking photo:", error);
      Alert.alert("Error", "Failed to pick photo");
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation for each step
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0: // Inspection - Allow proceeding without requiring all checks
        return true;
      case 1: // Photo Guide
        return true;
      case 2: // Photos
        return photos.length >= 1; // At least one photo
      case 3: // Details
        return (
          batteryHealth &&
          bodyCondition &&
          finalPrice &&
          parseFloat(finalPrice) > 0 &&
          paymentMethod &&
          customerAccepted
        );
      case 4: // Review
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    physicalChecks,
    photos,
    batteryHealth,
    bodyCondition,
    finalPrice,
    paymentMethod,
    customerAccepted,
  ]);

  // Navigation
  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Format condition data
  const getPhoneConditions = () => {
    const conditions: Record<string, any> = {};

    PHYSICAL_CHECKLIST.forEach((item) => {
      conditions[item.id] = physicalChecks[item.id] || false;
    });

    ACCESSORIES_CHECKLIST.forEach((item) => {
      conditions[item.id] = accessoryChecks[item.id] || false;
    });

    conditions.battery_health = batteryHealth;
    conditions.body_condition = bodyCondition;

    return conditions;
  };

  // Submit pickup
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("final_offered_price", finalPrice);
      formData.append("customer_accepted", customerAccepted.toString());
      formData.append(
        "actual_condition",
        `Battery: ${batteryHealth}, Body: ${bodyCondition}`,
      );
      formData.append("pickup_notes", notes || "");
      formData.append("payment_method", paymentMethod);
      formData.append("phone_conditions", JSON.stringify(getPhoneConditions()));

      // Append photos
      photos.forEach((photo, index) => {
        formData.append("photos", {
          uri: photo.uri,
          name: photo.filename || `photo_${index + 1}.jpg`,
          type: photo.type || "image/jpeg",
        } as any);
      });

      await api.post(`/agent/orders/${orderId}/complete-pickup`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (Platform.OS === "web") {
        window.alert("Pickup completed successfully!");
        resetForm();
        onSuccess();
        onClose();
      } else {
        Alert.alert("Success", "Pickup completed successfully!", [
          {
            text: "OK",
            onPress: () => {
              resetForm();
              onSuccess();
              onClose();
            },
          },
        ]);
      }
    } catch (error: any) {
      const message =
        error.response?.data?.detail || "Failed to complete pickup";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setPhysicalChecks({});
    setAccessoryChecks({});
    setPhotos([]);
    setCurrentPhotoIndex(0);
    setBatteryHealth("");
    setBodyCondition("");
    setFinalPrice("");
    setPaymentMethod("");
    setCustomerAccepted(false);
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Calculate price difference
  const priceDifference = finalPrice
    ? parseFloat(finalPrice) - estimatedPrice
    : 0;

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderInspectionStep();
      case 1:
        return renderPhotoGuideStep();
      case 2:
        return renderPhotosStep();
      case 3:
        return renderDetailsStep();
      case 4:
        return renderReviewStep();
      default:
        return null;
    }
  };

  // Step 1: Physical Inspection
  const renderInspectionStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Physical Inspection</Text>
      <Text style={styles.stepDescription}>
        Check each item as you inspect the device
      </Text>

      {/* Physical Checklist */}
      <View style={styles.checklistSection}>
        <Text style={styles.sectionTitle}>📱 Device Checks</Text>
        {PHYSICAL_CHECKLIST.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.checklistItem,
              physicalChecks[item.id] && styles.checklistItemChecked,
            ]}
            onPress={() => togglePhysicalCheck(item.id)}
          >
            <View
              style={[
                styles.checkbox,
                physicalChecks[item.id] && styles.checkboxChecked,
              ]}
            >
              {physicalChecks[item.id] && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text
              style={[
                styles.checklistLabel,
                physicalChecks[item.id] && styles.checklistLabelChecked,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Accessories Checklist */}
      <View style={styles.checklistSection}>
        <Text style={styles.sectionTitle}>📦 Accessories</Text>
        {ACCESSORIES_CHECKLIST.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.checklistItem,
              accessoryChecks[item.id] && styles.checklistItemChecked,
            ]}
            onPress={() => toggleAccessoryCheck(item.id)}
          >
            <View
              style={[
                styles.checkbox,
                accessoryChecks[item.id] && styles.checkboxChecked,
              ]}
            >
              {accessoryChecks[item.id] && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text
              style={[
                styles.checklistLabel,
                accessoryChecks[item.id] && styles.checklistLabelChecked,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  // Step 2: Photo Guide
  const renderPhotoGuideStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Photo Guide</Text>
      <Text style={styles.stepDescription}>
        Follow these guidelines for taking device photos
      </Text>

      <View style={styles.photoGuideContainer}>
        {PHOTO_GUIDES.map((guide) => (
          <View key={guide.id} style={styles.photoGuideItem}>
            <View style={styles.photoGuideNumber}>
              <Text style={styles.photoGuideNumberText}>{guide.id}</Text>
            </View>
            <View style={styles.photoGuideContent}>
              <Text style={styles.photoGuideTitle}>{guide.title}</Text>
              <Text style={styles.photoGuideDescription}>
                {guide.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.proTipsContainer}>
        <Text style={styles.proTipsTitle}>📌 Pro Tips</Text>
        <Text style={styles.proTip}>• Good lighting is critical</Text>
        <Text style={styles.proTip}>• Avoid reflections and glare</Text>
        <Text style={styles.proTip}>• Focus clearly on any damage</Text>
        <Text style={styles.proTip}>• Capture all angles</Text>
      </View>
    </ScrollView>
  );

  // Step 3: Photos
  const renderPhotosStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Capture Photos</Text>
      <Text style={styles.stepDescription}>
        Photo {Math.min(photos.length + 1, 4)} of 4 -{" "}
        {PHOTO_GUIDES[Math.min(currentPhotoIndex, 3)]?.title ||
          "Additional Photo"}
      </Text>

      {/* Current photo preview */}
      {photos.length > 0 && (
        <View style={styles.photoPreviewContainer}>
          <Image
            source={{ uri: photos[photos.length - 1].uri }}
            style={styles.photoPreview}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Camera buttons */}
      <View style={styles.cameraButtons}>
        <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
          <Text style={styles.cameraButtonIcon}>📷</Text>
          <Text style={styles.cameraButtonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={pickFromGallery}
        >
          <Text style={styles.galleryButtonIcon}>🖼️</Text>
          <Text style={styles.galleryButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <View style={styles.photoThumbnails}>
          <Text style={styles.thumbnailsTitle}>
            Captured Photos ({photos.length}/4)
          </Text>
          <View style={styles.thumbnailsRow}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.thumbnailContainer}>
                <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
                <TouchableOpacity
                  style={styles.removeThumbnail}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removeThumbnailText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );

  // Step 4: Details
  const renderDetailsStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Condition Assessment</Text>
      <Text style={styles.stepDescription}>
        Provide detailed condition and pricing information
      </Text>

      {/* Battery Health */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Battery Health *</Text>
        <View style={styles.optionsGrid}>
          {BATTERY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                batteryHealth === option.value && {
                  borderColor: option.color,
                  backgroundColor: option.color + "10",
                },
              ]}
              onPress={() => setBatteryHealth(option.value)}
            >
              <Text
                style={[
                  styles.optionLabel,
                  batteryHealth === option.value && { color: option.color },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Body Condition */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Body Condition *</Text>
        <View style={styles.optionsGrid}>
          {BODY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                bodyCondition === option.value && {
                  borderColor: option.color,
                  backgroundColor: option.color + "10",
                },
              ]}
              onPress={() => setBodyCondition(option.value)}
            >
              <Text
                style={[
                  styles.optionLabel,
                  bodyCondition === option.value && { color: option.color },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Final Price */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Final Price (₹) *</Text>
        <TextInput
          style={styles.priceInput}
          value={finalPrice}
          onChangeText={setFinalPrice}
          placeholder="Enter final agreed price"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        {estimatedPrice > 0 && finalPrice && (
          <View
            style={[
              styles.priceDifference,
              priceDifference >= 0
                ? styles.priceDifferencePositive
                : styles.priceDifferenceNegative,
            ]}
          >
            <Text
              style={[
                styles.priceDifferenceText,
                priceDifference >= 0
                  ? { color: "#16a34a" }
                  : { color: "#dc2626" },
              ]}
            >
              {priceDifference >= 0 ? "+" : ""}₹{priceDifference} vs estimate (₹
              {estimatedPrice})
            </Text>
          </View>
        )}
      </View>

      {/* Payment Method */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Payment Method *</Text>
        <View style={styles.paymentOptions}>
          {PAYMENT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.paymentOption,
                paymentMethod === option.value && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod(option.value)}
            >
              <Text
                style={[
                  styles.paymentOptionText,
                  paymentMethod === option.value &&
                    styles.paymentOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Customer Accepted */}
      <TouchableOpacity
        style={[
          styles.acceptanceCard,
          customerAccepted && styles.acceptanceCardChecked,
        ]}
        onPress={() => setCustomerAccepted(!customerAccepted)}
      >
        <View
          style={[
            styles.acceptanceCheckbox,
            customerAccepted && styles.acceptanceCheckboxChecked,
          ]}
        >
          {customerAccepted && (
            <Text style={styles.acceptanceCheckmark}>✓</Text>
          )}
        </View>
        <View style={styles.acceptanceContent}>
          <Text style={styles.acceptanceTitle}>Customer Accepted</Text>
          <Text style={styles.acceptanceSubtitle}>
            Customer agreed to the final offer
          </Text>
        </View>
      </TouchableOpacity>

      {/* Notes */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Additional Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any observations, damage details, or other notes..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );

  // Step 5: Review
  const renderReviewStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Review & Confirm</Text>
      <Text style={styles.stepDescription}>
        Please review all information before submitting
      </Text>

      <View style={styles.reviewCard}>
        {/* Photos Count */}
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>📷 Photos</Text>
          <Text style={styles.reviewValue}>{photos.length} / 4</Text>
        </View>

        {/* Battery Health */}
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>🔋 Battery Health</Text>
          <Text style={styles.reviewValue}>
            {BATTERY_OPTIONS.find((o) => o.value === batteryHealth)?.label ||
              "-"}
          </Text>
        </View>

        {/* Body Condition */}
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>📱 Body Condition</Text>
          <Text style={styles.reviewValue}>
            {BODY_OPTIONS.find((o) => o.value === bodyCondition)?.label || "-"}
          </Text>
        </View>

        {/* Final Price */}
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>💰 Final Price</Text>
          <Text style={[styles.reviewValue, styles.priceValue]}>
            ₹{finalPrice}
          </Text>
        </View>

        {/* Payment Method */}
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>💳 Payment</Text>
          <Text style={styles.reviewValue}>{paymentMethod}</Text>
        </View>

        {/* Customer Accepted */}
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>✅ Customer Accepted</Text>
          <Text
            style={[
              styles.reviewValue,
              { color: customerAccepted ? "#16a34a" : "#dc2626" },
            ]}
          >
            {customerAccepted ? "Yes" : "No"}
          </Text>
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.reviewNotesContainer}>
            <Text style={styles.reviewLabel}>📝 Notes</Text>
            <Text style={styles.reviewNotes}>{notes}</Text>
          </View>
        )}
      </View>

      {/* Confirmation Notice */}
      <View style={styles.confirmationNotice}>
        <Text style={styles.confirmationIcon}>ℹ️</Text>
        <Text style={styles.confirmationText}>
          By submitting, you confirm that all the information is accurate and
          the pickup has been completed.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Complete Pickup</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Indicator */}
        <ProgressIndicator steps={WIZARD_STEPS} currentStep={currentStep} />

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Footer */}
        <View style={styles.footer}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <View style={styles.footerSpacer} />
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                !canProceed() && styles.buttonDisabled,
              ]}
              onPress={nextStep}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Continue →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                (submitting || !canProceed()) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || !canProceed()}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? "Submitting..." : "Complete Pickup"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#16a34a",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 20,
    color: "#ffffff",
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
    lineHeight: 20,
  },
  // Checklist styles
  checklistSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  checklistItemChecked: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  checkboxChecked: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  checklistLabel: {
    fontSize: 15,
    color: "#4b5563",
    flex: 1,
  },
  checklistLabelChecked: {
    color: "#15803d",
    fontWeight: "500",
  },
  // Photo guide styles
  photoGuideContainer: {
    marginBottom: 24,
  },
  photoGuideItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 12,
  },
  photoGuideNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  photoGuideNumberText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  photoGuideContent: {
    flex: 1,
  },
  photoGuideTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#15803d",
    marginBottom: 4,
  },
  photoGuideDescription: {
    fontSize: 14,
    color: "#166534",
    lineHeight: 20,
  },
  proTipsContainer: {
    backgroundColor: "#fffbeb",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  proTipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 10,
  },
  proTip: {
    fontSize: 14,
    color: "#b45309",
    marginBottom: 6,
    lineHeight: 20,
  },
  // Photo capture styles
  photoPreviewContainer: {
    height: 220,
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  cameraButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  cameraButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cameraButtonIcon: {
    fontSize: 20,
  },
  cameraButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  galleryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  galleryButtonIcon: {
    fontSize: 20,
  },
  galleryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  photoThumbnails: {
    marginTop: 8,
  },
  thumbnailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  thumbnailsRow: {
    flexDirection: "row",
    gap: 10,
  },
  thumbnailContainer: {
    position: "relative",
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  removeThumbnail: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
  },
  removeThumbnailText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  // Form styles
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  optionsGrid: {
    gap: 8,
  },
  optionCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  optionLabel: {
    fontSize: 15,
    color: "#4b5563",
    fontWeight: "500",
  },
  priceInput: {
    borderWidth: 2,
    borderColor: "#16a34a",
    borderRadius: 10,
    padding: 16,
    fontSize: 20,
    fontWeight: "600",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
  },
  priceDifference: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  priceDifferencePositive: {
    backgroundColor: "#f0fdf4",
  },
  priceDifferenceNegative: {
    backgroundColor: "#fef2f2",
  },
  priceDifferenceText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  paymentOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  paymentOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  paymentOptionSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  paymentOptionText: {
    fontSize: 15,
    color: "#4b5563",
    fontWeight: "500",
  },
  paymentOptionTextSelected: {
    color: "#2563eb",
    fontWeight: "600",
  },
  acceptanceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    marginBottom: 24,
  },
  acceptanceCardChecked: {
    backgroundColor: "#f0fdf4",
    borderColor: "#16a34a",
  },
  acceptanceCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#d1d5db",
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  acceptanceCheckboxChecked: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  acceptanceCheckmark: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  acceptanceContent: {
    flex: 1,
  },
  acceptanceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  acceptanceSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    backgroundColor: "#ffffff",
    color: "#111827",
  },
  // Review styles
  reviewCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#bbf7d0",
    marginBottom: 20,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#dcfce7",
  },
  reviewLabel: {
    fontSize: 14,
    color: "#166534",
    fontWeight: "500",
  },
  reviewValue: {
    fontSize: 14,
    color: "#15803d",
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16a34a",
  },
  reviewNotesContainer: {
    paddingTop: 12,
  },
  reviewNotes: {
    fontSize: 14,
    color: "#166534",
    marginTop: 8,
    lineHeight: 20,
  },
  confirmationNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 10,
  },
  confirmationIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  confirmationText: {
    flex: 1,
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
  // Footer styles
  footer: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  footerSpacer: {
    flex: 1,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  backButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: "#16a34a",
  },
  nextButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: "#16a34a",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#d1d5db",
  },
});
