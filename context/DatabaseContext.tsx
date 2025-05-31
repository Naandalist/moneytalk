import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { Transaction } from '@/types/transaction';

type DatabaseContextType = {
  isReady: boolean;
  addTransaction: (transaction: Transaction) => Promise<number>;
  getRecentTransactions: (limit: number) => Promise<Transaction[]>;
  getTransactionsByCategory: (period: string) => Promise<any[]>;
  getTransactionsByPeriod: (period: string) => Promise<Transaction[]>;
  getBalance: () => Promise<{ income: number, expenses: number }>;
  clearAllTransactions: () => Promise<void>;
};

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  addTransaction: async () => 0,
  getRecentTransactions: async () => [],
  getTransactionsByCategory: async () => [],
  getTransactionsByPeriod: async () => [],
  getBalance: async () => ({ income: 0, expenses: 0 }),
  clearAllTransactions: async () => { },
});

export const useDatabase = () => useContext(DatabaseContext);

// Open the database
// Replace the db declaration
let db: SQLite.SQLiteDatabase;

const initDatabase = async (setIsReady: (ready: boolean) => void) => {
  try {
    db = await SQLite.openDatabaseAsync('transactions.db');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL
      )
    `);

    setIsReady(true);
  } catch (error) {
    console.error('Database initialization error:', error);
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

  const getTransactionsByPeriod = async (period: string): Promise<Transaction[]> => {
    try {
      let dateFilter = '';
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        dateFilter = `WHERE date >= '${weekAgo.toISOString()}'`;
      } else if (period === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        dateFilter = `WHERE date >= '${monthAgo.toISOString()}'`;
      } else if (period === 'year') {
        const yearAgo = new Date();
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
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        dateFilter = `AND date >= '${weekAgo.toISOString()}'`;
      } else if (period === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        dateFilter = `AND date >= '${monthAgo.toISOString()}'`;
      } else if (period === 'year') {
        const yearAgo = new Date();
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
    } catch (error) {
      throw error;
    }
  };

  return (
    <DatabaseContext.Provider value={{
      isReady,
      addTransaction,
      getRecentTransactions,
      getTransactionsByCategory,
      getTransactionsByPeriod,
      getBalance,
      clearAllTransactions
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};