import Link from "next/link";

const packages = [
  { title: "Full Body Check-up", detail: "Preventive health screening packages.", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85" },
  { title: "Basic Health Package", detail: "Essential health screening packages.", image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=85" },
  { title: "Men's Health", detail: "Health screening options for men.", image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=85" },
  { title: "Women's Health", detail: "Health screening options for women.", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=85" },
];

export default function HealthCheckupPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <header className="bg-[#10243A] px-4 py-4 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-extrabold sm:text-2xl">NAREN <span className="text-amber-400">REALTY</span></Link>
          <Link href="/" className="text-sm font-semibold text-amber-300">← Home</Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Health packages</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#10243A] sm:text-4xl">Health Check-up</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Explore preventive health screening options from diagnostic partners.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {packages.map((item) => (
            <article key={item.title} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="relative aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to top, rgba(8,20,39,.8), transparent 60%), url("${item.image}")` }}>
                <h2 className="absolute bottom-3 left-3 right-3 text-base font-extrabold text-white sm:text-lg">{item.title}</h2>
              </div>
              <p className="p-3 text-xs leading-5 text-slate-600 sm:text-sm">{item.detail}</p>
            </article>
          ))}
        </div>
        <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-bold text-[#10243A]">Packages and booking</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Verified lab partners, test inclusions, package prices and booking options will be displayed here after they are finalized.</p>
        </div>
      </div>
    </main>
  );
}
