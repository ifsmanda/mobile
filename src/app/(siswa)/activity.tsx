import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Image, Modal, FlatList
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ActivityScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [rules, setRules]                 = useState([]);
  const [selectedRule, setSelectedRule]   = useState(null);   // { id, name, default_point }
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [activityDesc, setActivityDesc]   = useState('');
  const [eventDate, setEventDate]         = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri]           = useState(null);
  const [submitting, setSubmitting]       = useState(false);

  useEffect(() => {
    supabase
      .from('sr_point_rules')
      .select('id, name, code, default_point')
      .eq('type', 'POSITIF')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => { if (data) setRules(data); });
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setEventDate(selectedDate);
  };

  const submitActivity = async () => {
    if (!selectedRule) {
      Alert.alert('Peringatan', 'Silakan pilih kategori kegiatan terlebih dahulu.');
      return;
    }
    if (!activityDesc.trim()) {
      Alert.alert('Peringatan', 'Deskripsi kegiatan tidak boleh kosong.');
      return;
    }

    setSubmitting(true);
    let uploadedUrl = null;

    if (photoUri) {
      try {
        const response = await fetch(photoUri);
        const blob     = await response.blob();
        const ext      = photoUri.split('.').pop();
        const fileName = `${session.user.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('attachments')
          .upload(fileName, blob, { contentType: `image/${ext}` });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName);
        uploadedUrl = urlData.publicUrl;
      } catch (err) {
        Alert.alert('Gagal Upload Foto', err.message);
        setSubmitting(false);
        return;
      }
    }

    const { error } = await supabase.from('sr_activities').insert([{
      student_id:     session.user.id,
      rule_id:        selectedRule.id,
      type:           'POSITIF',
      description:    activityDesc,
      event_date:     eventDate.toISOString(),
      attachment_url: uploadedUrl,
      status:         'PENDING',
    }]);

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Berhasil! 🎉', 'Laporan aktivitas dikirim dan menunggu persetujuan guru.');
      setActivityDesc('');
      setSelectedRule(null);
      setPhotoUri(null);
      setEventDate(new Date());
      router.replace('/(siswa)/reports');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Lapor Aktivitas Positif</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Isi form di bawah dengan jujur</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── 1. Kategori Kegiatan (Dropdown) ── */}
        <Text style={[styles.label, { color: colors.textMuted }]}>1. Kategori Kegiatan *</Text>
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: colors.card, borderColor: selectedRule ? colors.primary : colors.border }]}
          onPress={() => setDropdownOpen(true)}
        >
          <Ionicons name="list" size={18} color={selectedRule ? colors.primary : colors.textMuted} style={{ marginRight: 10 }} />
          <Text style={[styles.dropdownText, { color: selectedRule ? colors.text : colors.textMuted }]} numberOfLines={1}>
            {selectedRule ? selectedRule.name : 'Pilih kategori kegiatan...'}
          </Text>
          {selectedRule && (
            <View style={[styles.pointChip, { backgroundColor: colors.iconBox2 }]}>
              <Text style={[styles.pointChipText, { color: colors.success }]}>+{selectedRule.default_point} poin</Text>
            </View>
          )}
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* ── 2. Tanggal ── */}
        <Text style={[styles.label, { color: colors.textMuted }]}>2. Waktu Pelaksanaan *</Text>
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
          <Text style={[styles.dropdownText, { color: colors.text }]}>
            {eventDate.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={eventDate} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
        )}

        {/* ── 3. Deskripsi ── */}
        <Text style={[styles.label, { color: colors.textMuted }]}>3. Deskripsi Singkat *</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Ceritakan detail kegiatan Anda secara singkat dan jelas..."
          placeholderTextColor={colors.textMuted}
          value={activityDesc}
          onChangeText={setActivityDesc}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* ── 4. Foto ── */}
        <Text style={[styles.label, { color: colors.textMuted }]}>4. Bukti Foto (Opsional)</Text>
        <TouchableOpacity
          style={[styles.photoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={pickImage}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.photoPlaceholderText, { color: colors.textMuted }]}>Ketuk untuk pilih foto</Text>
            </View>
          )}
        </TouchableOpacity>
        {photoUri && (
          <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.removePhoto}>
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
            <Text style={[styles.removePhotoText, { color: colors.danger }]}>Hapus foto</Text>
          </TouchableOpacity>
        )}

        {/* ── Tombol Kirim ── */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
          onPress={submitActivity}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>Kirim Laporan</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* ── MODAL DROPDOWN KATEGORI ── */}
      <Modal visible={dropdownOpen} transparent animationType="slide" onRequestClose={() => setDropdownOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownOpen(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Pilih Kategori Kegiatan</Text>
          <Text style={[styles.modalSub, { color: colors.textMuted }]}>{rules.length} kategori tersedia</Text>

          <FlatList
            data={rules}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
            renderItem={({ item }) => {
              const isSelected = selectedRule?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.optionRow, isSelected && { backgroundColor: colors.primaryLight }]}
                  onPress={() => { setSelectedRule(item); setDropdownOpen(false); }}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.optionDot, { backgroundColor: isSelected ? colors.primary : colors.border }]} />
                    <Text style={[styles.optionText, { color: isSelected ? colors.primary : colors.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={[styles.optionPointBadge, { backgroundColor: colors.iconBox2 }]}>
                    <Text style={[styles.optionPointText, { color: colors.success }]}>+{item.default_point}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            style={styles.optionList}
          />

          <TouchableOpacity
            style={[styles.modalCloseBtn, { backgroundColor: colors.border }]}
            onPress={() => setDropdownOpen(false)}
          >
            <Text style={[styles.modalCloseBtnText, { color: colors.text }]}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, borderBottomWidth: 1 },
  headerTitle:        { fontSize: 18, fontWeight: 'bold' },
  headerSub:          { fontSize: 12, marginTop: 2 },
  scroll:             { padding: 20, paddingBottom: 50 },

  label:              { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.4 },

  // Dropdown
  dropdown:           { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5 },
  dropdownText:       { flex: 1, fontSize: 15 },
  pointChip:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  pointChipText:      { fontSize: 12, fontWeight: 'bold' },

  // Text area
  textArea:           { borderRadius: 14, padding: 14, fontSize: 15, borderWidth: 1.5, minHeight: 110 },

  // Photo
  photoBtn:           { borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 8 },
  photoPlaceholder:   { height: 130, justifyContent: 'center', alignItems: 'center' },
  photoPlaceholderText: { marginTop: 8, fontSize: 14 },
  photoPreview:       { width: '100%', height: 160 },
  removePhoto:        { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  removePhotoText:    { fontSize: 13, marginLeft: 4, fontWeight: '600' },

  // Submit
  submitBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, marginTop: 28 },
  submitText:         { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  modalHandle:        { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle:         { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalSub:           { fontSize: 13, marginBottom: 16 },
  optionList:         { maxHeight: 380 },
  separator:          { height: 1 },
  optionRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 10 },
  optionLeft:         { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  optionDot:          { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  optionText:         { fontSize: 14, flex: 1 },
  optionPointBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  optionPointText:    { fontSize: 12, fontWeight: 'bold' },
  modalCloseBtn:      { marginTop: 12, padding: 14, borderRadius: 14, alignItems: 'center' },
  modalCloseBtnText:  { fontWeight: 'bold', fontSize: 15 },
});
