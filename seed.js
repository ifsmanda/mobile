const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zamfxvycdmmxuyvjjhsl.supabase.co';
const cleanUrl = supabaseUrl.replace('/rest/v1/', '');
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YqzYCgisF7WeW636Du7cMw_7LH3ZhG8';

const supabase = createClient(cleanUrl, supabaseAnonKey);

async function seed() {
  console.log('Mendaftarkan akun: guru@gmail.com...');
  
  // 1. Sign Up
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: 'guru@gmail.com',
    password: 'password123',
  });

  if (authError) {
    console.error('Error Auth:', authError.message);
    if (authError.message.includes('already registered')) {
        console.log('Akun sudah terdaftar! Lanjut membuat profil...');
        const { data: loginData } = await supabase.auth.signInWithPassword({
            email: 'guru@gmail.com',
            password: 'password123',
        });
        if (loginData?.user) {
            await createProfile(loginData.user.id);
        }
    }
    return;
  }

  const userId = authData.user.id;
  console.log('User ID berhasil dibuat:', userId);

  // 2. Insert Profile
  await createProfile(userId);
}

async function createProfile(userId) {
    console.log('Membuat profil untuk role SISWA...');
    const { error: profileError } = await supabase.from('sr_profiles').upsert({
        id: userId,
        email: 'guru@gmail.com',
        full_name: 'Guru Piket / Pengajar',
        role: 'GURU',
        nomor_induk: '10101010',
        class_name: 'X MIPA 1'
    });

    if (profileError) {
        console.error('Error Profile:', profileError.message);
    } else {
        console.log('====================================');
        console.log('SUKSES! Akun percobaan berhasil dibuat.');
        console.log('Email: siswa.smanda@gmail.com');
        console.log('Pass:  password123');
        console.log('====================================');
    }
}

seed();
