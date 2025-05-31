import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native';

type SummaryCardProps = {
  balance: string;
  income: string;
  expenses: string;
};

export default function SummaryCard({ balance, income, expenses }: SummaryCardProps) {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceLabel, { color: colors.white }]}>
          Current Balance
        </Text>
        <Text style={[styles.balanceAmount, { color: colors.white }]}>
          {balance}
        </Text>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <ArrowUpRight size={16} color={colors.success} />
            <Text style={[styles.statLabel, { color: colors.white }]}>
              Income
            </Text>
          </View>
          <Text style={[styles.statAmount, { color: colors.white }]}>
            {income}
          </Text>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.white }]} />
        
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <ArrowDownRight size={16} color={colors.error} />
            <Text style={[styles.statLabel, { color: colors.white }]}>
              Expenses
            </Text>
          </View>
          <Text style={[styles.statAmount, { color: colors.white }]}>
            {expenses}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
  },
  balanceSection: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    opacity: 0.8,
  },
  balanceAmount: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    marginLeft: 4,
    opacity: 0.8,
  },
  statAmount: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  divider: {
    width: 1,
    marginHorizontal: 12,
    opacity: 0.2,
  },
});