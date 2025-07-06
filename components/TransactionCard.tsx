import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getCategoryIcon } from '@/utils/categories';
import { Transaction } from '@/types/transaction';

type TransactionCardProps = {
  transaction: Transaction;
  onPress: (transaction: Transaction) => void;
  onLongPress?: (transaction: Transaction) => void;
};

export default function TransactionCard({ transaction, onPress, onLongPress }: TransactionCardProps) {
  const { colors } = useTheme();
  const { selectedCurrency } = useCurrency();
  const CategoryIcon = getCategoryIcon(transaction.category);

  

  const isExpense = transaction.type === 'expense';
  const amountColor = isExpense ? colors.error : colors.success;
  const amountPrefix = isExpense ? '-' : '+';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onPress(transaction)}
      onLongPress={() => onLongPress?.(transaction)}
      delayLongPress={500}
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

      <View style={styles.rightSection}>
        {transaction.imageUrl && (
          <View style={[styles.imagePreview, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>📷</Text>
          </View>
        )}
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountPrefix}{formatCurrency(Math.abs(transaction.amount), selectedCurrency.code)}
        </Text>
      </View>
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
  rightSection: {
    alignItems: 'flex-end',
  },
  imagePreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
  },
  amount: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
});