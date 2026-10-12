create policy "site members read videos files" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and (public.is_super() or (storage.foldername(name))[1] = public.current_site_id()::text));
create policy "site members upload videos files" on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = public.current_site_id()::text);
create policy "super deletes video files" on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and public.is_super());
create policy "own avatar read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
create policy "own avatar write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own avatar update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.add_upload_usage(_bytes bigint)
returns void language sql security definer set search_path = public as $$
  insert into public.upload_usage(day, bytes) values (current_date, greatest(_bytes,0))
  on conflict (day) do update set bytes = public.upload_usage.bytes + excluded.bytes
$$;
grant execute on function public.add_upload_usage(bigint) to authenticated;
