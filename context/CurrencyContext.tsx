import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useDatabase } from './DatabaseContext';
import * as SQLite from 'expo-sqlite';

interface Currency {
  language?: string;
  code: string;
  symbol: string;
  name: string;
}

interface CurrencyContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  currencies: Currency[];
  isOnboardingComplete: boolean;
  completeOnboarding: () => void;
}

const CURRENCIES = [
  { language: 'en', code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { language: 'id', code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
];

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Database instance for currency settings
let settingsDb: SQLite.SQLiteDatabase;

const initSettingsDatabase = async () => {
  try {
    settingsDb = await SQLite.openDatabaseAsync('settings.db');

    await settingsDb.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  } catch (error) {
    console.error('Settings database initialization error:', error);
  }
};

const saveCurrencyToDb = async (currency: Currency) => {
  try {
    await settingsDb.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['selectedCurrency', JSON.stringify(currency)]
    );
  } catch (error) {
    console.error('Error saving currency to database:', error);
  }
};

const saveOnboardingStatus = async (isComplete: boolean) => {
  try {
    await settingsDb.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['onboardingComplete', JSON.stringify(isComplete)]
    );
  } catch (error) {
    console.error('Error saving onboarding status:', error);
  }
};

const loadCurrencyFromDb = async (): Promise<Currency | null> => {
  try {
    const result = await settingsDb.getFirstAsync(
      'SELECT value FROM settings WHERE key = ?',
      ['selectedCurrency']
    ) as { value: string } | null;

    if (result) {
      const savedCurrency = JSON.parse(result.value);
      const validCurrency = CURRENCIES.find(c => c.code === savedCurrency.code);
      return validCurrency || null;
    }
    return null;
  } catch (error) {
    console.error('Error loading currency from database:', error);
    return null;
  }
};

const loadOnboardingStatus = async (): Promise<boolean> => {
  try {
    const result = await settingsDb.getFirstAsync(
      'SELECT value FROM settings WHERE key = ?',
      ['onboardingComplete']
    ) as { value: string } | null;

    if (result) {
      return JSON.parse(result.value);
    }
    return false;
  } catch (error) {
    console.error('Error loading onboarding status:', error);
    return false;
  }
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency>(CURRENCIES[0]);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isReady } = useDatabase();

  useEffect(() => {
    const initAndLoad = async () => {
      try {
        await initSettingsDatabase();
        const [savedCurrency, onboardingStatus] = await Promise.all([
          loadCurrencyFromDb(),
          loadOnboardingStatus()
        ]);

        if (savedCurrency) {
          setSelectedCurrencyState(savedCurrency);
        }
        setIsOnboardingComplete(onboardingStatus);
      } catch (error) {
        console.error('Error initializing currency context:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    if (isReady) {
      initAndLoad();
    }
  }, [isReady]);

  const setSelectedCurrency = async (currency: Currency) => {
    try {
      await saveCurrencyToDb(currency);
      setSelectedCurrencyState(currency);
    } catch (error) {
      console.error('Error saving currency:', error);
      setSelectedCurrencyState(currency);
    }
  };

  const completeOnboarding = async () => {
    try {
      await saveOnboardingStatus(true);
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsOnboardingComplete(true);
    }
  };

  if (!isLoaded || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <CurrencyContext.Provider value={{
      selectedCurrency,
      setSelectedCurrency,
      currencies: CURRENCIES,
      isOnboardingComplete,
      completeOnboarding
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}