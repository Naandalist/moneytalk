import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabase } from '@/context/DatabaseContext';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import TransactionList from '@/components/TransactionList';
import { categoryColors } from '@/utils/categories';
import { formatCurrency } from '@/utils/formatters';

const screenWidth = Dimensions.get('window').width;

export default function StatsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { getTransactionsByPeriod, getTransactionsByCategory } = useDatabase();
  
  const [transactions, setTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [timelineData, setTimelineData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
  });
  const [period, setPeriod] = useState('week'); // 'week', 'month', 'year'
  
  useEffect(() => {
    loadData();
  }, [period]);
  
  const loadData = async () => {
    try {
      // Get transactions for the selected period
      const periodTransactions = await getTransactionsByPeriod(period);
      setTransactions(periodTransactions);
      
      // Get spending by category
      const categoryTransactions = await getTransactionsByCategory(period);
      
      // Format data for pie chart
      const pieData = categoryTransactions.map(item => ({
        name: item.category,
        amount: Math.abs(item.amount),
        color: categoryColors[item.category] || colors.accent,
        legendFontColor: colors.text,
        legendFontSize: 12
      }));
      
      setCategoryData(pieData);
      
      // Format data for line chart (simple mock data for now)
      // In a real app, you would aggregate transactions by day
      setTimelineData({
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          data: [
            Math.random() * 100,
            Math.random() * 100,
            Math.random() * 100,
            Math.random() * 100,
            Math.random() * 100,
            Math.random() * 100,
            Math.random() * 100
          ]
        }]
      });
      
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };
  
  const getTotalExpenses = () => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };
  
  const getTotalIncome = () => {
    return transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>
        Statistics
      </Text>
      
      {/* Period selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'week' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setPeriod('week')}
        >
          <Text
            style={[
              styles.periodButtonText,
              { color: period === 'week' ? colors.white : colors.textSecondary }
            ]}
          >
            Week
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'month' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setPeriod('month')}
        >
          <Text
            style={[
              styles.periodButtonText,
              { color: period === 'month' ? colors.white : colors.textSecondary }
            ]}
          >
            Month
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'year' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setPeriod('year')}
        >
          <Text
            style={[
              styles.periodButtonText,
              { color: period === 'year' ? colors.white : colors.textSecondary }
            ]}
          >
            Year
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              {formatCurrency(getTotalExpenses())}
            </Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(getTotalIncome())}
            </Text>
          </View>
        </View>
        
        {/* Category breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
        
        {categoryData.length > 0 ? (
          <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
            <PieChart
              data={categoryData}
              width={screenWidth - 32}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => colors.text,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        ) : (
          <View style={[styles.emptyChart, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
              No expense data for this period
            </Text>
          </View>
        )}
        
        {/* Timeline chart */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Timeline</Text>
        
        <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
          <LineChart
            data={timelineData}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: colors.card,
              backgroundGradientFrom: colors.card,
              backgroundGradientTo: colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(106, 90, 205, ${opacity})`,
              labelColor: (opacity = 1) => colors.text,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: colors.primary
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </View>
        
        {/* Transactions list */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Transactions
        </Text>
        
        <TransactionList transactions={transactions} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  periodButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginBottom: 8,
  },
  summaryValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 12,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyChart: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    marginBottom: 8,
  },
  emptyChartText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
});