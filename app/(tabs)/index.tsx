import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useDatabase } from '@/context/DatabaseContext';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import TransactionCard from '@/components/TransactionCard';
import CustomNotification from '@/components/CustomNotification';
import { useNotification } from '@/hooks/useNotification';
import { formatCurrency } from '@/utils/formatters';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CirclePlus as PlusCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import SummaryCard from '@/components/SummaryCard';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Transaction } from '@/types/transaction';

export default function HomeScreen() {
  const { getRecentTransactions, getBalance } = useDatabase();
  const { colors } = useTheme();
  const { selectedCurrency, setSelectedCurrency, currencies, isOnboardingComplete, completeOnboarding } = useCurrency();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState({ income: 0, expenses: 0 });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { notification, hideNotification, showSuccess } = useNotification();

  const loadData = useCallback(async () => {
    const recentTransactions = await getRecentTransactions(5);
    setTransactions(recentTransactions);

    const balanceData = await getBalance();
    setBalance(balanceData);
  }, [getRecentTransactions, getBalance]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    // Show onboarding if not completed
    if (!isOnboardingComplete) {
      setShowOnboarding(true);
    }
  }, [isOnboardingComplete]);

  const navigateToRecord = () => {
    router.push('/record');
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

        <View style={styles.transactionsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/stats')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <TransactionCard
              key={transaction.id.toString()}
              transaction={transaction}
              onPress={() => handleTransactionLongPress(transaction)}
              onLongPress={() => handleTransactionLongPress(transaction)}
            />
          ))
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.cardAlt }]}>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No transactions yet. Tap the record button to add your first transaction!
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={navigateToRecord}
      >
        <PlusCircle color={colors.white} size={28} />
      </TouchableOpacity>

      <CustomNotification notification={notification} onClose={hideNotification} />
      {renderOnboardingModal()}
    </View>
  );
}

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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
});