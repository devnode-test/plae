'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Objetivo, Indicador, MetaAnual, Accion, Evidencia } from '@/lib/types';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, FileText, CheckCircle2, Circle, Clock, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type AccionRow = Accion & { evidencias: Evidencia[] };
type MetaRow = MetaAnual & { acciones: AccionRow[] };
type IndicadorRow = Indicador & { metas_anuales: MetaRow[] };
type ObjetivoRow = Objetivo & { indicadores: IndicadorRow[] };

interface MisObjetivosClientProps {
  objetivos: ObjetivoRow[];
}

export function MisObjetivosClient({ objetivos }: MisObjetivosClientProps) {
  const [selectedObjetivo, setSelectedObjetivo] = useState<string | null>(objetivos[0]?.id || null);
  
  // State for editing meta real value
  const [editingMeta, setEditingMeta] = useState<MetaAnual | null>(null);
  const [metaRealValue, setMetaRealValue] = useState<string>('');
  const [isMetaDialogOpen, setIsMetaDialogOpen] = useState(false);

  // State for actions
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<Partial<Accion>>({});
  const [selectedMetaId, setSelectedMetaId] = useState<string | null>(null);
  const [isEditingAction, setIsEditingAction] = useState(false);

  // State for evidences
  const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [localFile, setLocalFile] = useState<File | null>(null);

  const [actionToDeleteId, setActionToDeleteId] = useState<string | null>(null);
  const [isDeleteActionDialogOpen, setIsDeleteActionDialogOpen] = useState(false);
  const [isDeletingAction, setIsDeletingAction] = useState(false);
  const [evidenceToDeleteId, setEvidenceToDeleteId] = useState<string | null>(null);
  const [isDeleteEvidenceDialogOpen, setIsDeleteEvidenceDialogOpen] = useState(false);
  const [isDeletingEvidence, setIsDeletingEvidence] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/g, '_');

  const getTipoArchivoFromName = (name: string): Evidencia['tipo_archivo'] => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'png') return 'png';
    if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
    if (ext === 'doc' || ext === 'docx') return 'word';
    if (ext === 'xls' || ext === 'xlsx') return 'excel';
    return 'pdf';
  };

  const currentObj = objetivos.find(o => o.id === selectedObjetivo);
  const currentYear = new Date().getFullYear();

  const isMetaActionsEditable = (metaId: string) => {
    return (
      currentObj?.indicadores?.some((ind) =>
        ind.metas_anuales?.some((m) => m.id === metaId && m.acciones_edicion_habilitada)
      ) ?? false
    );
  };

  // --- Meta Management ---
  const handleEditMeta = (meta: MetaAnual) => {
    setEditingMeta(meta);
    setMetaRealValue(meta.valor_real?.toString() || '0');
    setIsMetaDialogOpen(true);
  };

  const handleSaveMeta = async () => {
    if (!editingMeta) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('metas_anuales')
        .update({ valor_real: parseFloat(metaRealValue) })
        .eq('id', editingMeta.id);

      if (error) throw error;
      toast.success('Avance actualizado correctamente');
      setIsMetaDialogOpen(false);
      router.refresh();
    } catch {
      toast.error('Error al actualizar avance');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Action Management ---
  const handleCreateAction = (metaId: string) => {
    setSelectedMetaId(metaId);
    setCurrentAction({ estado: 'pendiente' });
    setIsEditingAction(false);
    setIsActionDialogOpen(true);
  };

  const handleEditAction = (action: Accion) => {
    setCurrentAction(action);
    setIsEditingAction(true);
    setIsActionDialogOpen(true);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMetaId && !currentAction.meta_anual_id) return;

    const metaId = (selectedMetaId || currentAction.meta_anual_id) as string;
    if (!isMetaActionsEditable(metaId)) {
      toast.error('La edición de acciones para este año está deshabilitada por el administrador');
      return;
    }
    
    setIsLoading(true);
    try {
      if (isEditingAction && currentAction.id) {
        const { error } = await supabase
          .from('acciones')
          .update({
            descripcion: currentAction.descripcion,
            fecha_inicio: currentAction.fecha_inicio,
            fecha_fin: currentAction.fecha_fin,
            estado: currentAction.estado
          })
          .eq('id', currentAction.id);
        if (error) throw error;
        toast.success('Acción actualizada');
      } else {
        const { error } = await supabase
          .from('acciones')
          .insert([{
            meta_anual_id: selectedMetaId,
            descripcion: currentAction.descripcion,
            fecha_inicio: currentAction.fecha_inicio,
            fecha_fin: currentAction.fecha_fin,
            estado: currentAction.estado || 'pendiente'
          }]);
        if (error) throw error;
        toast.success('Acción creada');
      }
      setIsActionDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error('Error al guardar acción');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestDeleteAction = (id: string) => {
    setActionToDeleteId(id);
    setIsDeleteActionDialogOpen(true);
  };

  const handleConfirmDeleteAction = async () => {
    if (!actionToDeleteId) return;

    const metaId = currentAction.meta_anual_id || selectedMetaId;
    if (metaId && !isMetaActionsEditable(metaId)) {
      toast.error('La edición de acciones para este año está deshabilitada por el administrador');
      setIsDeleteActionDialogOpen(false);
      setActionToDeleteId(null);
      return;
    }

    setIsDeletingAction(true);
    try {
      const { error } = await supabase.from('acciones').delete().eq('id', actionToDeleteId);
      if (error) throw error;
      router.refresh();
      toast.success('Acción eliminada');
    } catch (error) {
      toast.error('Error al eliminar acción');
    } finally {
      setIsDeletingAction(false);
      setIsDeleteActionDialogOpen(false);
      setActionToDeleteId(null);
    }
  };

  // --- Evidence Management ---
  // Note: Simplified for MVP (URL input instead of file upload to storage)
  const handleAddEvidence = (actionId: string) => {
    setSelectedActionId(actionId);
    setFileName('');
    setLocalFile(null);
    setIsEvidenceDialogOpen(true);
  };

  const handleSaveEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActionId) return;
    if (!localFile) {
      toast.error('Debes seleccionar un archivo');
      return;
    }
    setIsLoading(true);
    try {
      let finalFileName = fileName;
      finalFileName = finalFileName || localFile.name;
      const finalTipo: Evidencia['tipo_archivo'] = getTipoArchivoFromName(finalFileName);
      const safeName = sanitizeFileName(finalFileName);
      const objectPath = `acciones/${selectedActionId}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('evidencias')
        .upload(objectPath, localFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: localFile.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('evidencias').getPublicUrl(objectPath);
      const finalUrl = publicData.publicUrl;

      if (!finalFileName.trim()) {
        toast.error('Debes ingresar un nombre de archivo');
        return;
      }

      const { error } = await supabase.from('evidencias').insert([
        {
          accion_id: selectedActionId,
          nombre_archivo: finalFileName,
          url_archivo: finalUrl,
          tipo_archivo: finalTipo,
        },
      ]);
      if (error) throw error;
      toast.success('Evidencia adjuntada');
      setIsEvidenceDialogOpen(false);
      setLocalFile(null);
      router.refresh();
    } catch (error) {
      toast.error('Error al guardar evidencia');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRequestDeleteEvidence = (id: string) => {
    setEvidenceToDeleteId(id);
    setIsDeleteEvidenceDialogOpen(true);
  };

  const handleConfirmDeleteEvidence = async () => {
    if (!evidenceToDeleteId) return;
    setIsDeletingEvidence(true);
    try {
      const { error } = await supabase.from('evidencias').delete().eq('id', evidenceToDeleteId);
      if (error) throw error;
      router.refresh();
      toast.success('Evidencia eliminada');
    } catch (error) {
      toast.error('Error al eliminar evidencia');
    } finally {
      setIsDeletingEvidence(false);
      setIsDeleteEvidenceDialogOpen(false);
      setEvidenceToDeleteId(null);
    }
  };

  if (objetivos.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">No tienes objetivos asignados</h3>
        <p className="text-muted-foreground">Contacta al administrador para que te asigne objetivos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar List of Objectives */}
      <div className="w-full lg:w-1/3 space-y-4">
        <h2 className="text-lg font-semibold mb-2">Mis Objetivos</h2>
        <div className="space-y-2">
          {objetivos.map((obj) => (
            <Card 
              key={obj.id} 
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${selectedObjetivo === obj.id ? 'border-primary bg-accent/20' : ''}`}
              onClick={() => setSelectedObjetivo(obj.id)}
            >
              <CardContent className="p-4">
                <div className="font-normal mb-1">{obj.nombre}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{obj.descripcion}</div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <Badge variant="outline">{obj.indicadores?.length || 0} Indicadores</Badge>
                  <span className="text-muted-foreground">{obj.año_inicio}-{obj.año_fin}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full lg:w-2/3">
        {currentObj && (
          <div className="space-y-6">
            <div className="space-y-6">
              {currentObj.indicadores?.map((ind) => {
                // Find meta for current year or closest
                const metas = ind.metas_anuales?.sort((a, b) => a.año - b.año) || [];
                const currentMeta = metas.find((m) => m.año === currentYear) || metas[0];
                const progress = currentMeta ? (currentMeta.valor_real / currentMeta.valor_meta) * 100 : 0;

                return (
                  <Card key={ind.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            {ind.nombre}
                            <Badge className="text-xs font-normal">{ind.tipo_medida}</Badge>
                          </CardTitle>
                          <CardDescription>{ind.descripcion}</CardDescription>
                        </div>
                        {currentMeta && (
                          <div className="text-right">
                             <div className="text-2xl font-bold">
                               {currentMeta.valor_real} <span className="text-sm font-normal text-muted-foreground">/ {currentMeta.valor_meta}</span>
                             </div>
                             <div className="text-xs text-muted-foreground">Meta {currentMeta.año}</div>
                          </div>
                        )}
                      </div>
                      {currentMeta && (
                        <div className="mt-4">
                          <Progress value={Math.min(progress, 100)} className="h-2" />
                        </div>
                      )}
                    </CardHeader>
                    
                    <CardContent className="pb-2">
                      <Tabs defaultValue="acciones" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="acciones">Acciones ({currentMeta?.acciones?.length || 0})</TabsTrigger>
                          <TabsTrigger value="historico">Histórico Metas</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="acciones" className="space-y-4 pt-4">
                          {currentMeta ? (
                            <>
                              <div className="flex items-center gap-2 flex-nowrap">
                                <h4 className="text-sm font-medium min-w-0 flex-1 truncate whitespace-nowrap">
                                  Acciones para la meta {currentMeta.año}
                                </h4>
                                <div className="flex gap-2 flex-nowrap shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="whitespace-nowrap"
                                    onClick={() => handleEditMeta(currentMeta)}
                                  >
                                    Actualizar Avance
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="whitespace-nowrap"
                                    onClick={() => {
                                      if (!currentMeta.acciones_edicion_habilitada) {
                                        toast.error('La edición de acciones para este año está deshabilitada por el administrador');
                                        return;
                                      }
                                      handleCreateAction(currentMeta.id);
                                    }}
                                    disabled={!currentMeta.acciones_edicion_habilitada}
                                  >
                                    <Plus className="mr-2 h-4 w-4" /> Nueva Acción
                                  </Button>
                                </div>
                              </div>

                              {!currentMeta.acciones_edicion_habilitada && (
                                <div className="text-xs text-muted-foreground">
                                  Edición de acciones deshabilitada por el administrador para este año.
                                </div>
                              )}
                              
                              <div className="space-y-3">
                                {currentMeta.acciones?.length === 0 ? (
                                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                                    No hay acciones registradas.
                                  </div>
                                ) : (
                                  currentMeta.acciones?.map((accion) => (
                                    <div key={accion.id} className="border rounded-md p-3 bg-card/50">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="font-medium text-sm">{accion.descripcion}</div>
                                        {currentMeta.acciones_edicion_habilitada && (
                                          <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditAction(accion)}>
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRequestDeleteAction(accion.id)}>
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex flex-wrap gap-2 mb-3">
                                        <Badge variant={
                                          accion.estado === 'completada' ? 'default' : 
                                          accion.estado === 'en_progreso' ? 'secondary' : 'outline'
                                        } className="text-xs">
                                          {accion.estado === 'completada' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                          {accion.estado === 'en_progreso' && <Clock className="mr-1 h-3 w-3" />}
                                          {accion.estado === 'pendiente' && <Circle className="mr-1 h-3 w-3" />}
                                          {accion.estado.replace('_', ' ')}
                                        </Badge>
                                        {accion.fecha_fin && (
                                          <span className="text-xs text-muted-foreground flex items-center bg-muted px-2 py-0.5 rounded">
                                            Vence: {accion.fecha_fin}
                                          </span>
                                        )}
                                      </div>

                                      <Separator className="my-2" />
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-semibold text-muted-foreground">EVIDENCIAS</span>
                                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleAddEvidence(accion.id)}>
                                            <Upload className="mr-1 h-3 w-3" /> Adjuntar
                                          </Button>
                                        </div>
                                        {accion.evidencias?.length > 0 ? (
                                          <div className="grid gap-1">
                                            {accion.evidencias.map((ev) => (
                                              <div key={ev.id} className="flex items-center justify-between text-xs bg-muted/50 p-1.5 rounded">
                                                <div className="flex items-center gap-2 truncate">
                                                  <FileText className="h-3 w-3 flex-shrink-0" />
                                                  <a href={ev.url_archivo} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px]">
                                                    {ev.nombre_archivo}
                                                  </a>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleRequestDeleteEvidence(ev.id)}>
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-muted-foreground italic">Sin evidencias adjuntas</div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              No hay meta definida para el año actual.
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="historico" className="pt-4">
                          <div className="md:hidden space-y-2">
                            {metas.map((m) => {
                              const p = m.valor_meta > 0 ? (m.valor_real / m.valor_meta) * 100 : 0;
                              return (
                                <Card key={m.id}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="min-w-0">
                                        <div className="font-medium">Meta {m.año}</div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                          Real: {m.valor_real} / {m.valor_meta}
                                        </div>
                                      </div>
                                      <div className="shrink-0 text-right">
                                        <div className="text-sm font-medium">{p.toFixed(0)}%</div>
                                      </div>
                                    </div>
                                    <div className="mt-3">
                                      <Progress value={Math.min(p, 100)} className="h-2" />
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
                                  <TableHead>Real</TableHead>
                                  <TableHead>Cumplimiento</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {metas.map((m) => {
                                  const p = m.valor_meta > 0 ? (m.valor_real / m.valor_meta) * 100 : 0;
                                  return (
                                    <TableRow key={m.id}>
                                      <TableCell className="font-medium">{m.año}</TableCell>
                                      <TableCell>{m.valor_meta}</TableCell>
                                      <TableCell>{m.valor_real}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Progress value={Math.min(p, 100)} className="w-[60px] h-2" />
                                          <span className="text-xs">{p.toFixed(0)}%</span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={isMetaDialogOpen} onOpenChange={setIsMetaDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Actualizar Avance</DialogTitle>
            <DialogDescription className="text-sm">
              Ingresa el valor real alcanzado para la meta del año {editingMeta?.año}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="valor_meta" className="text-base font-semibold">Meta</Label>
              <Input id="valor_meta" value={editingMeta?.valor_meta} disabled className="h-12 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="valor_real" className="text-base font-semibold">Valor Real</Label>
              <Input
                id="valor_real"
                type="number"
                step="0.01"
                value={metaRealValue}
                onChange={(e) => setMetaRealValue(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
            <Button variant="secondary" onClick={() => setIsMetaDialogOpen(false)} className="h-12 flex-1 rounded-full">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveMeta}
              disabled={isLoading}
              className="h-12 flex-1 rounded-full"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {isEditingAction ? 'Editar Acción' : 'Nueva Acción'}
            </DialogTitle>
            <DialogDescription className="text-sm">Define la acción a realizar para cumplir la meta.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAction}>
            <div className="grid gap-5 px-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="descripcion" className="text-base font-semibold">
                  Descripción <span className="text-destructive">*</span>
                </Label>
                <Textarea 
                  id="descripcion" 
                  value={currentAction.descripcion || ''} 
                  onChange={(e) => setCurrentAction({...currentAction, descripcion: e.target.value})}
                  required
                  className="min-h-[120px] rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fecha_inicio" className="text-base font-semibold">Fecha Inicio</Label>
                  <Input 
                    id="fecha_inicio" 
                    type="date"
                    value={currentAction.fecha_inicio ? new Date(currentAction.fecha_inicio).toISOString().split('T')[0] : ''}
                    onChange={(e) => setCurrentAction({...currentAction, fecha_inicio: e.target.value})}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fecha_fin" className="text-base font-semibold">Fecha Fin</Label>
                  <Input 
                    id="fecha_fin" 
                    type="date"
                    value={currentAction.fecha_fin ? new Date(currentAction.fecha_fin).toISOString().split('T')[0] : ''}
                    onChange={(e) => setCurrentAction({...currentAction, fecha_fin: e.target.value})}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estado" className="text-base font-semibold">Estado</Label>
                <Select 
                  value={currentAction.estado || 'pendiente'} 
                  onValueChange={(val) => setCurrentAction({ ...currentAction, estado: val as Accion['estado'] })}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsActionDialogOpen(false)} className="h-12 flex-1 rounded-full">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="h-12 flex-1 rounded-full">
                {isEditingAction ? 'Guardar Cambios' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEvidenceDialogOpen} onOpenChange={setIsEvidenceDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Adjuntar Evidencia</DialogTitle>
            <DialogDescription className="text-sm">Sube un archivo desde tu equipo como evidencia.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEvidence}>
            <div className="grid gap-5 px-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="nombre_archivo" className="text-base font-semibold">
                  Nombre del Archivo <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="nombre_archivo" 
                  value={fileName} 
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Ej. Informe de gestión.pdf"
                  required
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="archivo_local" className="text-base font-semibold">
                  Archivo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="archivo_local"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setLocalFile(file);
                    if (file) {
                      setFileName((prev) => prev || file.name);
                    }
                  }}
                  className="h-12 rounded-xl"
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">Formatos: PDF, Word, Excel, PNG, JPG.</p>
              </div>
            </div>
            <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsEvidenceDialogOpen(false)} className="h-12 flex-1 rounded-full">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="h-12 flex-1 rounded-full">
                Guardar
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

          <div className="px-6 py-6">
            <div className="text-sm">¿Seguro que deseas eliminar esta acción?</div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteActionDialogOpen(false);
                setActionToDeleteId(null);
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

      <Dialog open={isDeleteEvidenceDialogOpen} onOpenChange={setIsDeleteEvidenceDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Eliminar evidencia</DialogTitle>
            <DialogDescription className="text-sm">Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6">
            <div className="text-sm">¿Seguro que deseas eliminar esta evidencia?</div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteEvidenceDialogOpen(false);
                setEvidenceToDeleteId(null);
              }}
              disabled={isDeletingEvidence}
              className="h-12 flex-1 rounded-full"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteEvidence}
              disabled={isDeletingEvidence}
              className="h-12 flex-1 rounded-full"
            >
              {isDeletingEvidence && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
