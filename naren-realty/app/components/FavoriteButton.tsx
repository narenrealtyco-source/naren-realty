"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomerFavorites, getCustomerSession, toggleCustomerFavorite } from "../lib/customers";

export default function FavoriteButton({
  propertyId,
  title,
  locality,
  type,
  price,
  bedrooms,
}: {
  propertyId: string;
  title: string;
  locality: string;
  type: string;
  price: string;
  bedrooms?: number;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const customer = await getCustomerSession();
        if (!active) return;
        setSaved(customer ? getCustomerFavorites(customer.id).some((favorite) => favorite.propertyId === propertyId) : false);
      } catch {
        if (active) setSaved(false);
      }
    })();
    return () => { active = false; };
  }, [propertyId]);

  async function toggle() {
    const customer = await getCustomerSession();
    if (!customer) {
      router.push("/account");
      return;
    }

    const nextSaved = toggleCustomerFavorite(customer.id, {
      propertyId,
      title,
      locality,
      type,
      price,
      bedrooms,
    });
    setSaved(nextSaved);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? `Remove ${title} from favourites` : `Add ${title} to favourites`}
      aria-pressed={saved}
      title={saved ? "Remove from favourites" : "Save to favourites"}
      className={`inline-flex size-10 items-center justify-center rounded-full border shadow-sm transition-colors ${saved ? "border-amber-400 bg-[#A71930] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#A71930] hover:text-[#A71930]"}`}
    >
      <span aria-hidden="true" className="text-xl leading-none">{saved ? "♥" : "♡"}</span>
    </button>
  );
}
