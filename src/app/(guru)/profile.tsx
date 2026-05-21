import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Image
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function GuruProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null);

  useEffect(() => {
    if (profile?.avatar_url) {
      setLocalAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleLogout = async () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar dari akun Guru?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya, Keluar', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
      }}
    ]);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Peringatan', 'Kata sandi minimal 6 karakter.');
      return;
    }
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPass(false);

    if (error) {
      Alert.alert('Gagal', error.message);
    } else {
      Alert.alert('Sukses', 'Kata sandi berhasil diubah.');
      setNewPassword('');
    }
  };

  const getRolesList = () => {
    const roles = [];
    if (profile?.is_piket) roles.push('Guru Piket');
    if (profile?.is_walikelas) roles.push(`Wali Kelas ${profile?.kelas_binaan || ''}`);
    if (profile?.is_manajemen) roles.push('Manajemen');
    
    if (roles.length === 0) {
      return profile?.role === 'ADMIN' ? 'Administrator' : 'Guru Mata Pelajaran';
    }
    return roles.join(' • ');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profil Guru</Text>
        {/* Theme Toggle */}
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
          <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          
          <View style={[styles.avatarContainer, { borderColor: colors.border }]}>
            {localAvatarUrl ? (
              <Image source={{ uri: localAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="person" size={48} color={colors.primary} />
              </View>
            )}
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{profile?.full_name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>{getRolesList()}</Text>
          </View>
        </View>

        {/* Data Kepegawaian */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Data Kepegawaian</Text>
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
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>No Induk / NIP</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profile?.nomor_induk || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Ganti Password */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Ganti Password Akun</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Masukkan kata sandi baru..."
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
              : <Text style={styles.btnSecondaryText}>Simpan Kata Sandi Baru</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Tombol Logout */}
        <TouchableOpacity 
          style={[styles.btnLogout, { borderColor: colors.border }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.btnLogoutText}>Keluar Sesi Akun</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 45,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  themeToggle: {
    padding: 6,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    marginBottom: 14,
  },
  btnSecondary: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnLogout: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  btnLogoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
