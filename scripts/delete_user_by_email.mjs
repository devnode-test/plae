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
    .select('id,email,nombre,rol')
    .eq('email', email)
    .maybeSingle();

  if (usuarioErr) throw usuarioErr;
  if (!usuario?.id) throw new Error(`Usuario no se encuentra en public.usuarios: ${email}`);

  const { count: objetivosCount, error: objetivosErr } = await supabaseAdmin
    .from('objetivos')
    .select('id', { count: 'exact', head: true })
    .eq('responsable_id', usuario.id);

  if (objetivosErr) throw objetivosErr;
  if ((objetivosCount ?? 0) > 0) {
    throw new Error(`No se puede eliminar: tiene ${(objetivosCount ?? 0)} objetivos asignados.`);
  }

  const { error: profileDeleteErr } = await supabaseAdmin.from('usuarios').delete().eq('id', usuario.id);
  if (profileDeleteErr) throw profileDeleteErr;

  const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(usuario.id);
  const authDeleted = !authDeleteErr || authDeleteErr.status === 404;

  process.stdout.write(
    JSON.stringify(
      {
        email,
        deleted: {
          profile: true,
          auth: authDeleted,
          authError: authDeleteErr ? { message: authDeleteErr.message, status: authDeleteErr.status } : null,
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

