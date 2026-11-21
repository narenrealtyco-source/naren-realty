import Link from "next/link";

export default function EventSubmittedPage() {
  return <main className="grid min-h-screen place-items-center bg-[#f4f7fc] px-4 text-slate-900"><section className="w-full max-w-lg rounded-2xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200"><div className="mx-auto grid size-14 place-items-center rounded-full bg-amber-100 text-2xl">✓</div><h1 className="mt-4 text-2xl font-extrabold text-[#10243A]">Event submitted for review</h1><p className="mt-2 text-sm leading-6 text-slate-600">Thank you! Your event has been received and will appear in public listings only after NAREN REALTY admin approval.</p><Link href="/events" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-amber-400 px-5 font-bold text-[#10243A]">Back to Events</Link></section></main>;
}
