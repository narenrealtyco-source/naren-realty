import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ error: "Health catalogue is temporarily unavailable." }, { status: 503 });
  const supabase = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: items, error }, { data: mappings }] = await Promise.all([
    supabase.from("health_catalog_items").select("id,slug,item_type,title,category,description,inclusions,sample_type,preparation,report_tat,price,mrp,is_active,provider_verified").order("title"),
    supabase.from("health_package_test_items").select("package_id,test_id,sort_order,mapping_status")
  ]);
  if (error) return NextResponse.json({ error: "Could not load the health catalogue." }, { status: 500 });
  const byId = new Map((items || []).map(item => [item.id, item]));
  const packageTests: Record<string, Array<{slug:string;title:string;mappingStatus:string}>> = {};
  for (const mapping of mappings || []) {
    const test = byId.get(mapping.test_id);
    if (!test) continue;
    (packageTests[mapping.package_id] ||= []).push({ slug: test.slug, title: test.title, mappingStatus: mapping.mapping_status });
  }
  return NextResponse.json({
    items: (items || []).map(item => ({
      ...item,
      package_tests: (packageTests[item.id] || []).sort((a,b) => a.title.localeCompare(b.title))
    })),
    checkoutMode: process.env.HEALTH_CHECKOUT_ENABLED === "true" && !!process.env.CASHFREE_APP_ID && !!process.env.CASHFREE_SECRET_KEY ? "payment" : "request"
  }, { headers: { "Cache-Control": "no-store" } });
}
