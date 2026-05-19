import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();

  // Helper untuk format tanggal
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header: Greeting, Theme Toggle, Notification & Profile */}
        <View style={styles.headerRow}>
          <View style={styles.headerGreeting}>
            <Text style={[styles.greetingText, { color: colors.text }]}>
              Halo, {"\n"}<Text style={styles.nameText}>{profile?.full_name?.split(' ')[0] || 'Siswa'}</Text> 👋
            </Text>
            <Text style={[styles.subGreeting, { color: colors.textMuted }]}>Selamat belajar hari ini!</Text>
          </View>
          
          <View style={styles.headerActions}>
            {/* Theme Toggle */}
            <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
              <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={24} color={colors.text} />
            </TouchableOpacity>
            
            {/* Notification Bell */}
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              <View style={styles.badge} />
            </TouchableOpacity>

            {/* Profile Avatar */}
            <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(siswa)/profile')}>
               <Ionicons name="person-circle" size={40} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date / Quote Card */}
        <View style={[styles.quoteCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.quoteDate}>{today}</Text>
          <Text style={styles.quoteText}>
            "Belajar hari ini,{"\n"}memimpin masa depan."
          </Text>
          {/* Decorative Elements */}
          <View style={styles.quoteDecoration} />
        </View>

        {/* Akses Cepat */}
        <View style={styles.quickActionRow}>
          <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(siswa)/attendance')}>
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Scan Presensi</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(siswa)/activity')}>
            <View style={[styles.quickActionIcon, { backgroundColor: colors.iconBox2 }]}>
              <Ionicons name="add-circle" size={24} color={colors.success} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>Lapor Aktivitas</Text>
          </TouchableOpacity>
        </View>

        {/* Ringkasan (4 Grid) */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ringkasan</Text>
        </View>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(siswa)/tugas')}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.iconBox1 }]}>
              <Ionicons name="book" size={24} color="#3B82F6" />
            </View>
            <Text style={[styles.gridValue, { color: colors.text }]}>8</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Tugas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(siswa)/jadwal')}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.iconBox2 }]}>
              <Ionicons name="calendar" size={24} color="#10B981" />
            </View>
            <Text style={[styles.gridValue, { color: colors.text }]}>5</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Jadwal Hari Ini</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.iconBox3 }]}>
              <Ionicons name="document-text" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.gridValue, { color: colors.text }]}>2</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Ujian</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(siswa)/reports')}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.iconBox4 }]}>
              <Ionicons name="star" size={24} color="#A855F7" />
            </View>
            <Text style={[styles.gridValue, { color: colors.text }]}>120</Text>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Poin</Text>
          </TouchableOpacity>
        </View>

        {/* Pengumuman */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pengumuman</Text>
          <TouchableOpacity><Text style={{ color: colors.primary, fontSize: 13, fontWeight: 'bold' }}>Lihat semua</Text></TouchableOpacity>
        </View>
        
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.listIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="megaphone" size={20} color={colors.primary} />
          </View>
          <View style={styles.listContent}>
            <Text style={[styles.listTitle, { color: colors.text }]}>Libur Nasional</Text>
            <Text style={[styles.listDesc, { color: colors.textMuted }]}>Sekolah diliburkan pada tanggal 20 Mei 2026.</Text>
          </View>
          <Text style={[styles.listTime, { color: colors.textMuted }]}>2 jam lalu</Text>
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.listIcon, { backgroundColor: colors.iconBox2 }]}>
            <Ionicons name="document-text" size={20} color={colors.success} />
          </View>
          <View style={styles.listContent}>
            <Text style={[styles.listTitle, { color: colors.text }]}>Ujian Akhir Semester</Text>
            <Text style={[styles.listDesc, { color: colors.textMuted }]}>Ujian akan dimulai pada tanggal 3 - 10 Juni 2026.</Text>
          </View>
          <Text style={[styles.listTime, { color: colors.textMuted }]}>1 hari lalu</Text>
        </View>

        {/* Tugas Terbaru */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tugas Terbaru</Text>
          <TouchableOpacity onPress={() => router.push('/(siswa)/tugas')}><Text style={{ color: colors.primary, fontSize: 13, fontWeight: 'bold' }}>Lihat semua</Text></TouchableOpacity>
        </View>

        <View style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.taskCardHeader}>
            <View style={[styles.listIcon, { backgroundColor: colors.iconBox4 }]}>
              <Ionicons name="book" size={20} color="#A855F7" />
            </View>
            <View style={styles.listContent}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Matematika</Text>
              <Text style={[styles.listDesc, { color: colors.textMuted }]}>Kerjakan latihan soal halaman 45-60</Text>
            </View>
          </View>
          <View style={styles.taskCardFooter}>
            <Text style={[styles.taskDate, { color: colors.textMuted }]}>Kumpul: 20 Mei 2026</Text>
            <View style={[styles.taskBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.taskBadgeText, { color: colors.primary }]}>Belum Dikerjakan</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerGreeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    marginBottom: 4,
  },
  nameText: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  subGreeting: {
    fontSize: 13,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    position: 'relative',
    marginRight: 15,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  avatarBtn: {
    marginLeft: 5,
  },
  quoteCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  quoteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  quoteDecoration: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    width: '23%',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  gridLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  listCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  listTime: {
    fontSize: 11,
    marginLeft: 10,
  },
  taskCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  taskCardHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  taskCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
    paddingTop: 12,
  },
  taskDate: {
    fontSize: 12,
  },
  taskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
