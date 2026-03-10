'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eje, Foco } from '@/lib/types';
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
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from '@/components/ui/badge';

interface FocosClientProps {
  initialEjes: Eje[];
  initialFocos: Foco[];
}

export function FocosClient({ initialEjes, initialFocos }: FocosClientProps) {
  const [ejes] = useState<Eje[]>(initialEjes);
  const [focos, setFocos] = useState<Foco[]>(initialFocos);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFoco, setCurrentFoco] = useState<Partial<Foco>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEjeId, setSelectedEjeId] = useState<string>('all');
  const [focoToDelete, setFocoToDelete] = useState<Foco | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setCurrentFoco({});
      setIsEditing(false);
    }
  };

  const handleCreate = (preSelectedEjeId?: string) => {
    const ejeIdToUse = preSelectedEjeId || (selectedEjeId !== 'all' ? selectedEjeId : undefined);
    setCurrentFoco({
      eje_id: ejeIdToUse
    });
    setIsEditing(false);
    setIsOpen(true);
  }

  const handleEdit = (foco: Foco) => {
    setCurrentFoco(foco);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleRequestDelete = (foco: Foco) => {
    setFocoToDelete(foco);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!focoToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from('focos').delete().eq('id', focoToDelete.id);
      if (error) throw error;
      
      setFocos(focos.filter((f) => f.id !== focoToDelete.id));
      router.refresh();
      toast.success('Foco eliminado correctamente');
      setIsDeleteDialogOpen(false);
      setFocoToDelete(null);
    } catch (error: unknown) {
      console.error('Error al eliminar foco:', error);
      const message = error instanceof Error ? error.message : 'Error al eliminar el foco';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Use selectedEjeId as fallback if available and currentFoco.eje_id is missing
    const ejeId = currentFoco.eje_id || (selectedEjeId !== 'all' ? selectedEjeId : undefined);

    if (!ejeId) {
      toast.error('Debes seleccionar un eje');
      setIsLoading(false);
      return;
    }

    try {
      if (isEditing && currentFoco.id) {
        const { error } = await supabase
          .from('focos')
          .update({
            nombre: currentFoco.nombre,
            descripcion: currentFoco.descripcion,
            orden: currentFoco.orden,
            eje_id: ejeId,
          })
          .eq('id', currentFoco.id);

        if (error) throw error;
        
        setFocos(focos.map((item) => (item.id === currentFoco.id ? { ...item, ...currentFoco, eje_id: ejeId } as Foco : item)));
        toast.success('Foco actualizado correctamente');
      } else {
        // Calculate next order if not provided
        let nextOrder = currentFoco.orden;
        if (!nextOrder) {
          const focosInEje = focos.filter(f => f.eje_id === ejeId);
          nextOrder = focosInEje.length + 1;
        }

        const { data, error } = await supabase
          .from('focos')
          .insert([
            {
              nombre: currentFoco.nombre,
              descripcion: currentFoco.descripcion,
              orden: nextOrder,
              eje_id: ejeId,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        
        if (data) setFocos([...focos, data]);
        toast.success('Foco creado correctamente');
      }
      
      handleOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Error al guardar foco:', error);
      toast.error('Error al guardar el foco');
    } finally {
      setIsLoading(false);
    }
  };

  const getEjeName = (id: string) => {
    return ejes.find(e => e.id === id)?.nombre || 'Desconocido';
  };

  const filteredFocos = selectedEjeId === 'all' ? focos : focos.filter((f) => f.eje_id === selectedEjeId);

  // Group focos by Eje for display
  const focosByEje = ejes.map((eje) => ({
    eje,
    focos: focos.filter((f) => f.eje_id === eje.id).sort((a, b) => a.orden - b.orden),
  }));

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Label htmlFor="filter-eje" className="sr-only">Filtrar por Eje</Label>
          <Select value={selectedEjeId} onValueChange={setSelectedEjeId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Todos los ejes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los ejes</SelectItem>
              {ejes.map((eje) => (
                <SelectItem key={eje.id} value={eje.id}>
                  {eje.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => handleCreate()} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Foco
        </Button>
      </div>

      <div className="space-y-4">
        {selectedEjeId === 'all' ? (
           <Accordion type="multiple" defaultValue={ejes.map((e) => e.id)} className="space-y-4">
             {focosByEje.map(({ eje, focos }) => (
               <AccordionItem key={eje.id} value={eje.id} className="border rounded-lg bg-card px-4">
                 <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                     <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center bg-primary/10 text-primary border-primary/20">
                        {eje.orden}
                     </Badge>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm sm:text-base leading-snug">{eje.nombre}</div>
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-[11px]">
                          {focos.length} focos
                        </Badge>
                      </div>
                    </div>
                   </div>
                 </AccordionTrigger>
                 <AccordionContent className="pb-4">
                    {focos.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-md border border-dashed">
                        No hay focos registrados para este eje.
                        <Button variant="link" onClick={() => {
                          handleCreate(eje.id);
                        }}>
                          Crear el primer foco
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <div className="md:hidden space-y-2 p-2">
                          {focos.map((foco) => (
                            <Card key={foco.id} className="bg-card shadow-sm rounded-xl">
                              <CardContent className="p-5">
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <div className="w-full text-lg font-semibold leading-snug">{foco.nombre}</div>
                                    {foco.descripcion && (
                                      <div className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{foco.descripcion}</div>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-end gap-3 text-muted-foreground">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(foco)}>
                                      <Pencil className="h-5 w-5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => handleRequestDelete(foco)}
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        <div className="hidden md:block">
                          <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre del Foco</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {focos.map((foco) => (
                              <TableRow key={foco.id}>
                                <TableCell className="font-medium">{foco.nombre}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(foco)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => handleRequestDelete(foco)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                 </AccordionContent>
               </AccordionItem>
             ))}
           </Accordion>
        ) : (
          <div className="rounded-md border bg-card">
            <div className="md:hidden space-y-3 p-2">
              {filteredFocos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-md bg-card">
                  No hay focos registrados para este filtro.
                </div>
              ) : (
                filteredFocos.map((foco) => (
                  <Card key={foco.id} className="bg-card shadow-sm rounded-xl">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="w-full text-lg font-semibold leading-snug">{foco.nombre}</div>
                          <div className="text-sm text-muted-foreground">
                            Eje: <span className="font-medium">{getEjeName(foco.eje_id)}</span>
                          </div>
                          {foco.descripcion && (
                            <div className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{foco.descripcion}</div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-3 text-muted-foreground">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(foco)}>
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRequestDelete(foco)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="hidden md:block">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Eje</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFocos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                      No hay focos registrados para este filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFocos.map((foco) => (
                    <TableRow key={foco.id}>
                      <TableCell>{foco.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getEjeName(foco.eje_id)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(foco)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRequestDelete(foco)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Eliminar foco</DialogTitle>
            <DialogDescription className="text-sm">Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-2">
            <div className="text-sm">
              ¿Seguro que deseas eliminar <span className="font-semibold">{focoToDelete?.nombre ?? 'este foco'}</span>?
            </div>
            {focoToDelete?.descripcion && (
              <div className="text-xs text-muted-foreground line-clamp-3">{focoToDelete.descripcion}</div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setFocoToDelete(null);
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {isEditing ? 'Editar Foco' : 'Nuevo Foco'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isEditing ? 'Modifica los datos del foco estratégico.' : 'Ingresa los datos para crear un nuevo foco estratégico.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-5 px-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="eje" className="text-base font-semibold">
                  Eje Estratégico
                </Label>
                <Select 
                  value={currentFoco.eje_id || (selectedEjeId !== 'all' ? selectedEjeId : '')} 
                  onValueChange={(value) => setCurrentFoco({ ...currentFoco, eje_id: value })}
                >
                  <SelectTrigger id="eje" className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecciona un eje" />
                  </SelectTrigger>
                  <SelectContent>
                    {ejes.map((eje) => (
                      <SelectItem key={eje.id} value={eje.id}>
                        {eje.orden}. {eje.nombre}
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
                  <Input
                    id="nombre"
                    value={currentFoco.nombre || ''}
                    onChange={(e) => setCurrentFoco({ ...currentFoco, nombre: e.target.value })}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-1 grid gap-2">
                  <Label htmlFor="orden" className="text-base font-semibold">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    value={currentFoco.orden || ''}
                    onChange={(e) => setCurrentFoco({ ...currentFoco, orden: parseInt(e.target.value) })}
                    placeholder="Auto"
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descripcion" className="text-base font-semibold">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={currentFoco.descripcion || ''}
                  onChange={(e) => setCurrentFoco({ ...currentFoco, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Descripción opcional"
                  className="min-h-[120px] rounded-xl"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleOpenChange(false)}
                className="h-12 flex-1 rounded-full"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 flex-1 rounded-full"
              >
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
