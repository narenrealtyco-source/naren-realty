"use client";

import { useEffect, useState } from "react";

export default function AddToCartButton({ slug, disabled = false }: { slug: string; disabled?: boolean }) {
  const [added, setAdded] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mfit_cart_items") || "[]");
      setAdded(Array.isArray(saved) && saved.includes(slug));
    } catch {
      setAdded(false);
    }
  }, [slug]);

  function add() {
    if (disabled) return;
    try {
      const saved = JSON.parse(localStorage.getItem("mfit_cart_items") || "[]");
      const current = Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : [];
      if (!current.includes(slug)) current.push(slug);
      localStorage.setItem("mfit_cart_items", JSON.stringify(current.slice(0, 10)));
      setAdded(true);
    } catch {
      setAdded(false);
    }
  }

  return <button type="button" onClick={add} disabled={disabled} className="rounded-xl border border-[#08aeb1] bg-white px-4 py-3 text-xs font-extrabold text-[#078b8d] disabled:cursor-not-allowed disabled:opacity-40">{added ? "ADDED ✓" : "ADD TO CART"}</button>;
}
