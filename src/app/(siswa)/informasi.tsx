import React, { useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Modal, Dimensions
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const dummyAnnouncements = [
  {
    id: '1',
    title: 'Sosialisasi & Uji Coba Aplikasi Smart-Report',
    desc: 'Selamat datang di tahap uji coba / trial phase v1.0 aplikasi Smart-Report SMAN 2 Bandung. Aplikasi ini dirancang khusus untuk mempermudah presensi kehadiran pagi siswa, pencatatan jurnal karakter positif/negatif, serta integrasi laporan real-time dengan database kesiswaan dan kurikulum sekolah.',
    date: '20 Mei 2026',
    time: '08:00 WIB',
    category: 'UJI COBA',
    hasFlyer: true,
    image: require('../../../assets/images/trial_banner.png')
  },
  {
    id: '2',
    title: 'Panduan Penggunaan Sistem Smart-Report',
    desc: 'Untuk melakukan presensi masuk pagi, silakan masuk ke tab Beranda lalu klik tombol "Pindai QR Presensi". Arahkan kamera ke QR Code yang disediakan oleh Guru Piket di gerbang sekolah. Pastikan GPS/Location Anda aktif dan berada di dalam geofence sekolah.',
    date: '20 Mei 2026',
    time: '08:15 WIB',
    category: 'PANDUAN',
    hasFlyer: false
  },
  {
    id: '3',
    title: 'Pencatatan Karakter & Poin Prestasi',
    desc: 'Anda dapat melaporkan aktivitas positif yang dilakukan sehari-hari melalui menu Lapor Aktivitas di Beranda. Poin prestasi yang dikumpulkan akan menentukan predikat karakter Anda (AMAT BAIK, BAIK, CUKUP BAIK, PERLU BIMBINGAN).',
    date: '20 Mei 2026',
    time: '08:30 WIB',
    category: 'AKADEMIK',
    hasFlyer: false
  }
];

export default function InformasiScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'UJI COBA': return '#3B82F6'; // Biru
      case 'PANDUAN': return '#10B981'; // Hijau
      case 'AKADEMIK': return '#8B5CF6'; // Ungu
      default: return colors.primary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Informasi & Pengumuman</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>Informasi akademik dan kegiatan terbaru SMAN 2 Bandung</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {dummyAnnouncements.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setSelectedAnnouncement(item)}
          >
            {item.hasFlyer && (
              <Image
                source={item.image}
                style={styles.cardBanner}
                resizeMode="cover"
              />
            )}
            
            <View style={styles.cardBody}>
              <View style={styles.cardMeta}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '15' }]}>
                  <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>{item.category}</Text>
                </View>
                <Text style={[styles.dateText, { color: colors.textMuted }]}>
                  <Ionicons name="calendar-outline" size={12} color={colors.textMuted} /> {item.date}
                </Text>
              </View>

              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>{item.desc}</Text>
              
              <View style={styles.cardFooter}>
                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                  Lihat Detail Selengkapnya →
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* DETAIL MODAL (GAMBAR 2 AESTHETIC) */}
      <Modal
        visible={selectedAnnouncement !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: '#FBBF24' }]}>
          {/* Header Modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedAnnouncement(null)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Detail Pengumuman</Text>
          </View>

          {selectedAnnouncement && (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.flyerWrapper}>
                {/* Card Container */}
                <View style={styles.flyerCard}>
                  {/* Category & Date */}
                  <View style={styles.flyerMeta}>
                    <View style={styles.flyerLabelContainer}>
                      <View style={styles.flyerDot} />
                      <Text style={styles.flyerLabelText}>PENGUMUMAN</Text>
                    </View>
                    <View style={styles.flyerDateBadge}>
                      <Ionicons name="calendar-outline" size={14} color="#B45309" style={{ marginRight: 4 }} />
                      <Text style={styles.flyerDateText}>{selectedAnnouncement.date.toUpperCase()}</Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={styles.flyerTitle}>{selectedAnnouncement.title.toUpperCase()}</Text>

                  {/* Flyer Image or Text */}
                  {selectedAnnouncement.hasFlyer ? (
                    <Image
                      source={selectedAnnouncement.image}
                      style={styles.flyerImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.textAnnouncementBox}>
                      <Ionicons name="megaphone-outline" size={48} color="#D97706" style={{ marginBottom: 12 }} />
                      <Text style={styles.textAnnouncementContent}>{selectedAnnouncement.desc}</Text>
                    </View>
                  )}

                  {/* Additional info */}
                  {selectedAnnouncement.hasFlyer && (
                    <View style={styles.flyerDescBox}>
                      <Text style={styles.flyerDescTitle}>Deskripsi Kegiatan:</Text>
                      <Text style={styles.flyerDescText}>{selectedAnnouncement.desc}</Text>
                    </View>
                  )}
                  
                  {/* Close button inside card */}
                  <TouchableOpacity
                    style={styles.flyerCloseButton}
                    onPress={() => setSelectedAnnouncement(null)}
                  >
                    <Text style={styles.flyerCloseButtonText}>Kembali ke Menu</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
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
    paddingBottom: 110, // Agar tidak tertutup tab bar
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardBanner: {
    width: '100%',
    height: 160,
  },
  cardBody: {
    padding: 16,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 10,
    marginTop: 5,
  },
  
  // MODAL STYLES (Gambar 2 Reference)
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 24,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  flyerWrapper: {
    position: 'relative',
    marginTop: 10,
  },
  decorativeCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginBottom: -8,
    zIndex: 2,
  },
  yellowCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D97706', // Coklat emas/oranye tua
  },
  flyerCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  flyerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  flyerLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flyerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    marginRight: 6,
  },
  flyerLabelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4B5563',
    letterSpacing: 1,
  },
  flyerDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  flyerDateText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#B45309',
  },
  flyerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 20,
  },
  flyerImage: {
    width: '100%',
    height: width * 1.2,
    borderRadius: 12,
    marginBottom: 20,
  },
  textAnnouncementBox: {
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 200,
  },
  textAnnouncementContent: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  flyerDescBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  flyerDescTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  flyerDescText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  flyerCloseButton: {
    backgroundColor: '#D97706',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyerCloseButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  }
});
