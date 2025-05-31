import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { Transaction } from '@/types/transaction';

type DatabaseContextType = {
  isReady: boolean;
  addTransaction: (transaction: Transaction) => Promise<number>;
  getRecentTransactions: (limit: number) => Promise<Transaction[]>;
  getTransactionsByCategory: (period: string) => Promise<any[]>;
  getTransactionsByPeriod: (period: string) => Promise<Transaction[]>;
  getBalance: () => Promise<{income: number, expenses: number}>;
  clearAllTransactions: () => Promise<void>;
};

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  addTransaction: async () => 0,
  getRecentTransactions: async () => [],
  getTransactionsByCategory: async () => [],
  getTransactionsByPeriod: async () => [],
  getBalance: async () => ({income: 0, expenses: 0}),
  clearAllTransactions: async () => {},
});

export const useDatabase = () => useContext(DatabaseContext);

// Open the database
const db = SQLite.openDatabase('transactions.db');

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    initDatabase();
  }, []);
  
  const initDatabase = async () => {
    db.transaction(tx => {
      // Create tables if they don't exist
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          type TEXT NOT NULL,
          description TEXT,
          date TEXT NOT NULL
        )`
      );
    }, (error) => {
      console.error('Database initialization error:', error);
    }, () => {
      setIsReady(true);
    });
  };
  
  const addTransaction = (transaction: Transaction): Promise<number> => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO transactions (amount, category, type, description, date) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            transaction.amount,
            transaction.category,
            transaction.type,
            transaction.description || '',
            transaction.date || new Date().toISOString()
          ],
          (_, result) => {
            resolve(result.insertId || 0);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  };
  
  const getRecentTransactions = (limit: number): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM transactions ORDER BY date DESC LIMIT ?`,
          [limit],
          (_, result) => {
            const transactions: Transaction[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              transactions.push(result.rows.item(i) as Transaction);
            }
            resolve(transactions);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  };
  
  const getTransactionsByPeriod = (period: string): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
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
      
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM transactions ${dateFilter} ORDER BY date DESC`,
          [],
          (_, result) => {
            const transactions: Transaction[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              transactions.push(result.rows.item(i) as Transaction);
            }
            resolve(transactions);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  };
  
  const getTransactionsByCategory = (period: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
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
      
      db.transaction(tx => {
        tx.executeSql(
          `SELECT category, SUM(amount) as amount 
           FROM transactions 
           WHERE type = 'expense' ${dateFilter}
           GROUP BY category
           ORDER BY ABS(SUM(amount)) DESC`,
          [],
          (_, result) => {
            const categoryData = [];
            for (let i = 0; i < result.rows.length; i++) {
              categoryData.push(result.rows.item(i));
            }
            resolve(categoryData);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  };
  
  const getBalance = (): Promise<{income: number, expenses: number}> => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses
           FROM transactions`,
          [],
          (_, result) => {
            if (result.rows.length > 0) {
              const { income, expenses } = result.rows.item(0);
              resolve({
                income: income || 0,
                expenses: expenses || 0
              });
            } else {
              resolve({ income: 0, expenses: 0 });
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  };
  
  const clearAllTransactions = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM transactions',
          [],
          (_, result) => {
            resolve();
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
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