import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data: profileData, error } = await supabase.from('sr_profiles').select('*').eq('id', userId).single();
      if (error && error.code !== 'PGRST116') throw error;
      
      let finalProfile = profileData || { role: 'SISWA', full_name: 'User (Belum ada profil)' };

      // Jika role SISWA, ambil data kelas dari sr_student_details
      if (finalProfile.role?.toUpperCase() === 'SISWA') {
        const { data: detailData } = await supabase
          .from('sr_student_details')
          .select(`
            nisn,
            kelas:sr_classes(name)
          `)
          .eq('profile_id', userId)
          .single();
          
        if (detailData) {
          finalProfile.class_name = detailData.kelas?.name || finalProfile.class_name;
          finalProfile.nomor_induk = detailData.nisn || finalProfile.nomor_induk;
        }
      }

      setProfile(finalProfile);
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
