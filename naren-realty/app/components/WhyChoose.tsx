const benefits = [
  { title: "Service First, Payment Later", description: "No unnecessary advance. Pay as per agreed service terms.", icon: "M3 12 7 8l4 2 2-1 4 2 4 1-3 4-3 2-4-1-3-2-2 1-3-4Zm4-4 2-2 3 1 3-1 2 2", featured: true },
  { title: "Schedule at Your Convenience", description: "Choose a time that works for you.", icon: "M4 5h16v15H4zM8 3v4m8-4v4M4 9h16" },
  { title: "Fixed Time Commitment", description: "We respect your agreed schedule.", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2" },
  { title: "Verified Partners", description: "Connect with approved property and service partners.", icon: "M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3Zm-4 9 3 3 5-5" },
  { title: "Transparent Pricing", description: "Know the applicable charges in advance.", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h3" },
  { title: "No Pressure, Your Choice", description: "Make your decision at your own pace.", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-4-9 3 3 5-6" },
  { title: "Dedicated Customer Assistance", description: "Get support throughout your journey.", icon: "M4 13v-2a8 8 0 0 1 16 0v2M4 13h3v5H4zm13 0h3v5h-3zm3 5c0 2-3 3-6 3" },
  { title: "Everything Under One Roof", description: "Property and home services in one place.", icon: "M3 11 12 4l9 7M5 10v10h14V10m-7 2v6m-3-3h6" },
];

function Icon({ path }: { path: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d={path} /></svg>;
}

export default function WhyChoose() {
  return <section id="about" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12" aria-labelledby="why-choose">
    <h2 id="why-choose" className="text-center text-2xl font-bold text-[#10243A] sm:text-3xl">Why Choose NAREN REALTY?</h2>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {benefits.map((benefit) => benefit.featured
        ? <article key={benefit.title} className="flex min-w-0 flex-col items-center rounded-xl bg-[#10243A] p-3 text-center text-white shadow-lg sm:p-4">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-amber-400 text-[#10243A]"><Icon path={benefit.icon} /></span>
          <h3 className="mt-2 text-sm font-bold text-amber-400">{benefit.title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-200">{benefit.description}</p>
        </article>
        : <article key={benefit.title} className="flex min-w-0 flex-col items-center rounded-xl border border-slate-200 bg-white p-3 text-center sm:p-4">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><Icon path={benefit.icon} /></span>
          <h3 className="mt-2 text-sm font-bold text-[#10243A]">{benefit.title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">{benefit.description}</p>
        </article>)}
    </div>
  </section>;
}
