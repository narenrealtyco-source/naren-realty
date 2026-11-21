-- Manager login and assigned-visit access.
-- Role assignment is performed only by a server-side Admin action using service_role.
begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['customer'::text, 'owner'::text, 'admin'::text, 'manager'::text]));

alter table public.profiles
  add column if not exists manager_active boolean not null default true,
  add column if not exists manager_area text,
  add column if not exists manager_email text;

alter table public.visit_requests
  add column if not exists assigned_manager_id uuid references public.profiles(id) on delete set null,
  add column if not exists manager_response text not null default 'pending',
  add column if not exists manager_response_at timestamptz;

alter table public.visit_requests
  drop constraint if exists visit_requests_manager_response_check;
alter table public.visit_requests
  add constraint visit_requests_manager_response_check
  check (manager_response = any (array['pending'::text, 'accepted'::text, 'rejected'::text]));

create index if not exists visit_requests_assigned_manager_created_idx
  on public.visit_requests (assigned_manager_id, created_at desc)
  where assigned_manager_id is not null;

-- Prevent authenticated clients (including managers) from changing customer-facing
-- visit status or schedule. Admin server actions use the server-only service client.
revoke update (status, visit_date, visit_time) on public.visit_requests from authenticated;
grant update (manager_response) on public.visit_requests to authenticated;

drop policy if exists "visit manager read assigned" on public.visit_requests;
create policy "visit manager read assigned"
  on public.visit_requests for select to authenticated
  using (
    assigned_manager_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'manager'
        and p.manager_active = true
    )
  );

drop policy if exists "visit manager respond assigned" on public.visit_requests;
create policy "visit manager respond assigned"
  on public.visit_requests for update to authenticated
  using (
    assigned_manager_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'manager'
        and p.manager_active = true
    )
  )
  with check (
    assigned_manager_id = (select auth.uid())
    and manager_response in ('accepted', 'rejected')
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'manager'
        and p.manager_active = true
    )
  );

commit;
