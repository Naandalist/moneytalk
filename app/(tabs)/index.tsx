import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useDatabase } from '@/context/DatabaseContext';
import { useTheme } from '@/context/ThemeContext';
import TransactionCard from '@/components/TransactionCard';
import CustomNotification from '@/components/CustomNotification'; // Add this import
import { useNotification } from '@/hooks/useNotification'; // Add this import
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
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState({ income: 0, expenses: 0 });
  const { notification, hideNotification } = useNotification();

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

  const navigateToRecord = () => {
    router.push('/record');
  };

  const handleTransactionLongPress = (transaction: Transaction) => {
    // Navigate to transaction detail screen
    router.push({
      pathname: '/transaction-detail',
      params: {
        transactionId: transaction.id.toString(),
        transactionData: JSON.stringify(transaction)
      }
    });
  };

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
          balance={formatCurrency(balance.income - balance.expenses)}
          income={formatCurrency(balance.income)}
          expenses={formatCurrency(balance.expenses)}
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
});