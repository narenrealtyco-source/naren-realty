"use server";

import {
  getAdminDashboardStatsFromSupabase,
  type AdminDashboardStats,
} from "../lib/admin-supabase-data";

export async function loadAdminDashboardStats(): Promise<AdminDashboardStats> {
  return getAdminDashboardStatsFromSupabase();
}
