import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useCallback, useEffect } from "react";
import api from "../../lib/api";
import HoldNotificationBanner from "../../components/HoldNotificationBanner";
import "../../global.css";
import socket from "@/lib/socket";
import * as Notifications from "expo-notifications";

interface OrderStats {
  locked: number;
  purchased: number;
  in_progress: number;
  completed: number;
}

export default function PartnerDashboard() {
  console.log("DASHBOARD SCREEN RENDERED");
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<OrderStats>({
    locked: 0,
    purchased: 0,
    in_progress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationData, setNotificationData] = useState<any>(null);
  const [lockedDeals, setLockedDeals] = useState<any[]>([]);

  const fetchStats = async () => {
    console.log("FETCHING DASHBOARD DATA");
    try {
      // Fetch both orders and locked deals
      const [ordersResponse, lockedResponse] = await Promise.all([
        api.get("/partner/orders"),
        api.get("/partner/locked-deals"),
      ]);

      console.log("ORDERS RESPONSE:", ordersResponse.data);
      console.log("LOCKED DEALS RESPONSE:", lockedResponse.data);

      const orders = ordersResponse.data || [];
      const lockedDeals = lockedResponse.data || [];
      setLockedDeals(lockedDeals);

      // Locked deals come from separate endpoint
      const locked = lockedDeals.length;

      // Filter orders by status
      const purchased = orders.filter(
        (o: any) => o.status === "lead_purchased",
      ).length;
      const inProgress = orders.filter(
        (o: any) =>
          o.status === "assigned_to_agent" || o.status === "accepted_by_agent",
      ).length;
      const completed = orders.filter(
        (o: any) =>
          o.status === "pickup_completed" ||
          o.status === "payment_processed" ||
          o.status === "completed",
      ).length;

      setStats({ locked, purchased, in_progress: inProgress, completed });
    } catch (error: any) {
      if (error.response?.status !== 401) {
        Alert.alert("Error", "Failed to fetch dashboard stats");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh when screen comes into focus
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (mounted) {
        await fetchStats();
      }
    };

    load();

    const handleNewOrder = async (data: any) => {
      console.log("SOCKET EVENT RECEIVED");

      console.log("NEW ORDER RECEIVED");

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "New Order Available",
            body: `${data.brand} ${data.model}`,
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: {
              order_id: data.order_id,
            },
          },
          trigger: null,
        });

        setNotificationData(data);

        setNotificationVisible(true);

        setTimeout(() => {
          setNotificationVisible(false);
        }, 5000);

        fetchStats();
      } catch (err) {
        console.log("Notification Error:", err);
      }
    };

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = async () => {
      console.log("SOCKET CONNECTED");

      try {
        const response = await api.get("/partner/me");

        const partner = response.data;

        console.log("REGISTERING PARTNER:", partner);

        socket.emit("register_partner", {
          partner_id: partner.id,
          name: partner.full_name,
          pincodes: partner.serviceable_pincodes || [],
        });

        console.log("PARTNER REGISTER EMITTED");
      } catch (err) {
        console.log("PARTNER REGISTER FAILED:", err);
      }
    };

    socket.off("connect", onConnect);
    socket.on("connect", onConnect);
    console.log("REGISTERING SOCKET LISTENER");

    socket.off("new_order", handleNewOrder);
    socket.on("new_order", handleNewOrder);

    return () => {
      mounted = false;

      socket.off("new_order", handleNewOrder);
      socket.off("connect", onConnect);
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    await fetchStats();

    setRefreshing(false);
  }, []);
  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (confirmed) {
        await logout();
        window.location.href = "/";
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              // Wait for state to clear
              await new Promise((resolve) => setTimeout(resolve, 150));
              router.replace("/");
            } catch (error) {
              console.error("Logout error:", error);
            }
          },
        },
      ]);
    }
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
      {notificationVisible && notificationData && (
        <TouchableOpacity
          className="absolute top-16 left-4 right-4 bg-blue-600 rounded-xl p-4 z-50"
          onPress={() => {
            setNotificationVisible(false);
            router.push("/(tabs)/marketplace");
          }}
        >
          <Text className="text-white font-bold text-base">
            New Order Available
          </Text>

          <Text className="text-white mt-1">
            {notificationData.brand} {notificationData.model}
          </Text>

          <Text className="text-blue-100 text-xs mt-2">Tap to view</Text>
        </TouchableOpacity>
      )}
      {/* Hold Notification Banner */}
      {user?.is_on_hold && (
        <HoldNotificationBanner
          reason={user.hold_reason}
          liftDate={user.hold_lift_date}
        />
      )}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0d9488"]}
          />
        }
      >
        {/* Header with Logout */}
        <View className="flex-row justify-between items-center px-6 pt-4 pb-6 bg-white border-b border-gray-200">
          <View className="flex-1">
            <Text className="text-slate-500 text-sm">Welcome back,</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">
              {user?.name || user?.email?.split("@")[0] || "Partner"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center bg-red-50 px-4 py-2 rounded-lg"
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text className="text-red-600 font-semibold ml-2">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Credit Balance Widget */}
        <View className="px-6 py-4">
          <View className="bg-teal-600 rounded-2xl p-6 shadow-sm">
            <Text className="text-teal-100 text-sm font-medium mb-1">
              AVAILABLE CREDITS
            </Text>
            <Text className="text-white text-4xl font-bold mb-1">
              {(user as any)?.credit_balance || 0}
              <Text className="text-xl text-teal-100"> CR</Text>
            </Text>
            <Text className="text-teal-100 text-xs mb-4">
              Use credits to purchase leads from marketplace
            </Text>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="bg-white rounded-xl py-3 px-6"
                activeOpacity={0.8}
                onPress={() => {
                  console.log("WALLET BUTTON CLICKED");
                  router.push("/(tabs)/wallet");
                }}
              >
                <Text className="text-teal-600 font-bold">💳 Buy Credits</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-teal-50 border border-teal-200 rounded-xl py-3 px-6 ml-5"
                activeOpacity={0.8}
                onPress={() => {
                  console.log("DASHBOARD BUTTON CLICKED");
                  router.push("/(tabs)/dashboard");
                }}
              >
                <Text className="text-teal-700 font-bold">Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Dashboard Stats */}
        <View className="px-6 py-2">
          <Text className="text-lg font-bold text-slate-900 mb-3">
            Dashboard Overview
          </Text>
          <View className="space-y-3">
            {/* Locked Deals */}
            <TouchableOpacity
              className="bg-white rounded-xl p-4 shadow-sm border border-purple-100"
              onPress={() => {
                console.log("LOCKED DEALS BUTTON CLICKED");

                router.push("/(tabs)/dashboard?tab=locked");
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="lock-closed" size={24} color="#9333ea" />
                  </View>
                  <View>
                    <Text className="text-slate-500 text-sm font-medium">
                      Locked Deals
                    </Text>
                    <Text className="text-slate-900 text-2xl font-bold">
                      {stats.locked}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {/* Purchased */}
            <TouchableOpacity
              className="bg-white rounded-xl p-4 shadow-sm border border-blue-100"
              onPress={() => router.push("/(tabs)/dashboard?tab=purchased")}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="cart" size={24} color="#2563eb" />
                  </View>
                  <View>
                    <Text className="text-slate-500 text-sm font-medium">
                      Purchased
                    </Text>
                    <Text className="text-slate-900 text-2xl font-bold">
                      {stats.purchased}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {/* In Progress */}
            <TouchableOpacity
              className="bg-white rounded-xl p-4 shadow-sm border border-amber-100"
              onPress={() => router.push("/(tabs)/dashboard?tab=in_progress")}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 bg-amber-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="time" size={24} color="#f59e0b" />
                  </View>
                  <View>
                    <Text className="text-slate-500 text-sm font-medium">
                      In Progress
                    </Text>
                    <Text className="text-slate-900 text-2xl font-bold">
                      {stats.in_progress}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {/* Completed */}
            <TouchableOpacity
              className="bg-white rounded-xl p-4 shadow-sm border border-green-100"
              onPress={() => router.push("/(tabs)/dashboard?tab=completed")}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mr-3">
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#16a34a"
                    />
                  </View>
                  <View>
                    <Text className="text-slate-500 text-sm font-medium">
                      Completed
                    </Text>
                    <Text className="text-slate-900 text-2xl font-bold">
                      {stats.completed}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4 mb-6">
          <Text className="text-lg font-bold text-slate-900 mb-3">
            Quick Actions
          </Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              className="bg-white rounded-xl p-4 flex-1 mr-2 shadow-sm items-center"
              onPress={() => {
                console.log("MARKETPLACE BUTTON CLICKED");
                router.replace("/(tabs)/marketplace");
              }}
            >
              <View className="w-12 h-12 bg-teal-100 rounded-full items-center justify-center mb-2">
                <Ionicons name="storefront" size={24} color="#0d9488" />
              </View>
              <Text className="text-slate-900 font-semibold text-sm text-center">
                Browse Leads
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-xl p-4 flex-1 ml-2 shadow-sm items-center"
              onPress={() => {
                console.log("AGENTS BUTTON CLICKED");
                router.push("/(tabs)/agents");
              }}
            >
              <View className="w-12 h-12 bg-indigo-100 rounded-full items-center justify-center mb-2">
                <Ionicons name="people" size={24} color="#4f46e5" />
              </View>
              <Text className="text-slate-900 font-semibold text-sm text-center">
                Manage Agents
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
