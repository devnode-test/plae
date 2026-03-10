insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'evidencias_public_read'
  ) then
    execute 'create policy "evidencias_public_read" on storage.objects for select using (bucket_id = ''evidencias'')';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'evidencias_authenticated_insert'
  ) then
    execute 'create policy "evidencias_authenticated_insert" on storage.objects for insert to authenticated with check (bucket_id = ''evidencias'')';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'evidencias_authenticated_update'
  ) then
    execute 'create policy "evidencias_authenticated_update" on storage.objects for update to authenticated using (bucket_id = ''evidencias'') with check (bucket_id = ''evidencias'')';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'evidencias_authenticated_delete'
  ) then
    execute 'create policy "evidencias_authenticated_delete" on storage.objects for delete to authenticated using (bucket_id = ''evidencias'')';
  end if;
end $$;
