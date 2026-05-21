import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Dimensions, FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function GuruPresensiScreen() {
  const { session, profile } = useAuth();
  const { colors } = useTheme();

  // States
  const [activeSession, setActiveSession] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sessionType, setSessionType] = useState('SESI_KELAS'); // 'HARIAN_MASUK', 'SESI_KELAS'
  const [targetClass, setTargetClass] = useState('X-A');
  const [subjectName, setSubjectName] = useState('');
  const [scannedStudents, setScannedStudents] = useState([]);
  const [loadingScanned, setLoadingScanned] = useState(false);

  // Daftar opsi kelas
  const classOptions = ['X-A', 'X-B', 'XI-A', 'XI-B', 'XII-A', 'XII-B', 'SEMUA'];

  // Ref untuk menyimpan channel realtime
  const realtimeChannelRef = useRef(null);

  // Fetch daftar siswa yang sudah scan untuk sesi tertentu
  const fetchScannedStudents = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('sr_attendance_records')
        .select(`
          id,
          created_at,
          status,
          student:sr_profiles (
            full_name,
            nomor_induk
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScannedStudents(data || []);
    } catch (e) {
      console.error('Error fetching scanned students:', e);
    }
  };

  // Mulai sesi presensi baru
  const handleStartSession = async () => {
    if (sessionType === 'SESI_KELAS' && !subjectName.trim()) {
      Alert.alert('Peringatan', 'Silakan masukkan nama Mata Pelajaran terlebih dahulu.');
      return;
    }

    setGenerating(true);
    const token = 'QR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // Masa berlaku 1 jam

    try {
      const { data, error } = await supabase
        .from('sr_attendance_sessions')
        .insert([{
          teacher_id: session.user.id,
          session_type: sessionType,
          target_class: targetClass,
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          qr_token: token
        }])
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data);
      setScannedStudents([]);
      
      // Setup Realtime Postgres Subscription
      setupRealtimeSubscription(data.id);
    } catch (err: any) {
      Alert.alert('Gagal membuat sesi', err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Setup langganan PostgreSQL realtime
  const setupRealtimeSubscription = (sessionId) => {
    // Unsubscribe dari channel sebelumnya jika ada
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    // Buat channel baru
    const channel = supabase
      .channel(`scanned_records:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sr_attendance_records',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          console.log('Realtime check-in detected:', payload);
          // Ambil ulang daftar siswa agar mendapatkan data relasi profil
          await fetchScannedStudents(sessionId);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    realtimeChannelRef.current = channel;
  };

  // Menghentikan sesi aktif
  const handleStopSession = () => {
    Alert.alert('Hentikan Sesi', 'Apakah Anda yakin ingin menutup sesi presensi ini? Siswa tidak akan bisa scan lagi.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya, Tutup', style: 'destructive', onPress: () => {
          if (realtimeChannelRef.current) {
            supabase.removeChannel(realtimeChannelRef.current);
            realtimeChannelRef.current = null;
          }
          setActiveSession(null);
          setScannedStudents([]);
          setSubjectName('');
      }}
    ]);
  };

  // Bersihkan subscription ketika screen di-unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Generator QR Presensi</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>
          Buat QR Code presensi masuk harian atau per mata pelajaran kelas
        </Text>
      </View>

      {activeSession ? (
        // --- DISPLAY ACTIVE QR SESSION ---
        <View style={styles.activeSessionContainer}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>
              {activeSession.session_type === 'HARIAN_MASUK' ? 'Presensi Masuk Pagi' : `Presensi Mapel: ${subjectName}`}
            </Text>
            <Text style={styles.qrSubtitle}>Kelas Sasaran: {activeSession.target_class}</Text>
            
            <View style={styles.qrWrapper}>
              <QRCode
                value={activeSession.qr_token}
                size={width * 0.55}
                color="black"
                backgroundColor="white"
              />
            </View>

            <Text style={styles.tokenText}>TOKEN: {activeSession.qr_token}</Text>
            
            <TouchableOpacity style={styles.btnStop} onPress={handleStopSession}>
              <Ionicons name="close-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnStopText}>Hentikan Sesi Presensi</Text>
            </TouchableOpacity>
          </View>

          {/* List Siswa Real-time */}
          <View style={styles.trackerContainer}>
            <View style={styles.trackerHeader}>
              <Ionicons name="radio-outline" size={18} color={colors.success} style={{ marginRight: 6 }} />
              <Text style={[styles.trackerTitle, { color: colors.text }]}>
                Siswa Masuk ({scannedStudents.length})
              </Text>
              <ActivityIndicator size="small" color={colors.success} style={{ marginLeft: 8 }} />
            </View>

            {scannedStudents.length === 0 ? (
              <View style={styles.emptyTracker}>
                <Text style={[styles.emptyTrackerText, { color: colors.textMuted }]}>
                  Menunggu siswa melakukan scan QR...
                </Text>
              </View>
            ) : (
              <FlatList
                data={scannedStudents}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.studentRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentName, { color: colors.text }]}>
                        {item.student?.full_name || 'Siswa Tanpa Nama'}
                      </Text>
                      <Text style={[styles.studentNis, { color: colors.textMuted }]}>
                        NISN: {item.student?.nomor_induk || '-'}
                      </Text>
                    </View>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeText}>
                        {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.studentList}
              />
            )}
          </View>
        </View>
      ) : (
        // --- CONFIGURE NEW SESSION ---
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Pengaturan Sesi</Text>
            
            {/* Tipe Presensi */}
            <Text style={[styles.label, { color: colors.text }]}>Tipe Presensi</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Picker
                selectedValue={sessionType}
                onValueChange={(itemValue) => setSessionType(itemValue)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="Presensi Mapel (Sesi Kelas)" value="SESI_KELAS" />
                <Picker.Item label="Presensi Harian Masuk (Pagi)" value="HARIAN_MASUK" />
              </Picker>
            </View>

            {/* Nama Mapel (khusus SESI_KELAS) */}
            {sessionType === 'SESI_KELAS' && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>Nama Mata Pelajaran</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Contoh: Matematika Peminatan, Fisika, dll."
                  placeholderTextColor={colors.textMuted}
                  value={subjectName}
                  onChangeText={setSubjectName}
                />
              </>
            )}

            {/* Kelas Target */}
            <Text style={[styles.label, { color: colors.text }]}>Kelas Target</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Picker
                selectedValue={targetClass}
                onValueChange={(itemValue) => setTargetClass(itemValue)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.text}
              >
                {classOptions.map((cls) => (
                  <Picker.Item key={cls} label={cls} value={cls} />
                ))}
              </Picker>
            </View>

            {/* Tombol Generate */}
            <TouchableOpacity 
              style={[styles.btnGenerate, { backgroundColor: colors.primary }]}
              onPress={handleStartSession}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="qr-code-sharp" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.btnGenerateText}>Generate Kode QR</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
    overflow: 'hidden',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    marginBottom: 18,
  },
  btnGenerate: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnGenerateText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // Active Session Layout
  activeSessionContainer: {
    flex: 1,
    padding: 20,
  },
  qrCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  qrWrapper: {
    marginVertical: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFF',
  },
  tokenText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 16,
    letterSpacing: 1,
  },
  btnStop: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnStopText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Live Tracker Layout
  trackerContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  trackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  trackerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyTracker: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTrackerText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  studentList: {
    paddingBottom: 90,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  studentInfo: {
    flex: 0.75,
  },
  studentName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  studentNis: {
    fontSize: 10,
    marginTop: 2,
  },
  timeBadge: {
    backgroundColor: '#10B98115',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  }
});
