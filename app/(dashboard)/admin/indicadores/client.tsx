'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eje, Foco, Objetivo, Indicador, MetaAnual, Accion } from '@/lib/types';
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
import { Plus, Pencil, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface IndicadoresClientProps {
  initialEjes: Eje[];
  initialFocos: Foco[];
  initialObjetivos: Objetivo[];
  initialIndicadores: (Indicador & { objetivos: Objetivo, metas_anuales: MetaAnual[] })[];
}

type IndicadorRow = Indicador & { objetivos: Objetivo; metas_anuales: MetaAnual[] };

export function IndicadoresClient({ initialEjes, initialFocos, initialObjetivos, initialIndicadores }: IndicadoresClientProps) {
  const [indicadores, setIndicadores] = useState<IndicadorRow[]>(initialIndicadores);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndicador, setCurrentIndicador] = useState<Partial<Indicador>>({});
  const [currentMetas, setCurrentMetas] = useState<Partial<MetaAnual>[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [indicadorToDelete, setIndicadorToDelete] = useState<IndicadorRow | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filtering states
  const [selectedEjeId, setSelectedEjeId] = useState<string>('all');
  const [selectedFocoId, setSelectedFocoId] = useState<string>('all');
  const [selectedObjetivoId, setSelectedObjetivoId] = useState<string>('all');

  const router = useRouter();
  const supabase = createClient();

  const [formEjeId, setFormEjeId] = useState<string>('all');
  const [formFocoId, setFormFocoId] = useState<string>('all');

  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<MetaAnual | null>(null);
  const [metaActions, setMetaActions] = useState<Accion[]>([]);
  const [isActionsLoading, setIsActionsLoading] = useState(false);
  const [isActionsEditMode, setIsActionsEditMode] = useState(false);

  const [isActionFormOpen, setIsActionFormOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<Partial<Accion>>({ estado: 'pendiente' });
  const [isEditingAction, setIsEditingAction] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);

  const [actionToDelete, setActionToDelete] = useState<Accion | null>(null);
  const [isDeleteActionDialogOpen, setIsDeleteActionDialogOpen] = useState(false);
  const [isDeletingAction, setIsDeletingAction] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setCurrentIndicador({});
      setCurrentMetas([]);
      setIsEditing(false);
      setFormEjeId('all');
      setFormFocoId('all');
    } else {
      // Pre-fill form filters if main filters are selected
      if (!isEditing) {
        setFormEjeId(selectedEjeId);
        setFormFocoId(selectedFocoId);
      }
    }
  };

  const fetchMetaActions = async (metaId: string) => {
    setIsActionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('acciones')
        .select('*')
        .eq('meta_anual_id', metaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMetaActions(data || []);
    } catch (error) {
      console.error('Error al cargar acciones:', error);
      toast.error('No se pudieron cargar las acciones');
      setMetaActions([]);
    } finally {
      setIsActionsLoading(false);
    }
  };

  const handleOpenActions = async (meta: MetaAnual) => {
    setSelectedMeta(meta);
    setIsActionsEditMode(!!(meta as MetaAnual).acciones_edicion_habilitada);
    setIsActionsDialogOpen(true);
    await fetchMetaActions(meta.id);
  };

  const handleToggleActionsEditMode = async () => {
    if (!selectedMeta) return;

    const next = !isActionsEditMode;
    try {
      const { error } = await supabase
        .from('metas_anuales')
        .update({ acciones_edicion_habilitada: next })
        .eq('id', selectedMeta.id);

      if (error) throw error;

      setIsActionsEditMode(next);
      setSelectedMeta({ ...selectedMeta, acciones_edicion_habilitada: next });
      setIndicadores((prev) =>
        prev.map((ind) => ({
          ...ind,
          metas_anuales: (ind.metas_anuales || []).map((m) => (m.id === selectedMeta.id ? { ...m, acciones_edicion_habilitada: next } : m)),
        }))
      );

      toast.success(next ? 'Edición de acciones habilitada' : 'Edición de acciones deshabilitada');
    } catch (error) {
      console.error('Error al actualizar estado de edición:', error);
      toast.error('No se pudo actualizar el estado de edición');
    }
  };

  const handleCreateAction = () => {
    if (!selectedMeta) return;
    if (!isActionsEditMode) {
      toast.error('Activa el modo edición para crear acciones');
      return;
    }
    setCurrentAction({ estado: 'pendiente' });
    setIsEditingAction(false);
    setIsActionFormOpen(true);
  };

  const handleEditAction = (accion: Accion) => {
    if (!isActionsEditMode) {
      toast.error('Activa el modo edición para editar acciones');
      return;
    }
    setCurrentAction(accion);
    setIsEditingAction(true);
    setIsActionFormOpen(true);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeta) return;
    if (!currentAction.descripcion?.trim()) {
      toast.error('Debes ingresar una descripción');
      return;
    }

    setIsSavingAction(true);
    try {
      if (isEditingAction && currentAction.id) {
        const { error } = await supabase
          .from('acciones')
          .update({
            descripcion: currentAction.descripcion,
            fecha_inicio: currentAction.fecha_inicio || null,
            fecha_fin: currentAction.fecha_fin || null,
            estado: currentAction.estado || 'pendiente',
          })
          .eq('id', currentAction.id);
        if (error) throw error;
        toast.success('Acción actualizada');
      } else {
        const { error } = await supabase.from('acciones').insert([
          {
            meta_anual_id: selectedMeta.id,
            descripcion: currentAction.descripcion,
            fecha_inicio: currentAction.fecha_inicio || null,
            fecha_fin: currentAction.fecha_fin || null,
            estado: currentAction.estado || 'pendiente',
          },
        ]);
        if (error) throw error;
        toast.success('Acción creada');
      }

      setIsActionFormOpen(false);
      setCurrentAction({ estado: 'pendiente' });
      setIsEditingAction(false);
      await fetchMetaActions(selectedMeta.id);
    } catch (error) {
      console.error('Error al guardar acción:', error);
      toast.error('Error al guardar la acción');
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleRequestDeleteAction = (accion: Accion) => {
    if (!isActionsEditMode) {
      toast.error('Activa el modo edición para eliminar acciones');
      return;
    }
    setActionToDelete(accion);
    setIsDeleteActionDialogOpen(true);
  };

  const handleConfirmDeleteAction = async () => {
    if (!actionToDelete || !selectedMeta) return;
    setIsDeletingAction(true);
    try {
      const { error } = await supabase.from('acciones').delete().eq('id', actionToDelete.id);
      if (error) throw error;
      toast.success('Acción eliminada');
      setIsDeleteActionDialogOpen(false);
      setActionToDelete(null);
      await fetchMetaActions(selectedMeta.id);
    } catch (error) {
      console.error('Error al eliminar acción:', error);
      toast.error('Error al eliminar la acción');
    } finally {
      setIsDeletingAction(false);
    }
  };

  const initializeMetas = () => {
    const years = [2026, 2027, 2028, 2029, 2030];
    return years.map(year => ({
      año: year,
      valor_meta: 0,
      unidad_medida: ''
    }));
  };

  const handleCreate = () => {
    setCurrentIndicador({
      objetivo_id: selectedObjetivoId !== 'all' ? selectedObjetivoId : undefined
    });
    setCurrentMetas(initializeMetas());
    setIsEditing(false);
    setIsOpen(true);
  }

  const handleEdit = (indicador: IndicadorRow) => {
    setCurrentIndicador(indicador);
    // Sort metas by year to ensure correct order in form
    const sortedMetas = [...(indicador.metas_anuales || [])].sort((a, b) => a.año - b.año);
    
    // Fill missing years if any
    const completeMetas = [2026, 2027, 2028, 2029, 2030].map(year => {
      const existing = sortedMetas.find(m => m.año === year);
      return existing || { año: year, valor_meta: 0, unidad_medida: indicador.metas_anuales[0]?.unidad_medida || '' };
    });

    // Find objetivo to set filters
    const obj = initialObjetivos.find(o => o.id === indicador.objetivo_id);
    if (obj) {
        const foco = initialFocos.find(f => f.id === obj.foco_id);
        if (foco) {
            setFormFocoId(foco.id);
            setFormEjeId(foco.eje_id);
        }
    }

    setCurrentMetas(completeMetas);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleRequestDelete = (ind: IndicadorRow) => {
    setIndicadorToDelete(ind);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!indicadorToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from('indicadores').delete().eq('id', indicadorToDelete.id);
      if (error) throw error;
      
      setIndicadores(indicadores.filter((i) => i.id !== indicadorToDelete.id));
      router.refresh();
      toast.success('Indicador eliminado correctamente');
      setIsDeleteDialogOpen(false);
      setIndicadorToDelete(null);
    } catch (error: unknown) {
      console.error('Error al eliminar indicador:', error);
      const message = error instanceof Error ? error.message : 'Error al eliminar el indicador';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const objetivoId = currentIndicador.objetivo_id || (selectedObjetivoId !== 'all' ? selectedObjetivoId : undefined);

    if (!objetivoId) {
      toast.error('Debes seleccionar un objetivo');
      setIsLoading(false);
      return;
    }

    try {
      let indicadorId = currentIndicador.id;

      // 1. Save Indicador
      if (isEditing && indicadorId) {
        const { error } = await supabase
          .from('indicadores')
          .update({
            nombre: currentIndicador.nombre,
            descripcion: currentIndicador.descripcion,
            tipo_medida: currentIndicador.tipo_medida,
            objetivo_id: objetivoId,
          })
          .eq('id', indicadorId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('indicadores')
          .insert([
            {
              nombre: currentIndicador.nombre,
              descripcion: currentIndicador.descripcion,
              tipo_medida: currentIndicador.tipo_medida,
              objetivo_id: objetivoId,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        indicadorId = data.id;
      }

      // 2. Save Metas Anuales (Upsert)
      if (indicadorId) {
        const metasToUpsert = currentMetas.map(meta => ({
          ...meta,
          indicador_id: indicadorId,
          unidad_medida: currentIndicador.tipo_medida // Sync unit with indicator type or separate field
        }));

        // Remove ID from upsert if it's a new meta (no ID) to let DB generate it
        const cleanMetas = metasToUpsert.map(({ id, ...rest }) => id ? { id, ...rest } : rest);

        const { error: metasError } = await supabase
          .from('metas_anuales')
          .upsert(cleanMetas, { onConflict: 'id' }); // Or use a composite key constraint if exists

        if (metasError) throw metasError;
      }

      // Refresh data (simplified)
      router.refresh();
      toast.success(isEditing ? 'Indicador actualizado' : 'Indicador creado');
      handleOpenChange(false);

    } catch (error) {
      console.error('Error al guardar indicador:', error);
      toast.error('Error al guardar el indicador');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter logic
  const filteredFocos = selectedEjeId === 'all' 
    ? initialFocos 
    : initialFocos.filter(f => f.eje_id === selectedEjeId);

  const filteredObjetivos = initialObjetivos.filter(obj => {
    if (selectedFocoId !== 'all' && obj.foco_id !== selectedFocoId) return false;
    if (selectedEjeId !== 'all') {
       const foco = initialFocos.find(f => f.id === obj.foco_id);
       if (foco?.eje_id !== selectedEjeId) return false;
    }
    return true;
  });

  const filteredIndicadores = indicadores.filter(ind => {
    if (selectedObjetivoId !== 'all' && ind.objetivo_id !== selectedObjetivoId) return false;
    if (selectedFocoId !== 'all') {
      const obj = initialObjetivos.find(o => o.id === ind.objetivo_id);
      if (obj?.foco_id !== selectedFocoId) return false;
    }
    if (selectedEjeId !== 'all') {
       const obj = initialObjetivos.find(o => o.id === ind.objetivo_id);
       const foco = initialFocos.find(f => f.id === obj?.foco_id);
       if (foco?.eje_id !== selectedEjeId) return false;
    }
    return true;
  });

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto flex-wrap">
            <div className="grid gap-2 w-full md:w-[200px]">
              <Label htmlFor="filter-eje">Eje</Label>
              <Select 
                value={selectedEjeId} 
                onValueChange={(val) => {
                  setSelectedEjeId(val);
                  setSelectedFocoId('all');
                  setSelectedObjetivoId('all');
                }}
              >
                <SelectTrigger id="filter-eje">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {initialEjes.map((eje) => (
                    <SelectItem key={eje.id} value={eje.id}>
                      {eje.orden}. {eje.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2 w-full md:w-[200px]">
              <Label htmlFor="filter-foco">Foco</Label>
              <Select 
                value={selectedFocoId} 
                onValueChange={(val) => {
                  setSelectedFocoId(val);
                  setSelectedObjetivoId('all');
                }}
                disabled={selectedEjeId === 'all' && initialFocos.length > 50}
              >
                <SelectTrigger id="filter-foco">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filteredFocos.map((foco) => (
                    <SelectItem key={foco.id} value={foco.id}>
                      {foco.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 w-full md:w-[300px]">
              <Label htmlFor="filter-objetivo">Objetivo</Label>
              <Select 
                value={selectedObjetivoId} 
                onValueChange={setSelectedObjetivoId}
                disabled={selectedFocoId === 'all' && initialObjetivos.length > 100}
              >
                <SelectTrigger id="filter-objetivo">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filteredObjetivos.map((obj) => (
                    <SelectItem key={obj.id} value={obj.id}>
                      {obj.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Indicador
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredIndicadores.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-md bg-card">
            No hay indicadores registrados para este filtro.
          </div>
        ) : (
          filteredIndicadores.map((ind) => (
            <Collapsible key={ind.id} className="border rounded-md bg-card">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full items-start gap-4 min-w-0">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto mt-1">
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Toggle</span>
                    </Button>
                  </CollapsibleTrigger>
                  <div className="grid gap-1 min-w-0">
                    <div className="w-full text-sm font-semibold leading-tight flex flex-wrap items-center gap-2">
                      {ind.nombre}
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {ind.tipo_medida}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{ind.descripcion}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Objetivo: {ind.objetivos?.nombre}
                    </div>
                  </div>
                </div>
                <div className="flex w-full items-center justify-end gap-2 text-muted-foreground sm:w-auto">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(ind)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRequestDelete(ind)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0">
                  <div className="md:hidden space-y-2">
                    {ind.metas_anuales
                      ?.sort((a, b) => a.año - b.año)
                      .map((meta) => {
                        const real = meta.valor_real || 0;
                        const target = meta.valor_meta;
                        const status = real >= target ? 'Cumplida' : real > 0 ? 'En Progreso' : 'Pendiente';
                        const statusVariant = real >= target ? 'default' : real > 0 ? 'secondary' : 'outline';

                        return (
                          <Card key={meta.id} className="bg-card shadow-sm rounded-xl">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold">Meta {meta.año}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {real} / {target} {meta.unidad_medida || ''}
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  <Badge variant={statusVariant} className="text-[11px]">{status}</Badge>
                                </div>
                              </div>

                              <div className="mt-3 flex justify-end">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-10 rounded-full"
                                  onClick={() => handleOpenActions(meta)}
                                >
                                  Gestionar acciones
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>

                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Año</TableHead>
                          <TableHead>Meta</TableHead>
                          <TableHead>Unidad</TableHead>
                          <TableHead>Valor Real</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ind.metas_anuales?.sort((a, b) => a.año - b.año).map((meta) => (
                          <TableRow key={meta.id}>
                            <TableCell className="font-medium">{meta.año}</TableCell>
                            <TableCell>{meta.valor_meta}</TableCell>
                            <TableCell>{meta.unidad_medida}</TableCell>
                            <TableCell>{meta.valor_real || 0}</TableCell>
                            <TableCell>
                              {(meta.valor_real || 0) >= meta.valor_meta ? (
                                <Badge className="bg-green-500">Cumplida</Badge>
                              ) : (meta.valor_real || 0) > 0 ? (
                                <Badge className="bg-yellow-500">En Progreso</Badge>
                              ) : (
                                <Badge variant="outline">Pendiente</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-10 rounded-full"
                                onClick={() => handleOpenActions(meta)}
                              >
                                Gestionar acciones
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>

      <Dialog
        open={isActionsDialogOpen}
        onOpenChange={(open) => {
          setIsActionsDialogOpen(open);
          if (!open) {
            setSelectedMeta(null);
            setMetaActions([]);
            setIsActionsEditMode(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              Acciones para la meta {selectedMeta?.año ?? ''}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Crea, edita o elimina acciones asociadas a este año.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {isActionsLoading ? 'Cargando acciones…' : `${metaActions.length} acciones`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isActionsEditMode ? 'default' : 'secondary'}
                  className="h-10 rounded-full whitespace-nowrap"
                  onClick={handleToggleActionsEditMode}
                  disabled={!selectedMeta}
                >
                  {isActionsEditMode ? 'Deshabilitar edición' : 'Activar edición'}
                </Button>

                <Button
                  type="button"
                  className="h-10 rounded-full"
                  onClick={handleCreateAction}
                  disabled={!selectedMeta || !isActionsEditMode}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva acción
                </Button>
              </div>
            </div>

            {isActionsLoading ? (
              <div className="text-sm text-muted-foreground">Cargando…</div>
            ) : metaActions.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-md bg-card p-4">
                No hay acciones registradas.
              </div>
            ) : (
              <div className="space-y-3">
                {metaActions.map((accion) => (
                  <Card key={accion.id} className="bg-card shadow-sm rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <div className="text-sm font-semibold leading-snug">{accion.descripcion}</div>
                          <div className="text-xs text-muted-foreground">
                            {accion.fecha_inicio ? `Inicio: ${accion.fecha_inicio}` : 'Inicio: —'}
                            {' · '}
                            {accion.fecha_fin ? `Fin: ${accion.fecha_fin}` : 'Fin: —'}
                          </div>
                          <div>
                            <Badge
                              variant={accion.estado === 'completada' ? 'default' : accion.estado === 'en_progreso' ? 'secondary' : 'outline'}
                              className="text-[11px]"
                            >
                              {accion.estado === 'completada'
                                ? 'Completada'
                                : accion.estado === 'en_progreso'
                                  ? 'En progreso'
                                  : 'Pendiente'}
                            </Badge>
                          </div>
                        </div>

                        {isActionsEditMode && (
                          <div className="flex items-center justify-end gap-2 text-muted-foreground">
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleEditAction(accion)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRequestDeleteAction(accion)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsActionsDialogOpen(false)}
              className="h-12 flex-1 rounded-full"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={handleCreateAction}
              disabled={!selectedMeta || !isActionsEditMode}
              className="h-12 flex-1 rounded-full"
            >
              Nueva acción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isActionFormOpen}
        onOpenChange={(open) => {
          setIsActionFormOpen(open);
          if (!open) {
            setCurrentAction({ estado: 'pendiente' });
            setIsEditingAction(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {isEditingAction ? 'Editar acción' : 'Nueva acción'}
            </DialogTitle>
            <DialogDescription className="text-sm">Meta {selectedMeta?.año ?? ''}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAction}>
            <div className="px-6 py-6 space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="accion-descripcion" className="text-base font-semibold">
                  Descripción <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="accion-descripcion"
                  value={currentAction.descripcion || ''}
                  onChange={(e) => setCurrentAction({ ...currentAction, descripcion: e.target.value })}
                  required
                  rows={4}
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="accion-fecha-inicio" className="text-base font-semibold">Fecha inicio</Label>
                  <Input
                    id="accion-fecha-inicio"
                    type="date"
                    value={currentAction.fecha_inicio || ''}
                    onChange={(e) => setCurrentAction({ ...currentAction, fecha_inicio: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accion-fecha-fin" className="text-base font-semibold">Fecha fin</Label>
                  <Input
                    id="accion-fecha-fin"
                    type="date"
                    value={currentAction.fecha_fin || ''}
                    onChange={(e) => setCurrentAction({ ...currentAction, fecha_fin: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accion-estado" className="text-base font-semibold">Estado</Label>
                <Select
                  value={currentAction.estado || 'pendiente'}
                  onValueChange={(value) => setCurrentAction({ ...currentAction, estado: value as Accion['estado'] })}
                >
                  <SelectTrigger id="accion-estado" className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En progreso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsActionFormOpen(false)}
                disabled={isSavingAction}
                className="h-12 flex-1 rounded-full"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingAction} className="h-12 flex-1 rounded-full">
                {isSavingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditingAction ? 'Guardar Cambios' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteActionDialogOpen} onOpenChange={setIsDeleteActionDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Eliminar acción</DialogTitle>
            <DialogDescription className="text-sm">Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-2">
            <div className="text-sm">
              ¿Seguro que deseas eliminar esta acción?
            </div>
            <div className="text-sm text-muted-foreground line-clamp-3">{actionToDelete?.descripcion ?? ''}</div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteActionDialogOpen(false);
                setActionToDelete(null);
              }}
              disabled={isDeletingAction}
              className="h-12 flex-1 rounded-full"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteAction}
              disabled={isDeletingAction}
              className="h-12 flex-1 rounded-full"
            >
              {isDeletingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Eliminar indicador</DialogTitle>
            <DialogDescription className="text-sm">
              Se eliminarán también sus metas anuales. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-2">
            <div className="text-sm">
              ¿Seguro que deseas eliminar <span className="font-semibold">{indicadorToDelete?.nombre ?? 'este indicador'}</span>?
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setIndicadorToDelete(null);
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {isEditing ? 'Editar Indicador' : 'Nuevo Indicador'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Define el indicador y sus metas anuales para el periodo 2026-2030.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
              <div className="grid gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium leading-none">Información General</h3>
                <div className="grid gap-4">
                    
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="form-eje" className="text-base font-semibold">Filtrar Eje</Label>
                        <Select 
                            value={formEjeId} 
                            onValueChange={(val) => {
                                setFormEjeId(val);
                                setFormFocoId('all');
                                setCurrentIndicador({ ...currentIndicador, objetivo_id: undefined });
                            }}
                        >
                            <SelectTrigger id="form-eje" className="h-12 rounded-xl">
                                <SelectValue placeholder="Selecciona Eje" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {initialEjes.map((eje) => (
                                    <SelectItem key={eje.id} value={eje.id}>
                                        {eje.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="form-foco" className="text-base font-semibold">Filtrar Foco</Label>
                        <Select 
                            value={formFocoId} 
                            onValueChange={(val) => {
                                setFormFocoId(val);
                                setCurrentIndicador({ ...currentIndicador, objetivo_id: undefined });
                            }}
                        >
                            <SelectTrigger id="form-foco" className="h-12 rounded-xl">
                                <SelectValue placeholder="Selecciona Foco" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {initialFocos
                                    .filter(f => formEjeId === 'all' || f.eje_id === formEjeId)
                                    .map((foco) => (
                                    <SelectItem key={foco.id} value={foco.id}>
                                        {foco.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="objetivo" className="text-base font-semibold">Objetivo Asociado</Label>
                    <Select 
                      value={currentIndicador.objetivo_id || (selectedObjetivoId !== 'all' && !isEditing ? selectedObjetivoId : '')} 
                      onValueChange={(value) => setCurrentIndicador({ ...currentIndicador, objetivo_id: value })}
                    >
                      <SelectTrigger id="objetivo" className="h-auto min-h-[48px] py-3 rounded-xl">
                        <SelectValue placeholder="Selecciona un objetivo" className="whitespace-normal" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[600px]">
                        {initialObjetivos
                            .filter(obj => {
                                if (formFocoId !== 'all' && obj.foco_id !== formFocoId) return false;
                                if (formEjeId !== 'all') {
                                    const foco = initialFocos.find(f => f.id === obj.foco_id);
                                    if (foco?.eje_id !== formEjeId) return false;
                                }
                                return true;
                            })
                            .map((obj) => (
                          <SelectItem key={obj.id} value={obj.id} className="whitespace-normal border-b py-2">
                            <span className="font-semibold mr-2 text-muted-foreground">#{obj.orden}</span>
                            {obj.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 grid gap-2">
                      <Label htmlFor="nombre" className="text-base font-semibold">
                        Nombre <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="nombre"
                        value={currentIndicador.nombre || ''}
                        onChange={(e) => setCurrentIndicador({ ...currentIndicador, nombre: e.target.value })}
                        required
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tipo" className="text-base font-semibold">
                        Unidad de Medida <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="tipo"
                        placeholder="ej. Porcentaje, Cantidad"
                        value={currentIndicador.tipo_medida || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentIndicador({ ...currentIndicador, tipo_medida: val });
                          // Update metas units as well for consistency
                          setCurrentMetas(currentMetas.map(m => ({ ...m, unidad_medida: val })));
                        }}
                        required
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="descripcion" className="text-base font-semibold">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={currentIndicador.descripcion || ''}
                      onChange={(e) => setCurrentIndicador({ ...currentIndicador, descripcion: e.target.value })}
                      rows={2}
                      placeholder="Descripción opcional"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium leading-none">Metas Anuales (2026 - 2030)</h3>
                <div className="rounded-md border p-4 bg-muted/20">
                  <div className="grid grid-cols-5 gap-4 text-center text-sm font-medium mb-2">
                    {currentMetas.map((meta) => (
                      <div key={meta.año}>{meta.año}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    {currentMetas.map((meta, index) => (
                      <div key={meta.año} className="space-y-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={meta.valor_meta || ''}
                          onChange={(e) => {
                            const newMetas = [...currentMetas];
                            newMetas[index] = { ...meta, valor_meta: parseFloat(e.target.value) || 0 };
                            setCurrentMetas(newMetas);
                          }}
                          className="h-11 rounded-xl text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>
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
