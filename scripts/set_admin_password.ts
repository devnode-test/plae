
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

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
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setPassword() {
  const email = 'acastro@saintgeorge.cl';
  const password = 'temporal_password_123'; // Contraseña temporal
  
  console.log(`Setting password for: ${email}...`);

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  
  if (user) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: password
      });
      
      if (error) console.error('Error setting password:', error);
      else console.log(`Password set successfully! Use: ${password}`);
  } else {
      console.error('User not found');
  }
}

setPassword();
