import { redirect } from "next/navigation";
import { Suspense } from "react";
import { uuid } from "../../lib/vendor-marketplace";

export default function VendorsPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  return <Suspense fallback={<main className="p-5">Loading services...</main>}><Redirect searchParams={searchParams} /></Suspense>;
}
async function Redirect({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const category = (await searchParams).category;
  return redirect(typeof category === "string" && uuid(category) ? `/home-services?category=${encodeURIComponent(category)}` : "/home-services");
}
