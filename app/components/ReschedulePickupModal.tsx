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
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "../lib/api";

interface ReschedulePickupModalProps {
  visible: boolean;
  orderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReschedulePickupModal({
  visible,
  orderId,
  onClose,
  onSuccess,
}: ReschedulePickupModalProps) {
  const [date, setDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
  const [time, setTime] = useState(new Date());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!reason.trim()) {
      Alert.alert("Error", "Please provide a reason for rescheduling");
      return;
    }

    if (reason.trim().length < 5) {
      Alert.alert("Error", "Reason must be at least 5 characters");
      return;
    }

    setSubmitting(true);
    try {
      // Format date as YYYY-MM-DD
      const pickupDate = date.toISOString().split("T")[0];
      // Format time as HH:MM
      const pickupTime = time.toTimeString().slice(0, 5);

      await api.post(`/agent/orders/${orderId}/reschedule-pickup`, {
        new_date: pickupDate,
        new_time: pickupTime,
        reschedule_reason: reason.trim(),
        notes: notes.trim() || null,
      });

      if (Platform.OS === "web") {
        window.alert("Pickup rescheduled successfully!");
        onSuccess();
        onClose();
      } else {
        Alert.alert("Success", "Pickup rescheduled successfully!", [
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
      const message =
        error.response?.data?.detail || "Failed to reschedule pickup";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    setTime(new Date());
    setReason("");
    setNotes("");
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (t: Date) => {
    return t.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>📅</Text>
            <Text style={styles.title}>Reschedule Pickup</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            This will update the pickup schedule. The customer should be
            informed of the new timing.
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              New Pickup Date <Text style={styles.required}>*</Text>
            </Text>
            {Platform.OS === "web" ? (
              <input
                type="date"
                value={date.toISOString().split("T")[0]}
                min={new Date().toISOString().split("T")[0]}
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "2px solid #fde68a",
                  fontSize: "16px",
                  width: "100%",
                  backgroundColor: "#fffbeb",
                }}
                onChange={(e) => setDate(new Date(e.target.value))}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateTimeIcon}>📆</Text>
                  <Text style={styles.dateTimeText}>{formatDate(date)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setDate(selectedDate);
                    }}
                  />
                )}
              </>
            )}
          </View>

          {/* Time Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              New Pickup Time <Text style={styles.required}>*</Text>
            </Text>
            {Platform.OS === "web" ? (
              <input
                type="time"
                value={time.toTimeString().slice(0, 5)}
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "2px solid #fde68a",
                  fontSize: "16px",
                  width: "100%",
                  backgroundColor: "#fffbeb",
                }}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(":");
                  const newTime = new Date();
                  newTime.setHours(parseInt(hours), parseInt(minutes));
                  setTime(newTime);
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateTimeIcon}>🕐</Text>
                  <Text style={styles.dateTimeText}>{formatTime(time)}</Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={time}
                    mode="time"
                    display="default"
                    onChange={(event, selectedTime) => {
                      setShowTimePicker(false);
                      if (selectedTime) setTime(selectedTime);
                    }}
                  />
                )}
              </>
            )}
          </View>

          {/* Reason */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Reason for Rescheduling <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g., Customer requested different time, not available today..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {reason.length}/500 characters (min 5)
            </Text>
          </View>

          {/* Additional Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.textArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about the rescheduling..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              handleReset();
              onClose();
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || reason.length < 5) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || reason.length < 5}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? "Rescheduling..." : "Confirm Reschedule"}
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
    backgroundColor: "#fffbeb",
    borderBottomWidth: 2,
    borderBottomColor: "#fde68a",
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
    color: "#92400e",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  closeText: {
    fontSize: 20,
    color: "#92400e",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  warningIcon: {
    fontSize: 18,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
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
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderWidth: 2,
    borderColor: "#fde68a",
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  dateTimeIcon: {
    fontSize: 18,
  },
  dateTimeText: {
    fontSize: 16,
    color: "#92400e",
    fontWeight: "500",
  },
  textArea: {
    borderWidth: 2,
    borderColor: "#fde68a",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fffbeb",
    minHeight: 80,
    color: "#111827",
  },
  charCount: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 6,
    textAlign: "right",
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
    backgroundColor: "#d97706",
    borderRadius: 10,
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
