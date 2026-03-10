alter table metas_anuales
add column if not exists acciones_edicion_habilitada boolean not null default false;

drop policy if exists "Enable insert for all users" on acciones;
drop policy if exists "Enable update for all users" on acciones;
drop policy if exists "Enable delete for all users" on acciones;

create policy "Enable insert for editable metas" on acciones
for insert to authenticated
with check (
  exists (
    select 1
    from metas_anuales m
    where m.id = acciones.meta_anual_id
      and m.acciones_edicion_habilitada = true
  )
);

create policy "Enable update for editable metas" on acciones
for update to authenticated
using (
  exists (
    select 1
    from metas_anuales m
    where m.id = acciones.meta_anual_id
      and m.acciones_edicion_habilitada = true
  )
)
with check (
  exists (
    select 1
    from metas_anuales m
    where m.id = acciones.meta_anual_id
      and m.acciones_edicion_habilitada = true
  )
);

create policy "Enable delete for editable metas" on acciones
for delete to authenticated
using (
  exists (
    select 1
    from metas_anuales m
    where m.id = acciones.meta_anual_id
      and m.acciones_edicion_habilitada = true
  )
);
