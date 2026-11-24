begin;

create table if not exists public.property_submission_documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.property_submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 180),
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  constraint property_submission_documents_user_path_check
    check (storage_path like user_id::text || '/' || submission_id::text || '/%')
);

create index if not exists property_submission_documents_submission_idx
  on public.property_submission_documents (submission_id, created_at);

alter table public.property_submission_documents enable row level security;
revoke all on public.property_submission_documents from public, anon, authenticated;
grant select on public.property_submission_documents to authenticated;

drop policy if exists "Admins can read private property submission documents"
  on public.property_submission_documents;
create policy "Admins can read private property submission documents"
  on public.property_submission_documents
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-property-owner-documents',
  'private-property-owner-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

commit;
