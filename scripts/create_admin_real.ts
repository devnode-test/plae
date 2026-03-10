
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error('Could not read .env.local');
}

const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'acastro@saintgeorge.cl';
  const nombre = 'Admin Castro';
  
  console.log(`Configuring admin user: ${email}...`);

  // 1. Get Auth User
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
      console.error('Error listing users:', listError);
      return;
  }

  let authUser = users.find(u => u.email === email);
  
  if (!authUser) {
      console.log('User not found in Auth. Creating...');
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: nombre, rol: 'admin' }
      });
      if (error) {
          console.error('Error creating user:', error);
          return;
      }
      authUser = data.user;
  } else {
      console.log(`User found in Auth (ID: ${authUser.id}). Updating role...`);
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        user_metadata: { ...authUser.user_metadata, full_name: nombre, rol: 'admin' },
        email_confirm: true
      });
  }

  if (!authUser) return;

  // 2. Check Public User and Fix ID Mismatch
  const { data: publicUser } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .single();

  if (publicUser && publicUser.id !== authUser.id) {
      console.log(`Mismatch found! Public ID (${publicUser.id}) != Auth ID (${authUser.id}). Cleaning up...`);
      
      // Check and clear references in 'objetivos'
      const { error: updateError } = await supabaseAdmin
        .from('objetivos')
        .update({ responsable_id: null })
        .eq('responsable_id', publicUser.id);
        
      if (updateError) console.error('Error unlinking objetivos:', updateError);

      // Now delete
      const { error: deleteError } = await supabaseAdmin.from('usuarios').delete().eq('id', publicUser.id);
      if (deleteError) {
          console.error('Error deleting public user:', deleteError);
          return; // Stop if we can't delete
      }
      console.log('Deleted old public record.');
  }

  // 3. Upsert correct record
  console.log(`Ensuring public record for ID: ${authUser.id}...`);
  const { error: dbError } = await supabaseAdmin
    .from('usuarios')
    .upsert({ 
        id: authUser.id, 
        email: email, 
        nombre: nombre, 
        rol: 'admin' 
    });
    
  if (dbError) console.error('Error creating/updating public user:', dbError);
  else console.log('Admin user configured successfully!');
}

createAdmin();
