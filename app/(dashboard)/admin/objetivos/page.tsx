import { createClient } from '@/lib/supabase-server';
import { ObjetivosClient } from './client';

export default async function ObjetivosPage() {
  const supabase = await createClient();
  
  const { data: ejes } = await supabase.from('ejes').select('*').order('orden');
  const { data: focos } = await supabase.from('focos').select('*').order('orden');
  
  // Join query using Supabase syntax for 1:N relations
  const { data: objetivos } = await supabase
    .from('objetivos')
    .select('*, focos(*)')
    .order('orden', { ascending: true });

  // Fetch users for responsible assignment
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('*')
    .order('nombre');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Gestión de Objetivos</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Define objetivos estratégicos, asígnalos a focos y responsables.
        </p>
      </div>
      <ObjetivosClient 
        initialEjes={ejes || []} 
        initialFocos={focos || []} 
        initialObjetivos={objetivos || []}
        usuarios={usuarios || []}
      />
    </div>
  );
}
