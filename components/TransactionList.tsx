import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import TransactionCard from './TransactionCard';
import { Transaction } from '@/types/transaction';

type TransactionListProps = {
  transactions: Transaction[];
};

export default function TransactionList({ transactions }: TransactionListProps) {
  const { colors } = useTheme();
  
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
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TransactionCard
          transaction={item}
          onPress={() => {}}
        />
      )}
      style={styles.list}
      scrollEnabled={false}
    />
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
});