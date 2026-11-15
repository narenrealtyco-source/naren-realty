# Hosted Owner Activation Deployment Checklist

## Before approval

- [ ] Keep migrations `0007` and `0008` undeployed.
- [ ] Deploy only this hosted proposal after human review; do not deploy either
      earlier migration as a prerequisite.
- [ ] Run the existing read-only diagnostics in Supabase SQL Editor.
- [ ] Confirm the deployment role owns `profiles`, `properties`, and `handle_new_user()`.
- [ ] Confirm the deployment role has `CREATE` on schema `public`.
- [ ] Confirm `profiles`, `properties`, `enquiries`, and `auth.users` exist.
- [ ] Confirm exact `auth.users` trigger binding and current `handle_new_user()` definition.
- [ ] Confirm exactly one enabled non-internal `auth.users` trigger has
      `tgtype = 5` and the exact generated
      `pg_get_triggerdef()` form:
      `AFTER INSERT ... FOR EACH ROW ... public.handle_new_user()`.
- [ ] Review every existing `profiles`, `properties`, and `enquiries` RLS policy.
- [ ] Confirm the complete live policy expressions preserve Admin access,
      legacy Owner access, public approved reads, and do not give an activated
      Customer access to another user's rows or to enquiries.
- [ ] Confirm the property policy review is based on complete expressions,
      not policy names or substring matches.
- [ ] Resolve the proposal's fail-closed policy gate: no existing
      `PERMISSIVE` policy for `public`, `anon`, or `authenticated` may remain
      unreviewed. PostgreSQL combines permissive policies with OR semantics.
- [ ] Do not bypass the policy gate by deleting, weakening, or renaming an
      existing policy. Add an exact, human-reviewed allowlist only after the
      complete live expressions are recorded.
- [ ] Confirm the exact enabled `profiles_protect_role_v4` trigger and
      `public.protect_profile_role_v4()` definition, including owner,
      SECURITY DEFINER, exactly one empty function-level `search_path`
      value (validated from `proconfig` as an empty value after the
      `search_path=` key, not by assuming a display literal), the
      `BEFORE INSERT OR UPDATE OF role` event scope, and Customer/Admin role
      checks.
- [ ] Confirm the deployment/function owner has no application-accessible
      recursive membership or superuser assumption path. Evaluate every
      catalog role with PostgreSQL 17 `SET` and `USAGE` semantics; do not
      rely only on `rolcanlogin`, fixed role names, or `rolinherit`.
- [ ] Confirm no application-accessible role has effective EXECUTE on the
      activation function or write access to either activation table. Check
      INSERT, UPDATE, and DELETE separately for each activation table.
- [ ] Do not exclude the deployment role from privilege checks until its
      ownership, non-superuser status, schema privilege, and owner isolation
      have independently passed.
- [ ] Confirm the exact enabled `auth.users` AFTER INSERT trigger binding and
      the replacement `public.handle_new_user()` owner/security attributes.
- [ ] Confirm property statuses are only `pending`, `rejected`, or `approved`.
- [ ] Confirm no activation tables or activation function already exist.
- [ ] Confirm `service_role` is the only intended executor of the activation function.
- [ ] Confirm no service-role key is present in browser code or `NEXT_PUBLIC_*` variables.

## Deployment

- [ ] Review `owner_activation_hosted_atomic_proposal.sql` in full.
- [ ] Run it once in a controlled Supabase SQL Editor transaction.
- [ ] Stop immediately if any `BLOCKED` exception occurs.
- [ ] Do not continue after a failed transaction or manually apply partial statements.

## Post-deployment verification

- [ ] Verify activation tables are owned by the existing trusted owner.
- [ ] Verify RLS is enabled and application write grants are absent.
- [ ] Verify the activation function is `SECURITY DEFINER`.
- [ ] Verify `search_path` is exactly `pg_catalog, public`.
- [ ] Verify `EXECUTE` is granted only to `service_role`, including all
      transitive `SET` and inherited `USAGE` paths.
- [ ] Verify no reachable non-service role, including non-login roles, has
      effective activation EXECUTE or activation-table INSERT, UPDATE, or
      DELETE privileges.
- [ ] Verify new signups always create `profiles.role = 'customer'`.
- [ ] Verify Customer activation preserves `profiles.role = 'customer'`.
- [ ] Verify capability and policy acceptance writes are atomic.
- [ ] Verify direct authenticated capability writes fail.
- [ ] Verify Owners can only access their own pending/rejected listings.
- [ ] Verify Owners cannot approve, publish, transfer, or delete listings.
- [ ] Verify Owners cannot access enquiries or customer contact data.
- [ ] Verify legacy Owners and Admins retain existing behavior.
- [ ] Verify Broker access remains disabled.
- [ ] Verify LocalStorage records and helpers are unchanged.
