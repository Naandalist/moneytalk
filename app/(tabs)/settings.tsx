import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Moon, Sun, Trash2, RefreshCcw, Database, Info, LogOut, User, Mail } from 'lucide-react-native';
import { useDatabase } from '@/context/DatabaseContext';
import { useNotification } from '@/hooks/useNotification';
import CustomNotification from '@/components/CustomNotification';
import Constants from 'expo-constants';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/AuthModal';

import { NativeAdCard } from '@/components/NativeAdCard';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, session, signOut, loading: authLoading } = useAuth();
  const {
    clearAllTransactions,
    restoreBackup,
    getCloudSyncStatus,
    isCloudBackupEnabled,
    cloudBackupData,
    cloudRestoreData,
    enableAutoSync
  } = useDatabase();

  const { notification, showWarning, showInfo, showSuccess, showError, hideNotification } = useNotification();
  const [isRestoring, setIsRestoring] = useState(false);
  const [showBackupList, setShowBackupList] = useState(false);
  const [backupFiles, setBackupFiles] = useState<{ transactions: string[], settings: string[] }>({ transactions: [], settings: [] });
  const [selectedTransactionBackup, setSelectedTransactionBackup] = useState<string | undefined>();
  const [selectedSettingsBackup, setSelectedSettingsBackup] = useState<string | undefined>();
  const [dbInfo, setDbInfo] = useState<any>(null);

  // Add these state variables in your SettingsScreen component
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<any>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Authentication modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Add these methods
  const loadCloudSyncStatus = async () => {
    try {
      const status = await getCloudSyncStatus();
      setCloudSyncStatus(status);
      const enabled = await isCloudBackupEnabled();
      setCloudSyncEnabled(enabled);
    } catch (error) {
      console.error('Error loading cloud sync status:', error);
    }
  };

  const handleCloudBackup = async () => {
    setIsCloudSyncing(true);
    try {
      const result = await cloudBackupData();
      if (result.success) {
        showSuccess('Cloud Backup Complete', result.message, 2000);
        await loadCloudSyncStatus();
      } else {
        showError('Cloud Backup Failed', result.message);
      }
    } catch (error) {
      showError('Cloud Backup Failed', (error as Error).message);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleCloudRestore = async () => {
    Alert.alert(
      'Restore from Cloud',
      'This will replace your current data with data from cloud backup. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setIsCloudSyncing(true);
            try {
              const result = await cloudRestoreData();
              if (result.success) {
                showSuccess('Cloud Restore Complete', result.message, 2000);
                await loadCloudSyncStatus();
              } else {
                showError('Cloud Restore Failed', result.message);
              }
            } catch (error) {
              showError('Cloud Restore Failed', (error as Error).message);
            } finally {
              setIsCloudSyncing(false);
            }
          },
        },
      ]
    );
  };

  const toggleCloudSync = async (enabled: boolean) => {
    try {
      await enableAutoSync(enabled);
      setCloudSyncEnabled(enabled);

      if (enabled) {
        // Perform initial backup when enabling
        await handleCloudBackup();
      }

      showSuccess(
        'Auto Sync Updated',
        `Cloud auto-sync has been ${enabled ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      showError('Settings Error', 'Failed to update auto-sync setting');
    }
  };

  // Add useEffect to load cloud sync status
  useEffect(() => {
    loadCloudSyncStatus();
  }, []);

  /**
   * Handle user logout with confirmation
   */
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await signOut();
              showSuccess('Signed Out', 'You have been successfully signed out.', 2000);
            } catch (error) {
              showError('Sign Out Failed', 'Failed to sign out. Please try again.', 2000);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    showSuccess('Welcome!', 'You have been successfully signed in.', 2000);
  };

  /**
   * Show login/register modal
   */
  const handleShowAuth = () => {
    setShowAuthModal(true);
  };

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
      showSuccess('Success', 'All transactions have been deleted.', 2000);
    } catch (error) {
      console.error('Error clearing data:', error);
      hideNotification();
      showError('Error', 'Failed to clear data. Please try again.');
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedTransactionBackup && !selectedSettingsBackup) {
      showError('Selection Required', 'Please select at least one backup file to restore');
      return;
    }

    Alert.alert(
      'Restore Backup',
      'This will replace your current data with the selected backup. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const success = await restoreBackup(selectedTransactionBackup, selectedSettingsBackup);
              if (success) {
                showSuccess('Restore Complete', 'Backup restored successfully!');
                setShowBackupList(false);
                setSelectedTransactionBackup(undefined);
                setSelectedSettingsBackup(undefined);
              } else {
                showError('Restore Failed', 'Failed to restore backup');
              }
            } catch (error) {
              showError('Restore Failed', 'Restore failed: ' + (error as Error).message);
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Formats backup file names to display human-readable dates
   * Handles filenames like "transactions_backup_2024-01-15T10-30-45-123Z.db"
   */
  const formatBackupFileName = (fileName: string) => {
    // Extract timestamp from filename
    const match = fileName.match(/_backup_(.+)\.db$/);
    if (match) {
      let timestamp = match[1];

      // Convert filename timestamp format to ISO format
      // Replace hyphens in time part only (after T), keep date hyphens
      const parts = timestamp.split('T');
      if (parts.length === 2) {
        const datePart = parts[0]; // Keep date format: 2024-01-15
        const timePart = parts[1].replace(/-/g, ':').replace(/Z$/, ''); // Convert time: 10:30:45:123 -> 10:30:45.123

        // Handle milliseconds format
        const timeWithMs = timePart.replace(/:([0-9]{3})$/, '.$1');
        timestamp = `${datePart}T${timeWithMs}Z`;
      }

      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          return fileName; // Return original if date is invalid
        }

        // Format for Indonesia timezone (GMT+7)
        return date.toLocaleString('en-US', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch {
        return fileName;
      }
    }
    return fileName;
  };

  const handleAbout = () => {
    const appVersion = Constants.expoConfig?.version || '1.1.0';
    const website = Constants.expoConfig?.extra?.website || 'https://moneytalk.space/';
    showInfo('About', `MoneyTalk v${appVersion}\nA voice-powered expense tracker.\n${website}`, 5000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <CustomNotification notification={notification} onClose={hideNotification} />
      <Text style={[styles.header, { color: colors.text }]}>Settings</Text>

      <ScrollView style={styles.scrollView}>
        {/* User Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>

          {user ? (
            // Logged in user info
            <>
              <View style={[styles.settingRow, { backgroundColor: colors.card }]}>
                <View style={styles.settingLabelContainer}>
                  <User size={20} color={colors.primary} style={styles.settingIcon} />
                  <View style={styles.userInfoContainer}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Signed in as</Text>
                    <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.settingRow, { backgroundColor: colors.card }]}
                onPress={handleLogout}
                disabled={isLoggingOut}
              >
                <View style={styles.settingLabelContainer}>
                  <LogOut size={20} color={colors.error} style={styles.settingIcon} />
                  <Text style={[styles.settingLabel, { color: colors.error }]}>
                    {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                  </Text>
                </View>
                {isLoggingOut && <ActivityIndicator size="small" color={colors.error} />}
              </TouchableOpacity>
            </>
          ) : (
            // Not logged in - show login/register button
            <TouchableOpacity
              style={[styles.settingRow, { backgroundColor: colors.card }]}
              onPress={handleShowAuth}
              disabled={authLoading}
            >
              <View style={styles.settingLabelContainer}>
                <Mail size={20} color={colors.primary} style={styles.settingIcon} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  {authLoading ? 'Loading...' : 'Sign In / Register'}
                </Text>
              </View>
              {authLoading && <ActivityIndicator size="small" color={colors.primary} />}
            </TouchableOpacity>
          )}
        </View>

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
          <NativeAdCard />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
            onPress={() => toggleCloudSync(!cloudSyncEnabled)}
          >
            <View style={styles.settingContent}>
              <Ionicons name="cloud-outline" size={24} color={colors.text} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Auto Cloud Sync</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Automatically backup data to cloud
                </Text>
              </View>
            </View>
            <Switch
              value={cloudSyncEnabled}
              onValueChange={toggleCloudSync}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={cloudSyncEnabled ? colors.background : colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
            onPress={handleCloudBackup}
            disabled={isCloudSyncing}
          >
            <View style={styles.settingContent}>
              <Ionicons name="cloud-upload-outline" size={24} color={colors.text} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Manual Cloud Backup</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {isCloudSyncing ? 'Backing up...' : 'Backup data to cloud now'}
                </Text>
              </View>
            </View>
            {isCloudSyncing && <ActivityIndicator size="small" color={colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
            onPress={handleCloudRestore}
            disabled={isCloudSyncing}
          >
            <View style={styles.settingContent}>
              <Ionicons name="cloud-download-outline" size={24} color={colors.text} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Restore from Cloud</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {isCloudSyncing ? 'Restoring...' : 'Replace local data with cloud backup'}
                </Text>
              </View>
            </View>
            {isCloudSyncing && <ActivityIndicator size="small" color={colors.primary} />}
          </TouchableOpacity>

          {cloudSyncStatus && (
            <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
              <View style={styles.settingContent}>
                <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Sync Status</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    {cloudSyncStatus.enabled ? 'Enabled' : 'Disabled'} •
                    {cloudSyncStatus.transactionCount || 0} transactions in cloud
                    {cloudSyncStatus.lastSyncTime && (
                      `\nLast sync: ${new Date(cloudSyncStatus.lastSyncTime).toLocaleDateString()}`
                    )}
                  </Text>
                </View>
              </View>
            </View>
          )}

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

      {/* Backup Restore Modal */}
      <Modal
        visible={showBackupList}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBackupList(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Restore Backup</Text>
            <TouchableOpacity
              onPress={() => setShowBackupList(false)}
              style={styles.closeButton}
            >
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Transaction Backups */}
            <View style={styles.backupSection}>
              <Text style={[styles.backupSectionTitle, { color: colors.text }]}>Transaction Backups</Text>
              {backupFiles.transactions.length === 0 ? (
                <Text style={[styles.noBackupsText, { color: colors.textSecondary }]}>
                  No transaction backups found
                </Text>
              ) : (
                backupFiles.transactions.map((file, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.backupItem,
                      { backgroundColor: colors.card },
                      selectedTransactionBackup === file && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => setSelectedTransactionBackup(
                      selectedTransactionBackup === file ? undefined : file
                    )}
                  >
                    <View style={styles.backupItemContent}>
                      <Text style={[styles.backupFileName, { color: colors.text }]}>
                        {formatBackupFileName(file)}
                      </Text>
                      <Text style={[styles.backupFileSize, { color: colors.textSecondary }]}>
                        Transactions
                      </Text>
                    </View>
                    {selectedTransactionBackup === file && (
                      <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Settings Backups */}
            <View style={styles.backupSection}>
              <Text style={[styles.backupSectionTitle, { color: colors.text }]}>Settings Backups</Text>
              {backupFiles.settings.length === 0 ? (
                <Text style={[styles.noBackupsText, { color: colors.textSecondary }]}>
                  No settings backups found
                </Text>
              ) : (
                backupFiles.settings.map((file, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.backupItem,
                      { backgroundColor: colors.card },
                      selectedSettingsBackup === file && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => setSelectedSettingsBackup(
                      selectedSettingsBackup === file ? undefined : file
                    )}
                  >
                    <View style={styles.backupItemContent}>
                      <Text style={[styles.backupFileName, { color: colors.text }]}>
                        {formatBackupFileName(file)}
                      </Text>
                      <Text style={[styles.backupFileSize, { color: colors.textSecondary }]}>
                        Settings & AI Data
                      </Text>
                    </View>
                    {selectedSettingsBackup === file && (
                      <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.restoreButton,
                { backgroundColor: colors.primary },
                (!selectedTransactionBackup && !selectedSettingsBackup) && { opacity: 0.5 }
              ]}
              onPress={handleRestoreBackup}
              disabled={isRestoring || (!selectedTransactionBackup && !selectedSettingsBackup)}
            >
              <Text style={[styles.restoreButtonText, { color: colors.white }]}>
                {isRestoring ? 'Restoring...' : 'Restore Selected'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Authentication Modal */}
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
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
  userInfoContainer: {
    flex: 1,
  },
  userEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginTop: 2,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backupSection: {
    marginVertical: 16,
  },
  backupSectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    marginBottom: 12,
  },
  noBackupsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  backupItemContent: {
    flex: 1,
  },
  backupFileName: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginBottom: 4,
  },
  backupFileSize: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 12,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  restoreButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginBottom: 2,
  },
  settingDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 18,
  },
});
