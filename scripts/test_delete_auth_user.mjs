import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const userId = process.env.USER_ID ?? '15ee636b-2b1c-4bb3-a74d-f57d1a004dfe';

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

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  process.stdout.write(
    JSON.stringify(
      {
        userId,
        error: error
          ? {
              message: error.message,
              name: error.name,
              status: error.status,
              code: error.code,
            }
          : null,
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

