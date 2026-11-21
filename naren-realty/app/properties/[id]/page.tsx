import { Suspense } from "react";
import PropertyDetailClient from "./PropertyDetailClient";

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-slate-600">Loading property...</main>}><PropertyContent params={params} /></Suspense>;
}

async function PropertyContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetailClient listingId={id} />;
}
