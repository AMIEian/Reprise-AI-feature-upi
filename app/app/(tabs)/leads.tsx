import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Lead = {
  id: string;
  device: string;
  specs: string;
  location: string;
  timeAgo: string;
  price: number;
  distance: number;
  badge?: string;
  image: string;
};

const Leads = () => {
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filters = ["All", "Apple", "Samsung", "< 5km", "High Value"];

  const leadsData: Lead[] = [
    {
      id: "1",
      device: "iPhone 15 Pro",
      specs: "256GB • Natural Titanium",
      location: "560061 • Bangalore",
      timeAgo: "2m ago",
      price: 82000,
      distance: 2.5,
      badge: "HOT LEAD",
      image: "📱",
    },
    {
      id: "2",
      device: "Galaxy S24 Ultra",
      specs: "512GB • Phantom Black",
      location: "560034 • Bangalore",
      timeAgo: "15m ago",
      price: 75000,
      distance: 1.2,
      badge: "NEW",
      image: "📱",
    },
    {
      id: "3",
      device: "MacBook Air M3",
      specs: "16GB RAM • 512GB SSD",
      location: "560001 • Bangalore",
      timeAgo: "1h ago",
      price: 95000,
      distance: 5.0,
      badge: "HIGH VALUE",
      image: "💻",
    },
    {
      id: "4",
      device: 'iPad Pro 12.9"',
      specs: "256GB • Space Gray",
      location: "560078 • Bangalore",
      timeAgo: "2h ago",
      price: 65000,
      distance: 3.8,
      image: "📱",
    },
    {
      id: "5",
      device: "iPhone 14 Pro Max",
      specs: "512GB • Deep Purple",
      location: "560017 • Bangalore",
      timeAgo: "3h ago",
      price: 72000,
      distance: 4.2,
      image: "📱",
    },
  ];

  const handleClaimPress = (lead: Lead) => {
    setSelectedLead(lead);
    setModalVisible(true);
  };

  const handleConfirmClaim = () => {
    setModalVisible(false);
    // Add claim logic here
    console.log("Claimed lead:", selectedLead?.device);
  };

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case "HOT LEAD":
        return "bg-orange-500";
      case "NEW":
        return "bg-blue-500";
      case "HIGH VALUE":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const renderLeadCard = ({ item }: { item: Lead }) => {
    const creditCost = Math.floor(item.price * 0.1); // 10% rule

    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row">
          {/* Left - Device Icon/Image */}
          <View className="w-16 h-16 bg-gray-100 rounded-xl items-center justify-center mr-3">
            <Text className="text-3xl">{item.image}</Text>
          </View>

          {/* Middle - Details */}
          <View className="flex-1">
            {item.badge && (
              <View
                className={`${getBadgeColor(item.badge)} px-2 py-1 rounded self-start mb-1`}
              >
                <Text className="text-white text-xs font-bold">
                  {item.badge}
                </Text>
              </View>
            )}
            <Text className="text-slate-900 font-bold text-base mb-1">
              {item.device}
            </Text>
            <Text className="text-slate-500 text-xs mb-1">{item.specs}</Text>
            <View className="flex-row items-center">
              <Text className="text-slate-400 text-xs">📍 {item.location}</Text>
              <Text className="text-slate-300 mx-1">•</Text>
              <Text className="text-slate-400 text-xs">{item.timeAgo}</Text>
            </View>
          </View>

          {/* Right - Price Badge */}
          <View className="items-end justify-center ml-2">
            <View className="bg-slate-100 px-3 py-2 rounded-lg">
              <Text className="text-slate-500 text-xs">SELL PRICE</Text>
              <Text className="text-slate-900 font-bold text-lg">
                ₹{(item.price / 1000).toFixed(0)}k
              </Text>
            </View>
            <Text className="text-slate-400 text-xs mt-1">
              {item.distance} km
            </Text>
          </View>
        </View>

        {/* Claim Button */}
        <View className="mt-3 pt-3 border-t border-gray-100">
          <TouchableOpacity
            className="bg-teal-600 rounded-xl py-3 flex-row items-center justify-center"
            activeOpacity={0.8}
            onPress={() => handleClaimPress(item)}
          >
            <Text className="text-white font-bold text-base">CLAIM NOW</Text>
            <Text className="text-white ml-2">→</Text>
          </TouchableOpacity>
          <Text className="text-slate-500 text-xs text-center mt-2">
            Cost: {creditCost.toLocaleString()} Credits
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="bg-white px-6 pt-4 pb-3">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-slate-900">Marketplace</Text>
          <View className="flex-row items-center">
            <View className="bg-teal-100 px-3 py-1 rounded-full mr-3">
              <Text className="text-teal-600 font-bold">💳 12,000</Text>
            </View>
            <TouchableOpacity className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
              <Text className="text-lg">🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="bg-gray-100 rounded-xl px-4 py-3 mb-3">
          <TextInput
            className="text-slate-900"
            placeholder="Search devices, brands, locations..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row -mx-1"
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              className={`px-4 py-2 rounded-full mr-2 ${
                selectedFilter === filter ? "bg-teal-600" : "bg-gray-100"
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`font-semibold ${
                  selectedFilter === filter ? "text-white" : "text-slate-600"
                }`}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Live Indicator */}
      <View className="flex-row items-center justify-between px-6 py-3 bg-white border-t border-gray-100">
        <Text className="text-slate-600 font-semibold">LIVE OPPORTUNITIES</Text>
        <View className="flex-row items-center">
          <View className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          <Text className="text-green-600 text-xs font-semibold">
            Updates Live
          </Text>
        </View>
      </View>

      {/* Leads List */}
      <FlatList
        data={leadsData}
        renderItem={renderLeadCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Claim Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-teal-100 rounded-full items-center justify-center mb-4">
                <Text className="text-4xl">{selectedLead?.image}</Text>
              </View>
              <Text className="text-xl font-bold text-slate-900 mb-2">
                Claim This Lead?
              </Text>
              <Text className="text-slate-600 text-center mb-1">
                {selectedLead?.device}
              </Text>
              <Text className="text-slate-500 text-sm text-center">
                {selectedLead?.location}
              </Text>
            </View>

            <View className="bg-gray-50 rounded-xl p-4 mb-6">
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-600">Credit Cost:</Text>
                <Text className="text-slate-900 font-bold">
                  {selectedLead &&
                    Math.floor(selectedLead.price * 0.1).toLocaleString()}{" "}
                  Credits
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-600">Seller Price:</Text>
                <Text className="text-slate-900 font-bold">
                  ₹{selectedLead?.price.toLocaleString()}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-600">Distance:</Text>
                <Text className="text-slate-900 font-bold">
                  {selectedLead?.distance} km away
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-4"
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text className="text-slate-700 font-bold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-teal-600 rounded-xl py-4"
                onPress={handleConfirmClaim}
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-center">
                  Confirm Claim
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Leads;
