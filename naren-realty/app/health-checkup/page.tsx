import Link from "next/link";

const categories = [
  { title: "Blood Tests", image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=85" },
  { title: "Full Body Check-ups", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=85" },
  { title: "Home Sample Collection", image: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=900&q=85" },
  { title: "Specialist Consultation", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=85" },
  { title: "Women's & Men's Health", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85" },
  { title: "Physiotherapy", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85" },
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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Health & care</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#10243A] sm:text-4xl">Health</h1>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.title} href="/contact" aria-label={category.title} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
              <div className="relative aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to top, rgba(8,20,39,.86), rgba(8,20,39,.02) 68%), url("${category.image}")` }}>
                <h2 className="absolute bottom-3 left-3 right-3 text-sm font-extrabold leading-tight text-white drop-shadow sm:bottom-4 sm:left-4 sm:text-base">{category.title}</h2>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-500">Service listings and bookings will be available as verified partners join.</p>
      </div>
    </main>
  );
}
