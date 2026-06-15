import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import api from "../../lib/api";
import { Order } from "../../types";
import { formatPrice } from "../../utils/formatting";
import EmptyState from "../../components/EmptyState";
import "../../global.css";

export default function MarketplaceScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeads = async () => {
    try {
      const response = await api.get("/sell-phone/partner/leads/available");
      const mappedLeads = response.data.map((lead: any) => ({
        ...lead,
        id: lead.order_id,
      }));
      setLeads(mappedLeads);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        Alert.alert("Error", "Failed to fetch marketplace leads");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeads();
  }, []);

  const handleLockLead = async (orderId: number) => {
    // Direct execution without confirmation for testing
    if (actionLoading) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await api.post(
        `/sell-phone/partner/leads/${orderId}/lock`,
      );
      await fetchLeads();

      Alert.alert(
        "Success",
        "Lead locked successfully! You have 15 minutes to purchase it.",
        [
          {
            text: "View Locked Lead",
            onPress: () => router.push(`/lead-detail/${orderId}?source=locked`),
          },
          {
            text: "OK",
            style: "cancel",
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.detail || "Failed to lock lead",
      );
    } finally {
      setActionLoading(false);
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
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-6 py-4">
        <Text className="text-2xl font-bold text-slate-900">Marketplace</Text>
        <Text className="text-sm text-slate-500 mt-1">
          {leads.length} live leads available for purchase
        </Text>
      </View>

      {/* Leads List */}
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
        {leads.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No Leads Available"
            message="Check back later for new leads in the marketplace."
          />
        ) : (
          <View className="px-6 py-4">
            {leads.map((lead) => (
              <View key={lead.id} className="mb-4">
                <LeadCard
                  lead={lead}
                  onLock={handleLockLead}
                  actionLoading={actionLoading}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LeadCard({
  lead,
  onLock,
  actionLoading,
}: {
  lead: Order;
  onLock: (id: number) => void;
  actionLoading: boolean;
}) {
  const router = useRouter();
  const isNewLead = new Date(lead.created_at).getTime() > Date.now() - 3600000; // 1 hour

  return (
    <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
      {/* Badge */}
      {isNewLead && (
        <View className="absolute top-3 right-3">
          <View className="bg-green-100 px-3 py-1 rounded-full">
            <Text className="text-green-700 font-semibold text-xs">NEW</Text>
          </View>
        </View>
      )}

      {/* Device Info */}
      <View className="mb-4">
        <Text className="text-lg font-bold text-slate-900">
          {lead.brand} {lead.model}
        </Text>
        <Text className="text-sm text-slate-500 mt-1">
          {lead.ram_gb}GB RAM • {lead.storage_gb}GB Storage
        </Text>
      </View>

      {/* Price */}
      <View className="mb-4">
        <Text className="text-xs text-slate-500 mb-1">Estimated Value</Text>
        <Text className="text-3xl font-bold text-green-600">
          {formatPrice(lead.quoted_price)}
        </Text>
      </View>
      {/* Lead Cost */}
      {lead.lead_cost && (
        <View className="mb-4">
          <Text className="text-xs text-slate-500 mb-1">Lead Cost</Text>
          <Text className="text-xl font-bold text-orange-600">
            {formatPrice(lead.lead_cost)}
          </Text>
        </View>
      )}

      {/* Location */}
      <View className="mb-4 p-3 bg-gray-50 rounded-lg">
        <View className="flex-row items-center mb-2">
          <Text className="text-sm font-medium text-slate-700">
            📍 Pickup Location
          </Text>
        </View>
        <Text className="text-sm text-slate-600">
          {lead.pickup_city}, {lead.pickup_state} - {lead.pickup_pincode}
        </Text>
      </View>

      {/* Customer Info */}
      <View className="mb-4">
        <Text className="text-xs text-slate-500 mb-1">Customer</Text>
        <Text className="text-sm font-medium text-slate-700">
          {lead.customer_name}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 bg-gray-100 rounded-xl py-3 items-center"
          onPress={() =>
            router.push(`/lead-detail/${lead.id}?source=marketplace`)
          }
          activeOpacity={0.8}
        >
          <Text className="text-gray-700 font-semibold text-base">
            View Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-teal-600 rounded-xl py-3 items-center"
          onPress={() => onLock(lead.id)}
          disabled={actionLoading}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-base">
            {actionLoading ? "Locking..." : "Lock Lead"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
