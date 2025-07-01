import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Transaction } from '@/types/transaction';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabase } from '@/context/DatabaseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import TransactionList from '@/components/TransactionList';
import { categoryColors } from '@/utils/categories';
import { formatCurrency } from '@/utils/formatters';
import { useFocusEffect } from '@react-navigation/native';
import { NativeAdCard } from '@/components/NativeAdCard';
import { generateSuggestion } from '@/utils/suggestionGenerator';
import { convertFromUTC, getUserTimezone } from '@/utils/timezoneUtils';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

interface PieChartData {
  name: string;
  amount: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { getTransactionsByPeriod, getTransactionsByCategory, saveAISuggestion, getAISuggestion, clearAISuggestion, getRemainingRefreshes, incrementDailyRefreshCount } = useDatabase();
  const { selectedCurrency } = useCurrency();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryData, setCategoryData] = useState<PieChartData[]>([]);
  const [timelineData, setTimelineData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
  });
  const [period, setPeriod] = useState('week'); // 'week', 'month', 'year'
  const [suggestion, setSuggestion] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [remainingRefreshes, setRemainingRefreshes] = useState(3);
  const [showRefreshInfo, setShowRefreshInfo] = useState(false);

  useEffect(() => {
    loadData();
    loadSuggestion();
    loadRemainingRefreshes();
  }, [period]);

  // Add focus effect to reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
      loadSuggestion();
      loadRemainingRefreshes();
    }, [period])
  );

  /**
   * Load AI suggestion from database cache or generate new one
   * @param forceRefresh - Force generation of new suggestion
   */
  const loadSuggestion = async (forceRefresh: boolean = false) => {
    setLoadingSuggestion(true);
    try {
      if (!forceRefresh) {
        // Check for cached suggestion in database
        const cachedData = await getAISuggestion();
        if (cachedData) {
          const { suggestion, timestamp } = cachedData;
          const isCacheValid = (new Date().getTime() - timestamp) < 24 * 60 * 60 * 1000; // 24 hours
          if (isCacheValid) {
            setSuggestion(suggestion);
            setLoadingSuggestion(false);
            return;
          }
        }
      }

      // Generate new suggestion
      const thisWeekTransactions = await getTransactionsByPeriod('week');
      const lastMonthTransactions = await getTransactionsByPeriod('month');
      const newSuggestion = await generateSuggestion(thisWeekTransactions, lastMonthTransactions);

      // Save the new suggestion to database
      await saveAISuggestion(newSuggestion);
      setSuggestion(newSuggestion);
    } catch (error) {
      console.error('Error loading suggestion:', error);
      setSuggestion('Could not load suggestion.');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  /**
   * Load remaining refreshes count
   */
  const loadRemainingRefreshes = async () => {
    try {
      const remaining = await getRemainingRefreshes();
      setRemainingRefreshes(remaining);
    } catch (error) {
      console.error('Error loading remaining refreshes:', error);
    }
  };

  /**
   * Manually refresh AI suggestion with daily limit check
   */
  const handleRefreshSuggestion = async () => {
    try {
      const remaining = await getRemainingRefreshes();
      if (remaining <= 0) {
        // Show alert or toast that limit is reached
        return;
      }

      await incrementDailyRefreshCount();
      await loadSuggestion(true);
      await loadRemainingRefreshes(); // Update remaining count
    } catch (error) {
      console.error('Error refreshing suggestion:', error);
    }
  };

  const loadData = async () => {
    try {
      // Get transactions for the selected period
      const periodTransactions = await getTransactionsByPeriod(period);
      setTransactions(periodTransactions);

      // Get spending by category
      const categoryTransactions = await getTransactionsByCategory(period);

      // Format data for pie chart (expenses only)
      const pieData = categoryTransactions
        .filter(item => item.amount < 0) // Show only expenses (negative amounts)
        .map(item => ({
          name: item.category,
          amount: Math.abs(item.amount),
          color: categoryColors[item.category] || colors.accent,
          legendFontColor: colors.text,
          legendFontSize: 12
        }));

      setCategoryData(pieData);

      // Format data for line chart using real transaction data
      const timelineLabels = [];
      const timelineValues = [];

      if (period === 'week') {
        // Get last 7 days
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dayName = days[date.getDay()];
          timelineLabels.push(dayName);

          // Calculate total expenses for this day
          const dayExpenses = periodTransactions
            .filter(t => {
              // Convert UTC date to user's timezone for comparison
              const transactionDate = convertFromUTC(t.date);
              return transactionDate.toDateString() === date.toDateString() && t.type === 'expense';
            })
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

          timelineValues.push(dayExpenses);
        }
      } else if (period === 'month') {
        // Get last 4 weeks
        const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        const today = new Date();

        for (let i = 3; i >= 0; i--) {
          timelineLabels.push(weekLabels[3 - i]);

          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - (i * 7 + 6));
          const weekEnd = new Date(today);
          weekEnd.setDate(today.getDate() - (i * 7));

          const weekExpenses = periodTransactions
            .filter(t => {
              // Convert UTC date to user's timezone for comparison
              const transactionDate = convertFromUTC(t.date);
              return transactionDate >= weekStart && transactionDate <= weekEnd && t.type === 'expense';
            })
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

          timelineValues.push(weekExpenses);
        }
      } else {
        // Year view - show last 12 months
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();

        for (let i = 11; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          timelineLabels.push(monthNames[date.getMonth()]);

          const monthExpenses = periodTransactions
            .filter(t => {
              // Convert UTC date to user's timezone for comparison
              const transactionDate = convertFromUTC(t.date);
              return transactionDate.getMonth() === date.getMonth() &&
                transactionDate.getFullYear() === date.getFullYear() &&
                t.type === 'expense';
            })
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

          timelineValues.push(monthExpenses);
        }
      }

      setTimelineData({
        labels: timelineLabels,
        datasets: [{
          data: timelineValues.length > 0 && timelineValues.some(v => v > 0)
            ? timelineValues
            : [0]
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
              {formatCurrency(getTotalExpenses(), selectedCurrency.code)}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(getTotalIncome(), selectedCurrency.code)}
            </Text>
          </View>
        </View>

        {/* AI Suggestion Card */}
        <View style={styles.suggestionHeader}>
          <View style={styles.titleContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>MoneyTalk AI Suggestion</Text>
          </View>
          <View style={styles.refreshContainer}>
            <Text style={[styles.refreshCount, { color: colors.textSecondary }]}>
              {remainingRefreshes}/3
            </Text>
            <TouchableOpacity
              onPress={() => setShowRefreshInfo(!showRefreshInfo)}
              style={styles.infoButton}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRefreshSuggestion}
              disabled={loadingSuggestion || remainingRefreshes <= 0}
              style={[styles.refreshButton, { opacity: (loadingSuggestion || remainingRefreshes <= 0) ? 0.3 : 1 }]}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={remainingRefreshes <= 0 ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.suggestionCard, { backgroundColor: colors.card }]}>
          {loadingSuggestion ? (
            <Text style={{ color: colors.textSecondary }}>Loading suggestion...</Text>
          ) : (
            <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{suggestion}</Text>
          )}
          {showRefreshInfo && (
            <Text style={[styles.suggestionSubTitle, { color: colors.textSecondary }]}>-- Refreshed every 24 hours or tap refresh button (3 manual refreshes per day)</Text>
          )}
        </View>

        <NativeAdCard />
        {/* Category breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending by Category</Text>

        {categoryData.length > 0 ? (
          <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
            <PieChart
              key={`pie-chart-${isDark}`}
              data={categoryData}
              width={screenWidth - 32}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '33, 33, 33'}, ${opacity})`,
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

        {timelineData.datasets[0].data.some(value => value > 0) ? (
          <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
            <LineChart
              key={`line-chart-${isDark}`}
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
        ) : (
          <View style={[styles.emptyChart, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
              No expense data for this period
            </Text>
          </View>
        )}

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
    fontSize: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    padding: 4,
  },
  refreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshCount: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
  },
  suggestionCard: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 20,
  },
  suggestionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  suggestionSubTitle: {
    fontFamily: 'Inter-regular',
    fontSize: 10,
    marginTop: 8,
  },
  suggestionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
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