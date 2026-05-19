import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const lightColors = {
  background: '#F8FAFC', // Slate 50
  card: '#FFFFFF',
  text: '#0F172A', // Slate 900
  textMuted: '#64748B', // Slate 500
  border: '#E2E8F0', // Slate 200
  primary: '#3B82F6', // Blue 500
  primaryLight: '#EFF6FF', // Blue 50
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  iconBox1: '#DBEAFE', // Blue 100
  iconBox2: '#D1FAE5', // Green 100
  iconBox3: '#FEF3C7', // Yellow 100
  iconBox4: '#F3E8FF', // Purple 100
};

export const darkColors = {
  background: '#121826', // Deep Dark Navy
  card: '#1E293B', // Slate 800
  text: '#F8FAFC', // Slate 50
  textMuted: '#94A3B8', // Slate 400
  border: 'rgba(255, 255, 255, 0.05)',
  primary: '#3B82F6',
  primaryLight: 'rgba(59, 130, 246, 0.1)',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  tabBar: '#121826',
  tabBarBorder: 'rgba(255,255,255,0.05)',
  iconBox1: 'rgba(59, 130, 246, 0.2)',
  iconBox2: 'rgba(16, 185, 129, 0.2)',
  iconBox3: 'rgba(245, 158, 11, 0.2)',
  iconBox4: 'rgba(168, 85, 247, 0.2)',
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode based on previous UI
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        // Fallback to system theme if not saved
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (e) {
      console.warn('Failed to load theme.');
    } finally {
      setIsLoaded(true);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem('appTheme', newTheme ? 'dark' : 'light');
    } catch (e) {
      console.warn('Failed to save theme.');
    }
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
