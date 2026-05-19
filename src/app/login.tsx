import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Jika sudah login, redirect ke index (yang akan mengatur rute berdasarkan role)
  if (session) {
    return <Redirect href="/" />;
  }

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Gagal Login', error.message);
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={styles.authContainer}>
            {/* Logo SMAN 2 Bandung */}
            <View style={styles.logoBox}>
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
            </View>
            
            <Text style={[styles.title, { color: colors.text }]}>Smart-Report Siswa</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>SMAN 2 Bandung</Text>

            <View style={[styles.formContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Email Siswa"
                placeholderTextColor={colors.textMuted}
                onChangeText={(text) => setEmail(text)}
                value={email}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                onChangeText={(text) => setPassword(text)}
                value={password}
                secureTextEntry
              />
              <TouchableOpacity 
                style={[styles.btnPrimary, { backgroundColor: colors.primary }]} 
                onPress={signIn}
                disabled={loading}
              >
                <Text style={styles.btnText}>
                  {loading ? 'Memproses...' : 'Masuk'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  authContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 24 
  },
  logoBox: { 
    width: 120, 
    height: 120, 
    justifyContent: 'center', 
    alignItems: 'center', 
    alignSelf: 'center', 
    marginBottom: 16 
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 4 
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40
  },
  formContainer: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  input: { 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    fontSize: 16
  },
  btnPrimary: { 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    marginTop: 8
  },
  btnText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});
