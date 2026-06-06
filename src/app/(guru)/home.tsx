import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Image, Dimensions
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function GuruHomeScreen() {
  const { session, profile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    attendanceToday: 0,
    pendingActivities: 0,
    pendingPermissions: 0
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // 1. Ambil jumlah presensi hari ini
      const { count: attendanceCount, error: attError } = await supabase
        .from('sr_attendance_records')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00.000Z`);

      // 2. Ambil jumlah aktivitas karakter pending
      const { count: activitiesCount, error: actError } = await supabase
        .from('sr_activities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      // 3. Ambil jumlah perizinan piket pending (fallback ke 0 jika tabel belum ada)
      let permissionsCount = 0;
      try {
        const { count, error: permError } = await supabase
          .from('sr_permissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');
        if (!permError && count !== null) {
          permissionsCount = count;
        }
      } catch (err) {
        console.warn('sr_permissions table might not exist yet:', err);
      }

      setStats({
        attendanceToday: attendanceCount || 0,
        pendingActivities: activitiesCount || 0,
        pendingPermissions: permissionsCount
      });
    } catch (e) {
      console.error('Error fetching stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Format peran Guru untuk tampilan
  const getRolesList = () => {
    const roles = [];
    if (profile?.is_kepsek) roles.push('Kepala Sekolah');
    if (profile?.is_piket) roles.push('Guru Piket');
    if (profile?.is_walikelas) roles.push(`Wali Kelas ${profile?.kelas_binaan || ''}`);
    if (profile?.is_manajemen) {
      const field = profile?.manajemen_role ? (profile.manajemen_role.charAt(0) + profile.manajemen_role.slice(1).toLowerCase()) : 'Sekolah';
      roles.push(`${profile?.is_waka ? 'Waka' : 'Staf'} ${field}`);
    }
    
    if (roles.length === 0) {
      return profile?.role === 'ADMIN' ? 'Administrator' : 'Guru Mata Pelajaran';
    }
    return roles.join(' • ');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Guru */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greetingLabel, { color: colors.textMuted }]}>Selamat Bertugas,</Text>
            <Text style={[styles.greetingName, { color: colors.text }]}>{profile?.full_name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>{getRolesList()}</Text>
            </View>
          </View>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={[styles.avatar, { borderColor: colors.border }]} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Ringkasan Statistik Hari Ini */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Statistik Sekolah Hari Ini</Text>
          <TouchableOpacity onPress={fetchStats} style={styles.refreshButton}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {/* Box 1: Kehadiran */}
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(guru)/presensi')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#3B82F615' }]}>
                <Ionicons name="people" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.attendanceToday}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Siswa Hadir</Text>
            </TouchableOpacity>

            {/* Box 2: Poin Pending */}
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(guru)/persetujuan')}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="ribbon" size={20} color={colors.warning} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.pendingActivities}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Persetujuan Poin</Text>
            </TouchableOpacity>

            {/* Box 3: Perizinan Pending */}
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(guru)/persetujuan')}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="document-text" size={20} color={colors.success} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.pendingPermissions}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Izin Piket Pending</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Banner Panduan Penggunaan Guru */}
        <View style={[styles.bannerContainer, { backgroundColor: colors.primary }]}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Uji Coba Lensa Grafity v1.0</Text>
            <Text style={styles.bannerDesc}>
              Kelola aktivitas harian, presensi QR kelas, persetujuan poin karakter, dan pantau kedisiplinan siswa langsung dari genggaman Anda.
            </Text>
          </View>
          <Ionicons name="school" size={70} color="rgba(255,255,255,0.15)" style={styles.bannerIcon} />
        </View>

        {/* Menu Akses Cepat */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12, marginBottom: 12 }]}>Aksi Cepat</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(guru)/presensi')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="qr-code" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Buat QR Presensi</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(guru)/persetujuan')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="checkmark-done-circle" size={22} color={colors.success} />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Menu Persetujuan</Text>
          </TouchableOpacity>
        </View>
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 4,
  },
  loadingBox: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 0.31,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  bannerContainer: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
    elevation: 4,
  },
  bannerContent: {
    flex: 1,
    zIndex: 2,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  bannerDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 16,
  },
  bannerIcon: {
    position: 'absolute',
    right: -10,
    bottom: -15,
    zIndex: 1,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 0.48,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  }
});
