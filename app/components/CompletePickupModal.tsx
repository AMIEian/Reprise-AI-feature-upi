import React, { useState } from "react";
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
} from "react-native";
import api from "../lib/api";

interface CompletePickupModalProps {
  visible: boolean;
  orderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CONDITION_OPTIONS = {
  physical_condition: ["Excellent", "Good", "Fair", "Poor"],
  screen_condition: [
    "Perfect",
    "Minor Scratches",
    "Major Scratches",
    "Cracked",
  ],
  battery_health: ["100-90%", "89-80%", "79-70%", "Below 70%"],
  functional_issues: ["None", "Minor", "Major", "Not Working"],
  accessories: ["All Original", "Some Original", "Third Party", "None"],
  payment_method: ["Cash", "UPI", "Bank Transfer", "Cheque"],
};

export default function CompletePickupModal({
  visible,
  orderId,
  onClose,
  onSuccess,
}: CompletePickupModalProps) {
  const [formData, setFormData] = useState({
    physical_condition: "",
    screen_condition: "",
    battery_health: "",
    functional_issues: "",
    accessories_included: "",
    original_box: false,
    charger_included: false,
    warranty_valid: false,
    purchase_invoice: false,
    imei_verified: false,
    icloud_locked: false,
    final_price: "",
    payment_method: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (
      !formData.physical_condition ||
      !formData.screen_condition ||
      !formData.battery_health
    ) {
      Alert.alert("Error", "Please fill all required condition fields");
      return;
    }

    if (!formData.final_price || parseFloat(formData.final_price) <= 0) {
      Alert.alert("Error", "Please enter a valid final price");
      return;
    }

    if (!formData.payment_method) {
      Alert.alert("Error", "Please select payment method");
      return;
    }

    setSubmitting(true);
    try {
      // Format condition as a summary string
      const actualCondition = `Physical: ${formData.physical_condition}, Screen: ${formData.screen_condition}, Battery: ${formData.battery_health}, Issues: ${formData.functional_issues || "None"}`;

      // Format notes with all collected details
      const pickupNotes = `Accessories: ${formData.accessories_included || "Not specified"}. Original Box: ${formData.original_box ? "Yes" : "No"}. Charger: ${formData.charger_included ? "Yes" : "No"}. Warranty: ${formData.warranty_valid ? "Valid" : "N/A"}. Invoice: ${formData.purchase_invoice ? "Yes" : "No"}. IMEI Verified: ${formData.imei_verified ? "Yes" : "No"}. Cloud Locked: ${formData.icloud_locked ? "Yes" : "No"}. ${formData.notes || ""}`;

      await api.post(`/agent/orders/${orderId}/complete-pickup`, {
        actual_condition: actualCondition,
        final_offered_price: parseFloat(formData.final_price),
        customer_accepted: true, // Assuming customer accepts if agent completes pickup
        pickup_notes: pickupNotes.trim(),
        payment_method: formData.payment_method,
      });

      if (Platform.OS === "web") {
        window.alert("Pickup completed successfully!");
        onSuccess();
        onClose();
      } else {
        Alert.alert("Success", "Pickup completed successfully!", [
          {
            text: "OK",
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]);
      }
    } catch (error: any) {
      if (Platform.OS === "web") {
        window.alert(
          error.response?.data?.detail || "Failed to complete pickup",
        );
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.detail || "Failed to complete pickup",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderSelector = (
    label: string,
    field: keyof typeof formData,
    options: string[],
    required = true,
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.optionsRow}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              formData[field] === option && styles.optionButtonSelected,
            ]}
            onPress={() => setFormData({ ...formData, [field]: option })}
          >
            <Text
              style={[
                styles.optionText,
                formData[field] === option && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCheckbox = (label: string, field: keyof typeof formData) => (
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={() => setFormData({ ...formData, [field]: !formData[field] })}
    >
      <View
        style={[styles.checkbox, formData[field] && styles.checkboxChecked]}
      >
        {formData[field] && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Pickup</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Physical Condition */}
          {renderSelector(
            "Physical Condition",
            "physical_condition",
            CONDITION_OPTIONS.physical_condition,
          )}

          {/* Screen Condition */}
          {renderSelector(
            "Screen Condition",
            "screen_condition",
            CONDITION_OPTIONS.screen_condition,
          )}

          {/* Battery Health */}
          {renderSelector(
            "Battery Health",
            "battery_health",
            CONDITION_OPTIONS.battery_health,
          )}

          {/* Functional Issues */}
          {renderSelector(
            "Functional Issues",
            "functional_issues",
            CONDITION_OPTIONS.functional_issues,
          )}

          {/* Accessories */}
          {renderSelector(
            "Accessories",
            "accessories_included",
            CONDITION_OPTIONS.accessories,
          )}

          {/* Checkboxes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Details</Text>
            {renderCheckbox("Original Box Available", "original_box")}
            {renderCheckbox("Charger Included", "charger_included")}
            {renderCheckbox("Warranty Valid", "warranty_valid")}
            {renderCheckbox("Purchase Invoice Available", "purchase_invoice")}
            {renderCheckbox("IMEI Verified", "imei_verified")}
            {renderCheckbox("iCloud/Google Locked", "icloud_locked")}
          </View>

          {/* Final Price */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Final Price (₹) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.final_price}
              onChangeText={(text) =>
                setFormData({ ...formData, final_price: text })
              }
              placeholder="Enter final negotiated price"
              keyboardType="numeric"
            />
          </View>

          {/* Payment Method */}
          {renderSelector(
            "Payment Method",
            "payment_method",
            CONDITION_OPTIONS.payment_method,
          )}

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Any additional observations or notes..."
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? "Completing..." : "Complete Pickup"}
            </Text>
          </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 20,
    color: "#6b7280",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  required: {
    color: "#dc2626",
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionButtonSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },
  optionText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#2563eb",
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
  },
  checkboxChecked: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 15,
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
