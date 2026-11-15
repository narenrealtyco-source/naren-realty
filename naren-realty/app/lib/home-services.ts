export const HOME_SERVICES = [
  { slug: "builder-projects", name: "New Builder Projects", description: "Tell us what kind of new project you are looking for.", icon: "▦" },
  { slug: "home-interior", name: "Home Interior", description: "Share your interior design requirements.", icon: "⌂" },
  { slug: "legal-services", name: "Legal Services", description: "Ask about property-related legal assistance.", icon: "§" },
  { slug: "home-loan", name: "Home Loan", description: "Enquire about home-loan assistance.", icon: "₹" },
  { slug: "nri-services", name: "NRI Services", description: "Tell us how we can assist with your property needs.", icon: "◎" },
] as const;

export function findHomeService(slug: string) {
  return HOME_SERVICES.find((service) => service.slug === slug);
}

export function validateServiceEnquiry(form: FormData) {
  const slug = form.get("service");
  const name = form.get("name");
  const mobile = form.get("mobile");
  const requirement = form.get("requirement");
  const preferred = form.get("preferred_time");
  const service = typeof slug === "string" ? findHomeService(slug) : undefined;
  if (!service || service.slug === "builder-projects") throw new Error("Choose a valid service.");
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 120 || name.includes("\0")) throw new Error("Enter a name of up to 120 characters.");
  if (typeof mobile !== "string" || !/^(?:[6-9]\d{9}|\+91[6-9]\d{9})$/.test(mobile.trim())) throw new Error("Enter a valid Indian mobile number.");
  if (typeof requirement !== "string" || requirement.trim().length < 1 || requirement.trim().length > 2000 || requirement.includes("\0")) throw new Error("Enter your requirement in up to 2,000 characters.");
  if (typeof preferred !== "string" || preferred.trim().length > 120 || preferred.includes("\0")) throw new Error("Preferred contact time must be at most 120 characters.");
  return { service: service.slug, name: name.trim(), mobile: mobile.trim(), requirement: requirement.trim(), preferred: preferred.trim() };
}
