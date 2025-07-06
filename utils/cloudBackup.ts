import { supabase, SUPABASE_TABLES } from './supabase';
import { Transaction } from '@/types/transaction';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentDateInTimezone } from './timezoneUtils';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

interface CloudBackupResult {
  success: boolean;
  message: string;
  error?: string;
}

interface SyncStatus {
  lastSyncTime: string;
  transactionCount: number;
  settingsCount: number;
}

/**
 * Cloud backup service for syncing data with Supabase
 */
export class CloudBackupService {
  private static instance: CloudBackupService;
  private userId: string | null = null;
  private isOnline: boolean = true;

  static getInstance(): CloudBackupService {
    if (!CloudBackupService.instance) {
      CloudBackupService.instance = new CloudBackupService();
    }
    return CloudBackupService.instance;
  }

  /**
   * Initialize cloud backup service with device-based authentication
   */
  async initialize(): Promise<boolean> {
    try {
      // Generate or retrieve device-based user ID
      this.userId = await this.getOrCreateDeviceUserId();
      
      // Create user profile if doesn't exist
      if (this.userId) {
        await this.createUserProfile();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize cloud backup:', error);
      return false;
    }
  }

  /**
   * Generate or retrieve a unique device-based user ID
   */
  private async getOrCreateDeviceUserId(): Promise<string> {
    try {
      // Try to get existing device ID from AsyncStorage
      let deviceUserId = await AsyncStorage.getItem('device_user_id');
      
      // Check if existing ID is in old format and regenerate if needed
      if (!deviceUserId || deviceUserId.startsWith('device_')) {
        // Generate a proper UUID for database compatibility
        deviceUserId = await Crypto.randomUUID();
        
        // Store it for future use
        await AsyncStorage.setItem('device_user_id', deviceUserId);
        console.log('Generated new device UUID:', deviceUserId);
      }
      
      return deviceUserId;
    } catch (error) {
      console.error('Error generating device user ID:', error);
      // Fallback to a simple UUID
      const fallbackId = await Crypto.randomUUID();
      await AsyncStorage.setItem('device_user_id', fallbackId);
      return fallbackId;
    }
  }

  /**
   * Create user profile in Supabase
   */
  private async createUserProfile(): Promise<void> {
    if (!this.userId) return;

    const { error } = await supabase
      .from(SUPABASE_TABLES.USER_PROFILES)
      .upsert({
        id: this.userId,
        created_at: new Date().toISOString(),
        timezone: 'Asia/Jakarta',
        last_sync: new Date().toISOString(),
      });

    if (error && error.code !== '23505') { // Ignore duplicate key error
      console.error('Error creating user profile:', error);
    }
  }

  /**
   * Backup all transactions to cloud
   */
  async backupTransactions(transactions: Transaction[]): Promise<CloudBackupResult> {
    if (!this.userId) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      // Transform transactions for cloud storage
      const cloudTransactions = transactions.map(transaction => ({
        id: transaction.id,
        user_id: this.userId,
        amount: transaction.amount,
        category: transaction.category,
        type: transaction.type,
        description: transaction.description || '',
        date: transaction.date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Delete existing transactions for this user
      await supabase
        .from(SUPABASE_TABLES.TRANSACTIONS)
        .delete()
        .eq('user_id', this.userId);

      // Insert new transactions
      const { error } = await supabase
        .from(SUPABASE_TABLES.TRANSACTIONS)
        .insert(cloudTransactions);

      if (error) throw error;

      await this.updateLastSyncTime();
      
      return {
        success: true,
        message: `Successfully backed up ${transactions.length} transactions`,
      };
    } catch (error) {
      console.error('Error backing up transactions:', error);
      return {
        success: false,
        message: 'Failed to backup transactions',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Restore transactions from cloud
   */
  async restoreTransactions(): Promise<{ success: boolean; transactions: Transaction[]; message: string }> {
    if (!this.userId) {
      return { success: false, transactions: [], message: 'User not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from(SUPABASE_TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', this.userId)
        .order('date', { ascending: false });

      if (error) throw error;

      const transactions: Transaction[] = (data || []).map(item => ({
        id: item.id,
        amount: item.amount,
        category: item.category,
        type: item.type,
        description: item.description,
        date: item.date,
      }));

      return {
        success: true,
        transactions,
        message: `Successfully restored ${transactions.length} transactions`,
      };
    } catch (error) {
      console.error('Error restoring transactions:', error);
      return {
        success: false,
        transactions: [],
        message: 'Failed to restore transactions',
      };
    }
  }

  /**
   * Backup AI suggestions to cloud
   */
  async backupAISuggestions(suggestion: string, timestamp: number): Promise<CloudBackupResult> {
    if (!this.userId) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      const { error } = await supabase
        .from(SUPABASE_TABLES.AI_SUGGESTIONS)
        .upsert({
          user_id: this.userId,
          suggestion,
          timestamp,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true, message: 'AI suggestion backed up successfully' };
    } catch (error) {
      console.error('Error backing up AI suggestion:', error);
      return {
        success: false,
        message: 'Failed to backup AI suggestion',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Restore AI suggestions from cloud
   */
  async restoreAISuggestions(): Promise<{ suggestion: string; timestamp: number } | null> {
    if (!this.userId) return null;

    try {
      const { data, error } = await supabase
        .from(SUPABASE_TABLES.AI_SUGGESTIONS)
        .select('suggestion, timestamp')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error

      return data || null;
    } catch (error) {
      console.error('Error restoring AI suggestions:', error);
      return null;
    }
  }

  /**
   * Sync daily refresh count
   */
  async syncDailyRefreshCount(date: string, count: number): Promise<CloudBackupResult> {
    if (!this.userId) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      const { error } = await supabase
        .from(SUPABASE_TABLES.DAILY_REFRESH_COUNT)
        .upsert({
          user_id: this.userId,
          date,
          count,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true, message: 'Refresh count synced successfully' };
    } catch (error) {
      console.error('Error syncing refresh count:', error);
      return {
        success: false,
        message: 'Failed to sync refresh count',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get daily refresh count from cloud
   */
  async getDailyRefreshCount(date: string): Promise<number> {
    if (!this.userId) return 0;

    try {
      const { data, error } = await supabase
        .from(SUPABASE_TABLES.DAILY_REFRESH_COUNT)
        .select('count')
        .eq('user_id', this.userId)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data?.count || 0;
    } catch (error) {
      console.error('Error getting refresh count:', error);
      return 0;
    }
  }

  /**
   * Perform automatic sync of all data
   */
  async autoSync(transactions: Transaction[]): Promise<CloudBackupResult> {
    try {
      // Check if we should sync (avoid too frequent syncs)
      const lastSync = await AsyncStorage.getItem('lastCloudSync');
      const now = new Date();
      
      if (lastSync) {
        const lastSyncTime = new Date(lastSync);
        const timeDiff = now.getTime() - lastSyncTime.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        // Only sync if more than 1 hour has passed
        if (hoursDiff < 1) {
          return { success: true, message: 'Sync skipped - too recent' };
        }
      }

      // Backup transactions
      const backupResult = await this.backupTransactions(transactions);
      
      if (backupResult.success) {
        await AsyncStorage.setItem('lastCloudSync', now.toISOString());
      }

      return backupResult;
    } catch (error) {
      console.error('Error during auto sync:', error);
      return {
        success: false,
        message: 'Auto sync failed',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get sync status information
   */
  async getSyncStatus(): Promise<SyncStatus | null> {
    try {
      const lastSync = await AsyncStorage.getItem('lastCloudSync');
      
      if (!this.userId || !lastSync) {
        return null;
      }

      const { data: transactionData } = await supabase
        .from(SUPABASE_TABLES.TRANSACTIONS)
        .select('id', { count: 'exact' })
        .eq('user_id', this.userId);

      const { data: settingsData } = await supabase
        .from(SUPABASE_TABLES.AI_SUGGESTIONS)
        .select('id', { count: 'exact' })
        .eq('user_id', this.userId);

      return {
        lastSyncTime: lastSync,
        transactionCount: transactionData?.length || 0,
        settingsCount: settingsData?.length || 0,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  /**
   * Update last sync time in user profile
   */
  private async updateLastSyncTime(): Promise<void> {
    if (!this.userId) return;

    await supabase
      .from(SUPABASE_TABLES.USER_PROFILES)
      .update({ last_sync: new Date().toISOString() })
      .eq('id', this.userId);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.userId !== null;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }
}

export const cloudBackup = CloudBackupService.getInstance();