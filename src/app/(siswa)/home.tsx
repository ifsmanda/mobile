import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, Image, RefreshControl, Modal, ActivityIndicator, Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

export default function HomeScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(100); // Default fallback
  const [pendingActivities, setPendingActivities] = useState(0);
  const [recentLogs, setRecentLogs] = useState([]);
  
  // State Presensi Hari Ini
  const [attendanceMasuk, setAttendanceMasuk] = useState({ done: false, time: '--:--', status: '', label: 'Belum Presensi' });

  // State Notifikasi
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    try {
      setLoading(true);
      const promises = [
        fetchPoints(),
        fetchTodayAttendance(),
        fetchRecentLogs(),
        fetchNotifications()
      ];
      if (refreshProfile) {
        promises.push(refreshProfile());
      }
      await Promise.all(promises);
    } catch (e) {
      console.warn('Error loading home data:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Fetch Total Poin dari Ledger
  const fetchPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('sr_point_ledgers')
        .select('delta_point')
        .eq('student_id', session.user.id);
      
      if (error) throw error;
      
      const total = data ? data.reduce((acc, curr) => acc + curr.delta_point, 0) : 0;
      setTotalPoints(total);
    } catch (e) {
      console.warn('Failed to fetch points:', e);
    }
  };

  // Fetch Presensi Hari Ini
  const fetchTodayAttendance = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('sr_attendance_records')
        .select(`
          status,
          created_at,
          session:sr_attendance_sessions(session_type)
        `)
        .eq('student_id', session.user.id)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (error) throw error;

      // Reset
      setAttendanceMasuk({ done: false, time: '--:--', status: '', label: 'Belum Presensi' });

      if (data && data.length > 0) {
        data.forEach(record => {
          const timeString = new Date(record.created_at).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIB';

          const sessionType = record.session?.session_type;

          if (sessionType === 'HARIAN_MASUK') {
            let label = 'Belum Presensi';
            if (record.status === 'HADIR') label = 'Tepat Waktu';
            else if (record.status === 'TERLAMBAT') label = 'Terlambat';
            else if (record.status === 'DITOLAK') label = 'Ditolak';

            setAttendanceMasuk({ done: true, time: timeString, status: record.status, label });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to fetch today attendance:', e);
    }
  };

  // Fetch Riwayat Log Aktivitas & Poin Terbaru
  const fetchRecentLogs = async () => {
    try {
      // Ambil 5 aktivitas terbaru
      const { data: activities, error: actError } = await supabase
        .from('sr_activities')
        .select(`
          id,
          type,
          status,
          description,
          event_date,
          rule:sr_point_rules(name, default_point)
        `)
        .eq('student_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (actError) throw actError;

      // Ambil count pending
      const { count } = await supabase
        .from('sr_activities')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', session.user.id)
        .eq('status', 'PENDING');
      
      setPendingActivities(count || 0);

      // Map ke log format
      const formatted = (activities || []).map(item => ({
        id: item.id,
        title: item.rule?.name || 'Aktivitas',
        type: item.type, // POSITIF / NEGATIF
        status: item.status, // PENDING, APPROVED, REJECTED
        point: item.type === 'POSITIF' ? `+${item.rule?.default_point}` : `-${item.rule?.default_point}`,
        date: new Date(item.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        rawDate: item.event_date
      }));

      setRecentLogs(formatted);
    } catch (e) {
      console.warn('Failed to fetch recent logs:', e);
    }
  };

  // Fetch data notifikasi dari riwayat persetujuan & aktivitas terbaru
  const fetchNotifications = async () => {
    try {
      // 1. Fetch activities
      const { data: actData, error: actError } = await supabase
        .from('sr_activities')
        .select(`
          id,
          type,
          status,
          description,
          notes,
          created_at,
          rule:sr_point_rules(name)
        `)
        .eq('student_id', session.user.id)
        .in('status', ['APPROVED', 'REJECTED'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (actError) throw actError;

      // 2. Fetch attendance records
      const { data: attData, error: attError } = await supabase
        .from('sr_attendance_records')
        .select(`
          id,
          status,
          created_at,
          session:sr_attendance_sessions(session_type)
        `)
        .eq('student_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (attError) throw attError;

      // Map activities
      const actItems = (actData || []).map(item => {
        let msg = '';
        let iconName = 'notifications';
        let iconColor = colors.primary;

        if (item.status === 'APPROVED') {
          msg = `Laporan aktivitas "${item.rule?.name || item.description}" telah DISETUJUI. Poin bertambah!`;
          iconName = 'checkmark-circle';
          iconColor = colors.success;
        } else if (item.status === 'REJECTED') {
          msg = `Laporan aktivitas "${item.rule?.name || item.description}" DITOLAK. Catatan: ${item.notes || 'Tidak ada catatan.'}`;
          iconName = 'close-circle';
          iconColor = colors.danger;
        }

        return {
          id: item.id,
          message: msg,
          timestamp: new Date(item.created_at).getTime(),
          time: new Date(item.created_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
          }),
          icon: iconName,
          iconColor: iconColor
        };
      });

      // Map attendance
      const attItems = (attData || []).map(item => {
        const sType = item.session?.session_type === 'HARIAN_MASUK' ? 'Masuk Harian' : 'Pulang Harian';
        return {
          id: item.id,
          message: `Kehadiran Anda pada sesi "${sType}" tercatat dengan status: ${item.status}.`,
          timestamp: new Date(item.created_at).getTime(),
          time: new Date(item.created_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
          }),
          icon: 'location',
          iconColor: colors.primary
        };
      });

      // Merge and sort
      const merged = [...actItems, ...attItems].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

      setNotifications(merged);
      setHasUnreadNotifications(merged.length > 0);
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
    }
  };

  // Hitung predikat karakter siswa
  const getPredicate = () => {
    if (totalPoints >= 150) return { label: 'AMAT BAIK', color: '#8B5CF6' }; // Ungu
    if (totalPoints >= 100) return { label: 'BAIK', color: '#10B981' }; // Hijau
    if (totalPoints >= 50) return { label: 'CUKUP BAIK', color: '#F59E0B' }; // Orange
    return { label: 'PERLU BIMBINGAN', color: '#EF4444' }; // Merah
  };

  const predikat = getPredicate();

  // Helper tanggal hari ini
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        
        {/* HEADER: Greet & Actions */}
        <View style={styles.headerRow}>
          <View style={styles.headerGreeting}>
            <Text style={[styles.greetingText, { color: colors.text }]}>Halo,</Text>
            <Text style={[styles.nameText, { color: colors.text }]}>
              {profile?.full_name?.split(' ')[0] || 'Siswa'} 👋
            </Text>
            <Text style={[styles.subGreeting, { color: colors.textMuted }]}>Selamat belajar hari ini!</Text>
          </View>
          
          <View style={styles.headerActions}>
            {/* Theme Toggle */}
            <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={20} color={colors.text} />
            </TouchableOpacity>
            
            {/* Notification Bell */}
            <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setShowNotificationModal(true);
                setHasUnreadNotifications(false);
              }}
            >
              <Ionicons name="notifications" size={20} color={colors.text} />
              {hasUnreadNotifications && <View style={styles.badge} />}
            </TouchableOpacity>

            {/* Profile Avatar */}
            <TouchableOpacity 
              style={[styles.avatarBtn, { borderColor: colors.border, overflow: 'hidden' }]} 
              onPress={() => router.push('/(siswa)/profile')}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Ionicons name="person" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* BANNER PENGUMUMAN BERGAMBAR (Dalam Bentuk Card agar Seukuran & Tidak Terpotong) */}
        <TouchableOpacity 
          style={[styles.largeCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 12, marginBottom: 20 }]}
          onPress={() => router.push('/(siswa)/informasi')}
          activeOpacity={0.9}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../../../assets/images/trial_banner.png')}
              style={{ width: 80, height: 80, borderRadius: 12, marginRight: 16 }}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <View style={[styles.bannerLabel, { backgroundColor: colors.primaryLight, marginBottom: 6 }]}>
                <Text style={[styles.bannerLabelText, { color: colors.primary }]}>SOSIALISASI & UJI COBA</Text>
              </View>
              <Text style={[styles.bannerTitle, { color: colors.text, fontSize: 15, fontWeight: 'bold', lineHeight: 20 }]} numberOfLines={2}>
                Uji Coba Aplikasi Smart-Report
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                Versi 1.0 — SMAN 2 Bandung
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* KARTU UTAMA DITENGAH: PRESENSI & LAPOR AKTIVITAS (BESAR & PROPORSIAL) */}
        <View style={styles.mainGrid}>
          
          {/* CARD 1: PRESENSI (QR & GPS) */}
          <View style={[styles.largeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="time-sharp" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Presensi Masuk Pagi</Text>
            </View>

            <View style={styles.attendanceDetailRows}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Sudah Presensi</Text>
                <View style={[styles.smallBadge, { 
                  backgroundColor: attendanceMasuk.done ? colors.success + '15' : '#94A3B815' 
                }]}>
                  <Text style={{ 
                    fontSize: 12, 
                    fontWeight: 'bold', 
                    color: attendanceMasuk.done ? colors.success : '#64748B' 
                  }}>
                    {attendanceMasuk.done ? 'YA' : 'BELUM'}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Waktu Presensi</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {attendanceMasuk.time}
                </Text>
              </View>

              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Keterangan</Text>
                <View style={[styles.smallBadge, { 
                  backgroundColor: attendanceMasuk.done 
                    ? (attendanceMasuk.status === 'HADIR' ? colors.success + '15' : colors.warning + '15') 
                    : '#94A3B815'
                }]}>
                  <Text style={{ 
                    fontSize: 12, 
                    fontWeight: 'bold', 
                    color: attendanceMasuk.done 
                      ? (attendanceMasuk.status === 'HADIR' ? colors.success : colors.warning) 
                      : '#64748B'
                  }}>
                    {attendanceMasuk.done ? (attendanceMasuk.status === 'HADIR' ? 'Tepat Waktu' : 'Terlambat') : 'Belum Presensi'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.cardActionButton, { backgroundColor: colors.primary, marginTop: 12 }]}
              onPress={() => router.push('/(siswa)/attendance')}
            >
              <Ionicons name="qr-code-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.cardActionButtonText}>Pindai QR Presensi</Text>
            </TouchableOpacity>
          </View>

          {/* CARD 2: LAPOR AKTIVITAS & POIN */}
          <View style={[styles.largeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBox, { backgroundColor: colors.iconBox4 }]}>
                <Ionicons name="star" size={24} color="#A855F7" />
              </View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Jurnal Karakter</Text>
            </View>

            <View style={styles.pointStatusSection}>
              <View style={styles.pointRow}>
                <Text style={[styles.pointNumber, { color: colors.text }]}>{totalPoints}</Text>
                <Text style={[styles.pointUnit, { color: colors.textMuted }]}> Poin</Text>
              </View>

              <View style={[styles.predicateBadge, { backgroundColor: predikat.color }]}>
                <Text style={styles.predicateText}>{predikat.label}</Text>
              </View>

              <View style={styles.statsBriefRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.statsBriefText, { color: colors.textMuted }]}>
                  {pendingActivities} Laporan pending persetujuan
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.cardActionButton, { backgroundColor: colors.success }]}
              onPress={() => router.push('/(siswa)/activity')}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.cardActionButtonText}>Lapor Aktivitas Positif</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* LOG AKTIVITAS TERBARU */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Log Aktivitas Terbaru</Text>
          <TouchableOpacity onPress={() => router.push('/(siswa)/reports')}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: 'bold' }}>Lihat semua</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : recentLogs.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada aktivitas tercatat.</Text>
          </View>
        ) : (
          recentLogs.map((log) => (
            <View key={log.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.listIcon, { 
                backgroundColor: log.type === 'POSITIF' ? colors.iconBox2 : colors.danger + '15' 
              }]}>
                <Ionicons 
                  name={log.type === 'POSITIF' ? "add" : "alert-circle"} 
                  size={20} 
                  color={log.type === 'POSITIF' ? colors.success : colors.danger} 
                />
              </View>
              <View style={styles.listContent}>
                <Text style={[styles.listTitle, { color: colors.text }]}>{log.title}</Text>
                <View style={styles.statusRow}>
                  <Text style={[styles.listDesc, { color: colors.textMuted }]}>Status: </Text>
                  <Text style={{ 
                    fontSize: 12, 
                    fontWeight: 'bold',
                    color: log.status === 'APPROVED' ? colors.success : log.status === 'REJECTED' ? colors.danger : colors.warning 
                  }}>
                    {log.status}
                  </Text>
                </View>
              </View>
              <View style={styles.listRight}>
                <Text style={[styles.listPoint, { 
                  color: log.type === 'POSITIF' ? colors.success : colors.danger 
                }]}>
                  {log.point}
                </Text>
                <Text style={[styles.listTime, { color: colors.textMuted }]}>{log.date}</Text>
              </View>
            </View>
          ))
        )}

      </ScrollView>

      {/* MODAL NOTIFIKASI */}
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalOverlayBackground}>
          <View style={[styles.notificationBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.notifHeader}>
              <Text style={[styles.notifTitle, { color: colors.text }]}>Notifikasi</Text>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)} style={styles.notifCloseBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.notifEmptyText, { color: colors.textMuted }]}>Tidak ada notifikasi baru.</Text>
              </View>
            ) : (
              <ScrollView style={styles.notifList}>
                {notifications.map((notif) => (
                  <View key={notif.id} style={[styles.notifItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.notifIconContainer, { backgroundColor: notif.iconColor + '15' }]}>
                      <Ionicons name={notif.icon} size={20} color={notif.iconColor} />
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifMessage, { color: colors.text }]}>{notif.message}</Text>
                      <Text style={[styles.notifTime, { color: colors.textMuted }]}>{notif.time}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 110, // Memberi ruang bagi tab bar absolute
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerGreeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 15,
    lineHeight: 20,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subGreeting: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  
  // Banner
  bannerContainer: {
    width: '100%',
    aspectRatio: 2.3,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 14,
  },
  bannerLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  bannerLabelText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF',
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bannerDate: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginTop: 4,
  },

  // Grid
  mainGrid: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  largeCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  attendanceDetailRows: {
    backgroundColor: 'rgba(150, 150, 150, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardDivider: {
    height: 1,
    opacity: 0.1,
  },
  cardActionButton: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  
  // Point Section
  pointStatusSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 6,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  pointNumber: {
    fontSize: 32,
    fontWeight: '900',
  },
  pointUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  predicateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 10,
  },
  predicateText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsBriefRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsBriefText: {
    fontSize: 11,
    marginLeft: 6,
  },

  // List Cards
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
  },
  listCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listDesc: {
    fontSize: 11,
  },
  listRight: {
    alignItems: 'flex-end',
  },
  listPoint: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listTime: {
    fontSize: 10,
  },

  // Notif Modal
  modalOverlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  notificationBox: {
    height: '65%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  notifTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notifCloseBtn: {
    padding: 4,
  },
  notifEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifEmptyText: {
    fontSize: 14,
    marginTop: 10,
  },
  notifList: {
    flex: 1,
  },
  notifItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  notifIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 10,
  }
});
