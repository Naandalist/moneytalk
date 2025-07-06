import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '@/types/transaction';
import { getCurrentDateInTimezone, getUserTimezone } from '@/utils/timezoneUtils';
import { supabase } from '../utils/supabase';
import { CloudBackupService } from '../utils/cloudBackup';
import { useAuth } from './AuthContext';
import * as Crypto from 'expo-crypto';

type DatabaseContextType = {
  isReady: boolean;
  addTransaction: (transaction: Transaction) => Promise<number>;
  updateTransaction: (transaction: Transaction) => Promise<boolean>;
  getRecentTransactions: (limit: number) => Promise<Transaction[]>;
  getAllTransactions: () => Promise<Transaction[]>;
  getTransactionsByCategory: (period: string) => Promise<any[]>;
  getTransactionsByPeriod: (period: string) => Promise<Transaction[]>;
  getBalance: () => Promise<{ income: number, expenses: number }>;
  clearAllTransactions: () => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  saveAISuggestion: (suggestion: string) => Promise<void>;
  getAISuggestion: () => Promise<{ suggestion: string; timestamp: number } | null>;
  clearAISuggestion: () => Promise<void>;
  getDailyRefreshCount: () => Promise<number>;
  incrementDailyRefreshCount: () => Promise<void>;
  getRemainingRefreshes: () => Promise<number>;
  getDatabaseInfo: () => Promise<any>;
  manualBackup: () => Promise<boolean>;
  getBackupFiles: () => Promise<{ transactions: string[], settings: string[] }>;
  restoreBackup: (transactionBackupFile?: string, settingsBackupFile?: string) => Promise<boolean>;
  cloudBackupData: () => Promise<{ success: boolean; message: string }>;
  cloudRestoreData: () => Promise<{ success: boolean; message: string }>;
  getCloudSyncStatus: () => Promise<any>;
  enableAutoSync: (enabled: boolean) => Promise<void>;
  isCloudBackupEnabled: () => Promise<boolean>;
};

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  addTransaction: async () => 0,
  updateTransaction: async () => false,
  getRecentTransactions: async () => [],
  getAllTransactions: async () => [],
  getTransactionsByCategory: async () => [],
  getTransactionsByPeriod: async () => [],
  getBalance: async () => ({ income: 0, expenses: 0 }),
  clearAllTransactions: async () => { },
  deleteTransaction: async () => { },
  saveAISuggestion: async () => { },
  getAISuggestion: async () => null,
  clearAISuggestion: async () => { },
  getDailyRefreshCount: async () => 0,
  incrementDailyRefreshCount: async () => { },
  getRemainingRefreshes: async () => 3,
  getDatabaseInfo: async () => null,
  manualBackup: async () => false,
  getBackupFiles: async () => ({ transactions: [], settings: [] }),
  restoreBackup: async () => false,
  cloudBackupData: async () => ({ success: false, message: '' }),
  cloudRestoreData: async () => ({ success: false, message: '' }),
  getCloudSyncStatus: async () => ({}),
  enableAutoSync: async () => { },
  isCloudBackupEnabled: async () => false,
});

export const useDatabase = () => useContext(DatabaseContext);

// Global instances
let cloudBackupService: CloudBackupService | null = null;

/**
 * Initialize Supabase connection and cloud backup service
 */
const initSupabase = async (setIsReady: (ready: boolean) => void) => {
  try {
    console.log('Initializing Supabase connection...');
    
    // Initialize cloud backup service
    cloudBackupService = new CloudBackupService();
    
    // Test Supabase connection
    const { data, error } = await supabase.from('transactions').select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is fine for first time
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection successful');
    }
    
    setIsReady(true);
  } catch (error) {
    console.error('Supabase initialization failed:', error);
    setIsReady(false);
  }
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [cloudBackupInitialized, setCloudBackupInitialized] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    initSupabase(setIsReady);
  }, []);

  useEffect(() => {
    // Initialize cloud backup when database is ready and user is authenticated
    if (isReady && !cloudBackupInitialized && user) {
      initializeCloudBackup();
    }
  }, [isReady, cloudBackupInitialized, user]);

  /**
   * Get user ID for database operations (authenticated user ID or device UUID)
   */
  const getUserId = async (): Promise<string> => {
    if (user?.id) {
      return user.id;
    }
    
    // For anonymous users, generate or get device UUID
    try {
      let deviceUserId = await AsyncStorage.getItem('device_user_id');
      
      if (!deviceUserId || deviceUserId.startsWith('device_')) {
        // Generate a proper UUID for database compatibility
        deviceUserId = await Crypto.randomUUID();
        await AsyncStorage.setItem('device_user_id', deviceUserId);
        console.log('Generated new device UUID for anonymous user:', deviceUserId);
      }
      
      return deviceUserId;
    } catch (error) {
      console.error('Error generating device user ID:', error);
      // Fallback to a simple UUID
      const fallbackId = await Crypto.randomUUID();
      await AsyncStorage.setItem('device_user_id', fallbackId);
      return fallbackId;
    }
  };

  /**
   * Initialize cloud backup service (simplified for Supabase)
   */
  const initializeCloudBackup = async () => {
    try {
      console.log('Initializing cloud backup with Supabase...');
      console.log('User authenticated:', !!user);
      console.log('User ID:', user?.id);
      
      if (!cloudBackupService) {
        cloudBackupService = new CloudBackupService();
      }
      
      // Since we're using Supabase directly, cloud backup is always available when user is authenticated
      if (user?.id) {
        await cloudBackupService.initialize();
        setCloudBackupInitialized(true);
        console.log('Cloud backup initialized successfully with Supabase');
      } else {
        console.log('No authenticated user, cloud backup not available');
        setCloudBackupInitialized(false);
      }
    } catch (error) {
      console.error('Failed to initialize cloud backup:', error);
      setCloudBackupInitialized(false);
    }
  };

  const addTransaction = async (transaction: Transaction): Promise<number> => {
    try {
      // Use user_id from transaction if provided, otherwise get from getUserId()
      const userId = (transaction as any).user_id || await getUserId();
      
      // Ensure user profile exists before inserting transaction
      if (user?.id) {
        try {
          // Check if user profile exists
          const { data: existingProfile, error: profileCheckError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('user_id', userId)
            .single();

          // If profile doesn't exist, create it
          if (profileCheckError && profileCheckError.code === 'PGRST116') {
            console.log('Creating user profile for:', userId);
            const { error: createError } = await supabase
              .from('user_profiles')
              .upsert({
                user_id: userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (createError) {
              console.error('Error creating user profile:', createError);
              // Don't throw here, let the transaction insert attempt and handle the error
            } else {
              console.log('User profile created successfully');
            }
          }
        } catch (profileError) {
          console.error('Error checking/creating user profile:', profileError);
          // Continue with transaction insert
        }
      }
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          amount: transaction.amount,
          category: transaction.category,
          type: transaction.type,
          description: transaction.description || '',
          date: transaction.date || new Date().toISOString(),
          user_id: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding transaction to Supabase:', error);
        throw error;
      }

      // Auto-sync to cloud if enabled
      const autoSyncEnabled = await isCloudBackupEnabled();
      if (autoSyncEnabled && cloudBackupInitialized && cloudBackupService) {
        const allTransactions = await getAllTransactions();
        cloudBackupService.autoSync(allTransactions).catch(console.error);
      }

      return data.id || 0;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Manual cloud backup of all data (simplified for Supabase - data is already in cloud)
   */
  const cloudBackupData = async (): Promise<{ success: boolean; message: string }> => {
    try {
      // Check if user is authenticated
      if (!user) {
        return { success: false, message: 'Please sign in to use cloud backup' };
      }

      // With Supabase, data is already in the cloud, so this is just a sync verification
      const transactions = await getAllTransactions();
      console.log(`Verified ${transactions.length} transactions in cloud storage`);
      
      return { success: true, message: `Data verified in cloud! Found ${transactions.length} transactions.` };
    } catch (error) {
      console.error('Error during cloud backup verification:', error);
      return {
        success: false,
        message: 'Cloud backup verification failed: ' + (error as Error).message,
      };
    }
  };

  /**
   * Restore data from cloud backup (simplified for Supabase - data is already synced)
   */
  const cloudRestoreData = async (): Promise<{ success: boolean; message: string }> => {
    try {
      // Check if user is authenticated
      if (!user) {
        return { success: false, message: 'Please sign in to use cloud restore' };
      }

      // With Supabase, data is already synced from the cloud
      // This function now just refreshes the local view of cloud data
      const transactions = await getAllTransactions();
      const aiSuggestion = await getAISuggestion();
      
      console.log(`Refreshed ${transactions.length} transactions from cloud`);
      
      return {
        success: true,
        message: `Successfully refreshed ${transactions.length} transactions from cloud`,
      };
    } catch (error) {
      console.error('Error during cloud restore:', error);
      return {
        success: false,
        message: 'Cloud restore failed: ' + (error as Error).message,
      };
    }
  };

  /**
   * Get cloud sync status
   */
  const getCloudSyncStatus = async (): Promise<any> => {
    try {
      if (!cloudBackupInitialized || !cloudBackupService) {
        return { enabled: false, message: 'Cloud backup not initialized' };
      }

      const status = await cloudBackupService.getSyncStatus();
      const isEnabled = await isCloudBackupEnabled();

      return {
        enabled: isEnabled,
        authenticated: cloudBackupService.isAuthenticated(),
        userId: cloudBackupService.getUserId(),
        ...status,
      };
    } catch (error) {
      console.error('Error getting cloud sync status:', error);
      return { enabled: false, error: (error as Error).message };
    }
  };

  /**
   * Enable or disable auto-sync
   */
  const enableAutoSync = async (enabled: boolean): Promise<void> => {
    try {
      const userId = await getUserId();
      
      // Ensure user profile exists before inserting settings
      if (user?.id) {
        try {
          // Check if user profile exists
          const { data: existingProfile, error: profileCheckError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('user_id', userId)
            .single();

          // If profile doesn't exist, create it
          if (profileCheckError && profileCheckError.code === 'PGRST116') {
            console.log('Creating user profile for settings:', userId);
            const { error: createError } = await supabase
              .from('user_profiles')
              .upsert({
                user_id: userId,
                created_at: new Date().toISOString()
              });

            if (createError) {
              console.error('Error creating user profile for settings:', createError);
              throw createError;
            }
          } else if (profileCheckError) {
            console.error('Error checking user profile for settings:', profileCheckError);
            throw profileCheckError;
          }
        } catch (profileError) {
          console.error('Error ensuring user profile exists for settings:', profileError);
          throw profileError;
        }
      }
      
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'auto_sync_enabled',
          value: enabled ? 'true' : 'false',
          user_id: userId
        });

      if (error) {
        console.error('Error setting auto sync preference in Supabase:', error);
      }
    } catch (error) {
      console.error('Error setting auto sync preference:', error);
    }
  };

  /**
   * Check if cloud backup is enabled
   */
  const isCloudBackupEnabled = async (): Promise<boolean> => {
    try {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'auto_sync_enabled')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking auto sync preference in Supabase:', error);
        return false;
      }

      return data?.value === 'true';
    } catch (error) {
      console.error('Error checking auto sync preference:', error);
      return false;
    }
  };

  const getRecentTransactions = async (limit: number): Promise<Transaction[]> => {
    try {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recent transactions from Supabase:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      throw error;
    }
  };

  const getAllTransactions = async (): Promise<Transaction[]> => {
    try {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error getting transactions from Supabase:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  };

  const getTransactionsByPeriod = async (period: string): Promise<Transaction[]> => {
    try {
      // Use current time in user's timezone, then convert to UTC for database comparison
      const now = new Date(getCurrentDateInTimezone());
      let dateThreshold: string;

      if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        dateThreshold = weekAgo.toISOString();
      } else if (period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        dateThreshold = monthAgo.toISOString();
      } else if (period === 'year') {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(now.getFullYear() - 1);
        dateThreshold = yearAgo.toISOString();
      } else {
        // If no specific period, return all transactions
        return await getAllTransactions();
      }

      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', dateThreshold)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error getting transactions by period from Supabase:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting transactions by period:', error);
      throw error;
    }
  };

  const getTransactionsByCategory = async (period: string): Promise<any[]> => {
    try {
      // Use current time in user's timezone, then convert to UTC for database comparison
      const now = new Date(getCurrentDateInTimezone());
      let dateThreshold: string | null = null;

      if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        dateThreshold = weekAgo.toISOString();
      } else if (period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        dateThreshold = monthAgo.toISOString();
      } else if (period === 'year') {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(now.getFullYear() - 1);
        dateThreshold = yearAgo.toISOString();
      }

      const userId = await getUserId();
      
      // Get transactions from Supabase
      let query = supabase
        .from('transactions')
        .select('category, amount')
        .eq('user_id', userId)
        .eq('type', 'expense');

      if (dateThreshold) {
        query = query.gte('date', dateThreshold);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting transactions by category from Supabase:', error);
        throw error;
      }

      // Group by category and calculate totals
      const categoryMap = new Map();
      (data || []).forEach((transaction: any) => {
        const category = transaction.category;
        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category);
          categoryMap.set(category, {
            category,
            amount: existing.amount + Math.abs(transaction.amount)
          });
        } else {
          categoryMap.set(category, {
            category,
            amount: Math.abs(transaction.amount)
          });
        }
      });

      // Convert to array and sort by amount
      return Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);
    } catch (error) {
      console.error('Error getting transactions by category:', error);
      throw error;
    }
  };

  const getBalance = async (): Promise<{ income: number, expenses: number }> => {
    try {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting balance from Supabase:', error);
        throw error;
      }

      let income = 0;
      let expenses = 0;

      (data || []).forEach((transaction: any) => {
        if (transaction.type === 'income') {
          income += transaction.amount;
        } else if (transaction.type === 'expense') {
          expenses += Math.abs(transaction.amount);
        }
      });

      return { income, expenses };
    } catch (error) {
      console.error('Error calculating balance:', error);
      throw error;
    }
  };

  const clearAllTransactions = async (): Promise<void> => {
    try {
      const userId = await getUserId();
      
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      if (transactionsError) {
        console.error('Error clearing transactions from Supabase:', transactionsError);
        throw transactionsError;
      }

      const { error: settingsError } = await supabase
        .from('settings')
        .delete()
        .eq('user_id', userId);

      if (settingsError) {
        console.error('Error clearing settings from Supabase:', settingsError);
        throw settingsError;
      }
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: number): Promise<void> => {
    try {
      const userId = await getUserId();
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting transaction from Supabase:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  /**
   * Save AI suggestion to Supabase with timestamp
   * @param suggestion - The AI generated suggestion text
   */
  const saveAISuggestion = async (suggestion: string): Promise<void> => {
    try {
      const timestamp = new Date().getTime();
      const { error } = await supabase
        .from('ai_suggestions')
        .upsert({
          user_id: user?.id || 'anonymous',
          suggestion: suggestion,
          timestamp: timestamp,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving AI suggestion to Supabase:', error);
        throw error;
      }

      // Backup to cloud if enabled
      const autoSyncEnabled = await isCloudBackupEnabled();
      if (autoSyncEnabled && cloudBackupInitialized && cloudBackupService) {
        cloudBackupService.backupAISuggestions(suggestion, timestamp).catch(console.error);
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Get the latest AI suggestion from Supabase
   * @returns Object with suggestion and timestamp, or null if not found
   */
  const getAISuggestion = async (): Promise<{ suggestion: string; timestamp: number } | null> => {
    try {
      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('suggestion, timestamp')
        .eq('user_id', user?.id || 'anonymous')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting AI suggestion from Supabase:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Clear AI suggestion cache from Supabase
   */
  const clearAISuggestion = async (): Promise<void> => {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .delete()
        .eq('user_id', user?.id || 'anonymous');

      if (error) {
        console.error('Error clearing AI suggestions from Supabase:', error);
        throw error;
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Get today's refresh count for the user from Supabase
   * @returns Number of refreshes used today
   */
  const getDailyRefreshCount = async (): Promise<number> => {
    try {
      const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
      const { data, error } = await supabase
        .from('daily_refresh_count')
        .select('count')
        .eq('user_id', user?.id || 'anonymous')
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting daily refresh count from Supabase:', error);
        throw error;
      }

      return data?.count || 0;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Increment today's refresh count for the user in Supabase
   */
  const incrementDailyRefreshCount = async (): Promise<void> => {
    try {
      const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
      const currentCount = await getDailyRefreshCount();

      if (currentCount === 0) {
        // Insert new record for today
        const { error } = await supabase
          .from('daily_refresh_count')
          .insert({
            user_id: user?.id || 'anonymous',
            date: today,
            count: 1,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error inserting daily refresh count to Supabase:', error);
          throw error;
        }
      } else {
        // Update existing record
        const { error } = await supabase
          .from('daily_refresh_count')
          .update({ count: currentCount + 1 })
          .eq('user_id', user?.id || 'anonymous')
          .eq('date', today);

        if (error) {
          console.error('Error updating daily refresh count in Supabase:', error);
          throw error;
        }
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Get remaining refreshes for today (max 3 per day)
   * @returns Number of remaining refreshes
   */
  const getRemainingRefreshes = async (): Promise<number> => {
    try {
      const usedCount = await getDailyRefreshCount();
      return Math.max(0, 3 - usedCount);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Get database information for debugging
   */
  const getDatabaseInfo = async (): Promise<any> => {
    try {
      const userId = await getUserId();
      
      // Get transaction count from Supabase
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      if (transactionError) {
        console.error('Error getting transaction count:', transactionError);
      }

      // Get AI suggestions count from Supabase
      const { data: suggestions, error: suggestionError } = await supabase
        .from('ai_suggestions')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      if (suggestionError) {
        console.error('Error getting suggestion count:', suggestionError);
      }

      return {
        database: {
          type: 'Supabase',
          status: 'Connected',
          transactionCount: transactions?.length || 0,
          suggestionCount: suggestions?.length || 0,
        },
        user: {
          id: userId,
          authenticated: !!user?.id
        }
      };
    } catch (error) {
      console.error('Error getting database info:', error);
      return { error: (error as Error).message };
    }
  };

  /**
   * Manual backup to local storage (from Supabase data)
   */
  const manualBackup = async (): Promise<boolean> => {
    try {
      const transactions = await getAllTransactions();
      const aiSuggestion = await getAISuggestion();
      const refreshCount = await getDailyRefreshCount();
      
      const backupData = {
        transactions,
        aiSuggestion,
        refreshCount,
        timestamp: new Date().toISOString(),
        version: '2.0',
        source: 'supabase'
      };

      const backupString = JSON.stringify(backupData, null, 2);
      const fileName = `moneytalk_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      // Store in AsyncStorage as well for local access
      await AsyncStorage.setItem('latest_backup', backupString);
      await AsyncStorage.setItem('latest_backup_date', new Date().toISOString());

      console.log(`Manual backup completed with ${transactions.length} transactions`);

      return true;
    } catch (error) {
      console.error('Manual backup failed:', error);
      return false;
    }
  };

  /**
   * Get list of available backup files (now from AsyncStorage)
   */
  const getBackupFiles = async (): Promise<{ transactions: string[], settings: string[] }> => {
    try {
      const latestBackupDate = await AsyncStorage.getItem('latest_backup_date');
      return {
        transactions: latestBackupDate ? [latestBackupDate] : [],
        settings: []
      };
    } catch (error) {
      console.error('Error getting backup files:', error);
      return { transactions: [], settings: [] };
    }
  };

  /**
   * Restore backup from AsyncStorage (simplified for Supabase)
   */
  const restoreBackup = async (): Promise<boolean> => {
    try {
      const backupString = await AsyncStorage.getItem('latest_backup');
      if (!backupString) {
        console.log('No local backup found');
        return false;
      }

      const backupData = JSON.parse(backupString);
      console.log(`Found local backup with ${backupData.transactions?.length || 0} transactions`);
      
      // With Supabase, data is already synced from cloud
      // This function now just confirms local backup exists
      return true;
    } catch (error) {
      console.error('Restore backup failed:', error);
      return false;
    }
  };

  /**
   * Update an existing transaction in the database
   * @param transaction - The transaction to update (must include id)
   * @returns Promise resolving to true if successful, false otherwise
   */
  const updateTransaction = async (transaction: Transaction): Promise<boolean> => {
    try {
      if (!transaction.id) {
        throw new Error('Transaction ID is required for update');
      }

      const userId = await getUserId();

      // Log the transaction description before updating
      console.log('DatabaseContext - Updating transaction with description:', transaction.description);

      const { data, error } = await supabase
        .from('transactions')
        .update({
          amount: transaction.amount,
          category: transaction.category,
          type: transaction.type,
          description: transaction.description || '',
          date: transaction.date || new Date().toISOString()
        })
        .eq('id', transaction.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction in Supabase:', error);
        return false;
      }

      console.log('DatabaseContext - After update, transaction description:', data?.description);

      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      return false;
    }
  };

  return (
    <DatabaseContext.Provider value={{
      isReady,
      addTransaction,
      updateTransaction,
      getRecentTransactions,
      getAllTransactions,
      getTransactionsByCategory,
      getTransactionsByPeriod,
      getBalance,
      clearAllTransactions,
      deleteTransaction,
      saveAISuggestion,
      getAISuggestion,
      clearAISuggestion,
      getDailyRefreshCount,
      incrementDailyRefreshCount,
      getRemainingRefreshes,
      getDatabaseInfo,
      manualBackup,
      getBackupFiles,
      restoreBackup,
      // New cloud backup methods
      cloudBackupData,
      cloudRestoreData,
      getCloudSyncStatus,
      enableAutoSync,
      isCloudBackupEnabled,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};