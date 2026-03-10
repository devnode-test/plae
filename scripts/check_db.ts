
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
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Checking Ejes...');
  const { data: ejes, error: errorEjes } = await supabase.from('ejes').select('*');
  if (errorEjes) console.error('Error fetching ejes:', errorEjes);
  else console.log(`Found ${ejes?.length} ejes`);
  if (ejes && ejes.length > 0) console.log('Sample eje:', ejes[0]);

  console.log('Checking Focos...');
  const { data: focos, error: errorFocos } = await supabase.from('focos').select('*');
  if (errorFocos) console.error('Error fetching focos:', errorFocos);
  else console.log(`Found ${focos?.length} focos`);

  console.log('Checking Objetivos...');
  const { data: objetivos, error: errorObjetivos } = await supabase.from('objetivos').select('*');
  if (errorObjetivos) console.error('Error fetching objetivos:', errorObjetivos);
  else console.log(`Found ${objetivos?.length} objetivos`);
}

checkData();
