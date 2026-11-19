import Link from "next/link";

const services = [
  { title: "Blood Tests", detail: "Routine and preventive tests such as CBC, thyroid, sugar, HbA1c, vitamin levels and lipid profile.", icon: "🧪" },
  { title: "Full Body Check-ups", detail: "Explore preventive screening packages and essential health panels.", icon: "🩺" },
  { title: "Home Sample Collection", detail: "Convenient sample collection at home through diagnostic partners.", icon: "🏠" },
  { title: "Specialised Health Packages", detail: "Men's health, women's health and age-based screening options.", icon: "💙" },
  { title: "Doctor & Specialist Consultation", detail: "Find consultation options with qualified healthcare professionals.", icon: "👩‍⚕️" },
  { title: "Physiotherapy", detail: "Explore rehabilitation and physiotherapy services at clinic or home.", icon: "🧑‍⚕️" },
];

export default function HealthPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <header className="bg-[#10243A] px-4 py-4 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-extrabold sm:text-2xl">NAREN <span className="text-amber-400">REALTY</span></Link>
          <Link href="/" className="text-sm font-semibold text-amber-300">← Home</Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Health services</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#10243A] sm:text-4xl">Health</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Explore diagnostic tests, preventive health check-ups and healthcare services. Service availability, prices and appointment slots will be shown with verified providers.</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {services.map((item) => (
            <article key={item.title} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
              <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-2xl">{item.icon}</span>
              <div><h2 className="font-bold text-[#10243A]">{item.title}</h2><p className="mt-1 text-sm leading-5 text-slate-600">{item.detail}</p></div>
            </article>
          ))}
        </div>
        <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <h2 className="font-bold text-[#10243A]">Bookings coming soon</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">We are preparing verified healthcare partner listings. Online test selection, prices, home collection slots and appointment booking will be enabled as partners are onboarded.</p>
        </div>
      </div>
    </main>
  );
}
