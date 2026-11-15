// The home_service_enquiries table and its customer/admin RLS policies
// are provisioned in Supabase. Keep this gate aligned with that setup.
export function homeServicesReady(): boolean {
  return true;
}
