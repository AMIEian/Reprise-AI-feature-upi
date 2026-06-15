import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Order } from '../../types';
import { formatPrice, formatDate } from '../../utils/formatting';

export default function LeadPurchaseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [lead, setLead] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchLeadDetail();
  }, [id]);

  const fetchLeadDetail = async () => {
    try {
      const response = await api.get<Order[]>('/partner/locked-deals');
      const foundLead = response.data.find((l: any) =>
        l.id?.toString() === id ||
        l.order_id?.toString() === id
      );
      if (foundLead) {
        setLead({
          ...foundLead,
          id: foundLead.id || foundLead.order_id,
        } as Order);
      } else {
        setLead(null);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  };

  

  const handlePurchase = async () => {
    if (!lead || !user) {
      return;
    }

    const userCredits = user.credit_balance || 0;
    const leadPrice = lead.ai_estimated_price ;

    if (userCredits < leadPrice) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${formatPrice(leadPrice)} but only have ${formatPrice(userCredits)}. Please buy credits first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => router.replace('/(tabs)/wallet') },
        ]
      );
      return;
    }

    // Execute purchase directly
    setPurchasing(true);
    try {
      // Attempt purchase (lead should already be locked from locked-deals)
      const response = await api.post(`/sell-phone/partner/leads/${lead.id}/purchase`);

      await refreshUser(); // Refresh to update credit balance

      if (Platform.OS === 'web') {
        window.alert('Lead purchased successfully!');
      } else {
        Alert.alert('Success', 'Lead purchased successfully!');
      }
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || 'Failed to purchase lead';

      // Check if error is due to expired lock
      if (errorDetail.includes('active lock') || errorDetail.includes('expired')) {
        if (Platform.OS === 'web') {
          const shouldRelock = window.confirm(
            'Your lock on this lead has expired. Go to Marketplace to re-lock it?'
          );
          if (shouldRelock) {
            router.replace('/(tabs)/marketplace');
          } else {
            router.replace('/(tabs)/dashboard');
          }
        } else {
          Alert.alert(
            'Lock Expired',
            'Your lock on this lead has expired. Go to Marketplace to re-lock it?',
            [
              { text: 'Cancel', onPress: () => router.replace('/(tabs)/dashboard'), style: 'cancel' },
              { text: 'Go to Marketplace', onPress: () => router.replace('/(tabs)/marketplace') }
            ]
          );
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(errorDetail);
        } else {
          Alert.alert('Purchase Failed', errorDetail);
        }
      }
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!lead) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Lead Not Available</Text>
          <Text style={styles.errorMessage}>
            This lead may have expired or been purchased by another partner.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)/marketplace')}
          >
            <Text style={styles.backButtonText}>Browse Marketplace</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const creditCost = lead.lead_cost ;
  const remainingBalance = (user?.credit_balance || 0) - creditCost;
  const hasEnoughCredits = remainingBalance >= 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Purchase</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Purchase Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔒 Lead Summary</Text>

          <View style={styles.deviceInfo}>
            <View>
              <Text style={styles.brand}>{lead.brand}</Text>
              <Text style={styles.model}>{lead.model}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Locked</Text>
            </View>
          </View>

          <View style={styles.specs}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>RAM</Text>
              <Text style={styles.specValue}>{lead.ram_gb}GB</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Storage</Text>
              <Text style={styles.specValue}>{lead.storage_gb}GB</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Color</Text>
              <Text style={styles.specValue}>{lead.color || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Customer Preview Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Customer Location</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City:</Text>
            <Text style={styles.infoValue}>{lead.pickup_city}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pincode:</Text>
            <Text style={styles.infoValue}>{lead.pickup_pincode}</Text>
          </View>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              ℹ️ Full customer details will be revealed after purchase
            </Text>
          </View>
        </View>

        {/* Credit Balance Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 Credit Balance</Text>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceValue}>{formatPrice(user?.credit_balance || 0)}</Text>
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Lead Cost</Text>
            <Text style={styles.costValue}>- {formatPrice(creditCost)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.remainingRow}>
            <Text style={styles.remainingLabel}>Remaining Balance</Text>
            <Text
              style={[
                styles.remainingValue,
                !hasEnoughCredits && styles.remainingValueNegative,
              ]}
            >
              {formatPrice(remainingBalance)}
            </Text>
          </View>

          {!hasEnoughCredits && (
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Insufficient Credits</Text>
                <Text style={styles.warningMessage}>
                  You need {formatPrice(Math.abs(remainingBalance))} more credits to purchase this
                  lead.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Lock Timer Card */}
        {lead.locked_at && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⏱️ Lock Status</Text>

            <View style={styles.lockInfo}>
              <Text style={styles.lockLabel}>Locked at:</Text>
              <Text style={styles.lockValue}>{formatDate(lead.locked_at)}</Text>
            </View>

            <View style={styles.timerNote}>
              <Text style={styles.timerNoteText}>
                ⚡ Lock expires in 15 minutes from lock time. Purchase now to secure this lead.
              </Text>
            </View>
          </View>
        )}

        {/* Terms Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Terms & Conditions</Text>

          <View style={styles.termItem}>
            <Text style={styles.termBullet}>•</Text>
            <Text style={styles.termText}>Lead will be assigned to your account immediately</Text>
          </View>

          <View style={styles.termItem}>
            <Text style={styles.termBullet}>•</Text>
            <Text style={styles.termText}>
              Credits are non-refundable once lead is purchased
            </Text>
          </View>

          <View style={styles.termItem}>
            <Text style={styles.termBullet}>•</Text>
            <Text style={styles.termText}>
              You must assign an agent and complete pickup within specified timeframe
            </Text>
          </View>

          <View style={styles.termItem}>
            <Text style={styles.termBullet}>•</Text>
            <Text style={styles.termText}>Full customer details will be accessible post-purchase</Text>
          </View>
        </View>

        {/* Add some bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Fixed Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            router.replace('/(tabs)/dashboard');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (!hasEnoughCredits || purchasing) && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!hasEnoughCredits || purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.purchaseButtonText}>Confirm Purchase</Text>
              <Text style={styles.purchaseButtonPrice}>{formatPrice(creditCost)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIconText: {
    fontSize: 24,
    color: '#111827',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  deviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  brand: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  model: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  specs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  specItem: {
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  specValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  specDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  infoNote: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoNoteText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  costLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 16,
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  remainingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  remainingValueNegative: {
    color: '#dc2626',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 13,
    color: '#dc2626',
    lineHeight: 18,
  },
  lockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lockLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  lockValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  timerNote: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  timerNoteText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  termItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  termBullet: {
    fontSize: 16,
    color: '#6b7280',
    marginRight: 8,
    lineHeight: 20,
  },
  termText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  purchaseButtonPrice: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
