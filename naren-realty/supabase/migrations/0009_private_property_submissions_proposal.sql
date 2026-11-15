-- REVIEW ONLY. Do not execute until the live profiles, storage policies,
-- is_admin() definition, effective grants, and default privileges are reviewed.
-- This does not change existing properties, enquiries, policies, or roles.
begin;

create table public.property_submissions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles(id),
  title text not null check (length(btrim(title)) between 1 and 120),
  category text not null check (category in ('Rental', 'Resale', 'PG', 'Airbnb')),
  locality text not null check (length(btrim(locality)) between 1 and 120),
  address text not null check (length(btrim(address)) between 1 and 500),
  price numeric not null check (price > 0 and price <= 1000000000000),
  area numeric not null check (area > 0 and area <= 10000000),
  description text not null check (length(btrim(description)) between 1 and 2000),
  photo_paths text[] not null check (
    cardinality(photo_paths) between 1 and 5
    and array_position(photo_paths, null) is null
  ),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_feedback text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  published_property_id uuid references public.properties(id),
  created_at timestamptz not null default now()
);

create index property_submissions_user_created_idx
  on public.property_submissions (user_id, created_at desc);
alter table public.property_submissions enable row level security;

-- Only new objects are granted/revoked. Existing broad grants are unchanged.
revoke all on public.property_submissions from public, anon, authenticated;
grant select on public.property_submissions to authenticated;
grant insert (id, title, category, locality, address, price, area, description, photo_paths)
  on public.property_submissions to authenticated;

create policy "Customers read own submissions"
  on public.property_submissions for select to authenticated
  using (user_id = auth.uid());

create policy "Admins read submissions"
  on public.property_submissions for select to authenticated
  using (public.is_admin());

create policy "Customers insert own pending submissions"
  on public.property_submissions for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null and reviewed_at is null
    and rejection_feedback is null and published_property_id is null
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'customer'
    )
    and not exists (
      select 1 from unnest(photo_paths) as paths(path)
      where path not like auth.uid()::text || '/' || property_submissions.id::text || '/%'
         or not exists (
           select 1 from storage.objects o
           where o.bucket_id = 'private-property-submissions' and o.name = path
         )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-property-submissions', 'private-property-submissions', false,
  5242880, array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Customers upload private submission photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'private-property-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
    and array_length(storage.foldername(name), 1) = 2
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'customer'
    )
    and not exists (
      select 1 from public.property_submissions s
      where s.user_id = auth.uid()
        and s.id::text = (storage.foldername(name))[2]
    )
  );

create policy "Customers and admins read private submission photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'private-property-submissions'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "Customers remove unsubmitted private photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'private-property-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.property_submissions s
      where s.user_id = auth.uid()
        and s.id::text = (storage.foldername(name))[2]
    )
  );

commit;
