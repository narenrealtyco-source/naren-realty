-- Instagram property-post workflow. Review against the live Supabase schema before applying.
-- This proposal creates a private post journal and a public, JPEG-only media bucket.
begin;

create table if not exists public.instagram_property_posts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'preview_ready'
    check (status in ('preview_ready','processing','publishing','published','failed','cancelled')),
  caption text not null check (char_length(caption) between 1 and 2200),
  image_path text not null,
  container_id text,
  ig_media_id text unique,
  permalink text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.instagram_property_posts enable row level security;
revoke all on public.instagram_property_posts from anon, authenticated;
grant all on public.instagram_property_posts to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('instagram-post-media', 'instagram-post-media', true, 8388608, array['image/jpeg'])
on conflict (id) do update
set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg'];

commit;
