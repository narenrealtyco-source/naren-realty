import {redirect} from "next/navigation";
import {Suspense} from "react";
import {connection} from "next/server";
import {requireCollectionPartner} from "../lib/collection-partner";
import {updatePartnerBooking} from "./actions";
import PartnerAutoRefresh from "./auto-refresh";
import PartnerLinkActions from "./link-actions";

const money=(value:any)=>"₹"+Number(value||0).toLocaleString("en-IN");
function trackingLabel(b:any,approved:boolean){
 if(approved)return b.partner_b2b_payment_status==="paid"?"Report available":"Report approved · B2B payment pending";
 if(b.report_submitted_at)return "Report submitted · MFIT review";
 if(b.sample_status==="processing")return "Testing in progress";
 if(b.lab_received_at)return "Received at MFIT lab";
 if(b.sample_collected_at)return "Sample collected · In transit";
 return "Awaiting sample collection";
}
async function Content({searchParams}:{searchParams?:Promise<{q?:string}>}){
 await connection();
 let ctx;try{ctx=await requireCollectionPartner();}catch{redirect("/collection-partner/login");}
 const {admin,partner}=ctx;const query=((await searchParams)?.q||"").trim().toLowerCase();
 const [{data:allBookings,error},{data:rates}]=await Promise.all([
  admin.from("health_booking_requests").select("id,reference,customer_name,customer_phone,customer_email,address,pincode,selected_items,preferred_date,preferred_slot,status,sample_status,sample_collected_at,lab_received_at,report_due_at,report_tat_hours,report_submitted_at,partner_tracking_note,partner_customer_amount,partner_customer_payment_status,partner_customer_payment_method,partner_b2b_amount,partner_b2b_payment_status,created_at").eq("collection_partner_id",partner.id).order("created_at",{ascending:false}).limit(200),
  admin.from("health_collection_partner_rates").select("customer_price,b2b_price,is_active,catalog:health_catalog_items(slug,title,item_type,price,mrp)").eq("partner_id",partner.id).eq("is_active",true)
 ]);
 if(error)throw new Error("Unable to load partner bookings.");
 const bookings=(allBookings||[]).filter((b:any)=>!query||[b.reference,b.customer_name,b.customer_phone,b.address,...(b.selected_items||[]).map((x:any)=>x.title)].join(" ").toLowerCase().includes(query));
 const pending=(allBookings||[]).filter((x:any)=>x.partner_b2b_payment_status!=="paid").reduce((s:number,x:any)=>s+Number(x.partner_b2b_amount||0),0);
 const awaiting=(allBookings||[]).filter((x:any)=>!x.sample_collected_at).length;
 const processing=(allBookings||[]).filter((x:any)=>x.lab_received_at&&!x.report_submitted_at).length;
 const {data:events}=await admin.from("health_booking_request_tracking_events").select("id,request_id,event_key,from_status,to_status,note,created_at").in("request_id",(allBookings||[]).map((x:any)=>x.id)).order("created_at",{ascending:false});
 const {data:reports}=await admin.from("health_booking_request_reports").select("id,request_id,report_title,storage_path,visible_to_customer").in("request_id",(allBookings||[]).map((x:any)=>x.id));
 const paidByRequest=new Map((allBookings||[]).map((x:any)=>[x.id,x.partner_b2b_payment_status==="paid"]));
 const reportLinks=await Promise.all((reports||[]).map(async(r:any)=>{
  if(paidByRequest.get(r.request_id)!==true||!r.visible_to_customer)return {...r,url:null};
  const {data}=await admin.storage.from("mfit-private-reports").createSignedUrl(r.storage_path,300);
  return {...r,url:data?.signedUrl||null};
 }));
 const approvedIds=new Set((reports||[]).filter((r:any)=>r.visible_to_customer).map((r:any)=>r.request_id));
 const bookingUrl="https://narenrealty.co/collection/"+partner.public_slug;
 const ratesList=(rates||[]).map((r:any)=>({rate:r,catalog:Array.isArray(r.catalog)?r.catalog[0]:r.catalog})).filter((x:any)=>x.catalog&&(!query||String(x.catalog.title||"").toLowerCase().includes(query)));
 return <main className="min-h-screen bg-[#f4f7f8] text-slate-900">
  <PartnerAutoRefresh/>
  <div className="mx-auto flex max-w-[1500px]">
   <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-5 lg:flex">
    <div className="mb-8"><p className="text-[10px] font-black tracking-[.2em] text-teal-700">COLLECTION PARTNER</p><h1 className="mt-2 text-xl font-extrabold">Operations</h1><p className="mt-1 text-xs text-slate-500">{partner.display_name}</p></div>
    <nav className="space-y-1 text-sm font-semibold">
     <a href="#overview" className="block rounded-lg bg-teal-50 px-3 py-2.5 text-teal-800">▦　Dashboard</a>
     <a href="#booking-link" className="block rounded-lg px-3 py-2.5 hover:bg-slate-50">↗　My Booking Link</a>
     <a href="#bookings" className="block rounded-lg px-3 py-2.5 hover:bg-slate-50">▤　Bookings & Visits</a>
     <a href="#catalogue" className="block rounded-lg px-3 py-2.5 hover:bg-slate-50">⌕　Test Catalogue & Rates</a>
     <a href="#payments" className="block rounded-lg px-3 py-2.5 hover:bg-slate-50">₹　B2B Payments</a>
     <a href="#tracking" className="block rounded-lg px-3 py-2.5 hover:bg-slate-50">⌁　Sample Tracking</a>
     <a href="#reports" className="block rounded-lg px-3 py-2.5 hover:bg-slate-50">▧　Reports</a>
    </nav>
    <div className="mt-auto border-t pt-4"><p className="text-xs text-slate-500">Service areas</p><p className="mt-1 text-sm font-bold">{(partner.service_areas||[]).join(", ")||"Not set"}</p><form action="/collection-partner/logout" method="post" className="mt-5"><button className="text-sm font-semibold text-slate-500">Sign out</button></form></div>
   </aside>
   <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Partner workspace</p><h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">Good day, {partner.display_name}</h2><p className="mt-1 text-sm text-slate-500">Manage customer visits, B2B payments and sample progress.</p></div><form action="/collection-partner/logout" method="post" className="lg:hidden"><button className="rounded-lg border bg-white px-3 py-2 text-xs font-bold">Sign out</button></form></header>
    <div id="overview" className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
     <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Total bookings</p><p className="mt-2 text-2xl font-extrabold">{allBookings?.length||0}</p><p className="mt-1 text-[11px] text-slate-400">All assigned customers</p></div>
     <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">B2B outstanding</p><p className="mt-2 text-2xl font-extrabold">{money(pending)}</p><p className="mt-1 text-[11px] text-amber-700">Payable to MFIT</p></div>
     <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Collection pending</p><p className="mt-2 text-2xl font-extrabold">{awaiting}</p><p className="mt-1 text-[11px] text-slate-400">Awaiting sample collection</p></div>
     <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Lab processing</p><p className="mt-2 text-2xl font-extrabold">{processing}</p><p className="mt-1 text-[11px] text-slate-400">Awaiting report submission</p></div>
    </div>

    <section id="booking-link" className="mt-6 rounded-xl border border-teal-100 bg-white p-4 sm:p-5">
     <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-extrabold">My customer booking link</h3><p className="mt-1 text-xs text-slate-500">Share this link. Customer bookings are automatically assigned to your partner account.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">Active</span></div>
     <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3"><code className="min-w-0 flex-1 break-all text-xs sm:text-sm">{bookingUrl}</code><PartnerLinkActions url={bookingUrl} partnerName={partner.display_name}/></div>
    </section>

    <section id="bookings" className="mt-8 scroll-mt-5">
     <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-xl font-extrabold">Bookings & visit management</h3><p className="mt-1 text-xs text-slate-500">New bookings are automatically accepted. Change the visit time if you are busy.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600">{bookings.length} results</span></div>
     <form method="get" action="/collection-partner" className="mt-4 flex gap-2"><input name="q" defaultValue={query} placeholder="Search client, mobile, booking ID, address, test or package…" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600"/><button className="rounded-lg bg-slate-900 px-5 text-sm font-bold text-white">Search</button></form>
     <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Booking / Client</th><th className="px-4 py-3">Tests / Packages</th><th className="px-4 py-3">Visit schedule</th><th className="px-4 py-3">B2B payable</th><th className="px-4 py-3">Current status</th><th className="px-4 py-3">Manage</th></tr></thead><tbody>
      {bookings.map((b:any)=>{const approved=approvedIds.has(b.id);return <tr key={b.id} className="border-t border-slate-100 align-top"><td className="px-4 py-4"><b className="text-teal-800">{b.reference}</b><p className="mt-1 font-bold text-slate-900">{b.customer_name}</p><p className="mt-1 text-slate-500">{b.customer_phone}</p><p className="mt-1 max-w-[190px] text-[10px] leading-4 text-slate-400">{b.address}</p></td><td className="px-4 py-4"><div className="max-w-[230px] space-y-1">{(b.selected_items||[]).map((x:any)=><p key={x.slug} className="font-semibold">{x.title}</p>)}</div><p className="mt-2 text-[10px] text-slate-500">Customer: {money(b.partner_customer_amount)}</p></td><td className="px-4 py-4"><p className="font-bold">{b.preferred_date}</p><p className="mt-1 text-slate-600">{b.preferred_slot}</p><span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Auto accepted</span></td><td className="px-4 py-4"><p className="font-extrabold">{money(b.partner_b2b_amount)}</p><p className={"mt-1 font-bold "+(b.partner_b2b_payment_status==="paid"?"text-emerald-700":"text-amber-700")}>{b.partner_b2b_payment_status==="paid"?"Paid":"Payment pending"}</p></td><td className="px-4 py-4"><p className="max-w-[155px] font-semibold">{trackingLabel(b,approved)}</p><p className="mt-1 text-[10px] text-slate-400">Customer payment: {b.partner_customer_payment_status||"Not recorded"}</p></td><td className="px-4 py-4"><details className="min-w-[210px]"><summary className="cursor-pointer rounded-lg border px-3 py-2 text-center font-bold text-teal-800">Manage booking</summary><div className="mt-2 space-y-3 rounded-lg bg-slate-50 p-3">
       <form action={updatePartnerBooking} className="space-y-2"><input type="hidden" name="request_id" value={b.id}/><input type="hidden" name="action" value="reschedule"/><p className="font-extrabold">Reschedule visit</p><label className="block text-[10px] font-bold text-slate-500">New date<input type="date" name="new_date" required min={new Date().toISOString().slice(0,10)} defaultValue={b.preferred_date} className="mt-1 w-full rounded-md border bg-white p-2 text-xs"/></label><label className="block text-[10px] font-bold text-slate-500">New time<input type="time" name="new_time" required className="mt-1 w-full rounded-md border bg-white p-2 text-xs"/></label><label className="block text-[10px] font-bold text-slate-500">Reason<textarea name="reason" required minLength={3} placeholder="e.g. Previous visit taking longer" className="mt-1 w-full rounded-md border bg-white p-2 text-xs"/></label><button className="w-full rounded-md bg-teal-700 p-2 text-xs font-bold text-white">Save new visit time</button></form>
       <div className="border-t pt-3"><p className="font-extrabold">Customer payment</p><p className="mt-1 text-[11px]">Status: {b.partner_customer_payment_status||"Not recorded"}</p>{b.partner_customer_payment_status!=="paid"&&<form action={updatePartnerBooking} className="mt-2 flex gap-2"><input type="hidden" name="request_id" value={b.id}/><input type="hidden" name="action" value="customer_paid"/><select name="method" className="min-w-0 flex-1 rounded-md border bg-white p-2 text-xs"><option value="upi">UPI</option><option value="cash">Cash</option></select><button className="rounded-md border bg-white px-2 text-[10px] font-bold">Record paid</button></form>}</div>
       <div className="border-t pt-3"><p className="font-extrabold">Sample collection</p>{b.sample_collected_at?<p className="mt-1 text-[11px] text-emerald-700">Collected: {new Date(b.sample_collected_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</p>:<form action={updatePartnerBooking} className="mt-2"><input type="hidden" name="request_id" value={b.id}/><input type="hidden" name="action" value="sample_collected"/><button className="w-full rounded-md border border-teal-700 bg-white p-2 text-xs font-bold text-teal-800">Confirm sample collected</button></form>}</div><div className="border-t pt-3"><p className="font-extrabold">Visit & tracking history</p><div className="mt-2 space-y-2">{(events||[]).filter((e:any)=>e.request_id===b.id).map((e:any)=><div key={e.id} className="border-l-2 border-teal-300 pl-2"><p className="text-[10px] font-bold">{String(e.event_key).replaceAll("_"," ")}</p><p className="text-[10px] text-slate-500">{new Date(e.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</p>{e.note&&<p className="text-[10px] text-slate-600">{e.note}</p>}</div>)}</div></div>
       {b.partner_b2b_payment_status!=="paid"&&<form action="/api/collection-partner/pay/create" method="post" className="border-t pt-3"><input type="hidden" name="request_id" value={b.id}/><button className="w-full rounded-md bg-slate-900 p-2 text-xs font-bold text-white">Pay B2B to MFIT</button></form>}
      </div></details></td></tr>})}
      {!bookings.length&&<tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">No matching bookings found. Share your customer booking link to receive bookings here.</td></tr>}
      </tbody></table></div>
     </div>
    </section>

    <section id="catalogue" className="mt-8 scroll-mt-5"><h3 className="text-xl font-extrabold">Test catalogue & rate confirmation</h3><p className="mt-1 text-xs text-slate-500">Your active partner rates. Confirm customer and MFIT B2B prices before discussing a test with a client.</p><div className="mt-3 overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Test / Package</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Customer rate</th><th className="px-4 py-3">MFIT B2B rate</th><th className="px-4 py-3">Rate difference</th></tr></thead><tbody>{ratesList.map((x:any)=><tr key={x.catalog.slug} className="border-t"><td className="px-4 py-3 font-semibold">{x.catalog.title}</td><td className="px-4 py-3">{x.catalog.item_type==="package"?"Package":"Single test"}</td><td className="px-4 py-3 font-bold">{money(x.rate.customer_price??x.catalog.price)}</td><td className="px-4 py-3">{money(x.rate.b2b_price??x.catalog.price)}</td><td className="px-4 py-3 font-bold text-teal-800">{money(Number(x.rate.customer_price??x.catalog.price)-Number(x.rate.b2b_price??x.catalog.price))}</td></tr>)}</tbody></table></div><p className="mt-2 text-[11px] text-slate-500">{ratesList.length} active rate entries · Prices shown from your partner rate configuration.</p></section>

    <section id="payments" className="mt-8 scroll-mt-5"><h3 className="text-xl font-extrabold">B2B payments</h3><p className="mt-1 text-xs text-slate-500">Partner-to-MFIT settlement controls report eligibility. Customer payment to partner does not unlock reports.</p><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Outstanding to MFIT</p><p className="mt-2 text-2xl font-extrabold">{money(pending)}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Paid bookings</p><p className="mt-2 text-2xl font-extrabold">{(allBookings||[]).filter((b:any)=>b.partner_b2b_payment_status==="paid").length}</p></div></div></section>

    <section id="tracking" className="mt-8 scroll-mt-5"><h3 className="text-xl font-extrabold">Sample tracking</h3><p className="mt-1 text-xs text-slate-500">Follow every assigned booking from collection through lab processing.</p><div className="mt-3 overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Sample</th><th className="px-4 py-3">Lab receipt</th><th className="px-4 py-3">Processing</th><th className="px-4 py-3">Report</th></tr></thead><tbody>{(allBookings||[]).map((b:any)=><tr key={b.id} className="border-t"><td className="px-4 py-3 font-bold">{b.reference}<p className="mt-1 font-normal text-slate-500">{b.customer_name}</p></td><td className="px-4 py-3">{b.sample_collected_at?"Collected":"Awaiting collection"}</td><td className="px-4 py-3">{b.lab_received_at?new Date(b.lab_received_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}):"Awaiting lab receipt"}</td><td className="px-4 py-3">{b.sample_status==="processing"?"In progress":b.lab_received_at?"Received":"Not started"}</td><td className="px-4 py-3">{b.report_submitted_at?"Submitted":approvedIds.has(b.id)?"Approved":"Pending"}</td></tr>)}</tbody></table></div></section>

    <section id="reports" className="mt-8 scroll-mt-5"><h3 className="text-xl font-extrabold">Reports & submission</h3><p className="mt-1 text-xs text-slate-500">Only MFIT-admin-approved reports with fully paid partner B2B dues can be downloaded.</p><div className="mt-3 space-y-2">{(reports||[]).map((r:any)=>{const b=(allBookings||[]).find((x:any)=>x.id===r.request_id);return <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3"><div><p className="font-bold">{r.report_title||"Diagnostic report"}</p><p className="mt-1 text-[11px] text-slate-500">{b?.reference||"Booking"} · {b?.customer_name||""}</p></div><div className="text-right">{b?.partner_b2b_payment_status!=="paid"?<p className="text-xs font-bold text-amber-700">B2B payment pending · Locked</p>:!r.visible_to_customer?<p className="text-xs text-slate-500">Awaiting MFIT approval</p>:reportLinks.find((x:any)=>x.id===r.id)?.url?<a href={reportLinks.find((x:any)=>x.id===r.id).url} target="_blank" rel="noreferrer" className="rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white">Download approved report</a>:<p className="text-xs text-rose-700">Secure link unavailable</p>}</div></div>})}{!(reports||[]).length&&<p className="rounded-lg border bg-white p-4 text-sm text-slate-500">No reports submitted yet.</p>}</div></section>
    <footer className="mt-10 border-t pt-4 text-[11px] text-slate-400">Collection Partner Operations · Data refreshes automatically every 45 seconds.</footer>
   </section>
  </div>
 </main>;
}
export default function PartnerDashboard({searchParams}:{searchParams?:Promise<{q?:string}>}){return <Suspense fallback={<main className="p-8 text-center">Loading partner dashboard…</main>}><Content searchParams={searchParams}/></Suspense>}
