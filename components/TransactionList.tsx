import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import TransactionCard from './TransactionCard';
import { Transaction } from '@/types/transaction';
import { NativeAdCard } from './NativeAdCard';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type TransactionListProps = {
  transactions: Transaction[];
  onTransactionPress?: (transaction: Transaction) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
};

export default function TransactionList({ 
  transactions, 
  onTransactionPress, 
  onLoadMore, 
  hasMore = false, 
  loading = false
}: TransactionListProps) {
  const { colors } = useTheme();
  const router = useRouter();

  /**
   * Handle transaction card press - navigate to transaction detail page
   * @param transaction - The transaction to view details for
   */
  const handleTransactionPress = (transaction: Transaction) => {
    if (onTransactionPress) {
      onTransactionPress(transaction);
    } else {
      // Default navigation behavior
      router.push({
        pathname: '/transaction-detail',
        params: {
          transactionId: transaction.id.toString(),
          transactionData: JSON.stringify(transaction)
        }
      });
    }
  };

  const renderFooter = () => {
    if (!hasMore && !loading) return null;

    return (
      <View style={styles.footerContainer}>
        {loading && (
          <ActivityIndicator 
            size="small" 
            color={colors.primary} 
            style={styles.loadingIndicator}
          />
        )}
      </View>
    );
  };

  const handleEndReached = () => {
    if (hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  };

  if (transactions.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.cardAlt }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No transactions found for this period
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <View key={`view-${index}`}>
            {((index + 1) % 3 === 0 || (transactions.length < 3 && index === 0)) && <NativeAdCard key={index} />}
            <TransactionCard
              transaction={item}
              onPress={() => handleTransactionPress(item)}
            />
          </View>
        )}
        style={styles.list}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />  
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    textAlign: 'center',
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingIndicator: {
    marginVertical: 10,
  },
});