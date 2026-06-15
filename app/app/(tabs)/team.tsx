import React, { useState, useEffect } from "react";
import {
  FlatList,
  Linking,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../lib/api";
import "../../global.css";

interface Agent {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  employee_id?: string;
  is_active: boolean;
  created_at: string;
}

const Team = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [newAgent, setNewAgent] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    employee_id: "",
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await api.get("/partner/agents");
      setAgents(response.data || []);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        Alert.alert("Error", "Failed to fetch agents");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgents();
  };

  const handleAddAgent = async () => {
    if (
      !newAgent.full_name ||
      !newAgent.email ||
      !newAgent.phone ||
      !newAgent.password
    ) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    setFormLoading(true);
    try {
      await api.post("/partner/agents", {
        full_name: newAgent.full_name,
        email: newAgent.email,
        phone: newAgent.phone,
        password: newAgent.password,
        employee_id: newAgent.employee_id || undefined,
      });
      setNewAgent({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        employee_id: "",
      });
      setModalVisible(false);
      Alert.alert("Success", "Agent added successfully!");
      await fetchAgents();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.detail || "Failed to add agent",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (
    agentId: number,
    currentStatus: boolean,
  ) => {
    const action = currentStatus ? "deactivate" : "activate";
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Agent`,
      `Are you sure you want to ${action} this agent?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: currentStatus ? "destructive" : "default",
          onPress: async () => {
            try {
              await api.patch(`/partner/agents/${agentId}`, {
                is_active: !currentStatus,
              });
              await fetchAgents();
              Alert.alert("Success", `Agent ${action}d successfully`);
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.detail || `Failed to ${action} agent`,
              );
            }
          },
        },
      ],
    );
  };

  const handleCallAgent = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderAgentCard = ({ item }: { item: Agent }) => {
    const statusColor = item.is_active ? "bg-green-500" : "bg-gray-400";
    const statusLabel = item.is_active ? "Active" : "Inactive";

    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-center">
          {/* Avatar */}
          <View className="relative mr-4">
            <View className="w-14 h-14 bg-teal-100 rounded-full items-center justify-center">
              <Text className="text-2xl">
                {item.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View
              className={`absolute bottom-0 right-0 w-4 h-4 ${statusColor} border-2 border-white rounded-full`}
            />
          </View>

          {/* Agent Info */}
          <View className="flex-1">
            <Text className="text-slate-900 font-bold text-base mb-1">
              {item.full_name}
            </Text>
            <TouchableOpacity onPress={() => handleCallAgent(item.phone)}>
              <Text className="text-slate-500 text-sm mb-1">
                📞 {item.phone}
              </Text>
            </TouchableOpacity>
            <Text className="text-slate-400 text-xs mb-1">✉️ {item.email}</Text>
            {item.employee_id && (
              <Text className="text-slate-400 text-xs">
                🆔 {item.employee_id}
              </Text>
            )}
          </View>

          {/* Status Badge */}
          <View className="items-end">
            <View className={`${statusColor} px-2 py-1 rounded-full mb-2`}>
              <Text className="text-white text-xs font-bold">
                {statusLabel}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleToggleStatus(item.id, item.is_active)}
              className={`px-3 py-2 rounded-lg ${item.is_active ? "bg-red-50" : "bg-green-50"}`}
            >
              <Text
                className={`text-xs font-semibold ${item.is_active ? "text-red-600" : "text-green-600"}`}
              >
                {item.is_active ? "Deactivate" : "Activate"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="bg-white px-6 pt-4 pb-4">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-2xl font-bold text-slate-900">
              Agent Network
            </Text>
            <Text className="text-slate-500 text-sm mt-1">
              {agents.length} {agents.length === 1 ? "Agent" : "Agents"} •{" "}
              {agents.filter((a) => a.is_active).length} Active
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : (
        <>
          {/* Agent List */}
          <FlatList
            data={agents}
            renderItem={renderAgentCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#0d9488"]}
              />
            }
            ListEmptyComponent={
              <View className="bg-white rounded-2xl p-6 items-center">
                <Text className="text-slate-500 text-center mb-4">
                  No agents yet
                </Text>
                <Text className="text-slate-400 text-center text-sm">
                  Add your first agent to start managing your team
                </Text>
              </View>
            }
          />
        </>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-8 right-6 w-16 h-16 bg-teal-600 rounded-full items-center justify-center shadow-lg"
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>

      {/* Add Agent Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-900">
                Add New Agent
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Text className="text-slate-600 font-bold">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-teal-50 rounded-xl p-3 mb-6">
              <Text className="text-teal-600 text-sm font-semibold">
                Lead Assignment Ready
              </Text>
              <Text className="text-teal-600 text-xs mt-1">
                New agents will automatically receive leads based on their
                pincode coverage.
              </Text>
            </View>

            {/* Form Fields */}
            <View className="mb-4">
              <Text className="text-slate-700 font-semibold mb-2">
                Full Name <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                <TextInput
                  className="text-slate-900"
                  placeholder="e.g. Sarah Connor"
                  placeholderTextColor="#94a3b8"
                  value={newAgent.full_name}
                  onChangeText={(text) =>
                    setNewAgent({ ...newAgent, full_name: text })
                  }
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-slate-700 font-semibold mb-2">
                Email <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                <TextInput
                  className="text-slate-900"
                  placeholder="agent@example.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={newAgent.email}
                  onChangeText={(text) =>
                    setNewAgent({ ...newAgent, email: text })
                  }
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-slate-700 font-semibold mb-2">
                Phone Number <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                <TextInput
                  className="text-slate-900"
                  placeholder="98765 43210"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={newAgent.phone}
                  onChangeText={(text) =>
                    setNewAgent({ ...newAgent, phone: text })
                  }
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-slate-700 font-semibold mb-2">
                Password <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                <TextInput
                  className="text-slate-900"
                  placeholder="Min 6 characters"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={newAgent.password}
                  onChangeText={(text) =>
                    setNewAgent({ ...newAgent, password: text })
                  }
                />
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-slate-700 font-semibold mb-2">
                Employee ID
              </Text>
              <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                <TextInput
                  className="text-slate-900"
                  placeholder="Optional"
                  placeholderTextColor="#94a3b8"
                  value={newAgent.employee_id}
                  onChangeText={(text) =>
                    setNewAgent({ ...newAgent, employee_id: text })
                  }
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-4"
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
                disabled={formLoading}
              >
                <Text className="text-slate-700 font-bold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-xl py-4 ${formLoading ? "bg-gray-400" : "bg-teal-600"}`}
                onPress={handleAddAgent}
                activeOpacity={0.8}
                disabled={formLoading}
              >
                {formLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-center">
                    Save Agent →
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Team;
