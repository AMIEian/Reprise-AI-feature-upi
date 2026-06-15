import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import "../../global.css";
import api from "../../lib/api";
import { getErrorMessage } from "../../utils/error";
import { Platform } from "react-native";

interface CreditPlan {
  id: number;
  plan_name: string;
  credit_amount: number;
  price: number;
  bonus_percentage: number;
  description: string;
  is_active: boolean;
}

const Wallet = () => {
  console.log("WALLET PAGE RENDERED");
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<number | null>(null);

  // Payment Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CreditPlan | null>(null);
  const [screenshot, setScreenshot] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const currentBalance = (user as any)?.credit_balance || 0;

  const fetchPlans = async () => {
    console.log("FETCHING CREDIT PLANS");
    try {
      const response = await api.get("/partner/credit-plans");
      console.log("CREDIT PLANS RESPONSE:", response.data);
      setPlans(response.data || []);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        Alert.alert(
          "Error",
          getErrorMessage(error, "Failed to load credit plans"),
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlans();
    refreshUser();
  };

  const handlePurchasePlan = async (plan: CreditPlan) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Purchase ${plan.plan_name} for ₹${plan.price.toLocaleString("en-IN")}?`,
      );

      if (confirmed) {
        setSelectedPlan(plan);
        setModalVisible(true);
      }

      return;
    }

    Alert.alert(
      "Purchase Credits",
      `Purchase ${plan.plan_name} for ₹${plan.price.toLocaleString("en-IN")}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed to Pay",
          onPress: () => {
            setSelectedPlan(plan);
            setModalVisible(true);
          },
        },
      ],
    );
  };

  const createPaymentRequest = async (
    plan: CreditPlan,
  ): Promise<number | null> => {
    try {
      // The API expects x-www-form-urlencoded for plan_id
      const params = new URLSearchParams();
      params.append("plan_id", plan.id.toString());

      const response = await api.post("/partner/payment-request", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const requestId = response.data.id || response.data.request_id;

      if (!requestId) {
        // Fallback or error check
        console.warn("No request ID found in response", response.data);
        Alert.alert(
          "Error",
          getErrorMessage(
            null,
            "Could not create payment request. Please try again.",
          ),
        );
        return null;
      }

      return requestId;
    } catch (error: any) {
      console.error("Payment request error:", error);
      Alert.alert(
        "Error",
        getErrorMessage(error, "Failed to initiate payment request"),
      );
      return null;
    }
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false, // Keeping original screenshot is usually better for verification
      quality: 0.8,
    });

    if (!result.canceled) {
      setScreenshot(result.assets[0]);
    }
  };

  const uploadScreenshot = async () => {
    if (!selectedPlan || !screenshot) return;

    setUploading(true);
    try {
      // First create the payment request
      const requestId = await createPaymentRequest(selectedPlan);
      if (!requestId) {
        return; // Error already shown in createPaymentRequest
      }

      // Now upload the screenshot
      const formData = new FormData();

      // Prepare file for upload
      // React Native expects: { uri, name, type }
      const fileToUpload = {
        uri: screenshot.uri, // On Expo/Android/iOS this is file://...
        name: screenshot.fileName || "screenshot.jpg",
        type: screenshot.mimeType || "image/jpeg",
      } as any;

      formData.append("screenshot", fileToUpload);

      await api.post(
        `/partner/payment-request/${requestId}/upload-screenshot`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setModalVisible(false);
      setScreenshot(null);
      setSelectedPlan(null);

      Alert.alert(
        "Success",
        "Payment screenshot uploaded successfully! Waiting for approval.",
      );

      // Refresh user balance/plans if needed, though approval might take time
      // Maybe specific requests list?
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert(
        "Error",
        getErrorMessage(error, "Failed to upload screenshot"),
      );
    } finally {
      setUploading(false);
    }
  };

  const closePaymentModal = () => {
    setModalVisible(false);
    setScreenshot(null);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 bg-gray-50 justify-center items-center"
        edges={["top"]}
      >
        <ActivityIndicator size="large" color="#0d9488" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0d9488"]}
          />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="text-2xl font-bold text-slate-900">Buy Credits</Text>
        </View>

        {/* Balance Card */}
        <View className="px-6 py-4">
          <View className="bg-teal-600 rounded-3xl p-6 shadow-xl">
            <View className="flex-row items-center mb-2">
              <Text className="text-teal-100 text-sm font-semibold">
                CURRENT BALANCE
              </Text>
              <View className="ml-auto w-10 h-10 bg-teal-500 rounded-full items-center justify-center">
                <Text className="text-2xl">💰</Text>
              </View>
            </View>

            <Text className="text-white text-5xl font-bold mb-3">
              {currentBalance.toLocaleString("en-IN")}
              <Text className="text-2xl text-teal-100"> CR</Text>
            </Text>

            <View className="flex-row items-center justify-between">
              <Text className="text-teal-100 text-xs">
                Use credits to purchase leads
              </Text>
            </View>
          </View>
        </View>

        {/* Credit Plans */}
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-slate-900">
              Available Credit Plans
            </Text>
          </View>

          {plans.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Text className="text-slate-500 text-center">
                No credit plans available
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {plans.map((plan, index) => {
                const bonusCredits = Math.floor(
                  (plan.credit_amount * plan.bonus_percentage) / 100,
                );
                const totalCredits = plan.credit_amount + bonusCredits;

                return (
                  <View
                    key={plan.id}
                    className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm"
                  >
                    {index === 1 && (
                      <View className="absolute -top-2 right-4 bg-orange-500 px-3 py-1 rounded-full">
                        <Text className="text-white text-xs font-bold">
                          🔥 Popular
                        </Text>
                      </View>
                    )}

                    <View className="flex-row items-start justify-between mb-4">
                      <View className="flex-1">
                        <Text className="text-slate-900 font-bold text-xl mb-2">
                          {plan.plan_name}
                        </Text>
                        <Text className="text-slate-500 text-sm mb-1">
                          {plan.description}
                        </Text>
                        <Text className="text-slate-600 text-base font-semibold mt-2">
                          ₹{plan.price.toLocaleString("en-IN")}
                        </Text>
                      </View>

                      <View className="items-end ml-4">
                        <View className="bg-teal-50 px-4 py-3 rounded-xl">
                          <Text className="text-teal-600 font-bold text-2xl">
                            {plan.credit_amount}
                          </Text>
                          <Text className="text-teal-600 text-xs text-center">
                            Credits
                          </Text>
                        </View>
                      </View>
                    </View>

                    {plan.bonus_percentage > 0 && (
                      <View className="bg-green-50 rounded-lg p-3 mb-4">
                        <Text className="text-green-700 text-sm font-semibold">
                          ✨ +{bonusCredits} Bonus Credits (
                          {plan.bonus_percentage}% bonus)
                        </Text>
                        <Text className="text-green-600 text-xs mt-1">
                          Total: {totalCredits} credits
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      className="bg-teal-600 rounded-xl py-4 items-center"
                      onPress={() => handlePurchasePlan(plan)}
                      disabled={processingPlanId === plan.id}
                      activeOpacity={0.8}
                    >
                      <Text className="text-white font-bold text-base">
                        {processingPlanId === plan.id
                          ? "Processing..."
                          : "Purchase Plan"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Information */}
        <View className="px-6 py-4 mb-6">
          <View className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <Text className="text-blue-900 font-semibold mb-2">
              ℹ️ How it works
            </Text>
            <Text className="text-blue-700 text-sm mb-2">
              • Purchase credits to unlock leads from the marketplace
            </Text>
            <Text className="text-blue-700 text-sm mb-2">
              • Each lead has a specific credit cost
            </Text>
            <Text className="text-blue-700 text-sm">
              • Bonus credits are automatically added to your balance
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closePaymentModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 h-[85%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-900">
                Complete Payment
              </Text>
              <TouchableOpacity onPress={closePaymentModal} className="p-2">
                <Text className="text-slate-500 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Payment Details */}
              <View className="bg-slate-50 p-4 rounded-xl mb-6">
                <Text className="text-slate-500 text-sm mb-1">
                  Total Amount
                </Text>
                <Text className="text-slate-900 text-3xl font-bold">
                  ₹{selectedPlan?.price.toLocaleString("en-IN")}
                </Text>
                <Text className="text-teal-600 font-medium mt-1">
                  For {selectedPlan?.credit_amount} Credits
                </Text>
              </View>

              {/* QR Code */}
              <View className="items-center mb-8">
                <Text className="text-slate-900 font-semibold mb-4">
                  Scan UPI QR Code
                </Text>
                <View className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  {/* Using require for local assets */}
                  <Image
                    source={require("../../assets/images/qr_code.png")}
                    style={{ width: 250, height: 250 }}
                    resizeMode="contain"
                  />
                </View>
                <Text className="text-slate-500 text-xs mt-3 text-center px-8">
                  Scan this code using any UPI app (GPay, PhonePe, Paytm) to
                  make the payment.
                </Text>
              </View>

              {/* Screenshot Upload */}
              <View className="mb-8">
                <Text className="text-slate-900 font-semibold mb-3">
                  Upload Payment Screenshot
                </Text>

                {screenshot ? (
                  <View className="relative">
                    <Image
                      source={{ uri: screenshot.uri }}
                      style={{ width: "100%", height: 200, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => setScreenshot(null)}
                      className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                    >
                      <Text className="text-white text-xs">✕ Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickImage}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 items-center justify-center bg-slate-50"
                  >
                    <Text className="text-4xl mb-2">📸</Text>
                    <Text className="text-slate-600 font-medium">
                      Tap to upload screenshot
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                className={`rounded-xl py-4 items-center mb-4 ${
                  !screenshot || uploading ? "bg-slate-300" : "bg-teal-600"
                }`}
                disabled={!screenshot || uploading}
                onPress={uploadScreenshot}
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Submit Payment
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closePaymentModal}
                disabled={uploading}
                className="py-3 items-center"
              >
                <Text className="text-slate-500 font-medium">Cancel</Text>
              </TouchableOpacity>

              {/* Bottom Spacer */}
              <View className="h-8" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Wallet;
