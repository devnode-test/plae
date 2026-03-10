'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Usuario } from '@/lib/types';
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
import { Plus, Pencil, Trash2, Loader2, User, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface ResponsablesClientProps {
  initialUsuarios: Usuario[];
}

export function ResponsablesClient({ initialUsuarios }: ResponsablesClientProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(initialUsuarios);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUsuario, setCurrentUsuario] = useState<Partial<Usuario> & { password?: string }>({ rol: 'responsable' });
  const [isEditing, setIsEditing] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setUsuarios(initialUsuarios);
  }, [initialUsuarios]);

  const filteredUsuarios = usuarios.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.nombre ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q);
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setCurrentUsuario({ rol: 'responsable' });
      setIsEditing(false);
    }
  };

  const handleCreate = () => {
    setCurrentUsuario({ rol: 'responsable' }); // No password needed
    setIsEditing(false);
    setIsOpen(true);
  }

  const handleEdit = (usuario: Usuario) => {
    setCurrentUsuario(usuario);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleRequestDelete = (usuario: Usuario) => {
    setUsuarioToDelete(usuario);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!usuarioToDelete) return;
    setIsDeleting(true);

    try {
      // Call API to delete user from Auth and DB
      const response = await fetch(`/api/admin/users?id=${usuarioToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar');
      }
      
      setUsuarios(usuarios.filter((u) => u.id !== usuarioToDelete.id));
      router.refresh();
      toast.success('Usuario eliminado correctamente');
      setIsDeleteDialogOpen(false);
      setUsuarioToDelete(null);
    } catch (error: unknown) {
      console.error('Error al eliminar usuario:', error);
      const message = error instanceof Error ? error.message : 'Error al eliminar';
      toast.error(`Error: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isEditing && currentUsuario.id) {
        // Update public data only (Auth update not implemented here for simplicity)
        const { error } = await supabase
          .from('usuarios')
          .update({
            nombre: currentUsuario.nombre,
            // email: currentUsuario.email, // Updating email in Auth is complex, skip for now
            rol: currentUsuario.rol,
          })
          .eq('id', currentUsuario.id);

        if (error) throw error;
        
        setUsuarios(usuarios.map((item) => (item.id === currentUsuario.id ? { ...item, ...currentUsuario } as Usuario : item)));
        toast.success('Usuario actualizado correctamente');
      } else {
        // Create new user via API (Auth + DB)
        const response = await fetch('/api/admin/users', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 email: currentUsuario.email,
                 // password: currentUsuario.password, // Removed
                 nombre: currentUsuario.nombre,
                 rol: currentUsuario.rol
             })
         });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear usuario');
        }

        const result = await response.json();
        
        // Optimistic update or refresh
        if (result.user) {
             // Construct the user object to add to state immediately
             const newUser: Usuario = {
                 id: result.user.id,
                 email: result.user.email,
                 nombre: result.user.nombre,
                 rol: result.user.rol as 'admin' | 'responsable',
                 created_at: new Date().toISOString()
             };
             setUsuarios([...usuarios, newUser]);
        }
        
        toast.success('Usuario creado correctamente');
      }
      
      handleOpenChange(false);
      router.refresh();
    } catch (error: unknown) {
      console.error('Error al guardar usuario:', error);
      const message = error instanceof Error ? error.message : 'Error al guardar usuario';
      toast.error(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Responsable
        </Button>
      </div>

      <div className="md:hidden space-y-3">
        <div className="grid gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="h-12 rounded-xl pl-9"
            />
          </div>
        </div>

        {filteredUsuarios.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-md bg-card">
            {usuarios.length === 0 ? 'No hay usuarios registrados. Crea uno nuevo para comenzar.' : 'No hay resultados para tu búsqueda.'}
          </div>
        ) : (
          filteredUsuarios.map((usuario) => (
            <Card key={usuario.id} className="bg-card shadow-sm rounded-xl">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="w-full text-lg font-semibold leading-snug">{usuario.nombre}</div>
                    <div className="text-sm text-muted-foreground">{usuario.email}</div>
                    <div className="pt-1">
                      <Badge variant={usuario.rol === 'admin' ? 'default' : 'secondary'} className="text-[11px]">
                        {usuario.rol === 'admin' ? 'Administrador' : 'Responsable'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 text-muted-foreground">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(usuario)}>
                      <Pencil className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRequestDelete(usuario)}
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
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No hay usuarios registrados. Crea uno nuevo para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="bg-primary/10 p-1 rounded-full">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    {usuario.nombre}
                  </TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>
                    <Badge variant={usuario.rol === 'admin' ? 'default' : 'secondary'}>
                      {usuario.rol === 'admin' ? 'Administrador' : 'Responsable'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(usuario)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRequestDelete(usuario)}
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

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isEditing ? 'Modifica los datos del usuario.' : 'Ingresa los datos para crear un nuevo usuario.'}
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
                  value={currentUsuario.nombre || ''}
                  onChange={(e) => setCurrentUsuario({ ...currentUsuario, nombre: e.target.value })}
                  required
                  className="h-12 rounded-xl"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-base font-semibold">
                  Correo Electrónico <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={currentUsuario.email || ''}
                  onChange={(e) => setCurrentUsuario({ ...currentUsuario, email: e.target.value })}
                  required
                  disabled={isEditing}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rol" className="text-base font-semibold">Rol</Label>
                <Select 
                  value={currentUsuario.rol || 'responsable'} 
                  onValueChange={(value) => setCurrentUsuario({ ...currentUsuario, rol: value as 'admin' | 'responsable' })}
                >
                  <SelectTrigger id="rol" className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responsable">Responsable</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px] p-0 rounded-2xl sm:rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Eliminar usuario</DialogTitle>
            <DialogDescription className="text-sm">Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-2">
            <div className="text-sm">
              ¿Seguro que deseas eliminar a <span className="font-semibold">{usuarioToDelete?.nombre ?? 'este usuario'}</span>?
            </div>
            {usuarioToDelete?.email && (
              <div className="text-sm text-muted-foreground">{usuarioToDelete.email}</div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUsuarioToDelete(null);
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
    </>
  );
}
