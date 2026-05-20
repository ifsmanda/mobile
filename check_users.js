// Script diagnostic: cek semua user di sr_profiles
const { createClient } = require('@supabase/supabase-js');

// Ambil dari .env.local web (menggunakan service_role key)
const supabaseUrl = 'https://zamfxvycdmmxuyvjjhsl.supabase.co';

// Catatan: ganti dengan service_role key dari Supabase Dashboard -> Settings -> API
// JANGAN commit key ini ke repository!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'ISI_SERVICE_ROLE_KEY_DISINI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkUsers() {
  console.log('=== CEK DATA USER DI DATABASE ===\n');

  // Ambil semua profiles
  const { data: profiles, error } = await supabase
    .from('sr_profiles')
    .select('id, full_name, role, email, created_at')
    .order('created_at');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Total profiles: ${profiles.length}\n`);
  profiles.forEach((p, i) => {
    console.log(`[${i+1}] ${p.full_name}`);
    console.log(`    ID   : ${p.id}`);
    console.log(`    Email: ${p.email}`);
    console.log(`    Role : "${p.role}" (uppercase: "${p.role?.toUpperCase()}")`);
    console.log(`    Match SISWA: ${p.role?.toUpperCase() === 'SISWA'}`);
    console.log('');
  });

  // Cek student details
  console.log('=== CEK SR_STUDENT_DETAILS ===\n');
  const { data: details, error: err2 } = await supabase
    .from('sr_student_details')
    .select('profile_id, nisn, sr_classes(name)');

  if (!err2) {
    console.log(`Total student details: ${details.length}`);
    details.forEach(d => {
      console.log(`  profile_id: ${d.profile_id}, NISN: ${d.nisn}, Kelas: ${d.sr_classes?.name}`);
    });
  }
}

checkUsers();
