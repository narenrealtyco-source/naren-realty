import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase-server";
import ServicesDirectory from "./ServicesDirectory";

export const instant = false;

export default async function HomeServicesPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("service_vendors")
    .select("id,public_name,business_name,services,city,locality,service_categories!inner(name,slug,active)")
    .eq("active", true).eq("service_categories.active", true)
    .order("created_at", { ascending: false }).limit(200);
  const vendors = (data ?? []).flatMap((v: any) => {
    const category = Array.isArray(v.service_categories) ? v.service_categories[0] : v.service_categories;
    if (!category) return [];
    return [{ id: v.id, public_name: v.public_name, business_name: v.business_name, category: category.name, category_slug: category.slug, city: v.city, locality: v.locality }];
  });
  return (
    <main className="min-h-screen bg-[#f7f8fa] px-3 py-4 text-slate-900 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex min-h-9 items-center text-sm font-semibold text-[#10243A] hover:underline">← Home</Link>
        <div className="mt-3"><ServicesDirectory initialCategory="" initialVendors={vendors} /></div>
      </div>
    </main>
  );
}
