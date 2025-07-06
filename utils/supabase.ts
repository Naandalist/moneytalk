import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

// Replace with your Supabase project URL and anon key
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

/**
 * Initialize Supabase client with AsyncStorage for session persistence
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Database table definitions for Supabase
 */
export const SUPABASE_TABLES = {
  TRANSACTIONS: 'transactions',
  AI_SUGGESTIONS: 'ai_suggestions',
  DAILY_REFRESH_COUNT: 'daily_refresh_count',
  SETTINGS: 'settings',
  USER_PROFILES: 'user_profiles',
} as const;