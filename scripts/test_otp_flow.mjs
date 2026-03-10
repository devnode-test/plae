import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const email = process.env.TEST_EMAIL ?? 'acastro@saintgeorge.cl';

function readEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return env;
}

async function main() {
  const env = readEnvLocal();
  const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sendRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const sendJson = await sendRes.json();
  if (!sendRes.ok) {
    throw new Error(`send-otp failed: ${sendRes.status} ${JSON.stringify(sendJson)}`);
  }

  const { data: otpRow, error: otpErr } = await supabaseAdmin
    .from('otp_codes')
    .select('code, expires_at, used')
    .eq('email', email)
    .single();

  if (otpErr) throw otpErr;
  if (!otpRow?.code) throw new Error('OTP not found in database');

  const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code: otpRow.code }),
  });

  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok) {
    throw new Error(`verify-otp failed: ${verifyRes.status} ${JSON.stringify(verifyJson)}`);
  }

  const actionLink = verifyJson.redirectUrl;
  if (!actionLink) throw new Error('verify-otp did not return redirectUrl');

  const supabaseVerifyRes = await fetch(actionLink, { redirect: 'manual' });
  const location = supabaseVerifyRes.headers.get('location');

  if (!location) throw new Error('Supabase verify did not return a Location header');

  const hasAccessToken = location.includes('access_token=');
  const hasRefreshToken = location.includes('refresh_token=');
  const hasCode = location.includes('code=');

  process.stdout.write(
    JSON.stringify(
      {
        email,
        otp: { expires_at: otpRow.expires_at, used: otpRow.used },
        supabaseRedirect: {
          location: location.slice(0, 200) + (location.length > 200 ? '...' : ''),
          hasAccessToken,
          hasRefreshToken,
          hasCode,
        },
      },
      null,
      2
    ) + '\n'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

