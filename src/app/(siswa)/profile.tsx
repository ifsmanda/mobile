import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { session, profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya, Keluar', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
      }}
    ]);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Peringatan', 'Password minimal 6 karakter.');
      return;
    }
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPass(false);

    if (error) {
      Alert.alert('Gagal', error.message);
    } else {
      Alert.alert('Sukses', 'Password berhasil diubah.');
      setNewPassword('');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profil Saya</Text>
        {/* Theme Toggle */}
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
          <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="person" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{profile?.full_name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>{profile?.role}</Text>
          </View>
        </View>

        {/* Info Pribadi */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Data Pribadi</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.iconBox1 }]}>
              <Ionicons name="mail" size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email (Username)</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{session?.user?.email}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.iconBox3 }]}>
              <Ionicons name="card" size={16} color={colors.warning} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>No Induk / NISN</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profile?.nomor_induk || '-'}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.iconBox2 }]}>
              <Ionicons name="school" size={16} color={colors.success} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Kelas Saat Ini</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profile?.class_name || 'Belum Terdaftar'}</Text>
            </View>
          </View>
        </View>

        {/* Ganti Password */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Ganti Password</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Masukkan password baru..."
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity 
            style={[styles.btnSecondary, { backgroundColor: colors.primary }]} 
            onPress={handleChangePassword}
            disabled={changingPass}
          >
            {changingPass 
              ? <ActivityIndicator color="white" /> 
              : <Text style={styles.btnSecondaryText}>Simpan Password Baru</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Tombol Logout */}
        <TouchableOpacity 
          style={[styles.btnLogout, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.danger} style={{marginRight: 10}} />
          <Text style={[styles.btnLogoutText, { color: colors.danger }]}>Keluar dari Akun</Text>
        </TouchableOpacity>
        
        <Text style={[styles.appVersion, { color: colors.textMuted }]}>Smart-Report Siswa v1.0.0 (Beta)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  themeToggle: { padding: 4 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileCard: {
    alignItems: 'center',
    borderRadius: 20,
    padding: 30,
    marginBottom: 24,
    borderWidth: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 13, fontWeight: 'bold' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  infoIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: 4 },
  input: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    fontSize: 15,
  },
  btnSecondary: { padding: 14, borderRadius: 12, alignItems: 'center' },
  btnSecondaryText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  btnLogout: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 30,
  },
  btnLogoutText: { fontWeight: 'bold', fontSize: 16 },
  appVersion: { textAlign: 'center', fontSize: 12 },
});
