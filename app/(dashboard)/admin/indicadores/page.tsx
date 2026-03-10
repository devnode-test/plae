import { createClient } from '@/lib/supabase-server';
import { IndicadoresClient } from './client';

export default async function IndicadoresPage() {
  const supabase = await createClient();
  
  const { data: ejes } = await supabase.from('ejes').select('*').order('orden');
  const { data: focos } = await supabase.from('focos').select('*').order('orden');
  const { data: objetivos } = await supabase.from('objetivos').select('*').order('created_at');
  
  // Join query to get nested relations: Indicador -> Objetivo, and Indicador -> Metas
  const { data: indicadores } = await supabase
    .from('indicadores')
    .select(`
      *,
      objetivos (*),
      metas_anuales (*)
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Gestión de Indicadores</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Define indicadores de logro y establece las metas anuales.
        </p>
      </div>
      <IndicadoresClient 
        initialEjes={ejes || []} 
        initialFocos={focos || []} 
        initialObjetivos={objetivos || []}
        initialIndicadores={indicadores || []}
      />
    </div>
  );
}
