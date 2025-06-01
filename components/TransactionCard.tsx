import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getCategoryIcon } from '@/utils/categories';
import { Transaction } from '@/types/transaction';

type TransactionCardProps = {
  transaction: Transaction;
  onPress: (transaction: Transaction) => void;
  onLongPress?: (transaction: Transaction) => void; // Add this line
};

export default function TransactionCard({ transaction, onPress, onLongPress }: TransactionCardProps) {
  const { colors } = useTheme();
  const CategoryIcon = getCategoryIcon(transaction.category);

  const isExpense = transaction.type === 'expense';
  const amountColor = isExpense ? colors.error : colors.success;
  const amountPrefix = isExpense ? '-' : '+';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onPress(transaction)}
      onLongPress={() => onLongPress?.(transaction)} // Add this line
      delayLongPress={500} // Add this line
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.cardAlt }]}>
        <CategoryIcon size={24} color={colors.primary} />
      </View>

      <View style={styles.details}>
        <Text style={[styles.category, { color: colors.text }]}>
          {transaction.category}
        </Text>
        {transaction.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {transaction.description}
          </Text>
        )}
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {formatDate(transaction.date)}
        </Text>
      </View>

      <Text style={[styles.amount, { color: amountColor }]}>
        {amountPrefix}{formatCurrency(Math.abs(transaction.amount))}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  category: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  date: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginTop: 4,
  },
  amount: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
});