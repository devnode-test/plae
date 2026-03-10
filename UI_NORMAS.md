# Normas de UI (PLAE)

Este documento define el estándar visual para mantener **todas las vistas CRUD** (admin y responsable) con el mismo look & feel.

## Tipografía

- Tipografía base: `Inter` (aplicada como `font-sans`).
- Monoespaciada: `Roboto Mono` (como `font-mono`).

## Listados CRUD (mobile-first)

### Encabezado (filters + CTA)

- En móvil, el CTA principal (ej. “Nuevo …”) debe ser `w-full`.
- En `sm+`, el CTA puede volver a `w-auto`.
- Inputs de búsqueda: `h-12 rounded-xl` (y padding para ícono si aplica).
- Selects en filtros: `w-full` en móvil.

### Cards (móvil)

- El título debe ocupar todo el ancho: `w-full`.
- Metadata (eje/foco/responsable/periodo, etc.) debajo del título.
- Acciones (editar/eliminar) siempre en **fila aparte**, abajo, alineadas a la derecha: `justify-end`.

### Tabla (desktop)

- Mantener tabla en `md+` cuando ya existe.
- Acciones en columna `text-right` con `flex justify-end gap-2`.

## Botones

- Acciones ícono (editar/eliminar): `variant="ghost" size="icon"`.
- Botón principal en modales (guardar): usa `primary`.
- Cancelar en modales: pill gris (`variant="secondary"`).

## Modales: Crear / Editar (estilo Supabase)

### Contenedor

- `DialogContent`: sin padding interno, borde redondeado grande y contenido "encapsulado".

Plantilla recomendada:

```tsx
<DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-2xl sm:rounded-2xl">
  ...
</DialogContent>
```

### Header

- Header con divisor y alineado a la izquierda.
- Título grande.
- Botón de cerrar: circular (ya estandarizado en `components/ui/dialog.tsx`).

Plantilla:

```tsx
<DialogHeader className="px-6 py-5 border-b text-left">
  <DialogTitle className="text-2xl font-semibold tracking-tight">...</DialogTitle>
  <DialogDescription className="text-sm">...</DialogDescription>
</DialogHeader>
```

### Campos

- Label: `text-base font-semibold`.
- Requeridos: `*` en rojo (`text-destructive`).
- Input: `h-12 rounded-xl`.
- Textarea: `rounded-xl` y, si es descripción opcional, placeholder “Descripción opcional” y `min-h-[120px]`.
- SelectTrigger: `h-12 rounded-xl`.

### Footer

- Botones en la misma fila.
- Ambos botones con el mismo ancho (`flex-1`) y estilo pill.

Plantilla:

```tsx
<DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
  <Button variant="secondary" className="h-12 flex-1 rounded-full">Cancelar</Button>
  <Button className="h-12 flex-1 rounded-full">
    Guardar / Guardar Cambios
  </Button>
</DialogFooter>
```

## Modales: Eliminar (confirmación)

- Misma estructura visual que crear/editar.
- Descripción clara: “Esta acción no se puede deshacer.”
- Botón “Eliminar” usa `variant="destructive"` y también pill (`h-12 flex-1 rounded-full`).
- Evitar `confirm()` del navegador: siempre usar modal.

Plantilla:

```tsx
<DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-2xl sm:rounded-2xl">
  <DialogHeader className="px-6 py-5 border-b text-left">
    <DialogTitle className="text-2xl font-semibold tracking-tight">Eliminar ...</DialogTitle>
    <DialogDescription className="text-sm">Esta acción no se puede deshacer.</DialogDescription>
  </DialogHeader>

  <div className="px-6 py-6 space-y-2">
    <div className="text-sm">¿Seguro que deseas eliminar ...?</div>
  </div>

  <DialogFooter className="flex flex-row items-center justify-between gap-3 px-6 pb-6 pt-2">
    <Button variant="secondary" className="h-12 flex-1 rounded-full">Cancelar</Button>
    <Button variant="destructive" className="h-12 flex-1 rounded-full">Eliminar</Button>
  </DialogFooter>
</DialogContent>
```

## Select (dropdown)

- El contenido del select debe alinearse al ancho del trigger y no desbordar en móvil.
- Mantener `max-w` respecto a viewport para evitar overflow.

## Reglas rápidas (checklist)

- Nada de `confirm()`.
- En móvil: título `w-full` y acciones en fila inferior `justify-end`.
- Inputs/Selects de formularios: `rounded-xl`, inputs `h-12`.
- Footer de modal: botones pill de ancho igual.
