import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Redirect } from 'expo-router';
import { View, TouchableOpacity, Platform } from 'react-native';

export default function SiswaLayout() {
  const { session, profile } = useAuth();
  const { colors } = useTheme();

  if (!session || profile?.role?.toUpperCase() !== 'SISWA') {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 82 : 72,
          position: 'absolute',
          bottom: 16,
          left: 28,
          right: 28,
          borderRadius: 24,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: 'bold',
          marginTop: 2,
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perizinan"
        options={{
          title: 'Izin',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "document-text" : "document-text-outline"} size={22} color={color} />
          ),
        }}
      />
      
      {/* TOMBOL PRESENSI QR FLOATING DI TENGAH */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Presensi',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              activeOpacity={0.8}
              style={{
                top: Platform.OS === 'ios' ? -22 : -18,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999,
              }}
            >
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  elevation: 6,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  borderWidth: 4,
                  borderColor: colors.tabBar,
                }}
              >
                <Ionicons name="qr-code" size={24} color="#FFF" />
              </View>
            </TouchableOpacity>
          )
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* SEMBUNYIKAN MENU YANG BELUM DIGUNAKAN ATAU DIAKSES VIA BANNER */}
      <Tabs.Screen
        name="informasi"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="jadwal"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tugas"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
