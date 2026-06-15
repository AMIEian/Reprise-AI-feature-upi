import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface CreditPlan {
  id: number;
  plan_name: string;
  credit_amount: number;
  price: number;
  bonus_percentage: number;
  is_active: boolean;
}

interface BuyCreditsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BuyCreditsModal({ visible, onClose, onSuccess }: BuyCreditsModalProps) {
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<CreditPlan | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (visible) {
      fetchPlans();
    }
  }, [visible]);

  const fetchPlans = async () => {
    try {
      const response = await api.get<CreditPlan[]>('/partner/credit-plans');
      // Filter out inactive plans and plans with missing required fields
      setPlans(
        response.data.filter(
          (p) => p.is_active && p.credit_amount != null && p.price != null
        )
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch credit plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    setPurchasing(true);
    try {
      await api.post('/partner/purchase-credits', {
        plan_id: selectedPlan.id,
      });
      // Refresh user balance immediately
      await refreshUser();
      Alert.alert('Success', `Purchased ${selectedPlan.credit_amount} credits successfully!`, [
        {
          text: 'OK',
          onPress: () => {
            onSuccess();
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to purchase credits');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Buy Credits</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <ScrollView style={styles.plansList}>
              <Text style={styles.subtitle}>Choose a credit package</Text>
              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    selectedPlan?.id === plan.id && styles.planCardSelected,
                  ]}
                  onPress={() => setSelectedPlan(plan)}
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.plan_name}</Text>
                    {plan.bonus_percentage > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{plan.bonus_percentage}% BONUS</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.planDetails}>
                    <View>
                      <Text style={styles.creditsAmount}>
                        {(plan.credit_amount ?? 0).toLocaleString()}
                      </Text>
                      <Text style={styles.creditsLabel}>Credits</Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>
                        ₹{(plan.price ?? 0).toLocaleString()}
                      </Text>
                      <Text style={styles.pricePerCredit}>
                        ₹{((plan.price ?? 0) / (plan.credit_amount ?? 1)).toFixed(2)}/credit
                      </Text>
                    </View>
                  </View>
                  {selectedPlan?.id === plan.id && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedText}>✓ Selected</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {!loading && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  (!selectedPlan || purchasing) && styles.purchaseButtonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={!selectedPlan || purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>
                    {selectedPlan
                      ? `Purchase for ₹${(selectedPlan.price ?? 0).toLocaleString()}`
                      : 'Select a Plan'}
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
    maxHeight: '85%',
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
  plansList: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  discountBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  planDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  creditsLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  pricePerCredit: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  purchaseButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
