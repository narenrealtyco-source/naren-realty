import Link from "next/link";
import ServicesDirectory from "./ServicesDirectory";

export const instant = false;

export default function HomeServicesPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] px-3 py-4 text-slate-900 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex min-h-9 items-center text-sm font-semibold text-[#A71930] hover:underline"
        >
          ← Home
        </Link>
        <div className="mt-3">
          <ServicesDirectory initialCategory="" />
        </div>
      </div>
    </main>
  );
}
