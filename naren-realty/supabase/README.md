# Supabase Policy Integration

Supabase is not connected to this application yet. Until it is, policy versions, acceptances, and brokerage acknowledgements use the same browser Local Storage prototype as the existing accounts and listings. These records are not permanent legal evidence and are not centrally synchronized.

## Database preparation

1. Create a Supabase project and configure Supabase Auth for customers, owners, and Admins.
2. Apply [`policies.sql`](policies.sql) to the project.
3. Set each authenticated user's `app_metadata.role` server-side to `customer`, `owner`, or `admin`. Never accept the role from editable user metadata or a browser form.
4. Configure the app with the public Supabase URL and anon key only. Never put a service-role key in frontend code.
5. Replace the Local Storage policy adapter with calls to `accept_current_policy` and `acknowledge_brokerage`. Load policy documents and acceptance history with the authenticated user ID.
6. Route policy version changes and brokerage acknowledgement preparation through an authenticated server context. The SQL RLS policies use the Admin app-metadata role for policy document management and audit visibility.

The migration prevents users from directly inserting or editing acceptance/audit rows; authenticated RPCs write acceptance timestamps using the database clock and bind the record to `auth.uid()`. Admin role metadata must be provisioned by trusted server-side tooling before enabling the database integration.
