import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AttendanceScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Arahkan kamera ke QR Code Presensi');

  useEffect(() => {
    if (!hasPermission?.granted) {
      requestPermission();
    }
  }, [hasPermission]);

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setStatusMsg('Mendapatkan Lokasi GPS...');
    
    // Request GPS
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Akses lokasi diperlukan untuk presensi.');
      setStatusMsg('Gagal mendapatkan lokasi.');
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({});
      setStatusMsg('Memvalidasi Token Presensi...');

      // 1. Cek Token di Database
      const { data: sessionData, error: sessionError } = await supabase
        .from('sr_attendance_sessions')
        .select('*')
        .eq('qr_token', data)
        .single();

      if (sessionError || !sessionData) {
        Alert.alert('Gagal', 'QR Code tidak valid atau sudah kedaluwarsa.');
        setStatusMsg('Scan QR Code Presensi');
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
        setStatusMsg('Anda sudah presensi.');
        return;
      }

      // 3. Bypass Geofence (MVP) - Langsung Insert
      setStatusMsg('Mencatat kehadiran...');
      
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
        setStatusMsg('Terjadi Kesalahan Server');
      } else {
        Alert.alert('Berhasil!', 'Data kehadiran Anda telah tercatat.');
        setStatusMsg('Presensi Berhasil Direkam!');
      }
    } catch (err) {
      Alert.alert('Terjadi Kesalahan', err.message);
      setStatusMsg('Gagal memproses presensi.');
    }
  };

  if (!hasPermission) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Memuat Kamera...</Text></View>;
  }

  if (!hasPermission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, marginBottom: 16 }}>Kami memerlukan akses kamera untuk scan QR.</Text>
        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.primary }]} onPress={requestPermission}>
          <Text style={styles.btnText}>Beri Akses Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Scan Presensi</Text>
      </View>
      
      <View style={styles.scannerContainer}>
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.overlay}>
           <View style={styles.scanFrame}>
             <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
             <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
             <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
             <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
           </View>
        </View>
      </View>

      <View style={[styles.footer, { backgroundColor: colors.card }]}>
        <View style={[styles.statusBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name={scanned ? "information-circle" : "scan"} size={24} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.text }]}>{statusMsg}</Text>
        </View>
        
        {scanned && (
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.primary }]} onPress={() => { setScanned(false); setStatusMsg('Arahkan kamera ke QR Code Presensi'); }}>
            <Text style={styles.btnText}>Scan Ulang</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, borderBottomWidth: 1, zIndex: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scannerContainer: { flex: 1, overflow: 'hidden', position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0, 0.7)' },
  scanFrame: { width: 250, height: 250, backgroundColor: 'transparent', position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  footer: { padding: 24, paddingBottom: 40 },
  statusBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
  statusText: { marginLeft: 12, flex: 1, fontSize: 14 },
  btnPrimary: { padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
