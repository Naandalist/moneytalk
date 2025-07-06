import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Alert } from 'react-native';
import { useDatabase } from '@/context/DatabaseContext';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/context/AuthContext';
import TransactionCard from '@/components/TransactionCard';
import CustomNotification from '@/components/CustomNotification';
import { useNotification } from '@/hooks/useNotification';
import { formatCurrency } from '@/utils/formatters';
import { useEffect, useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SummaryCard from '@/components/SummaryCard';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Transaction } from '@/types/transaction';
import { NativeAdCard } from '@/components/NativeAdCard';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const { getRecentTransactions, getBalance, manualBackup } = useDatabase();
  const { colors } = useTheme();
  const { selectedCurrency, setSelectedCurrency, currencies, isOnboardingComplete, completeOnboarding } = useCurrency();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState({ income: 0, expenses: 0 });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const { notification, hideNotification, showSuccess, showError } = useNotification();

  // Animation values
  const fabAnimation = useRef(new Animated.Value(0)).current;
  const cameraButtonAnimation = useRef(new Animated.Value(0)).current;
  const recordButtonAnimation = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    const recentTransactions = await getRecentTransactions(6);
    setTransactions(recentTransactions);

    const balanceData = await getBalance();
    setBalance(balanceData);
  }, [getRecentTransactions, getBalance]);

  // Check backup reminder after transactions are loaded
  useEffect(() => {
    if (transactions.length >= 0) { // Check even when 0 to handle initial state
      checkBackupReminder();
    }
  }, [transactions]);

  /**
   * Check if backup reminder should be shown
   * Shows reminder if no backup in last 7 days or never backed up
   */
  const checkBackupReminder = async () => {
    try {
      const lastBackup = await AsyncStorage.getItem('lastBackupDate');
      const dismissedUntil = await AsyncStorage.getItem('backupReminderDismissedUntil');
      
      setLastBackupDate(lastBackup);
      
      // Check if reminder is currently dismissed
      if (dismissedUntil) {
        const dismissedUntilTime = new Date(dismissedUntil).getTime();
        const now = new Date().getTime();
        if (now < dismissedUntilTime) {
          setShowBackupReminder(false);
          return;
        }
      }
      
      if (!lastBackup) {
        // Never backed up - show reminder after first transaction
        if (transactions.length > 0) {
          setShowBackupReminder(true);
        }
        return;
      }
      
      const lastBackupTime = new Date(lastBackup).getTime();
      const now = new Date().getTime();
      const daysSinceBackup = (now - lastBackupTime) / (1000 * 60 * 60 * 24);
      
      // Show reminder if more than 7 days since last backup
      setShowBackupReminder(daysSinceBackup > 7);
    } catch (error) {
      console.error('Error checking backup reminder:', error);
      // Only show reminder on error if user has transactions
      setShowBackupReminder(transactions.length > 0);
    }
  };

  /**
   * Handle manual backup operation
   */
  const handleManualBackup = async () => {
    try {
      setIsBackingUp(true);
      const success = await manualBackup();
      
      if (success) {
        const now = new Date().toISOString();
        await AsyncStorage.setItem('lastBackupDate', now);
        setLastBackupDate(now);
        setShowBackupReminder(false);
        
        showSuccess(
          'Backup Completed!',
          'Your data has been successfully backed up to device storage.',
          3000
        );
      } else {
        showError(
          'Backup Failed',
          'Unable to create backup. Please try again later.',
          3000
        );
      }
    } catch (error) {
      console.error('Backup error:', error);
      showError(
        'Backup Error',
        'An error occurred during backup. Please try again.',
        3000
      );
    } finally {
      setIsBackingUp(false);
    }
  };

  /**
   * Dismiss backup reminder for 24 hours
   */
  const dismissBackupReminder = async () => {
    try {
      const dismissUntil = new Date();
      dismissUntil.setHours(dismissUntil.getHours() + 24);
      await AsyncStorage.setItem('backupReminderDismissedUntil', dismissUntil.toISOString());
      setShowBackupReminder(false);
    } catch (error) {
      console.error('Error dismissing backup reminder:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Clear data when user logs out
  useEffect(() => {
    if (user === null) {
      setTransactions([]);
      setBalance({ income: 0, expenses: 0 });
      setLastBackupDate(null);
      setShowBackupReminder(false);
    }
  }, [user]);

  useEffect(() => {
    // Show onboarding if not completed
    if (!isOnboardingComplete) {
      setShowOnboarding(true);
    }
  }, [isOnboardingComplete]);

  const toggleFabMenu = () => {
    const toValue = isFabExpanded ? 0 : 1;

    Animated.parallel([
      Animated.spring(fabAnimation, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.stagger(50, [
        Animated.spring(recordButtonAnimation, {
          toValue,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(cameraButtonAnimation, {
          toValue,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]),
    ]).start();

    setIsFabExpanded(!isFabExpanded);
  };

  const collapseFabMenu = () => {
    Animated.parallel([
      Animated.spring(fabAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(recordButtonAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(cameraButtonAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    setIsFabExpanded(false);
  };

  const handleTransactionLongPress = (transaction: Transaction) => {
    router.push({
      pathname: '/transaction-detail',
      params: {
        transactionId: transaction.id.toString(),
        transactionData: JSON.stringify(transaction)
      }
    });
  };

  const handleCurrencySelect = async (currency: typeof currencies[0]) => {
    await setSelectedCurrency(currency);
    await completeOnboarding();
    setShowOnboarding(false);
    showSuccess(
      'Welcome to MoneyTalk!',
      `You have selected ${currency.name} (${currency.symbol}) as your default currency. You can change this anytime in settings.`,
      4000
    );
  };

  const renderOnboardingModal = () => (
    <Modal
      visible={showOnboarding}
      transparent={true}
      animationType="fade"
      onRequestClose={() => { }} // Prevent closing
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome to MoneyTalk!</Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
            Your voice-powered finance tracker
          </Text>

          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Your Currency</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Choose your preferred currency for transactions
          </Text>

          <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
            {currencies.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={[styles.currencyItem, { borderBottomColor: colors.border }]}
                onPress={() => handleCurrencySelect(currency)}
              >
                <View style={styles.currencyInfo}>
                  <Text style={[styles.currencySymbol, { color: colors.primary }]}>
                    {currency.symbol}
                  </Text>
                  <View style={styles.currencyDetails}>
                    <Text style={[styles.currencyName, { color: colors.text }]}>
                      {currency.name}
                    </Text>
                    <Text style={[styles.currencyCode, { color: colors.textSecondary }]}>
                      {currency.code}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Money<Text style={{ color: colors.primary }}>Talk</Text>
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your voice-powered finance tracker
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SummaryCard
          balance={formatCurrency(balance.income - balance.expenses, selectedCurrency.code)}
          income={formatCurrency(balance.income, selectedCurrency.code)}
          expenses={formatCurrency(balance.expenses, selectedCurrency.code)}
        />

        {/* Backup Reminder Card */}
        {showBackupReminder && (
          <View style={[styles.backupReminderCard, { backgroundColor: colors.cardAlt, borderColor: colors.primary }]}>
            <View style={styles.backupReminderHeader}>
              <Text style={[styles.backupReminderIcon, { color: colors.primary }]}>🛡️</Text>
              <View style={styles.backupReminderContent}>
                <Text style={[styles.backupReminderTitle, { color: colors.text }]}>Backup Reminder</Text>
                <Text style={[styles.backupReminderSubtitle, { color: colors.textSecondary }]}>
                  {lastBackupDate 
                    ? `Last backup: ${new Date(lastBackupDate).toLocaleDateString()}`
                    : 'No backup found. Protect your data!'}
                </Text>
              </View>
            </View>
            <Text style={[styles.backupReminderDescription, { color: colors.textSecondary }]}>
              Regular backups protect your financial data from device issues or app updates.
            </Text>
            <View style={styles.backupReminderActions}>
              <TouchableOpacity
                style={[styles.backupButton, { backgroundColor: colors.primary }]}
                onPress={handleManualBackup}
                disabled={isBackingUp}
              >
                <Text style={[styles.backupButtonText, { color: '#FFFFFF' }]}>
                  {isBackingUp ? 'Backing up...' : 'Backup Now'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dismissButton, { borderColor: colors.border }]}
                onPress={dismissBackupReminder}
                disabled={isBackingUp}
              >
                <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.transactionsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/stats')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {transactions.length > 0 ? (
          transactions.map((transaction, index) => (
            <View key={`view-${transaction.id.toString()}`}>
              {((index + 1) % 3 === 0 || (transactions.length < 3 && index === 0)) && <NativeAdCard key={`ads-${transaction.id.toString()}`} />}
              <TransactionCard
                key={transaction.id.toString()}
                transaction={transaction}
                onPress={() => handleTransactionLongPress(transaction)}
                onLongPress={() => handleTransactionLongPress(transaction)}
              />
            </View>
          ))
        ) : (
          <View key={'view-ads-empty'}>
            <NativeAdCard key={'ads-empty'} />
            <View style={[styles.emptyState, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No transactions yet. Tap the record button to add your first transaction!
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <CustomNotification notification={notification} onClose={hideNotification} />
      {renderOnboardingModal()}
    </View>
  );
}

// Add these styles to the existing StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  seeAll: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  emptyState: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyStateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  expandedFabButton: {
    position: 'absolute', // Position absolutely to overlay on main FAB
    bottom: 0, // Start from the same position as main FAB
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  secondaryFab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  welcomeTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  currencyList: {
    maxHeight: 300,
  },
  currencyItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    width: 40,
    textAlign: 'center',
    marginRight: 16,
  },
  currencyDetails: {
    flex: 1,
  },
  currencyName: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  currencyCode: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginTop: 2,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end', // Align items to bottom
  },
  // Backup Reminder Card Styles
  backupReminderCard: {
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backupReminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backupReminderIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  backupReminderContent: {
    flex: 1,
  },
  backupReminderTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 2,
  },
  backupReminderSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  backupReminderDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  backupReminderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  backupButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backupButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
});
