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


 // Public Tata 1mg homepage-listed individual test prices checked 21 Nov 2026.
 // Reference-only, not MFIT selling prices or partner rates.
const TATA1MG_SINGLE_TEST_REFERENCE: Record<string, { price: number; url: string }> = {
  "complete blood count (cbc)": { price: 349, url: "https://www.1mg.com/labs" },
  "cbc (complete blood count)": { price: 349, url: "https://www.1mg.com/labs" },
  "liver function test (lft)": { price: 439, url: "https://www.1mg.com/labs" },
  "lft (liver function test)": { price: 439, url: "https://www.1mg.com/labs" },
  "thyroid profile total (t3, t4 & tsh)": { price: 539, url: "https://www.1mg.com/labs" },
  "hba1c (glycosylated hemoglobin)": { price: 419, url: "https://www.1mg.com/labs" },
  "pt inr (prothrombin time with inr)": { price: 379, url: "https://www.1mg.com/labs" },
  "lipid profile": { price: 439, url: "https://www.1mg.com/labs" },
  "fbs (fasting blood sugar)": { price: 89, url: "https://www.1mg.com/labs" },
  "testosterone total": { price: 659, url: "https://www.1mg.com/labs" },
  "lh & fsh": { price: 949, url: "https://www.1mg.com/labs" },
  "dengue fever ns1 antigen": { price: 600, url: "https://www.1mg.com/labs" },
  "vitamin d (25-oh)": { price: 549, url: "https://www.1mg.com/labs/test/vitamin-d-25-hydroxy-1972" },
  "urine r/m (urine routine & microscopy)": { price: 129, url: "https://www.1mg.com/labs" },
  "urine routine & microscopy": { price: 129, url: "https://www.1mg.com/labs" }
};

// Public Tata 1mg Pune catalogue facts checked on 21 Nov 2026.
 // Reference-only records are served by the Preview app; they are not written to Supabase
 // and must not be treated as MFIT-verified panels, MFIT prices, or bookable items.
const TATA1MG_PUNE_REFERENCE = [
  {
    id: "tata1mg-pune-cbc-reference", slug: "tata1mg-pune-cbc-reference", item_type: "test",
    title: "CBC (Complete Blood Count)", category: "Blood",
    description: "Tata 1mg Pune reference listing. Contains 21 tests; report time shown as 7 hours.",
    inclusions: CBC_REFERENCE_PARAMETERS, sample_type: "Blood",
    preparation: "Confirm preparation with the performing laboratory.",
    report_tat: "7 hours (Tata 1mg listing)", price: 309, mrp: 389,
    is_active: true, provider_verified: false, reference_only: true,
    listed_test_count: 21, source_label: "Tata 1mg Pune", source_checked_at: "2026-11-21",
    source_url: "https://www.1mg.com/labs/test/cbc-complete-blood-count-1717"
  },
  {
    id: "tata1mg-pune-hba1c-reference", slug: "tata1mg-pune-hba1c-reference", item_type: "test",
    title: "HbA1c (Glycosylated Hemoglobin)", category: "Diabetes",
    description: "Tata 1mg Pune reference listing. Single test measuring glycated haemoglobin.",
    inclusions: ["HbA1c (Glycosylated Hemoglobin)"], sample_type: "Blood",
    preparation: "Confirm preparation with the performing laboratory.",
    report_tat: "12 hours (Tata 1mg Pune listing)", price: 359, mrp: 479,
    is_active: true, provider_verified: false, reference_only: true,
    listed_test_count: 1, source_label: "Tata 1mg Pune", source_checked_at: "2026-11-21",
    source_url: "https://www.1mg.com/labs/test/hba1c-glycosylated-hemoglobin-test-1611/pune/price"
  },
  {
    id: "tata1mg-pune-comprehensive-gold-reference", slug: "tata1mg-pune-comprehensive-gold-reference", item_type: "package",
    title: "Comprehensive Gold Full Body Checkup with Smart Report", category: "Full Body",
    description: "Tata 1mg Pune reference listing. 86 tests; blood and urine samples; overnight fasting for 8–12 hours.",
    inclusions: [], sample_type: "Blood & Urine",
    preparation: "Overnight fasting for 8–12 hours (Tata 1mg listing).",
    report_tat: "7 hours (Tata 1mg listing)", price: 2499, mrp: 4998,
    is_active: true, provider_verified: false, reference_only: true,
    listed_test_count: 86, source_label: "Tata 1mg Pune", source_checked_at: "2026-11-21",
    source_url: "https://www.1mg.com/labs/test/Comprehensive-Gold-Full-Body-Checkup-with-Smart-Report-2763"
  },
  {
    id: "tata1mg-pune-tax-saver-reference", slug: "tata1mg-pune-tax-saver-reference", item_type: "package",
    title: "Tax Saver Health Check", category: "Full Body",
    description: "Tata 1mg Pune reference listing. 62 tests; overnight fasting is preferred but not mandatory.",
    inclusions: [
      "Serum Calcium", "Serum Iron Studies Basic", "ESR (Erythrocyte Sedimentation Rate)",
      "CBC (Complete Blood Count)", "Random Blood Sugar (RBS)", "Diabetic Screen",
      "Total IgE", "Vitamin D (25-Hydroxy)", "Liver Function Test (LFT)",
      "Thyroid Profile Total (T3, T4 & TSH)", "Kidney Function Test (KFT) with Electrolytes",
      "Lipid Profile (Non-Fasting)"
    ],
    sample_type: "Blood",
    preparation: "Overnight fasting preferred; not mandatory (Tata 1mg Pune listing).",
    report_tat: "12 hours (Tata 1mg Pune listing)", price: 1250, mrp: 2399,
    is_active: true, provider_verified: false, reference_only: true,
    listed_test_count: 62, source_label: "Tata 1mg Pune", source_checked_at: "2026-11-21",
    source_url: "https://www.1mg.com/labs/test/tax-saver-health-check-35181/pune/price"
  },
  {
    id: "tata1mg-pune-thyroid-comprehensive-reference", slug: "tata1mg-pune-thyroid-comprehensive-reference", item_type: "package",
    title: "Thyroid Comprehensive Package", category: "Hormones",
    description: "Tata 1mg Pune reference listing. 5 tests covering thyroid profile and thyroid antibodies.",
    inclusions: [
      "Anti Thyroglobulin Antibody", "Anti-TPO Antibody (Anti-Thyroid Peroxidase Antibody)",
      "Thyroxine - Total (T4)", "Triiodothyronine - Total (T3)",
      "TSH (Thyroid Stimulating Hormone) Ultrasensitive"
    ],
    sample_type: "Blood",
    preparation: "Fasting not required (Tata 1mg Pune listing).",
    report_tat: "24 hours (Tata 1mg Pune listing)", price: 2559, mrp: 3200,
    is_active: true, provider_verified: false, reference_only: true,
    listed_test_count: 5, source_label: "Tata 1mg Pune", source_checked_at: "2026-11-21",
    source_url: "https://www.1mg.com/labs/test/thyroid-comprehensive-package-34761/pune/price"
  }
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
    items: [...(items || []).map(item => {
      const enriched = enrichTest(item);
      const reference = item.item_type === "test"
        ? TATA1MG_SINGLE_TEST_REFERENCE[String(item.title || "").trim().toLowerCase()]
        : undefined;
      return {
        ...item,
        ...(reference ? {
          tata1mg_reference_price: reference.price,
          tata1mg_reference_source: "Tata 1mg listing",
          tata1mg_reference_checked_at: "2026-11-21",
          tata1mg_reference_url: reference.url
        } : {}),
        inclusions: enriched.inclusions,
        inclusionsNote: enriched.inclusionsNote,
        package_tests: (packageTests[item.id] || []).sort((a,b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      };
    }), ...TATA1MG_PUNE_REFERENCE.filter(reference => !(items || []).some(item => item.slug === reference.slug))],
    checkoutMode: process.env.HEALTH_CHECKOUT_ENABLED === "true" && !!process.env.CASHFREE_APP_ID && !!process.env.CASHFREE_SECRET_KEY ? "payment" : "request"
  }, { headers: { "Cache-Control": "no-store" } });
}
