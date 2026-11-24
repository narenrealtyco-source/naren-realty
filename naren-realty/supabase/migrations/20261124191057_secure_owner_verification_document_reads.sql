drop policy if exists "Admins can read private owner verification files" on storage.objects;
create policy "Admins can read private owner verification files"
on storage.objects for select to authenticated
using (
  bucket_id = 'private-property-owner-documents'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);
