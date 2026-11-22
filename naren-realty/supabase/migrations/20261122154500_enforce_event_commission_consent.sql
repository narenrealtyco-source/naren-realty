drop policy if exists "Users can submit their own events" on public.event_submissions;
create policy "Users can submit their own events"
  on public.event_submissions for insert
  to authenticated
  with check (
    auth.uid() = submitted_by
    and status = 'pending'
    and (ticket_price = 0 or commission_terms_accepted_at is not null)
  );