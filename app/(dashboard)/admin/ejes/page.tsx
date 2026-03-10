import { createClient } from '@/lib/supabase-server';
import { EjesClient } from './client';

export default async function EjesPage() {
  const supabase = await createClient();
  const { data: ejes } = await supabase
    .from('ejes')
    .select('*')
    .order('orden', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Gestión de Ejes Estratégicos</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Administra los ejes principales del plan estratégico.
        </p>
      </div>
      <EjesClient initialEjes={ejes || []} />
    </div>
  );
}
