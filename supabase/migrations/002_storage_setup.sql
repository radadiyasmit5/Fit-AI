-- ============================================
-- Storage Bucket for Body Photos
-- Run this after 001_initial_schema.sql
-- ============================================

insert into storage.buckets (id, name, public)
values ('body-photos', 'body-photos', false);

create policy "Users can upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'body-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view own photos"
  on storage.objects for select
  using (
    bucket_id = 'body-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'body-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
