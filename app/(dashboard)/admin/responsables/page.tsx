import { createClient } from '@/lib/supabase-server';
import { ResponsablesClient } from './client';

export default async function ResponsablesPage() {
  const supabase = await createClient();
  
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('*')
    .order('nombre', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Gestión de Líderes</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Administra los usuarios y responsables del sistema.
        </p>
      </div>
      <ResponsablesClient initialUsuarios={usuarios || []} />
    </div>
  );
}
