"use client";

const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE?.trim();
const validPhone = businessPhone && /^\+?[0-9]{7,15}$/.test(businessPhone);

export default function ContactButton({ label = "Contact", compact = false }: { label?: string; compact?: boolean } = {}) {
  const style = compact
    ? "inline-flex min-h-10 items-center justify-center rounded-lg border border-[#10243A] px-3 py-2.5 text-xs font-bold text-[#10243A]"
    : "inline-flex items-center justify-center rounded-lg border border-[#10243A] px-5 py-3 text-sm font-bold text-[#10243A]";
  if (!validPhone) return <span className="inline-flex flex-col gap-1"><button type="button" disabled className={`${style} cursor-not-allowed opacity-50`}>{label}</button><span className="text-xs text-slate-600">Contact number is not configured.</span></span>;
  return <a className={style} href={`tel:${businessPhone}`} aria-label="Contact Naren Realty">{label}</a>;
}
