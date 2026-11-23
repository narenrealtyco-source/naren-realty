import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { findHomeService } from "../../lib/home-services";
import { homeServicesReady } from "../../lib/home-services-config";
import ServiceEnquiryForm from "../ServiceEnquiryForm";

export default function HomeServicePage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<main className="p-5">Loading service...</main>}><ServiceContent params={params} /></Suspense>;
}

async function ServiceContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "builder-projects") notFound();
  const service = findHomeService(slug);
  if (!service) notFound();
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-3xl">
    <Link href="/home-services" className="text-sm font-semibold text-[#A71930] underline">← All home services</Link>
    <h1 className="mt-5 text-3xl font-bold text-[#A71930]">{service.name}</h1>
    <p className="mb-6 mt-2 text-slate-600">{service.description} Services are subject to availability and confirmation.</p>
    <ServiceEnquiryForm service={service.slug} ready={homeServicesReady()} />
  </div></main>;
}
