import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const email = process.env.EMAIL ?? 'sistemas@saintgeorge.cl';

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

  const { data: usuario, error: usuarioErr } = await supabaseAdmin
    .from('usuarios')
    .select('id,email,nombre,rol,created_at')
    .eq('email', email)
    .maybeSingle();

  const objetivos = usuario?.id
    ? await supabaseAdmin
        .from('objetivos')
        .select('id', { count: 'exact', head: true })
        .eq('responsable_id', usuario.id)
    : null;

  let authUser = null;
  for (let page = 1; page <= 5; page++) {
    const { data: listed, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listErr) break;
    const match = listed.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (match) {
      authUser = { id: match.id, email: match.email, created_at: match.created_at };
      break;
    }
    if (listed.users.length < 1000) break;
  }

  process.stdout.write(
    JSON.stringify(
      {
        email,
        publicUsuario: usuarioErr ? { error: usuarioErr.message } : usuario,
        objetivosAsignados: objetivos
          ? objetivos.error
            ? { error: objetivos.error.message }
            : { count: objetivos.count ?? 0 }
          : null,
        authUser,
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

