import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Transaction } from '@/types/transaction';
import { getCurrentDateInTimezone, getUserTimezone } from '@/utils/timezoneUtils';

type DatabaseContextType = {
  isReady: boolean;
  addTransaction: (transaction: Transaction) => Promise<number>;
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
};

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  addTransaction: async () => 0,
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
});

export const useDatabase = () => useContext(DatabaseContext);

// Database file paths in document directory
const DB_NAME = 'transactions.db';
const SETTINGS_DB_NAME = 'settings.db';
const DB_PATH = FileSystem.documentDirectory + DB_NAME;
const SETTINGS_DB_PATH = FileSystem.documentDirectory + SETTINGS_DB_NAME;

let db: SQLite.SQLiteDatabase;
let settingsDb: SQLite.SQLiteDatabase;

/**
 * Migrate existing databases from default location to document directory
 */
const migrateExistingDatabases = async (): Promise<void> => {
  try {
    console.log('Checking for existing databases to migrate...');
    
    // Check if databases already exist in document directory
    const newDbExists = await FileSystem.getInfoAsync(DB_PATH);
    const newSettingsDbExists = await FileSystem.getInfoAsync(SETTINGS_DB_PATH);
    
    if (newDbExists.exists && newSettingsDbExists.exists) {
      console.log('Databases already exist in document directory, skipping migration');
      return;
    }
    
    // Try to open old databases to check if they exist and have data
    try {
      const oldDb = await SQLite.openDatabaseAsync('transactions.db');
      const oldSettingsDb = await SQLite.openDatabaseAsync('settings.db');
      
      // Check if old databases have data
      const transactionCount = await oldDb.getFirstAsync(
        'SELECT COUNT(*) as count FROM transactions'
      ) as { count: number } | null;
      
      const suggestionCount = await oldSettingsDb.getFirstAsync(
        'SELECT COUNT(*) as count FROM ai_suggestions'
      ) as { count: number } | null;
      
      if ((transactionCount?.count || 0) > 0 || (suggestionCount?.count || 0) > 0) {
        console.log(`Found ${transactionCount?.count || 0} transactions and ${suggestionCount?.count || 0} AI suggestions to migrate`);
        
        // Export data from old databases
        const transactions = await oldDb.getAllAsync('SELECT * FROM transactions') as Transaction[];
        const aiSuggestions = await oldSettingsDb.getAllAsync('SELECT * FROM ai_suggestions');
        const refreshCounts = await oldSettingsDb.getAllAsync('SELECT * FROM daily_refresh_count');
        const settings = await oldSettingsDb.getAllAsync('SELECT * FROM settings');
        
        // Close old databases
        await oldDb.closeAsync();
        await oldSettingsDb.closeAsync();
        
        // Create new databases in document directory
        const newDb = await SQLite.openDatabaseAsync(DB_PATH);
        const newSettingsDb = await SQLite.openDatabaseAsync(SETTINGS_DB_PATH);
        
        // Create tables in new databases
        await createTables(newDb, newSettingsDb);
        
        // Migrate data
        console.log('Migrating transaction data...');
        for (const transaction of transactions) {
          await newDb.runAsync(
            'INSERT INTO transactions (id, amount, category, type, description, date) VALUES (?, ?, ?, ?, ?, ?)',
            [
              transaction.id || 0,
              transaction.amount || 0,
              transaction.category || '',
              transaction.type || '',
              transaction.description || '',
              transaction.date || ''
            ]
          );
        }
        
        console.log('Migrating AI suggestions...');
        for (const suggestion of aiSuggestions) {
          const suggestionRecord = suggestion as any;
          await newSettingsDb.runAsync(
            'INSERT INTO ai_suggestions (id, user_id, suggestion, timestamp, created_at) VALUES (?, ?, ?, ?, ?)',
            [suggestionRecord.id, suggestionRecord.user_id, suggestionRecord.suggestion, suggestionRecord.timestamp, suggestionRecord.created_at]
          );
        }
        
        console.log('Migrating refresh counts...');
        for (const count of refreshCounts) {
          const countRecord = count as any;
          await newSettingsDb.runAsync(
            'INSERT INTO daily_refresh_count (id, user_id, date, count, created_at) VALUES (?, ?, ?, ?, ?)',
            [countRecord.id, countRecord.user_id, countRecord.date, countRecord.count, countRecord.created_at]
          );
        }
        
        console.log('Migrating settings...');
        for (const setting of settings) {
          const settingRecord = setting as any;
          await newSettingsDb.runAsync(
            'INSERT INTO settings (key, value) VALUES (?, ?)',
            [settingRecord.key, settingRecord.value]
          );
        }
        
        await newDb.closeAsync();
        await newSettingsDb.closeAsync();
        
        console.log('Database migration completed successfully');
      } else {
        console.log('No data found in old databases, skipping migration');
        await oldDb.closeAsync();
        await oldSettingsDb.closeAsync();
      }
    } catch (oldDbError) {
      console.log('No existing databases found or error accessing them:', oldDbError);
    }
  } catch (error) {
    console.error('Database migration error:', error);
  }
};

/**
 * Create database tables
 */
const createTables = async (database: SQLite.SQLiteDatabase, settingsDatabase: SQLite.SQLiteDatabase): Promise<void> => {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL
    )
  `);

  await settingsDatabase.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await settingsDatabase.execAsync(`
    CREATE TABLE IF NOT EXISTS ai_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      suggestion TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await settingsDatabase.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_refresh_count (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

/**
 * Initialize database with persistent file system location and migration
 */
const initDatabase = async (setIsReady: (ready: boolean) => void) => {
  try {
    console.log('Initializing database with FileSystem.documentDirectory...');
    console.log('Document directory:', FileSystem.documentDirectory);
    
    // Ensure the document directory exists
    const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory!);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory!, { intermediates: true });
    }

    // Migrate existing databases if needed
    await migrateExistingDatabases();

    // Open databases with explicit file paths
    console.log('Opening databases at:');
    console.log('Main DB:', DB_PATH);
    console.log('Settings DB:', SETTINGS_DB_PATH);
    
    db = await SQLite.openDatabaseAsync(DB_PATH);
    settingsDb = await SQLite.openDatabaseAsync(SETTINGS_DB_PATH);

    // Create tables if they don't exist
    await createTables(db, settingsDb);

    // Verify database integrity
    const transactionCount = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM transactions'
    ) as { count: number } | null;
    
    console.log(`Database initialized successfully. Found ${transactionCount?.count || 0} existing transactions.`);
    console.log('Database files located at:');
    console.log('- Transactions:', DB_PATH);
    console.log('- Settings:', SETTINGS_DB_PATH);

    setIsReady(true);
  } catch (error) {
    console.error('Database initialization error:', error);
    setIsReady(false);
    
    // Try to recover by creating new databases
    try {
      console.log('Attempting database recovery...');
      db = await SQLite.openDatabaseAsync(DB_PATH);
      settingsDb = await SQLite.openDatabaseAsync(SETTINGS_DB_PATH);
      await createTables(db, settingsDb);
      console.log('Database recovery successful');
      setIsReady(true);
    } catch (recoveryError) {
      console.error('Database recovery failed:', recoveryError);
      setIsReady(false);
    }
  }
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initDatabase(setIsReady);
  }, []);

  const addTransaction = async (transaction: Transaction): Promise<number> => {
    try {
      const result = await db.runAsync(
        `INSERT INTO transactions (amount, category, type, description, date) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          transaction.amount,
          transaction.category,
          transaction.type,
          transaction.description || '',
          transaction.date || new Date().toISOString()
        ]
      );
      return result.lastInsertRowId || 0;
    } catch (error) {
      throw error;
    }
  };

  const getRecentTransactions = async (limit: number): Promise<Transaction[]> => {
    try {
      const result = await db.getAllAsync(
        `SELECT * FROM transactions ORDER BY date DESC LIMIT ?`,
        [limit]
      );
      return result as Transaction[];
    } catch (error) {
      throw error;
    }
  };

  const getAllTransactions = async (): Promise<Transaction[]> => {
    try {
      const result = await db.getAllAsync(
        `SELECT * FROM transactions ORDER BY date DESC`
      );
      return result as Transaction[];
    } catch (error) {
      throw error;
    }
  };

  const getTransactionsByPeriod = async (period: string): Promise<Transaction[]> => {
    try {
      let dateFilter = '';
      // Use current time in user's timezone, then convert to UTC for database comparison
      const now = new Date(getCurrentDateInTimezone());

      if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        // Convert to UTC for database comparison (dates in DB are stored in UTC)
        dateFilter = `WHERE date >= '${weekAgo.toISOString()}'`;
      } else if (period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        dateFilter = `WHERE date >= '${monthAgo.toISOString()}'`;
      } else if (period === 'year') {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(now.getFullYear() - 1);
        dateFilter = `WHERE date >= '${yearAgo.toISOString()}'`;
      }

      const result = await db.getAllAsync(
        `SELECT * FROM transactions ${dateFilter} ORDER BY date DESC`
      );

      return result as Transaction[];
    } catch (error) {
      throw error;
    }
  };

  const getTransactionsByCategory = async (period: string): Promise<any[]> => {
    try {
      let dateFilter = '';
      // Use current time in user's timezone, then convert to UTC for database comparison
      const now = new Date(getCurrentDateInTimezone());

      if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        // Convert to UTC for database comparison (dates in DB are stored in UTC)
        dateFilter = `AND date >= '${weekAgo.toISOString()}'`;
      } else if (period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        dateFilter = `AND date >= '${monthAgo.toISOString()}'`;
      } else if (period === 'year') {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(now.getFullYear() - 1);
        dateFilter = `AND date >= '${yearAgo.toISOString()}'`;
      }

      const result = await db.getAllAsync(
        `SELECT category, SUM(amount) as amount 
         FROM transactions 
         WHERE type = 'expense' ${dateFilter}
         GROUP BY category
         ORDER BY ABS(SUM(amount)) DESC`
      );

      return result as any[];
    } catch (error) {
      throw error;
    }
  };

  const getBalance = async (): Promise<{ income: number, expenses: number }> => {
    try {
      const result = await db.getFirstAsync(
        `SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
         FROM transactions`
      ) as { income: number | null, expenses: number | null } | null;

      if (result) {
        return {
          income: result.income || 0,
          expenses: Math.abs(result.expenses || 0) // Apply ABS here instead of in SQL
        };
      } else {
        return { income: 0, expenses: 0 };
      }
    } catch (error) {
      throw error;
    }
  };

  const clearAllTransactions = async (): Promise<void> => {
    try {
      await db.runAsync('DELETE FROM transactions');
      await settingsDb.runAsync('DELETE FROM settings');
    } catch (error) {
      throw error;
    }
  };

  const deleteTransaction = async (id: number): Promise<void> => {
    try {
      await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Save AI suggestion to database with timestamp
   * @param suggestion - The AI generated suggestion text
   */
  const saveAISuggestion = async (suggestion: string): Promise<void> => {
    try {
      const timestamp = new Date().getTime();
      await settingsDb.runAsync(
        `INSERT OR REPLACE INTO ai_suggestions (user_id, suggestion, timestamp, created_at) 
         VALUES ('default_user', ?, ?, ?)`,
        [suggestion, timestamp, new Date().toISOString()]
      );
    } catch (error) {
      throw error;
    }
  };

  /**
   * Get the latest AI suggestion from database
   * @returns Object with suggestion and timestamp, or null if not found
   */
  const getAISuggestion = async (): Promise<{ suggestion: string; timestamp: number } | null> => {
    try {
      const result = await settingsDb.getFirstAsync(
        `SELECT suggestion, timestamp FROM ai_suggestions 
         WHERE user_id = 'default_user' 
         ORDER BY created_at DESC LIMIT 1`
      ) as { suggestion: string; timestamp: number } | null;
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Clear AI suggestion cache from database
   */
  const clearAISuggestion = async (): Promise<void> => {
    try {
      await settingsDb.runAsync(
        `DELETE FROM ai_suggestions WHERE user_id = 'default_user'`
      );
    } catch (error) {
      throw error;
    }
  };

  /**
   * Get today's refresh count for the user
   * @returns Number of refreshes used today
   */
  const getDailyRefreshCount = async (): Promise<number> => {
    try {
      const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
      const result = await settingsDb.getFirstAsync(
        `SELECT count FROM daily_refresh_count 
         WHERE user_id = 'default_user' AND date = ?`,
        [today]
      ) as { count: number } | null;
      
      return result?.count || 0;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Increment today's refresh count for the user
   */
  const incrementDailyRefreshCount = async (): Promise<void> => {
    try {
      const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
      const currentCount = await getDailyRefreshCount();
      
      if (currentCount === 0) {
        // Insert new record for today
        await settingsDb.runAsync(
          `INSERT INTO daily_refresh_count (user_id, date, count, created_at) 
           VALUES ('default_user', ?, 1, ?)`,
          [today, new Date().toISOString()]
        );
      } else {
        // Update existing record
        await settingsDb.runAsync(
          `UPDATE daily_refresh_count 
           SET count = count + 1 
           WHERE user_id = 'default_user' AND date = ?`,
          [today]
        );
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
      const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
      const settingsDbInfo = await FileSystem.getInfoAsync(SETTINGS_DB_PATH);
      
      const transactionCount = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM transactions'
      ) as { count: number } | null;
      
      const suggestionCount = await settingsDb.getFirstAsync(
        'SELECT COUNT(*) as count FROM ai_suggestions'
      ) as { count: number } | null;
      
      return {
        documentDirectory: FileSystem.documentDirectory,
        mainDatabase: {
          path: DB_PATH,
          exists: dbInfo.exists,
          size: dbInfo.exists ? (dbInfo as any).size || 0 : 0,
          transactionCount: transactionCount?.count || 0,
        },
        settingsDatabase: {
          path: SETTINGS_DB_PATH,
          exists: settingsDbInfo.exists,
          size: settingsDbInfo.exists ? (settingsDbInfo as any).size || 0 : 0,
          suggestionCount: suggestionCount?.count || 0,
        },
      };
    } catch (error) {
      console.error('Error getting database info:', error);
      return { error: (error as Error).message };
    }
  };

  /**
   * Manual backup function for user-initiated backups
   */
  const manualBackup = async (): Promise<boolean> => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = FileSystem.documentDirectory + 'backups/';
      
      // Create backup directory if it doesn't exist
      const backupDirInfo = await FileSystem.getInfoAsync(backupDir);
      if (!backupDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      }
      
      // Copy database files to backup directory
      const backupDbPath = backupDir + `transactions_backup_${timestamp}.db`;
      const backupSettingsPath = backupDir + `settings_backup_${timestamp}.db`;
      
      await FileSystem.copyAsync({
        from: DB_PATH,
        to: backupDbPath,
      });
      
      await FileSystem.copyAsync({
        from: SETTINGS_DB_PATH,
        to: backupSettingsPath,
      });
      
      console.log('Manual backup completed:');
      console.log('- Transactions backup:', backupDbPath);
      console.log('- Settings backup:', backupSettingsPath);
      
      return true;
    } catch (error) {
      console.error('Manual backup failed:', error);
      return false;
    }
  };

  return (
    <DatabaseContext.Provider value={{
      isReady,
      addTransaction,
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
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};