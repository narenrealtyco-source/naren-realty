export const MFIT_CART_KEY = "mfit-health-cart";

export function addHealthCartItem(slug: string) {
  if (typeof window === "undefined" || !slug) return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(MFIT_CART_KEY) || "[]");
    const current = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
    if (!current.includes(slug)) current.push(slug);
    window.localStorage.setItem(MFIT_CART_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event("mfit-cart-updated"));
  } catch {
    window.localStorage.setItem(MFIT_CART_KEY, JSON.stringify([slug]));
    window.dispatchEvent(new Event("mfit-cart-updated"));
  }
}
