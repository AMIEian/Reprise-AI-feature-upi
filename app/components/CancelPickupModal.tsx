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

interface CancelPickupModalProps {
  visible: boolean;
  orderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CancelPickupModal({
  visible,
  orderId,
  onClose,
  onSuccess,
}: CancelPickupModalProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!showConfirmation) {
      // Show confirmation first
      setShowConfirmation(true);
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/agent/orders/${orderId}/cancel-pickup`, {
        cancellation_reason: reason.trim(),
        notes: notes.trim() || null,
      });

      if (Platform.OS === "web") {
        window.alert(
          "Order cancelled successfully. Customer is not willing to sell.",
        );
        onSuccess();
        onClose();
      } else {
        Alert.alert(
          "Order Cancelled",
          "The order has been marked as cancelled.",
          [
            {
              text: "OK",
              onPress: () => {
                onSuccess();
                onClose();
              },
            },
          ],
        );
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to cancel order";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
      setShowConfirmation(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setReason("");
    setNotes("");
    setShowConfirmation(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isValid = reason.trim().length >= 10;

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
          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>❌</Text>
            <Text style={styles.title}>Cancel Pickup</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Banner */}
        <View style={styles.dangerBanner}>
          <Text style={styles.dangerIcon}>⚠️</Text>
          <View style={styles.dangerTextContainer}>
            <Text style={styles.dangerTitle}>This action is irreversible</Text>
            <Text style={styles.dangerText}>
              The order will be marked as cancelled. The customer does not want
              to sell the device.
            </Text>
          </View>
        </View>

        {!showConfirmation ? (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Cancellation Reason */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Cancellation Reason <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textArea}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g., Customer changed mind, found better offer, device not available..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {reason.length}/500 characters (min 10)
              </Text>
            </View>

            {/* Additional Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Additional Notes (Optional)</Text>
              <TextInput
                style={styles.textArea}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional details about the cancellation..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        ) : (
          <View style={styles.confirmationContainer}>
            <View style={styles.confirmationCard}>
              <Text style={styles.confirmationIcon}>🚨</Text>
              <Text style={styles.confirmationTitle}>Confirm Cancellation</Text>
              <Text style={styles.confirmationText}>
                Are you sure you want to cancel this pickup? This action cannot
                be undone.
              </Text>
              <View style={styles.confirmationDetails}>
                <Text style={styles.confirmationLabel}>Reason:</Text>
                <Text style={styles.confirmationValue}>{reason}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {showConfirmation ? (
            <>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowConfirmation(false)}
              >
                <Text style={styles.backButtonText}>← Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  submitting && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.confirmButtonText}>
                  {submitting ? "Cancelling..." : "Confirm Cancel"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !isValid && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={!isValid}
              >
                <Text style={styles.submitButtonText}>Cancel Order</Text>
              </TouchableOpacity>
            </>
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
    backgroundColor: "#fef2f2",
    borderBottomWidth: 2,
    borderBottomColor: "#fecaca",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#991b1b",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  closeText: {
    fontSize: 20,
    color: "#991b1b",
  },
  dangerBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#fecaca",
  },
  dangerIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  dangerTextContainer: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#991b1b",
    marginBottom: 4,
  },
  dangerText: {
    fontSize: 13,
    color: "#b91c1c",
    lineHeight: 18,
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
    marginBottom: 10,
  },
  required: {
    color: "#dc2626",
  },
  textArea: {
    borderWidth: 2,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fef2f2",
    minHeight: 100,
    color: "#111827",
  },
  charCount: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 6,
    textAlign: "right",
  },
  confirmationContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  confirmationCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fecaca",
  },
  confirmationIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#991b1b",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmationText: {
    fontSize: 15,
    color: "#7f1d1d",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  confirmationDetails: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  confirmationLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  confirmationValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
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
    backgroundColor: "#dc2626",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  backButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  backButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 2,
    backgroundColor: "#dc2626",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#d1d5db",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
