import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Modal, FlatList, ActivityIndicator
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function PerizinanScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  
  // State perizinan dengan default data mock (sebagai fallback jika tabel belum ada)
  const [perizinanList, setPerizinanList] = useState([
    {
      id: '1',
      tipe: 'Izin Keluar Sekolah',
      alasan: 'Ke fotokopi luar untuk tugas prakarya',
      waktu: 'Hari Ini, 09:30 - 10:30 WIB',
      status: 'DISETUJUI',
      approver: 'Bapak Asep, S.Pd. (Guru Piket)',
      date: '20 Mei 2026'
    },
    {
      id: '2',
      tipe: 'Izin Menggunakan Jaket',
      alasan: 'Sedang demam dan flu ringan',
      waktu: '19 Mei 2026, Full Day',
      status: 'DISETUJUI',
      approver: 'Ibu Rina, S.Pd. (Wali Kelas)',
      date: '19 Mei 2026'
    },
    {
      id: '3',
      tipe: 'Izin Pulang Cepat',
      alasan: 'Sakit demam tinggi, dijemput orang tua',
      waktu: '18 Mei 2026, 11:00 WIB',
      status: 'SELESAI',
      approver: 'Bapak Dadang (Guru Piket) & UKS',
      date: '18 Mei 2026'
    },
    {
      id: '4',
      tipe: 'Izin Masuk Terlambat',
      alasan: 'Ban sepeda motor bocor di Jalan supratman',
      waktu: '17 Mei 2026, 07:15 WIB',
      status: 'SELESAI',
      approver: 'Bapak Asep, S.Pd. (Guru Piket)',
      date: '17 Mei 2026'
    }
  ]);

  const [isUsingMock, setIsUsingMock] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPermissions = async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sr_permissions')
        .select(`
          id,
          tipe,
          alasan,
          waktu,
          status,
          created_at,
          approver:approver_id (
            full_name
          )
        `)
        .eq('student_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalisasi format database ke format tampilan list
      const formatted = (data || []).map(item => ({
        id: item.id,
        tipe: item.tipe,
        alasan: item.alasan,
        waktu: item.waktu,
        status: item.status,
        approver: item.approver?.full_name ? `${item.approver.full_name} (Guru Piket)` : 'Menunggu Guru Piket',
        date: new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      }));

      setPerizinanList(formatted);
      setIsUsingMock(false);
    } catch (err) {
      console.warn('sr_permissions fetch error, menggunakan data demo lokal:', err);
      setIsUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [session]);

  const [activeTab, setActiveTab] = useState('Semua'); // Semua, Aktif, Riwayat
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // State Form
  const [tipeIzin, setTipeIzin] = useState('Izin Keluar Sekolah');
  const [alasan, setAlasan] = useState('');
  const [waktu, setWaktu] = useState('');

  const tipeOptions = [
    'Izin Keluar Sekolah',
    'Izin Menggunakan Jaket',
    'Izin Masuk Terlambat',
    'Izin Pulang Cepat',
    'Izin Lainnya'
  ];

  const handleAjukanIzin = async () => {
    if (!alasan || !waktu) {
      Alert.alert('Gagal', 'Mohon lengkapi semua bidang alasan dan waktu perizinan.');
      return;
    }

    setSubmitting(true);

    if (isUsingMock) {
      // Jalankan fallback local simulation jika tabel DB belum ada
      setTimeout(() => {
        const newIzin = {
          id: Date.now().toString(),
          tipe: tipeIzin,
          alasan: alasan,
          waktu: waktu,
          status: 'PENDING',
          approver: 'Menunggu Guru Piket',
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        };

        setPerizinanList([newIzin, ...perizinanList]);
        setSubmitting(false);
        setModalVisible(false);
        setAlasan('');
        setWaktu('');
        setTipeIzin('Izin Keluar Sekolah');
        Alert.alert(
          'Pengajuan Berhasil (Simulasi)',
          'Izin berhasil diajukan secara digital. Silakan hubungi Guru Piket di lobi piket sekolah untuk melakukan verifikasi & scan persetujuan QR.'
        );
      }, 1000);
      return;
    }

    try {
      const { error } = await supabase
        .from('sr_permissions')
        .insert([{
          student_id: session.user.id,
          tipe: tipeIzin,
          alasan: alasan,
          waktu: waktu,
          status: 'PENDING'
        }]);

      if (error) throw error;

      setModalVisible(false);
      setAlasan('');
      setWaktu('');
      setTipeIzin('Izin Keluar Sekolah');
      Alert.alert(
        'Pengajuan Berhasil',
        'Izin berhasil diajukan secara digital. Silakan hubungi Guru Piket di lobi piket sekolah untuk melakukan verifikasi & scan persetujuan QR.'
      );
      fetchPermissions();
    } catch (err: any) {
      Alert.alert('Gagal Mengajukan', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'DISETUJUI':
        return { bg: colors.success + '15', text: colors.success, label: 'Disetujui' };
      case 'PENDING':
        return { bg: colors.warning + '15', text: colors.warning, label: 'Menunggu' };
      case 'SELESAI':
        return { bg: '#3B82F615', text: '#3B82F6', label: 'Selesai' };
      default:
        return { bg: '#94A3B815', text: '#64748B', label: 'Ditolak' };
    }
  };

  const filteredList = perizinanList.filter(item => {
    if (activeTab === 'Aktif') {
      return item.status === 'PENDING' || item.status === 'DISETUJUI';
    }
    if (activeTab === 'Riwayat') {
      return item.status === 'SELESAI' || item.status === 'DITOLAK';
    }
    return true; // Semua
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>E-Perizinan Piket</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>Ajukan izin keluar kelas, jaket, terlambat, dll. secara digital</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Ringkasan */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>
              {perizinanList.filter(i => i.status === 'PENDING' || i.status === 'DISETUJUI').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Izin Aktif</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: '#3B82F6' }]}>
              {perizinanList.filter(i => i.status === 'SELESAI' || i.status === 'DITOLAK').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Riwayat Izin</Text>
          </View>
        </View>

        {/* Tombol Ajukan Izin */}
        <TouchableOpacity 
          style={[styles.btnAjukan, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.btnAjukanText}>Ajukan Perizinan Baru</Text>
        </TouchableOpacity>

        {/* Segmented Filter */}
        <View style={[styles.segmentedContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {['Semua', 'Aktif', 'Riwayat'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.segmentButton, 
                activeTab === tab && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.segmentText, 
                { color: activeTab === tab ? '#FFF' : colors.text }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Daftar Perizinan */}
        {filteredList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tidak ada pengajuan izin ditemukan.</Text>
          </View>
        ) : (
          filteredList.map((item) => {
            const statusInfo = getStatusStyle(item.status);
            return (
              <View key={item.id} style={[styles.izinCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.tipeBox}>
                    <Ionicons 
                      name={
                        item.tipe.includes('Jaket') ? 'shirt-outline' :
                        item.tipe.includes('Keluar') ? 'walk-outline' :
                        item.tipe.includes('Terlambat') ? 'time-outline' : 'log-out-outline'
                      } 
                      size={18} 
                      color={colors.primary} 
                      style={{ marginRight: 8 }} 
                    />
                    <Text style={[styles.tipeText, { color: colors.text }]}>{item.tipe}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                  </View>
                </View>
                
                <View style={styles.cardBody}>
                  <Text style={[styles.bodyLabel, { color: colors.textMuted }]}>Alasan:</Text>
                  <Text style={[styles.bodyValue, { color: colors.text }]}>{item.alasan}</Text>

                  <View style={styles.bodyMetaRow}>
                    <View style={styles.metaCol}>
                      <Text style={[styles.bodyLabel, { color: colors.textMuted }]}>Waktu:</Text>
                      <Text style={[styles.bodyValue, { color: colors.text, fontSize: 12 }]}>{item.waktu}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={[styles.bodyLabel, { color: colors.textMuted }]}>Pemberi Izin:</Text>
                      <Text style={[styles.bodyValue, { color: colors.text, fontSize: 12 }]}>{item.approver}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODAL FORM PENGAJUAN */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Pengajuan Izin Piket</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Jenis Izin */}
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>Jenis Perizinan</Text>
              <View style={styles.optionsRow}>
                {tipeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionCard,
                      { borderColor: colors.border },
                      tipeIzin === opt && { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                    ]}
                    onPress={() => setTipeIzin(opt)}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: colors.text },
                      tipeIzin === opt && { color: colors.primary, fontWeight: 'bold' }
                    ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Alasan */}
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>Alasan Pengajuan</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Contoh: Sakit flu berat / Mengambil alat prakarya di mobil..."
                placeholderTextColor={colors.textMuted}
                value={alasan}
                onChangeText={setAlasan}
                multiline
                numberOfLines={3}
              />

              {/* Waktu */}
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>Waktu / Durasi Izin</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Contoh: Hari ini jam 09:00 - 10:00 WIB / Seharian penuh..."
                placeholderTextColor={colors.textMuted}
                value={waktu}
                onChangeText={setWaktu}
              />

              {/* Tombol Aksi */}
              <TouchableOpacity 
                style={[styles.btnSubmit, { backgroundColor: colors.primary }]}
                onPress={handleAjukanIzin}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.btnSubmitText}>Kirim Pengajuan Ke Piket</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110, // Ruang untuk tab bar
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 0.48,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  btnAjukan: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 2,
  },
  btnAjukanText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
  },
  izinCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.75,
  },
  tipeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.08)',
    paddingTop: 10,
  },
  bodyLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  bodyValue: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  bodyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 0.48,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '75%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalForm: {
    flex: 1,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  optionCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  btnSubmit: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  btnSubmitText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
