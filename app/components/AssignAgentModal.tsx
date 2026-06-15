import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import api from '../lib/api';
import { Agent } from '../types';

interface AssignAgentModalProps {
  visible: boolean;
  orderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignAgentModal({
  visible,
  orderId,
  onClose,
  onSuccess,
}: AssignAgentModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchAgents();
    }
  }, [visible]);

  const fetchAgents = async () => {
    try {
      const response = await api.get<Agent[]>('/partner/agents');
      // Filter only active agents
      setAgents(response.data.filter((a) => a.is_active));
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAgent) return;

    setAssigning(true);
    try {
      // Use query parameter format as per backend API
      await api.post(`/partner/orders/${orderId}/assign?agent_id=${selectedAgent.id}`);

      if (Platform.OS === 'web') {
        window.alert(`Order assigned to ${selectedAgent.full_name || selectedAgent.name}`);
        onSuccess();
        onClose();
      } else {
        Alert.alert('Success', `Order assigned to ${selectedAgent.full_name || selectedAgent.name}`, [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to assign agent';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Assign Agent</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : agents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No Active Agents</Text>
              <Text style={styles.emptyText}>
                Please add and activate agents before assigning orders.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.agentsList} showsVerticalScrollIndicator={false}>
              <Text style={styles.subtitle}>Select an agent to assign this order</Text>
              {agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  style={[
                    styles.agentCard,
                    selectedAgent?.id === agent.id && styles.agentCardSelected,
                  ]}
                  onPress={() => setSelectedAgent(agent)}
                >
                  <View style={styles.agentAvatar}>
                    <Text style={styles.agentAvatarText}>
                      {(agent.full_name || agent.name || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.agentInfo}>
                    <Text style={styles.agentName}>{agent.full_name || agent.name}</Text>
                    <Text style={styles.agentDetails}>
                      📱 {agent.phone}
                    </Text>
                    <Text style={styles.agentEmail}>{agent.email}</Text>
                  </View>
                  {selectedAgent?.id === agent.id && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {!loading && agents.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.assignButton,
                  (!selectedAgent || assigning) && styles.assignButtonDisabled,
                ]}
                onPress={handleAssign}
                disabled={!selectedAgent || assigning}
              >
                {assigning ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.assignButtonText}>
                    {selectedAgent ? 'Assign Order' : 'Select Agent'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: '#6b7280',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  agentsList: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  agentCardSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  agentDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  agentEmail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  selectedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  assignButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  assignButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  assignButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
