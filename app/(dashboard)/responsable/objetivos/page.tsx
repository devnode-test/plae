import { createClient } from '@/lib/supabase-server';
import { MisObjetivosClient } from './client';

export default async function MisObjetivosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;

  const objetivosQuery = supabase
    .from('objetivos')
    .select(`
      *,
      indicadores (
        *,
        metas_anuales (
          *,
          acciones (
            *,
            evidencias (*)
          )
        )
      )
    `)
    .order('created_at', { ascending: false });

  const { data: objetivos } = userId
    ? await objetivosQuery.eq('responsable_id', userId)
    : await objetivosQuery.limit(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Mis Objetivos</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Gestiona el avance de tus metas, registra acciones y sube evidencias.
        </p>
      </div>
      <MisObjetivosClient objetivos={objetivos || []} />
    </div>
  );
}
