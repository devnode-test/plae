'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eje } from '@/lib/types';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface EjesClientProps {
  initialEjes: Eje[];
}

export function EjesClient({ initialEjes }: EjesClientProps) {
  const [ejes, setEjes] = useState<Eje[]>(initialEjes);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEje, setCurrentEje] = useState<Partial<Eje>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [ejeToDelete, setEjeToDelete] = useState<Eje | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const filteredEjes = ejes.filter((e) => e.nombre.toLowerCase().includes(search.trim().toLowerCase()));

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setCurrentEje({});
      setIsEditing(false);
    }
  };

  const handleEdit = (eje: Eje) => {
    setCurrentEje(eje);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleRequestDelete = (eje: Eje) => {
    setEjeToDelete(eje);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!ejeToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from('ejes').delete().eq('id', ejeToDelete.id);
      if (error) throw error;
      
      setEjes(ejes.filter((e) => e.id !== ejeToDelete.id));
      router.refresh();
      toast.success('Eje eliminado correctamente');
      setIsDeleteDialogOpen(false);
      setEjeToDelete(null);
    } catch (error: unknown) {
      console.error('Error al eliminar eje:', error);
      const message = error instanceof Error ? error.message : 'Error al eliminar el eje';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isEditing && currentEje.id) {
        const { error } = await supabase
          .from('ejes')
          .update({
            nombre: currentEje.nombre,
            descripcion: currentEje.descripcion,
            orden: currentEje.orden,
          })
          .eq('id', currentEje.id);

        if (error) throw error;
        
        setEjes(ejes.map((item) => (item.id === currentEje.id ? { ...item, ...currentEje } as Eje : item)));
        toast.success('Eje actualizado correctamente');
      } else {
        const { data, error } = await supabase
          .from('ejes')
          .insert([
            {
              nombre: currentEje.nombre,
              descripcion: currentEje.descripcion,
              orden: currentEje.orden || ejes.length + 1,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        
        if (data) setEjes([...ejes, data]);
        toast.success('Eje creado correctamente');
      }
      
      handleOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Error al guardar eje:', error);
      toast.error('Error al guardar el eje');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Eje
        </Button>
      </div>

      <div className="md:hidden space-y-3">
        <div className="grid gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="pl-9"
            />
          </div>
        </div>

        {filteredEjes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-md bg-card">
            {ejes.length === 0 ? 'No hay ejes registrados. Crea uno nuevo para comenzar.' : 'No hay resultados para tu búsqueda.'}
          </div>
        ) : (
          filteredEjes.map((eje) => (
            <Card key={eje.id} className="bg-card shadow-sm rounded-xl">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold leading-snug">{eje.nombre}</div>
                    {eje.descripcion && (
                      <div className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{eje.descripcion}</div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 text-muted-foreground">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(eje)}>
                      <Pencil className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRequestDelete(eje)}
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

      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ejes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                  No hay ejes registrados. Crea uno nuevo para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              ejes.map((eje) => (
                <TableRow key={eje.id}>
                  <TableCell className="font-medium">{eje.nombre}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(eje)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRequestDelete(eje)}
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Eliminar eje</DialogTitle>
            <DialogDescription className="text-sm">Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-2">
            <div className="text-sm">
              ¿Seguro que deseas eliminar <span className="font-semibold">{ejeToDelete?.nombre ?? 'este eje'}</span>?
            </div>
            {ejeToDelete?.descripcion && (
              <div className="text-xs text-muted-foreground line-clamp-3">{ejeToDelete.descripcion}</div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setEjeToDelete(null);
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
              {isEditing ? 'Editar Eje' : 'Nuevo Eje'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isEditing ? 'Modifica los datos del eje estratégico.' : 'Ingresa los datos para crear un nuevo eje estratégico.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-5 px-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="nombre" className="text-base font-semibold">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={currentEje.nombre || ''}
                  onChange={(e) => setCurrentEje({ ...currentEje, nombre: e.target.value })}
                  required
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="orden" className="text-base font-semibold">Orden</Label>
                <Input
                  id="orden"
                  type="number"
                  value={currentEje.orden || ''}
                  onChange={(e) => setCurrentEje({ ...currentEje, orden: parseInt(e.target.value) })}
                  placeholder="Auto"
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descripcion" className="text-base font-semibold">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={currentEje.descripcion || ''}
                  onChange={(e) => setCurrentEje({ ...currentEje, descripcion: e.target.value })}
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
