import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  const fetchProfile = async (userId: string) => {
    // Cegah double fetch
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const { data: profileData, error } = await supabase
        .from('sr_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('[AuthContext] Error fetching profile:', error.message);
      }

      let finalProfile = profileData || { role: 'SISWA', full_name: 'User (Belum ada profil)' };

      // Normalisasi role ke uppercase untuk konsistensi
      if (finalProfile.role) {
        finalProfile = { ...finalProfile, role: finalProfile.role.toUpperCase() };
      }

      // Jika role SISWA, ambil data kelas & NISN dari sr_student_details
      if (finalProfile.role === 'SISWA') {
        const { data: detailData } = await supabase
          .from('sr_student_details')
          .select(`
            nisn,
            kelas:sr_classes(name)
          `)
          .eq('profile_id', userId)
          .single();

        if (detailData) {
          finalProfile = {
            ...finalProfile,
            class_name: detailData.kelas?.name || finalProfile.class_name,
            nomor_induk: detailData.nisn || finalProfile.nomor_induk,
          };
        }
      }

      console.log('[AuthContext] Profile loaded:', finalProfile?.full_name, '| Role:', finalProfile?.role);
      setProfile(finalProfile);
    } catch (error) {
      console.warn('[AuthContext] fetchProfile exception:', error);
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);

    // Gunakan onAuthStateChange sebagai satu-satunya sumber kebenaran
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      isFetching.current = false; // Reset flag saat session berubah

      if (newSession?.user) {
        setLoading(true);
        setProfile(null); // Reset profile dulu agar tidak pakai data lama
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Ambil session awal
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!initialSession) {
        // Tidak ada session, langsung selesai loading
        setLoading(false);
      }
      // Jika ada session, onAuthStateChange akan handle fetchProfile
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
