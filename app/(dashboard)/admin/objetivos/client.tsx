'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eje, Foco, Objetivo, Usuario } from '@/lib/types';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Loader2, User, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface ObjetivosClientProps {
  initialEjes: Eje[];
  initialFocos: Foco[];
  initialObjetivos: (Objetivo & { focos: Foco })[]; // Join with Foco to display hierarchy
  usuarios: Usuario[];
}

export function ObjetivosClient({ initialEjes, initialFocos, initialObjetivos, usuarios }: ObjetivosClientProps) {
  const [objetivos, setObjetivos] = useState(initialObjetivos);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formEjeId, setFormEjeId] = useState<string>('');
  const [availableUsuarios, setAvailableUsuarios] = useState<Usuario[]>(usuarios);
  const [currentObjetivo, setCurrentObjetivo] = useState<Partial<Objetivo>>({
    año_inicio: 2026,
    año_fin: 2030
  });
  const [isEditing, setIsEditing] = useState(false);
  
  // Filtering states
  const [selectedEjeId, setSelectedEjeId] = useState<string>('all');
  const [selectedFocoId, setSelectedFocoId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [objetivoToDelete, setObjetivoToDelete] = useState<Objetivo | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setAvailableUsuarios(usuarios);
  }, [usuarios]);

  const refreshUsuarios = async () => {
    const { data, error } = await supabase.from('usuarios').select('*').order('nombre');
    if (!error && data) setAvailableUsuarios(data);
  };

  const getEjeIdFromFocoId = (focoId?: string | null) => {
    if (!focoId) return '';
    return initialFocos.find((f) => f.id === focoId)?.eje_id ?? '';
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setCurrentObjetivo({ año_inicio: 2026, año_fin: 2030 });
      setIsEditing(false);
      setFormEjeId('');
    }
  };

  const handleCreate = (preSelectedFocoId?: string) => {
    void refreshUsuarios();
    const focoIdToUse = preSelectedFocoId || (selectedFocoId !== 'all' ? selectedFocoId : undefined);
    const ejeIdToUse = focoIdToUse
      ? getEjeIdFromFocoId(focoIdToUse)
      : selectedEjeId !== 'all'
        ? selectedEjeId
        : '';
    setCurrentObjetivo({
      foco_id: focoIdToUse,
      año_inicio: 2026,
      año_fin: 2030
    });
    setFormEjeId(ejeIdToUse);
    setIsEditing(false);
    setIsOpen(true);
  }

  const handleEdit = (objetivo: Objetivo) => {
    void refreshUsuarios();
    setCurrentObjetivo(objetivo);
    setFormEjeId(getEjeIdFromFocoId(objetivo.foco_id));
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleRequestDelete = (obj: Objetivo) => {
    setObjetivoToDelete(obj);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!objetivoToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from('objetivos').delete().eq('id', objetivoToDelete.id);
      if (error) throw error;
      
      setObjetivos(objetivos.filter((o) => o.id !== objetivoToDelete.id));
      router.refresh();
      toast.success('Objetivo eliminado correctamente');
      setIsDeleteDialogOpen(false);
      setObjetivoToDelete(null);
    } catch (error: unknown) {
      console.error('Error al eliminar objetivo:', error);
      const message = error instanceof Error ? error.message : 'Error al eliminar el objetivo';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const focoId = currentObjetivo.foco_id;

    if (!focoId) {
      toast.error('Debes seleccionar un foco');
      setIsLoading(false);
      return;
    }

    try {
      if (isEditing && currentObjetivo.id) {
        const { data, error } = await supabase
          .from('objetivos')
          .update({
            nombre: currentObjetivo.nombre,
            descripcion: currentObjetivo.descripcion,
            foco_id: focoId,
            responsable_id: currentObjetivo.responsable_id || null,
            orden: currentObjetivo.orden,
            año_inicio: currentObjetivo.año_inicio,
            año_fin: currentObjetivo.año_fin,
          })
          .eq('id', currentObjetivo.id)
          .select('*, focos(*)')
          .single();

        if (error) throw error;
        
        if (data) setObjetivos(objetivos.map((item) => (item.id === currentObjetivo.id ? data : item)));
        toast.success('Objetivo actualizado correctamente');
      } else {
        const { data, error } = await supabase
          .from('objetivos')
          .insert([
            {
              nombre: currentObjetivo.nombre,
              descripcion: currentObjetivo.descripcion,
              foco_id: focoId,
              responsable_id: currentObjetivo.responsable_id || null,
              orden: currentObjetivo.orden || 0,
              año_inicio: currentObjetivo.año_inicio,
              año_fin: currentObjetivo.año_fin,
            },
          ])
          .select('*, focos(*)') // Select with join to get Foco info immediately
          .single();

        if (error) throw error;
        
        if (data) setObjetivos([...objetivos, data]);
        toast.success('Objetivo creado correctamente');
      }
      
      handleOpenChange(false);
      router.refresh();
    } catch (error: unknown) {
      console.error('Error al guardar objetivo:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al guardar: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter logic
  const filteredFocos = selectedEjeId === 'all' 
    ? initialFocos 
    : initialFocos.filter(f => f.eje_id === selectedEjeId);

  const filteredObjetivos = objetivos.filter(obj => {
    if (selectedFocoId !== 'all' && obj.foco_id !== selectedFocoId) return false;
    if (selectedEjeId !== 'all') {
       // Check if objective's foco belongs to selected eje
       const foco = initialFocos.find(f => f.id === obj.foco_id);
       if (foco?.eje_id !== selectedEjeId) return false;
    }
    return true;
  });

  const filteredObjetivosBySearch = filteredObjetivos.filter((o) =>
    o.nombre.toLowerCase().includes(search.trim().toLowerCase())
  );

  const getResponsibleName = (id: string | null) => {
    if (!id) return 'Sin asignar';
    const user = availableUsuarios.find(u => u.id === id);
    return user ? user.nombre : 'Usuario desconocido';
  };

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="grid gap-2 w-full sm:w-[250px]">
              <Label htmlFor="filter-eje">Filtrar por Eje</Label>
              <Select 
                value={selectedEjeId} 
                onValueChange={(val) => {
                  setSelectedEjeId(val);
                  setSelectedFocoId('all'); // Reset foco filter when eje changes
                }}
              >
                <SelectTrigger id="filter-eje">
                  <SelectValue placeholder="Todos los ejes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los ejes</SelectItem>
                  {initialEjes.map((eje) => (
                    <SelectItem key={eje.id} value={eje.id}>
                      {eje.orden}. {eje.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2 w-full sm:w-[250px]">
              <Label htmlFor="filter-foco">Filtrar por Foco</Label>
              <Select 
                value={selectedFocoId} 
                onValueChange={setSelectedFocoId}
                disabled={selectedEjeId === 'all' && initialFocos.length > 50} // Optional optimization
              >
                <SelectTrigger id="filter-foco">
                  <SelectValue placeholder="Todos los focos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los focos</SelectItem>
                  {filteredFocos.map((foco) => (
                    <SelectItem key={foco.id} value={foco.id}>
                      {foco.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={() => handleCreate()} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Objetivo
          </Button>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        <div className="grid gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="h-12 rounded-xl pl-9"
            />
          </div>
        </div>

        {filteredObjetivosBySearch.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-md bg-card">
            {filteredObjetivos.length === 0 ? 'No hay objetivos registrados para este filtro.' : 'No hay resultados para tu búsqueda.'}
          </div>
        ) : (
          filteredObjetivosBySearch.map((obj) => {
            const foco = initialFocos.find((f) => f.id === obj.foco_id);
            const eje = initialEjes.find((e) => e.id === foco?.eje_id);

            return (
              <Card key={obj.id} className="bg-card shadow-sm rounded-xl">
                <CardContent className="p-5">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="w-full text-lg font-semibold leading-snug">{obj.nombre}</div>
                      <div className="text-sm text-muted-foreground">
                        {foco?.nombre ? `Foco: ${foco.nombre}` : 'Foco: —'}
                        {eje?.nombre ? `  |  Eje: ${eje.nombre}` : ''}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Responsable: <span className="font-medium">{getResponsibleName(obj.responsable_id)}</span>
                        {'  |  '}
                        Periodo: <span className="font-medium">{obj.año_inicio}–{obj.año_fin}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 text-muted-foreground">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(obj)}>
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRequestDelete(obj)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[10%]">Orden</TableHead>
              <TableHead className="w-[30%]">Objetivo</TableHead>
              <TableHead className="w-[20%]">Foco / Eje</TableHead>
              <TableHead className="w-[20%]">Responsable</TableHead>
              <TableHead className="w-[15%]">Periodo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredObjetivos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No hay objetivos registrados para este filtro.
                </TableCell>
              </TableRow>
            ) : (
              filteredObjetivos.map((obj) => {
                const foco = initialFocos.find(f => f.id === obj.foco_id);
                const eje = initialEjes.find(e => e.id === foco?.eje_id);
                
                return (
                  <TableRow key={obj.id}>
                    <TableCell className="font-medium text-muted-foreground">{obj.orden}</TableCell>
                    <TableCell>
                      <div className="font-normal">{obj.nombre}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{foco?.nombre}</div>
                      <div className="text-xs text-muted-foreground">{eje?.nombre}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{getResponsibleName(obj.responsable_id)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {obj.año_inicio} - {obj.año_fin}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(obj)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRequestDelete(obj)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Eliminar objetivo</DialogTitle>
            <DialogDescription className="text-sm">Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-2">
            <div className="text-sm">
              ¿Seguro que deseas eliminar <span className="font-semibold">{objetivoToDelete?.nombre ?? 'este objetivo'}</span>?
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setObjetivoToDelete(null);
              }}
              disabled={isDeleting}
              className="h-12 flex-1 rounded-full"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-12 flex-1 rounded-full"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {isEditing ? 'Editar Objetivo' : 'Nuevo Objetivo'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isEditing ? 'Modifica los datos del objetivo estratégico.' : 'Ingresa los datos para crear un nuevo objetivo estratégico.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-5 px-6 py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="form-eje" className="text-base font-semibold">
                    Eje Estratégico <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formEjeId}
                    onValueChange={(value) => {
                      setFormEjeId(value);
                      setCurrentObjetivo({ ...currentObjetivo, foco_id: undefined });
                    }}
                  >
                    <SelectTrigger id="form-eje" className="h-12 rounded-xl">
                      <SelectValue placeholder="Selecciona un eje" />
                    </SelectTrigger>
                    <SelectContent>
                      {initialEjes
                        .slice()
                        .sort((a, b) => a.orden - b.orden)
                        .map((eje) => (
                          <SelectItem key={eje.id} value={eje.id}>
                            {eje.orden}. {eje.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="foco" className="text-base font-semibold">
                    Foco Estratégico <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={currentObjetivo.foco_id || ''}
                    onValueChange={(value) => setCurrentObjetivo({ ...currentObjetivo, foco_id: value })}
                    disabled={!formEjeId}
                  >
                    <SelectTrigger id="foco" className="h-12 rounded-xl">
                      <SelectValue placeholder={formEjeId ? 'Selecciona un foco' : 'Selecciona un eje primero'} />
                    </SelectTrigger>
                    <SelectContent>
                      {initialFocos
                        .filter((foco) => foco.eje_id === formEjeId)
                        .sort((a, b) => a.orden - b.orden)
                        .map((foco) => (
                          <SelectItem key={foco.id} value={foco.id}>
                            {foco.orden}. {foco.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="responsable" className="text-base font-semibold">Responsable</Label>
                <Select
                  value={currentObjetivo.responsable_id || 'unassigned'}
                  onValueChange={(value) =>
                    setCurrentObjetivo({ ...currentObjetivo, responsable_id: value === 'unassigned' ? null : value })
                  }
                >
                  <SelectTrigger id="responsable" className="h-12 rounded-xl">
                    <SelectValue placeholder="Asignar responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {availableUsuarios.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3 grid gap-2">
                  <Label htmlFor="nombre" className="text-base font-semibold">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="nombre"
                    value={currentObjetivo.nombre || ''}
                    onChange={(e) => setCurrentObjetivo({ ...currentObjetivo, nombre: e.target.value })}
                    required
                    rows={2}
                    className="rounded-xl"
                  />
                </div>
                <div className="sm:col-span-1 grid gap-2">
                  <Label htmlFor="orden" className="text-base font-semibold">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    value={currentObjetivo.orden || ''}
                    onChange={(e) => setCurrentObjetivo({ ...currentObjetivo, orden: parseInt(e.target.value) })}
                    placeholder="Auto"
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descripcion" className="text-base font-semibold">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={currentObjetivo.descripcion || ''}
                  onChange={(e) => setCurrentObjetivo({ ...currentObjetivo, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Descripción opcional"
                  className="min-h-[120px] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="inicio" className="text-base font-semibold">Año Inicio</Label>
                  <Input
                    id="inicio"
                    type="number"
                    min={2026}
                    max={2030}
                    value={currentObjetivo.año_inicio || 2026}
                    onChange={(e) => setCurrentObjetivo({ ...currentObjetivo, año_inicio: parseInt(e.target.value) })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fin" className="text-base font-semibold">Año Fin</Label>
                  <Input
                    id="fin"
                    type="number"
                    min={2026}
                    max={2030}
                    value={currentObjetivo.año_fin || 2030}
                    onChange={(e) => setCurrentObjetivo({ ...currentObjetivo, año_fin: parseInt(e.target.value) })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} className="h-12 flex-1 rounded-full">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="h-12 flex-1 rounded-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar Cambios' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
