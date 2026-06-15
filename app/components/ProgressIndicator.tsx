import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Step {
  id: number;
  title: string;
  icon: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export default function ProgressIndicator({
  steps,
  currentStep,
}: ProgressIndicatorProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <View style={styles.stepContainer}>
              <View
                style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  isCurrent && styles.stepCircleCurrent,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : (
                  <Text
                    style={[
                      styles.stepIcon,
                      isCurrent && styles.stepIconCurrent,
                    ]}
                  >
                    {step.icon}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepTitle,
                  isCurrent && styles.stepTitleCurrent,
                  isCompleted && styles.stepTitleCompleted,
                ]}
                numberOfLines={1}
              >
                {step.title}
              </Text>
            </View>

            {/* Connector line */}
            {!isLast && (
              <View
                style={[
                  styles.connector,
                  isCompleted && styles.connectorCompleted,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#f9fafb",
  },
  stepContainer: {
    alignItems: "center",
    width: 60,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  stepCircleCompleted: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  stepCircleCurrent: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
    transform: [{ scale: 1.1 }],
  },
  stepIcon: {
    fontSize: 16,
    color: "#6b7280",
  },
  stepIconCurrent: {
    color: "#ffffff",
  },
  checkmark: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "bold",
  },
  stepTitle: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 6,
    textAlign: "center",
    fontWeight: "500",
  },
  stepTitleCurrent: {
    color: "#2563eb",
    fontWeight: "700",
  },
  stepTitleCompleted: {
    color: "#16a34a",
    fontWeight: "600",
  },
  connector: {
    height: 2,
    flex: 1,
    backgroundColor: "#d1d5db",
    marginTop: 20,
    marginHorizontal: -4,
  },
  connectorCompleted: {
    backgroundColor: "#16a34a",
  },
});
