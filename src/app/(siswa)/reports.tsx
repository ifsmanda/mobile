import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  ActivityIndicator, TouchableOpacity, RefreshControl
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Saldo awal poin setiap siswa
const BASE_POINT = 2000;

// Tabel predikat berdasarkan total poin
const PREDIKAT_TABLE = [
  { min: 2500, max: 9999, label: 'ISTIMEWA',          color: '#8B5CF6' },
  { min: 2200, max: 2499, label: 'LUAR BIASA',         color: '#3B82F6' },
  { min: 1900, max: 2199, label: 'NORMAL',              color: '#22C55E' },
  { min: 1800, max: 1899, label: 'PEMBINAAN 1',         color: '#84CC16' },
  { min: 1700, max: 1799, label: 'PEMBINAAN 2',         color: '#EAB308' },
  { min: 1600, max: 1699, label: 'PEMBINAAN 3',         color: '#F59E0B' },
  { min: 1500, max: 1599, label: 'PEMBINAAN 4',         color: '#F97316' },
  { min: 0,    max: 1499, label: 'INTERVENSI KHUSUS',   color: '#EF4444' },
];

const getPredikat = (totalPoin) => {
  return PREDIKAT_TABLE.find(p => totalPoin >= p.min && totalPoin <= p.max)
    || { label: 'TIDAK DIKETAHUI', color: '#64748B' };
};

export default function ReportsScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('KARAKTER');

  // Data Karakter
  const [deltaPoin, setDeltaPoin]   = useState(0);   // perubahan dari ledger
  const [activities, setActivities] = useState([]);
  const [absensi, setAbsensi]       = useState({ hadir: 0, terlambat: 0, alpa: 0 });

  const totalPoin = BASE_POINT + deltaPoin;
  const predikat  = getPredikat(totalPoin);

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      // 1. Delta poin dari ledger
      const { data: ledgers } = await supabase
        .from('sr_point_ledgers')
        .select('delta_point')
        .eq('student_id', session.user.id);

      if (ledgers) {
        const sum = ledgers.reduce((acc, cur) => acc + cur.delta_point, 0);
        setDeltaPoin(sum);
      }

      // 2. Riwayat aktivitas
      const { data: acts } = await supabase
        .from('sr_activities')
        .select('id, type, description, status, event_date, sr_point_rules(name, default_point)')
        .eq('student_id', session.user.id)
        .order('event_date', { ascending: false })
        .limit(30);

      if (acts) setActivities(acts);

      // 3. Rekap absensi dari attendance_records
      const { data: records } = await supabase
        .from('sr_attendance_records')
        .select('status')
        .eq('student_id', session.user.id);

      if (records) {
        const hadir    = records.filter(r => r.status === 'HADIR').length;
        const terlambat = records.filter(r => r.status === 'TERLAMBAT').length;
        const alpa     = records.filter(r => r.status === 'DITOLAK').length;
        setAbsensi({ hadir, terlambat, alpa });
      }
    } catch (err) {
      console.warn('Error fetching reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'APPROVED': return { bg: colors.iconBox2, color: colors.success,  text: 'Disetujui' };
      case 'PENDING':  return { bg: colors.iconBox3, color: colors.warning,  text: 'Menunggu'  };
      case 'REJECTED': return { bg: 'rgba(239,68,68,0.15)', color: colors.danger, text: 'Ditolak' };
      default: return { bg: colors.border, color: colors.textMuted, text: status };
    }
  };

  const totalAbsensi = absensi.hadir + absensi.terlambat + absensi.alpa;
  const pctHadir = totalAbsensi > 0 ? Math.round((absensi.hadir / totalAbsensi) * 100) : 0;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Dashboard Laporan</Text>
      </View>

      {/* Segmented Control */}
      <View style={[styles.segmentWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {['KARAKTER', 'AKADEMIK'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.segmentBtn, activeTab === tab && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.segmentText, { color: activeTab === tab ? '#fff' : colors.textMuted }]}>
              {tab === 'KARAKTER' ? '🧑‍🎓 Karakter' : '📚 Akademik'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {activeTab === 'AKADEMIK' ? (
          /* ── AKADEMIK (Coming Soon) ── */
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Laporan Akademik</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Fitur rekap nilai, jadwal, dan raport sedang dalam tahap pengembangan.
            </Text>
          </View>
        ) : (
          /* ── KARAKTER ── */
          <>
            {/* Kartu Poin Utama */}
            <View style={[styles.pointCard, { backgroundColor: predikat.color }]}>
              <Text style={styles.pointCardLabel}>Total Poin Kedisiplinan</Text>
              <Text style={styles.pointCardValue}>{totalPoin.toLocaleString('id-ID')}</Text>
              <View style={styles.predikatBadge}>
                <Text style={styles.predikatText}>{predikat.label}</Text>
              </View>
              <Text style={styles.pointCardSub}>
                Poin awal: {BASE_POINT.toLocaleString('id-ID')}
                {deltaPoin >= 0 ? ` + ${deltaPoin}` : ` - ${Math.abs(deltaPoin)}`}
              </Text>
            </View>

            {/* Rekap Absensi */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Rekap Kehadiran</Text>
            <View style={[styles.absensiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.absensiRow}>
                {[
                  { label: 'Hadir',     value: absensi.hadir,     color: colors.success, icon: 'checkmark-circle' },
                  { label: 'Terlambat', value: absensi.terlambat, color: colors.warning, icon: 'time'             },
                  { label: 'Alpa',      value: absensi.alpa,      color: colors.danger,  icon: 'close-circle'     },
                ].map(item => (
                  <View key={item.label} style={styles.absensiItem}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                    <Text style={[styles.absensiValue, { color: colors.text }]}>{item.value}</Text>
                    <Text style={[styles.absensiLabel, { color: colors.textMuted }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.pctBar, { backgroundColor: colors.border }]}>
                <View style={[styles.pctFill, { width: `${pctHadir}%`, backgroundColor: colors.success }]} />
              </View>
              <Text style={[styles.pctText, { color: colors.textMuted }]}>
                Tingkat Kehadiran: {pctHadir}%  ({totalAbsensi} pertemuan tercatat)
              </Text>
            </View>

            {/* Tombol Lapor Aktivitas */}
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(siswa)/activity')}
            >
              <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.addBtnText}>Lapor Aktivitas Baru</Text>
            </TouchableOpacity>

            {/* Riwayat Aktivitas */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Riwayat Aktivitas & Poin</Text>

            {activities.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyDesc, { color: colors.textMuted, marginTop: 8 }]}>
                  Belum ada riwayat aktivitas.
                </Text>
              </View>
            ) : (
              activities.map(item => {
                const st = getStatusStyle(item.status);
                const isPos = item.type === 'POSITIF';
                const poin = item.sr_point_rules?.default_point ?? 0;
                const date = new Date(item.event_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

                return (
                  <View key={item.id} style={[styles.actCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.actIcon, { backgroundColor: isPos ? colors.iconBox2 : 'rgba(239,68,68,0.12)' }]}>
                      <Ionicons
                        name={isPos ? 'trending-up' : 'trending-down'}
                        size={22}
                        color={isPos ? colors.success : colors.danger}
                      />
                    </View>
                    <View style={styles.actContent}>
                      <Text style={[styles.actName, { color: colors.text }]} numberOfLines={1}>
                        {item.sr_point_rules?.name ?? 'Aktivitas'}
                      </Text>
                      <Text style={[styles.actDesc, { color: colors.textMuted }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <Text style={[styles.actDate, { color: colors.textMuted }]}>{date}</Text>
                    </View>
                    <View style={styles.actRight}>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.color }]}>{st.text}</Text>
                      </View>
                      {item.status === 'APPROVED' && (
                        <Text style={[styles.pointDelta, { color: isPos ? colors.success : colors.danger }]}>
                          {isPos ? `+${poin}` : `-${poin}`}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:         { padding: 20, paddingTop: 40, borderBottomWidth: 1 },
  headerTitle:    { fontSize: 20, fontWeight: 'bold' },
  segmentWrap:    { flexDirection: 'row', margin: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  segmentBtn:     { flex: 1, paddingVertical: 12, alignItems: 'center' },
  segmentText:    { fontWeight: 'bold', fontSize: 14 },
  scroll:         { padding: 16, paddingBottom: 40 },

  // Kartu poin
  pointCard:      { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  pointCardLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  pointCardValue: { color: '#fff', fontSize: 56, fontWeight: 'bold' },
  predikatBadge:  { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginVertical: 10 },
  predikatText:   { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  pointCardSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  // Absensi
  sectionTitle:   { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 4 },
  absensiCard:    { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  absensiRow:     { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  absensiItem:    { alignItems: 'center' },
  absensiValue:   { fontSize: 22, fontWeight: 'bold', marginTop: 6 },
  absensiLabel:   { fontSize: 12, marginTop: 2 },
  pctBar:         { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  pctFill:        { height: '100%', borderRadius: 4 },
  pctText:        { fontSize: 12, textAlign: 'center' },

  // Tombol
  addBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 14, marginBottom: 24 },
  addBtnText:     { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Kartu aktivitas
  actCard:        { flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  actIcon:        { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actContent:     { flex: 1 },
  actName:        { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  actDesc:        { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  actDate:        { fontSize: 11 },
  actRight:       { alignItems: 'flex-end', justifyContent: 'center' },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6 },
  statusText:     { fontSize: 10, fontWeight: 'bold' },
  pointDelta:     { fontSize: 16, fontWeight: 'bold' },

  // Empty
  emptyState:     { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:     { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptyDesc:      { fontSize: 14, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },
});
