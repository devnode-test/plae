import { createClient } from '@/lib/supabase-server';
import { FocosClient } from './client';

export default async function FocosPage() {
  const supabase = await createClient();
  
  // Fetch ejes for the selector/filter
  const { data: ejes } = await supabase
    .from('ejes')
    .select('*')
    .order('orden', { ascending: true });

  // Fetch focos
  const { data: focos } = await supabase
    .from('focos')
    .select('*')
    .order('orden', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Gestión de Focos</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Administra los focos estratégicos asociados a cada eje.
        </p>
      </div>
      <FocosClient initialEjes={ejes || []} initialFocos={focos || []} />
    </div>
  );
}
