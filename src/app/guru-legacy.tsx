import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, ScrollView, Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Siswa States
  const [siswaMode, setSiswaMode] = useState('DASHBOARD'); // 'DASHBOARD', 'SCANNER', 'ACTIVITY'
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Mengambil lokasi...');

  // Guru States
  const [activeSession, setActiveSession] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Activity States
  const [rules, setRules] = useState([]);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityDesc, setActivityDesc] = useState('');
  const [selectedRule, setSelectedRule] = useState(null);
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [submittingActivity, setSubmittingActivity] = useState(false);

  useEffect(() => {
    // Ambil daftar aturan poin positif
    supabase.from('sr_point_rules').select('*').eq('type', 'POSITIF').then(({data}) => {
      if (data && data.length > 0) {
        setRules(data);
        setSelectedRule(data[0].id); // Default ke rule pertama
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setProfile(null);
    });
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('sr_profiles').select('*').eq('id', userId).single();
      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data || { role: 'SISWA', full_name: 'User (Belum ada profil)' });
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setLocationStatus('Mendapatkan GPS...');
    
    // Request GPS
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin ditolak', 'Akses lokasi diperlukan untuk presensi.');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setLocationStatus(`GPS Valid: Lat ${location.coords.latitude.toFixed(4)}`);

    try {
      // 1. Cek Token di Database
      const { data: sessionData, error: sessionError } = await supabase
        .from('sr_attendance_sessions')
        .select('*')
        .eq('qr_token', data)
        .single();

      if (sessionError || !sessionData) {
        Alert.alert('Gagal', 'QR Code tidak valid atau sudah kedaluwarsa.');
        setScanned(false);
        return;
      }

      // 2. Cek apakah sudah absen untuk sesi ini
      const { data: existingRecord } = await supabase
        .from('sr_attendance_records')
        .select('id')
        .eq('session_id', sessionData.id)
        .eq('student_id', session.user.id)
        .single();

      if (existingRecord) {
        Alert.alert('Sudah Presensi', 'Anda sudah melakukan presensi untuk sesi ini.');
        return; // Jangan lanjut insert
      }

      // 3. Bypass Geofence (Sesuai persetujuan user)
      setLocationStatus('Mencatat kehadiran...');
      
      const { error: insertError } = await supabase
        .from('sr_attendance_records')
        .insert([{
          session_id: sessionData.id,
          student_id: session.user.id,
          status: 'HADIR',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }]);

      if (insertError) {
        Alert.alert('Error Server', insertError.message);
      } else {
        Alert.alert('Presensi Berhasil!', 'Data kehadiran Anda telah tercatat.');
      }
    } catch (err) {
      Alert.alert('Terjadi Kesalahan', err.message);
    }
    
    // Jangan setScanned(false) otomatis agar tidak terus-menerus scan, 
    // biar siswa pencet tombol "Scan Ulang"
  };

  const generateQRSession = async () => {
    setGenerating(true);
    const token = 'QR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // Berlaku 1 jam

    const { data, error } = await supabase.from('sr_attendance_sessions').insert([{
      teacher_id: session.user.id,
      session_type: 'HARIAN_MASUK',
      target_class: 'SEMUA',
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
      qr_token: token
    }]).select().single();

    setGenerating(false);
    if (error) {
      Alert.alert('Gagal membuat sesi', error.message);
    } else {
      setActiveSession(data);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const submitActivity = async () => {
    if (!activityDesc.trim()) {
      Alert.alert('Peringatan', 'Deskripsi aktivitas tidak boleh kosong.');
      return;
    }
    if (!selectedRule) {
      Alert.alert('Peringatan', 'Pilih kategori terlebih dahulu.');
      return;
    }

    setSubmittingActivity(true);
    let uploadedUrl = null;

    if (photoUri) {
      try {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const ext = photoUri.split('.').pop();
        const fileName = `${session.user.id}-${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, blob, {
          contentType: `image/${ext}`,
        });
        
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(fileName);
        uploadedUrl = publicUrlData.publicUrl;
      } catch (err) {
        Alert.alert('Gagal Upload Foto', err.message);
        setSubmittingActivity(false);
        return;
      }
    }

    const { error } = await supabase.from('sr_activities').insert([{
      student_id: session.user.id,
      rule_id: selectedRule,
      type: 'POSITIF',
      description: activityDesc,
      event_date: eventDate.toISOString(),
      attachment_url: uploadedUrl,
      status: 'PENDING'
    }]);
    
    setSubmittingActivity(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Berhasil', 'Aktivitas berhasil dilaporkan dan menunggu persetujuan Guru.');
      setActivityDesc('');
      setPhotoUri(null);
      setEventDate(new Date());
      setSiswaMode('DASHBOARD');
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  }

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>SM</Text>
          </View>
          <Text style={styles.title}>Smart-Report Mobile</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            onChangeText={(text) => setEmail(text)}
            value={email}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            onChangeText={(text) => setPassword(text)}
            value={password}
            secureTextEntry
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={signIn}>
            <Text style={styles.btnText}>Masuk</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- SISWA SCREEN ---
  if (profile?.role?.toUpperCase() === 'SISWA') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Halo, {profile?.full_name}</Text>
          <TouchableOpacity onPress={() => supabase.auth.signOut()}>
            <Text style={{color: '#ef4444'}}>Keluar</Text>
          </TouchableOpacity>
        </View>
        
        {siswaMode === 'DASHBOARD' && (
          <View style={styles.content}>
            <Text style={styles.title}>Menu Utama Siswa</Text>
            
            <TouchableOpacity 
              style={[styles.btnPrimary, {marginBottom: 15}]} 
              onPress={() => {
                if (!hasPermission?.granted) requestPermission();
                setSiswaMode('SCANNER');
              }}
            >
              <Text style={styles.btnText}>📷 Scan Presensi</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnPrimary, {backgroundColor: '#10b981'}]} 
              onPress={() => setSiswaMode('ACTIVITY')}
            >
              <Text style={styles.btnText}>📝 Lapor Aktivitas (+)</Text>
            </TouchableOpacity>
          </View>
        )}

        {siswaMode === 'SCANNER' && (
          <>
            <View style={styles.scannerContainer}>
              {hasPermission?.granted ? (
                <CameraView
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : (
                <View style={styles.center}><Text style={{color:'white'}}>Meminta akses kamera...</Text></View>
              )}
              <View style={styles.overlay}>
                 <View style={styles.scanBox} />
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.infoText}>{scanned ? locationStatus : 'Arahkan kamera ke QR Code Presensi'}</Text>
              {scanned && (
                <TouchableOpacity style={[styles.btnPrimary, {marginBottom: 10}]} onPress={() => setScanned(false)}>
                  <Text style={styles.btnText}>Scan Ulang</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: '#64748b', marginTop: 10}]} onPress={() => setSiswaMode('DASHBOARD')}>
                <Text style={styles.btnText}>Kembali ke Menu</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {siswaMode === 'ACTIVITY' && (
          <ScrollView contentContainerStyle={{padding: 24}}>
            <Text style={{color: 'white', fontWeight: 'bold', fontSize: 22, marginBottom: 20}}>Lapor Aktivitas Positif</Text>
            <View style={{backgroundColor: '#1e293b', padding: 20, borderRadius: 12}}>
              
              <Text style={{color: '#cbd5e1', marginBottom: 10, fontWeight: 'bold'}}>Pilih Kategori:</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15}}>
                {rules.map(rule => (
                  <TouchableOpacity 
                    key={rule.id} 
                    onPress={() => setSelectedRule(rule.id)} 
                    style={{
                      backgroundColor: selectedRule === rule.id ? '#10b981' : '#334155', 
                      paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, marginRight: 10, marginBottom: 10,
                      borderWidth: 1, borderColor: selectedRule === rule.id ? '#34d399' : 'transparent'
                    }}>
                    <Text style={{color: 'white', fontWeight: selectedRule === rule.id ? 'bold' : 'normal', fontSize: 14}}>{rule.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{color: '#cbd5e1', marginBottom: 10, fontWeight: 'bold'}}>Waktu Pelaksanaan:</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, {padding: 12}]}>
                <Text style={{color: 'white'}}>📅 {eventDate.toLocaleString('id-ID')}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker 
                  value={eventDate} 
                  mode="datetime" 
                  display="default" 
                  onChange={onDateChange} 
                />
              )}

              <Text style={{color: '#cbd5e1', marginBottom: 10, fontWeight: 'bold', marginTop: 5}}>Keterangan:</Text>
              <TextInput
                style={[styles.input, {backgroundColor: 'rgba(255,255,255,0.05)', minHeight: 80, textAlignVertical: 'top'}]}
                placeholder="Ceritakan detail kegiatan Anda..."
                placeholderTextColor="#94a3b8"
                value={activityDesc}
                onChangeText={setActivityDesc}
                multiline
              />

              <Text style={{color: '#cbd5e1', marginBottom: 10, fontWeight: 'bold', marginTop: 5}}>Bukti Foto (Opsional):</Text>
              <TouchableOpacity onPress={pickImage} style={[styles.input, {alignItems: 'center', justifyContent: 'center', padding: photoUri ? 5 : 20}]}>
                {photoUri ? (
                  <Image source={{uri: photoUri}} style={{width: '100%', height: 150, borderRadius: 8}} resizeMode="cover" />
                ) : (
                  <Text style={{color: '#94a3b8'}}>📷 Ketuk untuk Memilih Foto</Text>
                )}
              </TouchableOpacity>

              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 20}}>
                <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: '#64748b', flex: 1, marginRight: 10}]} onPress={() => setSiswaMode('DASHBOARD')}>
                  <Text style={styles.btnText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, {flex: 1}]} onPress={submitActivity} disabled={submittingActivity}>
                  {submittingActivity ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Kirim Laporan</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // --- DEFAULT/GURU SCREEN ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Dashboard Guru</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={{color: '#ef4444'}}>Keluar</Text>
        </TouchableOpacity>
      </View>
      
      {activeSession ? (
        <View style={styles.center}>
          <Text style={[styles.title, {marginBottom: 10}]}>Sesi Presensi Aktif</Text>
          <Text style={{color: '#94a3b8', marginBottom: 30}}>Arahkan kamera siswa ke QR ini</Text>
          
          <View style={{backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 30}}>
            <QRCode
              value={activeSession.qr_token}
              size={250}
              color="black"
              backgroundColor="white"
            />
          </View>
          
          <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 30}}>
            Token: {activeSession.qr_token}
          </Text>

          <TouchableOpacity 
            style={[styles.btnPrimary, {backgroundColor: '#ef4444', width: '80%'}]} 
            onPress={() => setActiveSession(null)}
          >
            <Text style={styles.btnText}>Tutup Sesi (Selesai)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>Menu Utama</Text>
          <TouchableOpacity 
            style={styles.btnPrimary} 
            onPress={generateQRSession}
            disabled={generating}
          >
            {generating ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Generate QR Presensi Sesi</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnPrimary, {marginTop: 10, backgroundColor: '#10b981'}]}>
            <Text style={styles.btnText}>Approve Aktivitas Siswa</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#0f172a' },
  authContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  logoBox: { width: 64, height: 64, backgroundColor: '#4f46e5', borderRadius: 16, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  logoText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 12, padding: 16, color: 'white', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  btnPrimary: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerText: { color: 'white', fontSize: 18, fontWeight: '600' },
  scannerContainer: { flex: 1, overflow: 'hidden', position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#4f46e5', backgroundColor: 'transparent' },
  footer: { padding: 24, backgroundColor: '#1e293b' },
  infoText: { color: 'white', textAlign: 'center', marginBottom: 16, fontSize: 16 },
  content: { padding: 24 },
});
