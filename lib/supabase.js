import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Deteksi apakah sedang berjalan di lingkungan SSR Node.js
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

const customStorage = isServer ? {
  getItem: (key) => Promise.resolve(null),
  setItem: (key, value) => Promise.resolve(),
  removeItem: (key) => Promise.resolve(),
} : AsyncStorage;

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found. Please set them in mobile/.env");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: customStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
