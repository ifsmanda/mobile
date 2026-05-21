import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Modal, FlatList, ActivityIndicator, Image
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function GuruPersetujuanScreen() {
  const { session, profile } = useAuth();
  const { colors } = useTheme();

  // Navigation Tabs: 'POIN' atau 'IZIN'
  const [activeTab, setActiveTab] = useState('POIN');

  // States untuk Persetujuan Poin
  const [pendingActivities, setPendingActivities] = useState([]);
  const [loadingPoin, setLoadingPoin] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [poinNote, setPoinNote] = useState('');
  const [processingPoin, setProcessingPoin] = useState(false);

  // States untuk Persetujuan Izin Piket
  const [pendingPermissions, setPendingPermissions] = useState([]);
  const [loadingIzin, setLoadingIzin] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [processingIzin, setProcessingIzin] = useState(false);
  const [isUsingMockPermissions, setIsUsingMockPermissions] = useState(false);

  // Fetch Aktivitas Poin Karakter Pending
  const fetchPendingActivities = async () => {
    try {
      setLoadingPoin(true);
      const { data, error } = await supabase
        .from('sr_activities')
        .select(`
          id,
          student_id,
          type,
          description,
          attachment_url,
          status,
          point_override,
          event_date,
          student:student_id (
            id,
            full_name,
            nomor_induk
          ),
          rule:rule_id (
            id,
            name,
            default_point,
            type
          )
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingActivities(data || []);
    } catch (e) {
      console.error('Error fetching activities:', e);
      Alert.alert('Gagal Memuat Data', 'Gagal memuat daftar aktivitas pending.');
    } finally {
      setLoadingPoin(false);
    }
  };

  // Fetch Perizinan Piket Pending
  const fetchPendingPermissions = async () => {
    try {
      setLoadingIzin(true);
      
      // Ambil dari database dengan fallback jika tabel belum ada
      const { data, error } = await supabase
        .from('sr_permissions')
        .select(`
          id,
          student_id,
          tipe,
          alasan,
          waktu,
          status,
          created_at,
          student:student_id (
            full_name,
            nomor_induk
          )
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingPermissions(data || []);
      setIsUsingMockPermissions(false);
    } catch (e) {
      console.warn('sr_permissions table error or missing, using mock data:', e);
      setIsUsingMockPermissions(true);
      
      // Mock data perizinan untuk demo / uji coba v1
      setPendingPermissions([
        {
          id: 'mock-1',
          student_id: 'dummy-siswa-1',
          tipe: 'Izin Keluar Sekolah',
          alasan: 'Membeli perlengkapan karton untuk tugas seni budaya di koperasi luar.',
          waktu: 'Hari ini, 09:45 - 10:30 WIB',
          status: 'PENDING',
          created_at: new Date().toISOString(),
          student: {
            full_name: 'Aurelia Nisrina Hidayat',
            nomor_induk: '252610007'
          }
        },
        {
          id: 'mock-2',
          student_id: 'dummy-siswa-2',
          tipe: 'Izin Menggunakan Jaket',
          alasan: 'Badan menggigil dingin, indikasi gejala flu.',
          waktu: 'Hari ini, Jam Ke 1 s/d Jam Ke 8',
          status: 'PENDING',
          created_at: new Date().toISOString(),
          student: {
            full_name: 'Raffi Ahmad Dhani',
            nomor_induk: '252610089'
          }
        }
      ]);
    } finally {
      setLoadingIzin(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'POIN') {
      fetchPendingActivities();
    } else {
      fetchPendingPermissions();
    }
  }, [activeTab]);

  // Proses Approval Aktivitas Poin
  const handleProcessPoin = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedActivity) return;
    setProcessingPoin(true);

    try {
      // 1. Update status aktivitas
      const { error: updateError } = await supabase
        .from('sr_activities')
        .update({
          status: status,
          teacher_id: session.user.id,
          notes: poinNote
        })
        .eq('id', selectedActivity.id);

      if (updateError) throw updateError;

      // 2. Jika disetujui, tambahkan entri ledger poin
      if (status === 'APPROVED') {
        // Hitung poin delta. Jika tipe negatif, buat nilainya negatif
        const isNegatif = selectedActivity.rule?.type === 'NEGATIF';
        const rawPoint = selectedActivity.point_override || selectedActivity.rule?.default_point || 0;
        const delta = isNegatif ? -Math.abs(rawPoint) : Math.abs(rawPoint);

        const { error: ledgerError } = await supabase
          .from('sr_point_ledgers')
          .insert([{
            student_id: selectedActivity.student_id,
            source_type: isNegatif ? 'AKTIVITAS_NEGATIF' : 'AKTIVITAS_POSITIF',
            source_id: selectedActivity.id,
            delta_point: delta
          }]);

        if (ledgerError) throw ledgerError;
      }

      Alert.alert('Sukses', `Laporan aktivitas berhasil ${status === 'APPROVED' ? 'disetujui & poin ditambahkan' : 'ditolak'}.`);
      setSelectedActivity(null);
      setPoinNote('');
      fetchPendingActivities();
    } catch (err: any) {
      Alert.alert('Gagal Memproses', err.message);
    } finally {
      setProcessingPoin(false);
    }
  };

  // Proses Approval Perizinan
  const handleProcessIzin = async (status: 'DISETUJUI' | 'DITOLAK') => {
    if (!selectedPermission) return;

    if (isUsingMockPermissions) {
      // Jalankan logika simulasi lokal untuk mock data
      setProcessingIzin(true);
      setTimeout(() => {
        setPendingPermissions(prev => prev.filter(p => p.id !== selectedPermission.id));
        setProcessingIzin(false);
        setSelectedPermission(null);
        Alert.alert('Sukses (Simulasi)', `Izin digital berhasil ${status.toLowerCase()}.`);
      }, 800);
      return;
    }

    setProcessingIzin(true);
    try {
      const { error } = await supabase
        .from('sr_permissions')
        .update({
          status: status,
          approver_id: session.user.id
        })
        .eq('id', selectedPermission.id);

      if (error) throw error;

      Alert.alert('Sukses', `Izin digital berhasil ${status.toLowerCase()}.`);
      setSelectedPermission(null);
      fetchPendingPermissions();
    } catch (err: any) {
      Alert.alert('Gagal Memproses', err.message);
    } finally {
      setProcessingIzin(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Menu Persetujuan</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>
          Validasi pengajuan perolehan poin dan perizinan digital siswa
        </Text>
      </View>

      {/* Segmented Tab */}
      <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'POIN' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('POIN')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'POIN' ? colors.primary : colors.textMuted }]}>
            Poin Karakter ({pendingActivities.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'IZIN' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('IZIN')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'IZIN' ? colors.primary : colors.textMuted }]}>
            Izin Piket ({pendingPermissions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'POIN' ? (
        // ================= TAB POIN =================
        loadingPoin ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="medium" color={colors.primary} />
          </View>
        ) : pendingActivities.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="sparkles-outline" size={44} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tidak ada laporan poin pending.</Text>
          </View>
        ) : (
          <FlatList
            data={pendingActivities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setSelectedActivity(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.studentName, { color: colors.text }]}>{item.student?.full_name}</Text>
                  <View style={[styles.badge, { backgroundColor: item.type === 'POSITIF' ? '#10B98115' : '#EF444415' }]}>
                    <Text style={[styles.badgeText, { color: item.type === 'POSITIF' ? '#10B981' : '#EF4444' }]}>
                      {item.type === 'POSITIF' ? `+${item.rule?.default_point} Poin` : `-${item.rule?.default_point} Poin`}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.ruleName, { color: colors.text }]}>{item.rule?.name}</Text>
                <Text style={[styles.descExcerpt, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.description || 'Tidak ada keterangan tambahan.'}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={[styles.dateText, { color: colors.textMuted }]}>
                    📅 {new Date(item.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={[styles.actionPrompt, { color: colors.primary }]}>Ketuk untuk Validasi &rarr;</Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContainer}
          />
        )
      ) : (
        // ================= TAB IZIN =================
        loadingIzin ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="medium" color={colors.primary} />
          </View>
        ) : (
          <>
            {isUsingMockPermissions && (
              <View style={styles.fallbackNotice}>
                <Ionicons name="information-circle" size={16} color="#B45309" style={{ marginRight: 6 }} />
                <Text style={styles.fallbackText}>
                  Menjalankan Mode Simulasi (Tabel `sr_permissions` belum ada di DB).
                </Text>
              </View>
            )}
            {pendingPermissions.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="checkmark-done" size={44} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Semua perizinan digital selesai.</Text>
              </View>
            ) : (
              <FlatList
                data={pendingPermissions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setSelectedPermission(item)}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={[styles.studentName, { color: colors.text }]}>{item.student?.full_name}</Text>
                      <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>{item.tipe}</Text>
                      </View>
                    </View>
                    <Text style={[styles.ruleName, { color: colors.text, fontSize: 13 }]}>{item.alasan}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>⏱️ {item.waktu}</Text>
                      <Text style={[styles.actionPrompt, { color: colors.primary }]}>Ketuk untuk Proses &rarr;</Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContainer}
              />
            )}
          </>
        )
      )}

      {/* ================= MODAL DETAIL POIN ================= */}
      {selectedActivity && (
        <Modal
          visible={!!selectedActivity}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedActivity(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Validasi Laporan Poin</Text>
                <TouchableOpacity onPress={() => setSelectedActivity(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Siswa Info */}
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Siswa:</Text>
                  <Text style={[styles.metaVal, { color: colors.text }]}>{selectedActivity.student?.full_name}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>NISN:</Text>
                  <Text style={[styles.metaVal, { color: colors.text }]}>{selectedActivity.student?.nomor_induk || '-'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Kategori:</Text>
                  <Text style={[styles.metaVal, { color: colors.text, fontWeight: 'bold' }]}>
                    {selectedActivity.rule?.name} ({selectedActivity.type === 'POSITIF' ? '+' : '-'}{selectedActivity.rule?.default_point} Poin)
                  </Text>
                </View>

                {/* Deskripsi */}
                <Text style={[styles.bodyLabel, { color: colors.textMuted, marginTop: 12 }]}>Keterangan Kegiatan:</Text>
                <Text style={[styles.bodyText, { color: colors.text }]}>
                  {selectedActivity.description || 'Tidak ada deskripsi tambahan.'}
                </Text>

                {/* Bukti Foto */}
                {selectedActivity.attachment_url && (
                  <View style={styles.imageContainer}>
                    <Text style={[styles.bodyLabel, { color: colors.textMuted }]}>Bukti Lampiran Foto:</Text>
                    <Image source={{ uri: selectedActivity.attachment_url }} style={styles.attachmentImg} resizeMode="contain" />
                  </View>
                )}

                {/* Catatan Guru */}
                <Text style={[styles.bodyLabel, { color: colors.textMuted, marginTop: 16 }]}>Catatan Tambahan Guru (Opsional):</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Bagus sekali / Verifikasi valid..."
                  placeholderTextColor={colors.textMuted}
                  value={poinNote}
                  onChangeText={setPoinNote}
                />

                {/* Tombol Aksi */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.btnAction, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleProcessPoin('REJECTED')}
                    disabled={processingPoin}
                  >
                    {processingPoin ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>TOLAK</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAction, { backgroundColor: '#10B981', marginLeft: 12 }]}
                    onPress={() => handleProcessPoin('APPROVED')}
                    disabled={processingPoin}
                  >
                    {processingPoin ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>SETUJUI</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ================= MODAL DETAIL IZIN PIKET ================= */}
      {selectedPermission && (
        <Modal
          visible={!!selectedPermission}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedPermission(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Validasi Izin Digital</Text>
                <TouchableOpacity onPress={() => setSelectedPermission(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Siswa Info */}
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Siswa:</Text>
                  <Text style={[styles.metaVal, { color: colors.text }]}>{selectedPermission.student?.full_name}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>NISN:</Text>
                  <Text style={[styles.metaVal, { color: colors.text }]}>{selectedPermission.student?.nomor_induk || '-'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Tipe Izin:</Text>
                  <Text style={[styles.metaVal, { color: colors.text, fontWeight: 'bold' }]}>
                    {selectedPermission.tipe}
                  </Text>
                </View>

                {/* Alasan */}
                <Text style={[styles.bodyLabel, { color: colors.textMuted, marginTop: 12 }]}>Alasan Perizinan:</Text>
                <Text style={[styles.bodyText, { color: colors.text }]}>
                  {selectedPermission.alasan}
                </Text>

                {/* Waktu */}
                <Text style={[styles.bodyLabel, { color: colors.textMuted, marginTop: 12 }]}>Waktu/Durasi:</Text>
                <Text style={[styles.bodyText, { color: colors.text, fontWeight: 'bold' }]}>
                  {selectedPermission.waktu}
                </Text>

                {/* Tombol Aksi */}
                <View style={[styles.actionButtonsContainer, { marginTop: 32 }]}>
                  <TouchableOpacity
                    style={[styles.btnAction, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleProcessIzin('DITOLAK')}
                    disabled={processingIzin}
                  >
                    {processingIzin ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>TOLAK</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAction, { backgroundColor: '#10B981', marginLeft: 12 }]}
                    onPress={() => handleProcessIzin('DISETUJUI')}
                    disabled={processingIzin}
                  >
                    {processingIzin ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>SETUJUI</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    textAlign: 'center',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 110,
  },
  fallbackNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
  },
  fallbackText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: 'bold',
    flex: 1,
  },
  itemCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 0.7,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  ruleName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  descExcerpt: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.05)',
    paddingTop: 8,
  },
  dateText: {
    fontSize: 10,
  },
  actionPrompt: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    width: 80,
    fontSize: 12,
    fontWeight: '600',
  },
  metaVal: {
    flex: 1,
    fontSize: 12,
  },
  bodyLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  imageContainer: {
    marginVertical: 12,
  },
  attachmentImg: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: '#000',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  btnAction: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  }
});
