import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CBC_REFERENCE_PARAMETERS = [
  "Differential Neutrophil Count",
  "Differential Lymphocyte Count",
  "Differential Monocyte Count",
  "Differential Eosinophil Count",
  "Differential Basophil Count",
  "Red Blood Cell (RBC) Count",
  "Haemoglobin (Hb)",
  "Platelet Count",
  "Total Leukocyte Count (TLC)",
  "Hematocrit (HCT)",
  "Mean Corpuscular Volume (MCV)",
  "Mean Corpuscular Haemoglobin (MCH)",
  "Mean Corpuscular Haemoglobin Concentration (MCHC)",
  "Mean Platelet Volume (MPV)",
  "Platelet Distribution Width (PDW)",
  "Red Cell Distribution Width (RDW-CV)",
  "Absolute Lymphocyte Count",
  "Absolute Neutrophil Count",
  "Absolute Basophil Count",
  "Absolute Monocyte Count",
  "Absolute Eosinophil Count"
];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ error: "Health catalogue is temporarily unavailable." }, { status: 503 });
  const supabase = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: items, error }, { data: mappings, error: mappingError }] = await Promise.all([
    supabase.from("health_catalog_items").select("id,slug,item_type,title,category,description,inclusions,sample_type,preparation,report_tat,price,mrp,is_active,provider_verified").order("title"),
    supabase.from("health_package_test_items").select("package_id,test_id,sort_order,mapping_status").eq("mapping_status","confirmed")
  ]);
  if (error || mappingError) return NextResponse.json({ error: "Could not load the health catalogue." }, { status: 500 });
  const byId = new Map((items || []).map(item => [item.id, item]));
  const enrichTest = (test: any) => {
    const storedInclusions = Array.isArray(test.inclusions) ? test.inclusions : [];
    const isCbc = test.slug === "cbc-complete-blood-count";
    const inclusions = storedInclusions.length ? storedInclusions : (isCbc ? CBC_REFERENCE_PARAMETERS : []);
    return {
      slug: test.slug,
      title: test.title,
      description: test.description,
      inclusions,
      inclusionsNote: storedInclusions.length ? null : (isCbc
        ? "Typical 21-parameter CBC reference panel. Exact components can vary by laboratory; MFIT's performing lab confirmation is pending."
        : "Detailed parameter breakdown has not yet been supplied or verified by the performing laboratory."),
      sample_type: test.sample_type,
      preparation: test.preparation,
      report_tat: test.report_tat,
      provider_verified: !!test.provider_verified
    };
  };
  const packageTests: Record<string, Array<ReturnType<typeof enrichTest> & { mappingStatus: string; sortOrder: number }>> = {};
  for (const mapping of mappings || []) {
    const test = byId.get(mapping.test_id);
    if (!test) continue;
    (packageTests[mapping.package_id] ||= []).push({
      ...enrichTest(test),
      mappingStatus: mapping.mapping_status,
      sortOrder: mapping.sort_order
    });
  }
  return NextResponse.json({
    items: (items || []).map(item => {
      const enriched = enrichTest(item);
      return {
        ...item,
        inclusions: enriched.inclusions,
        inclusionsNote: enriched.inclusionsNote,
        package_tests: (packageTests[item.id] || []).sort((a,b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      };
    }),
    checkoutMode: process.env.HEALTH_CHECKOUT_ENABLED === "true" && !!process.env.CASHFREE_APP_ID && !!process.env.CASHFREE_SECRET_KEY ? "payment" : "request"
  }, { headers: { "Cache-Control": "no-store" } });
}
