import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile?.avatar_url) {
      setLocalAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

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

  // Fungsi Pilih & Upload Foto Profil
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Akses ke galeri foto diperlukan untuk mengganti foto profil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploading(true);
        const asset = result.assets[0];
        const base64Data = asset.base64;
        
        if (!base64Data) {
          throw new Error('Gagal membaca data gambar dari galeri.');
        }

        const dataUrl = `data:image/jpeg;base64,${base64Data}`;

        // Update ke database Supabase
        const { error } = await supabase
          .from('sr_profiles')
          .update({ avatar_url: dataUrl })
          .eq('id', session.user.id);

        if (error) {
          throw error;
        }

        setLocalAvatarUrl(dataUrl);
        if (refreshProfile) {
          await refreshProfile();
        }
        Alert.alert('Sukses', 'Foto profil berhasil diperbarui.');
      }
    } catch (e: any) {
      console.warn('Upload error:', e);
      Alert.alert(
        'Gagal', 
        `Terjadi kesalahan saat mengunggah foto profil: ${e.message || JSON.stringify(e)}`
      );
    } finally {
      setUploading(false);
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
          
          {/* Avatar Container Clickable */}
          <TouchableOpacity 
            style={[styles.avatarContainer, { borderColor: colors.border }]} 
            onPress={pickImage}
            disabled={uploading}
            activeOpacity={0.8}
          >
            {uploading ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            ) : localAvatarUrl ? (
              <Image source={{ uri: localAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="person" size={48} color={colors.primary} />
              </View>
            )}
            
            {/* Edit Icon Overlay */}
            <View style={[styles.editIconBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

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
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    zIndex: 3,
  },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
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
