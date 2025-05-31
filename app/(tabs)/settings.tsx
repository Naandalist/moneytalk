import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Moon, Sun, Trash2, RefreshCcw, Database, Info } from 'lucide-react-native';
import { useDatabase } from '@/context/DatabaseContext';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { clearAllTransactions } = useDatabase();

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all transactions? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await clearAllTransactions();
              Alert.alert('Success', 'All transactions have been deleted.');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
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
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}
          >
            <View style={styles.settingLabelContainer}>
              <Database size={20} color={colors.primary} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Export Data</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.card }]}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}
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
            onPress={() => Alert.alert('About', 'MoneyTalk v1.0.0\nA voice-powered expense tracker.')}
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