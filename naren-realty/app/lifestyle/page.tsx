import Link from "next/link";

const services = [
  { title: "Yoga Classes", detail: "Group yoga, beginner sessions and guided practice.", icon: "🧘" },
  { title: "Meditation & Mindfulness", detail: "Guided meditation, breathing and mindfulness sessions.", icon: "🌿" },
  { title: "Fitness & Personal Training", detail: "Personal trainers, group workouts and fitness programmes.", icon: "💪" },
  { title: "Zumba & Dance Fitness", detail: "Energetic group classes and dance-based workouts.", icon: "💃" },
  { title: "Diet & Nutrition", detail: "Consultations and practical nutrition guidance from professionals.", icon: "🥗" },
  { title: "Wellness Workshops & Retreats", detail: "Stress management, sound healing and wellness experiences.", icon: "✨" },
];

export default function LifestylePage() {
  return (
    <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <header className="bg-[#10243A] px-4 py-4 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-extrabold sm:text-2xl">NAREN <span className="text-amber-400">REALTY</span></Link>
          <Link href="/" className="text-sm font-semibold text-amber-300">← Home</Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Lifestyle & wellness</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#10243A] sm:text-4xl">Lifestyle</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Discover classes, trainers and experiences that support an active and balanced lifestyle.</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {services.map((item) => (
            <article key={item.title} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
              <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-2xl">{item.icon}</span>
              <div><h2 className="font-bold text-[#10243A]">{item.title}</h2><p className="mt-1 text-sm leading-5 text-slate-600">{item.detail}</p></div>
            </article>
          ))}
        </div>
        <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <h2 className="font-bold text-[#10243A]">Classes & bookings coming soon</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">Trainer profiles, class schedules, event seats and booking options will be enabled as verified instructors and organisers join NAREN REALTY.</p>
          <Link href="/events" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#10243A] px-4 text-sm font-bold text-white hover:bg-[#193a5c]">Explore Events <span className="ml-2" aria-hidden="true">→</span></Link>
        </div>
      </div>
    </main>
  );
}
