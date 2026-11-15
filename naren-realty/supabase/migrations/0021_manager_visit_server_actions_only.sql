-- Keep all visit assignment and response writes behind role-checked server actions.
begin;
revoke update (manager_response, manager_response_at) on public.visit_requests from authenticated;
drop policy if exists "visit manager respond assigned" on public.visit_requests;
commit;
