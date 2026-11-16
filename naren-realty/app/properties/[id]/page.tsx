import type { Metadata } from "next";
import { Suspense } from "react";
import PropertyDetailClient from "./PropertyDetailClient";
import { getApprovedPropertiesFromSupabase } from "../../lib/supabase-properties";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://naren-realty-fw7y.vercel.app").replace(/\/$/, "");

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const canonicalUrl = `${siteUrl}/properties/${encodeURIComponent(id)}`;

  try {
    const listings = await getApprovedPropertiesFromSupabase();
    const listing = listings.find((item) => item.id === id);
    if (!listing) {
      return {
        title: "Property | NAREN REALTY",
        description: "Explore verified property listings with NAREN REALTY.",
        alternates: { canonical: canonicalUrl },
        openGraph: {
          type: "website",
          url: canonicalUrl,
          siteName: "NAREN REALTY",
          title: "Property | NAREN REALTY",
          description: "Explore verified property listings with NAREN REALTY.",
        },
      };
    }

    const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(listing.price);
    const priceLabel = listing.type === "Rental" ? `${price}/month`
      : listing.type === "PG" ? `${price}/person/month`
      : listing.type === "Airbnb" ? `${price}/night` : price;
    const description = [listing.description?.trim(), listing.locality, priceLabel, "NAREN REALTY"]
      .filter(Boolean).join(" · ").slice(0, 300);
    const title = `${listing.title} | ${listing.locality} | NAREN REALTY`;
    const image = listing.photos.find((photo) => typeof photo === "string" && photo.trim());
    const imageUrl = image ? new URL(image, siteUrl).toString() : `${siteUrl}/opengraph-image`;

    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: "website",
        url: canonicalUrl,
        siteName: "NAREN REALTY",
        title,
        description,
        images: [{ url: imageUrl, width: 1200, height: 630, alt: listing.title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error("[property-metadata] Could not load listing metadata", error);
    return {
      title: "Property | NAREN REALTY",
      description: "Explore verified property listings with NAREN REALTY.",
      alternates: { canonical: canonicalUrl },
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
