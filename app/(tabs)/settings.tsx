import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Moon, Sun, Trash2, RefreshCcw, Database, Info } from 'lucide-react-native';
import { useDatabase } from '@/context/DatabaseContext';
import { useNotification } from '@/hooks/useNotification';
import CustomNotification from '@/components/CustomNotification';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Transaction } from '@/types/transaction';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { clearAllTransactions, getAllTransactions } = useDatabase();
  const { notification, showWarning, showInfo, showSuccess, showError, hideNotification } = useNotification();

  const handleClearData = () => {
    showWarning(
      'Clear All Data',
      'Are you sure you want to delete all transactions? This action cannot be undone.',
      0,
      [
        {
          label: 'Cancel',
          style: 'cancel',
          onPress: () => hideNotification(),
        },
        {
          label: 'Delete',
          style: 'destructive',
          onPress: confirmClearData,
        },
      ]
    );
  };

  const confirmClearData = async () => {
    try {
      await clearAllTransactions();
      hideNotification();
      showSuccess('Success', 'All transactions have been deleted.');
    } catch (error) {
      console.error('Error clearing data:', error);
      hideNotification();
      showError('Error', 'Failed to clear data. Please try again.');
    }
  };

  const handleExportData = async () => {
    try {
      showInfo('Exporting...', 'Preparing your transaction data for export.');
      
      // Get all transactions
      const transactions = await getAllTransactions();
      
      if (transactions.length === 0) {
        hideNotification();
        showInfo('No Data', 'No transactions found to export.');
        return;
      }

      // Convert transactions to CSV format
      const csvHeader = 'ID,Date,Type,Category,Amount,Description\n';
      const csvData = transactions.map(transaction => {
        const date = new Date(transaction.date).toLocaleDateString();
        const description = (transaction.description || '').replace(/"/g, '""'); // Escape quotes
        return `${transaction.id},"${date}","${transaction.type}","${transaction.category}",${transaction.amount},"${description}"`;
      }).join('\n');
      
      const csvContent = csvHeader + csvData;
      
      // Create file path
      const fileName = `moneytalk_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      // Write CSV file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        hideNotification();
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Transaction Data',
        });
        showSuccess('Export Complete', `Successfully exported ${transactions.length} transactions.`);
      } else {
        hideNotification();
        showError('Export Failed', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Export error:', error);
      hideNotification();
      showError('Export Failed', 'Failed to export transaction data. Please try again.');
    }
  };

  const handleSyncData = () => {
    showInfo('Coming Soon', 'This feature will be available in a future update.');
  };

  const handleAbout = () => {
    showInfo('About', 'MoneyTalk v1.0.0\nA voice-powered expense tracker.\n\nCreated by Randhi Putra\nhttps://www.linkedin.com/in/randhipp/', 5000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <CustomNotification notification={notification} onClose={hideNotification} />
      <Text style={[styles.header, { color: colors.text }]}>Settings</Text>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>

          <View style={[styles.settingRow, { backgroundColor: colors.card }]}>
            <View style={styles.settingLabelContainer}>
              {isDark ? (
                <Moon size={20} color={colors.primary} style={styles.settingIcon} />
              ) : (
                <Sun size={20} color={colors.primary} style={styles.settingIcon} />
              )}
              <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.cardAlt, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.card }]}
            onPress={handleExportData}
          >
            <View style={styles.settingLabelContainer}>
              <Database size={20} color={colors.primary} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Export Data</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.card }]}
            onPress={handleSyncData}
          >
            <View style={styles.settingLabelContainer}>
              <RefreshCcw size={20} color={colors.primary} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Sync with Cloud</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.card }]}
            onPress={handleClearData}
          >
            <View style={styles.settingLabelContainer}>
              <Trash2 size={20} color={colors.error} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: colors.error }]}>Clear All Data</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.card }]}
            onPress={handleAbout}
          >
            <View style={styles.settingLabelContainer}>
              <Info size={20} color={colors.primary} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>About MoneyTalk</Text>
            </View>
          </TouchableOpacity>
        </View>
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
});