import type { Metadata } from "next";
import { Suspense } from "react";
import { getApprovedPropertiesFromSupabase } from "../../lib/supabase-properties";
import PropertyDetailClient from "./PropertyDetailClient";

const siteUrl = "https://naren-realty-fw7y.vercel.app";

function formatPrice(price: number, type: string): string {
  const amount = `₹${price.toLocaleString("en-IN")}`;
  if (type === "Rental") return `${amount} per month`;
  if (type === "PG") return `${amount} per person / month`;
  if (type === "Airbnb") return `${amount} per night`;
  return amount;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const listings = await getApprovedPropertiesFromSupabase();
    const listing = listings.find((item) => item.id === id);
    if (!listing) {
      return {
        title: "Property not available | NAREN REALTY",
        description: "View verified property listings on NAREN REALTY.",
        robots: { index: false, follow: false },
      };
    }

    const title = `${listing.title} | ${listing.type} in ${listing.locality}`;
    const description = [
      listing.type === "Resale" ? "For sale" : listing.type === "Rental" ? "For rent" : listing.type,
      formatPrice(listing.price, listing.type),
      listing.locality,
      listing.bedrooms > 0 ? `${listing.bedrooms} BHK` : "",
      "View photos and details on NAREN REALTY.",
    ].filter(Boolean).join(" · ");
    const url = `${siteUrl}/properties/${encodeURIComponent(listing.id)}`;
    const image = listing.photos.find((photo) => /^https:\/\//i.test(photo));
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "website",
        siteName: "NAREN REALTY",
        title,
        description,
        url,
        ...(image ? { images: [{ url: image, alt: listing.title }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch (error) {
    console.error("[property-metadata] Could not load property metadata", error);
    return {
      title: "Property details | NAREN REALTY",
      description: "View property photos, pricing and details on NAREN REALTY.",
    };
  }
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-slate-600">Loading property...</main>}><PropertyContent params={params} /></Suspense>;
}

async function PropertyContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetailClient listingId={id} />;
}
