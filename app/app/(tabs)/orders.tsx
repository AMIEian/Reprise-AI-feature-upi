import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Linking, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

type OrderStatus =
  | "out_for_pickup"
  | "testing"
  | "payment_pending"
  | "completed"
  | "cancelled";
type TabType = "Active" | "Completed" | "Cancelled";

interface Order {
  id: string;
  device: string;
  specs: string;
  customerName: string;
  customerPhone: string;
  assignedAgent: string;
  status: OrderStatus;
  price: number;
  location: string;
  orderDate: string;
  icon: string;
}

const Orders = () => {
  const [selectedTab, setSelectedTab] = useState<TabType>("Active");
  const router = useRouter();

  const tabs: TabType[] = ["Active", "Completed", "Cancelled"];

  const ordersData: Order[] = [
    {
      id: "ORD-001",
      device: "iPhone 15 Pro",
      specs: "256GB • Natural Titanium",
      customerName: "Priya Sharma",
      customerPhone: "+91 98765 43210",
      assignedAgent: "Rahul Kumar",
      status: "out_for_pickup",
      price: 82000,
      location: "Koramangala, Bangalore",
      orderDate: "2h ago",
      icon: "📱",
    },
    {
      id: "ORD-002",
      device: "MacBook Air M3",
      specs: "16GB RAM • 512GB SSD",
      customerName: "Amit Patel",
      customerPhone: "+91 98765 43211",
      assignedAgent: "Sneha Reddy",
      status: "testing",
      price: 95000,
      location: "Whitefield, Bangalore",
      orderDate: "5h ago",
      icon: "💻",
    },
    {
      id: "ORD-003",
      device: "Galaxy S24 Ultra",
      specs: "512GB • Phantom Black",
      customerName: "Ravi Verma",
      customerPhone: "+91 98765 43212",
      assignedAgent: "Arjun Singh",
      status: "payment_pending",
      price: 75000,
      location: "Indiranagar, Bangalore",
      orderDate: "1d ago",
      icon: "📱",
    },
    {
      id: "ORD-004",
      device: "iPhone 14 Pro Max",
      specs: "512GB • Deep Purple",
      customerName: "Kavya Nair",
      customerPhone: "+91 98765 43213",
      assignedAgent: "Vikram Joshi",
      status: "completed",
      price: 72000,
      location: "HSR Layout, Bangalore",
      orderDate: "2d ago",
      icon: "📱",
    },
    {
      id: "ORD-005",
      device: 'iPad Pro 12.9"',
      specs: "256GB • Space Gray",
      customerName: "Suresh Menon",
      customerPhone: "+91 98765 43214",
      assignedAgent: "Priya Iyer",
      status: "cancelled",
      price: 65000,
      location: "Jayanagar, Bangalore",
      orderDate: "3d ago",
      icon: "📱",
    },
  ];

  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case "out_for_pickup":
        return { label: "Out for Pickup", color: "bg-yellow-500" };
      case "testing":
        return { label: "Testing In Progress", color: "bg-green-500" };
      case "payment_pending":
        return { label: "Payment Pending", color: "bg-orange-500" };
      case "completed":
        return { label: "Completed", color: "bg-blue-500" };
      case "cancelled":
        return { label: "Cancelled", color: "bg-red-500" };
      default:
        return { label: "Unknown", color: "bg-gray-500" };
    }
  };

  const filterOrders = (orders: Order[], tab: TabType) => {
    switch (tab) {
      case "Active":
        return orders.filter((o) =>
          ["out_for_pickup", "testing", "payment_pending"].includes(o.status),
        );
      case "Completed":
        return orders.filter((o) => o.status === "completed");
      case "Cancelled":
        return orders.filter((o) => o.status === "cancelled");
      default:
        return orders;
    }
  };

  const handleCallCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleTrackAgent = (agentName: string) => {
    // Placeholder for tracking functionality
    console.log("Track agent:", agentName);
  };

  const handleStartDiagnostic = (orderId: string) => {
    router.push(`/diagnostic/${orderId}`);
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    const statusInfo = getStatusInfo(item.status);
    const isActive = selectedTab === "Active";

    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        {/* Header */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-row items-center flex-1">
            <View className="w-14 h-14 bg-gray-100 rounded-xl items-center justify-center mr-3">
              <Text className="text-2xl">{item.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 font-bold text-base mb-1">
                {item.device}
              </Text>
              <Text className="text-slate-500 text-xs mb-1">{item.specs}</Text>
              <Text className="text-slate-400 text-xs">{item.orderDate}</Text>
            </View>
          </View>
          <View className={`${statusInfo.color} px-3 py-1 rounded-full`}>
            <Text className="text-white text-xs font-bold">
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View className="bg-gray-50 rounded-xl p-3 mb-3">
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-600 text-sm">Order ID:</Text>
            <Text className="text-slate-900 font-semibold text-sm">
              {item.id}
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-600 text-sm">Customer:</Text>
            <Text className="text-slate-900 font-semibold text-sm">
              {item.customerName}
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-600 text-sm">Assigned to:</Text>
            <Text className="text-teal-600 font-semibold text-sm">
              👤 {item.assignedAgent}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-600 text-sm">Location:</Text>
            <Text className="text-slate-900 font-semibold text-sm">
              📍 {item.location}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-2 mb-3">
          <TouchableOpacity
            className="flex-1 bg-blue-100 rounded-xl py-3 flex-row items-center justify-center"
            onPress={() => handleCallCustomer(item.customerPhone)}
            activeOpacity={0.7}
          >
            <Text className="text-blue-600 font-semibold text-sm">
              📞 Call Customer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-purple-100 rounded-xl py-3 flex-row items-center justify-center"
            onPress={() => handleTrackAgent(item.assignedAgent)}
            activeOpacity={0.7}
          >
            <Text className="text-purple-600 font-semibold text-sm">
              📍 Track Agent
            </Text>
          </TouchableOpacity>
        </View>

        {/* Diagnostic Button (Active Orders Only) */}
        {isActive && (
          <TouchableOpacity
            className="bg-teal-600 rounded-xl py-4 flex-row items-center justify-center"
            onPress={() => handleStartDiagnostic(item.id)}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-base">
              🔍 Start Diagnostic Check
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const filteredOrders = filterOrders(ordersData, selectedTab);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="bg-white px-6 pt-4 pb-3">
        <Text className="text-2xl font-bold text-slate-900 mb-4">
          My Orders
        </Text>

        {/* Status Tabs */}
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              className={`flex-1 py-2 rounded-lg ${
                selectedTab === tab ? "bg-white shadow-sm" : ""
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-center font-semibold ${
                  selectedTab === tab ? "text-teal-600" : "text-slate-500"
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-6xl mb-4">📦</Text>
          <Text className="text-slate-900 font-bold text-lg mb-2">
            No {selectedTab} Orders
          </Text>
          <Text className="text-slate-500 text-center">
            You don&apos;t have any {selectedTab.toLowerCase()} orders at the
            moment.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Orders;
