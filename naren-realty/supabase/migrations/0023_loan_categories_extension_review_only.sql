-- REVIEW ONLY. Depends on the loan_types table from 0019_requirements_proposal.sql.
-- Do not apply until the requirements schema and its RLS/grants have been formally approved.
begin;

insert into public.loan_types (name, active)
values
  ('Car Loan', true),
  ('Home Loan Balance Transfer', true),
  ('Home Loan Top-Up', true)
on conflict (name) do update set active = excluded.active;

commit;
